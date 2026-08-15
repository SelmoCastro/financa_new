import { BadRequestException } from '@nestjs/common';
import { TransactionsImportService } from './transactions-import.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { EncryptionService } from '../common/services/encryption.service';

type TransactionRow = {
  id: string;
  userId: string;
  fitId?: string | null;
  accountId?: string | null;
  amount: string;
  type: string;
  description: string;
  deletedAt: null;
  date: Date;
};

function createServiceScenario() {
  const persistedTransactions: TransactionRow[] = [];
  const accountState = {
    balance: 1000,
  };
  let lastTx: any;

  const prismaMock = {
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
      const tx = {
        $queryRaw: jest.fn(async () => [
          {
            id: 'account-1',
            userId: 'user-1',
            balance: String(accountState.balance),
          },
        ]),
        transaction: {
          findMany: jest.fn(async ({ where }: any) => {
            const fitIds: string[] | undefined = where?.fitId?.in;
            if (!fitIds || fitIds.length === 0) return [];
            return persistedTransactions
              .filter(
                (row) =>
                  row.userId === where.userId &&
                  row.deletedAt === null &&
                  row.fitId &&
                  fitIds.includes(row.fitId),
              )
              .map((row) => ({ fitId: row.fitId }));
          }),
          createMany: jest.fn(async ({ data }: { data: TransactionRow[] }) => {
            let count = 0;
            for (const row of data) {
              const duplicate =
                row.fitId &&
                persistedTransactions.some(
                  (existing) =>
                    existing.userId === row.userId &&
                    existing.fitId === row.fitId &&
                    existing.deletedAt === null,
                );
              if (duplicate) continue;
              persistedTransactions.push({
                id: `tx-${persistedTransactions.length + 1}`,
                userId: row.userId,
                fitId: row.fitId ?? null,
                accountId: row.accountId ?? null,
                amount: row.amount,
                type: row.type,
                description: row.description,
                deletedAt: null,
                date: row.date,
              });
              count += 1;
            }
            return { count };
          }),
        },
        account: {
          findMany: jest.fn(async ({ where }: any) => {
            const ids: string[] = where?.id?.in || [];
            return ids.includes('account-1')
              ? [{ id: 'account-1', balance: String(accountState.balance) }]
              : [];
          }),
          update: jest.fn(async ({ data }: any) => {
            accountState.balance = Number(data.balance);
            return { id: 'account-1', balance: data.balance };
          }),
        },
        category: {
          findMany: jest.fn(async () => []),
        },
        creditCard: {
          findMany: jest.fn(async () => []),
        },
        importedFitId: {
          upsert: jest.fn(async ({ create }: any) => {
            return create;
          }),
        },
      };

      lastTx = tx;
      return callback(tx);
    }),
    category: {
      findMany: jest.fn(async () => []),
    },
    transaction: {
      findMany: jest.fn(),
    },
    importedFitId: {
      findMany: jest.fn(),
    },
    account: {
      findMany: jest.fn(async ({ where }: any) => {
        const ids: string[] = where?.id?.in || [];
        return ids.includes('account-1') ? [{ id: 'account-1' }] : [];
      }),
    },
    creditCard: {
      findMany: jest.fn(),
    },
  };

  const service = new TransactionsImportService(
    prismaMock as unknown as PrismaService,
    { classifyTransactions: jest.fn() } as unknown as AiService,
    { log: jest.fn() } as unknown as AuditService,
    {
      isEnabled: jest.fn(() => false),
      encryptDecimal: jest.fn((value: number | string) => String(value)),
      decryptDecimal: jest.fn((value: string) => value),
    } as unknown as EncryptionService,
  );

  return {
    service,
    prismaMock,
    persistedTransactions,
    accountState,
    lastTx: () => lastTx,
  };
}

describe('TransactionsImportService.confirmImport', () => {
  it('deduplica transações com o mesmo fitId antes de calcular o saldo', async () => {
    const { service, accountState, lastTx } = createServiceScenario();

    const result = await service.confirmImport(
      [
        {
          fitId: 'fit-dup-1',
          accountId: 'account-1',
          amount: 100,
          date: '2026-08-01T12:00:00.000Z',
          description: 'Compra duplicada A',
          type: 'EXPENSE',
        },
        {
          fitId: 'fit-dup-1',
          accountId: 'account-1',
          amount: 100,
          date: '2026-08-01T12:05:00.000Z',
          description: 'Compra duplicada B',
          type: 'EXPENSE',
        },
        {
          accountId: 'account-1',
          amount: 20,
          date: '2026-08-01T13:00:00.000Z',
          description: 'Lançamento sem fitId',
          type: 'INCOME',
        },
      ],
      'user-1',
    );

    expect(result).toEqual({ importedCount: 2 });
    expect(accountState.balance).toBe(920);
    expect(lastTx()).toBeDefined();
    expect(lastTx().transaction.createMany).toHaveBeenCalledTimes(1);
    expect(lastTx().importedFitId.upsert).toHaveBeenCalledTimes(1);
  });

  it('não reimporta um fitId já persistido em uma nova confirmação', async () => {
    const { service, accountState } = createServiceScenario();
    const payload = [
      {
        fitId: 'fit-reimport-1',
        accountId: 'account-1',
        amount: 50,
        date: '2026-08-02T12:00:00.000Z',
        description: 'Lançamento único',
        type: 'EXPENSE',
      },
    ];

    const first = await service.confirmImport(payload, 'user-1');
    const afterFirstImport = accountState.balance;

    const second = await service.confirmImport(payload, 'user-1');

    expect(first).toEqual({ importedCount: 1 });
    expect(second).toEqual({ importedCount: 0 });
    expect(afterFirstImport).toBe(950);
    expect(accountState.balance).toBe(950);
  });

  it('rejeita importação com saldo negativo projetado', async () => {
    const { service } = createServiceScenario();

    await expect(
      service.confirmImport(
        [
          {
            fitId: 'fit-negative-1',
            accountId: 'account-1',
            amount: 1500,
            date: '2026-08-03T12:00:00.000Z',
            description: 'Despesa alta',
            type: 'EXPENSE',
          },
        ],
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
