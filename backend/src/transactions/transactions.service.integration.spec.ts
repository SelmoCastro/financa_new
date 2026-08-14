/**
 * Teste de integração do TransactionsService com banco de dados real.
 *
 * Requer: docker-compose.test.yml rodando (docker compose -f docker-compose.test.yml up -d)
 * DATABASE_URL_TEST=postgresql://test_user:test_password@localhost:5433/finanza_test
 *
 * Executar: DATABASE_URL_TEST=postgresql://test_user:test_password@localhost:5433/finanza_test npx jest --config jest.integration.config.js
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EncryptionService } from '../common/services/encryption.service';
import { PrismaClient } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TransactionsService (integration)', () => {
  let service: TransactionsService;
  let prisma: PrismaClient;
  const testUserId = 'test-user-integration-001';

  beforeAll(async () => {
    // Conecta ao banco de teste
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL_TEST } },
    });

    // Cria usuário de teste
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'test@integration.local',
        emailHash: 'test-email-hash-integration-001',
        password: 'hashed',
        name: 'Test User',
      },
    });

    // Cria conta de teste
    await prisma.account.create({
      data: {
        id: 'test-account-001',
        userId: testUserId,
        name: 'Conta Teste',
        balance: '1000',
        type: 'CHECKING',
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: EncryptionService,
          useValue: {
            isEnabled: () => false,
            decryptDecimal: (v: string) => v,
            encryptDecimal: (v: string | number) => String(v),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  afterAll(async () => {
    // Limpa dados de teste
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.account.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('deve criar uma transação de despesa e atualizar o saldo da conta', async () => {
    const dto = {
      type: 'EXPENSE' as const,
      amount: 100,
      date: new Date().toISOString(),
      description: 'Teste integração',
      accountId: 'test-account-001',
    };

    const result = await service.create(dto, testUserId);

    expect(result).toBeDefined();
    expect(result.type).toBe('EXPENSE');
    expect(Number(result.amount)).toBe(100);

    // Verifica que a transação foi persistida
    const saved = await prisma.transaction.findUnique({
      where: { id: result.id },
    });
    expect(saved).toBeDefined();
    expect(saved!.description).toBe('Teste integração');
  });

  it('deve rejeitar transação com data > 2 dias no futuro', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const dto = {
      type: 'EXPENSE' as const,
      amount: 50,
      date: futureDate.toISOString(),
      description: 'Data futura',
      accountId: 'test-account-001',
    };

    await expect(service.create(dto, testUserId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve rejeitar transação com accountId que não pertence ao usuário', async () => {
    const dto = {
      type: 'EXPENSE' as const,
      amount: 50,
      date: new Date().toISOString(),
      description: 'Conta alheia',
      accountId: 'non-existent-account',
    };

    await expect(service.create(dto, testUserId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deve rejeitar criação de TRANSFER via endpoint create', async () => {
    const dto = {
      type: 'TRANSFER' as const,
      amount: 50,
      date: new Date().toISOString(),
      description: 'Transfer indevida',
      accountId: 'test-account-001',
    };

    await expect(service.create(dto, testUserId)).rejects.toThrow(
      BadRequestException,
    );
  });
});
