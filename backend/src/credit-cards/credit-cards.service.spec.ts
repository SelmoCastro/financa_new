import { Test, TestingModule } from '@nestjs/testing';
import { CreditCardsService } from './credit-cards.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EncryptionService } from '../common/services/encryption.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CreditCardsService installment grouping', () => {
  let service: CreditCardsService;

  const creditCardFindFirst = jest.fn();
  const accountFindFirst = jest.fn();
  const categoryFindFirst = jest.fn();
  const installmentCreate = jest.fn();
  const installmentFindFirst = jest.fn();
  const installmentDeleteMany = jest.fn();
  const installmentUpdate = jest.fn();
  const transactionCreateMany = jest.fn();
  const transactionDeleteMany = jest.fn();
  const transactionCount = jest.fn();

  const prismaMock = {
    account: { findFirst: accountFindFirst },
    category: { findFirst: categoryFindFirst },
    creditCard: { findFirst: creditCardFindFirst },
    creditCardInstallment: {
      create: installmentCreate,
      findFirst: installmentFindFirst,
      deleteMany: installmentDeleteMany,
      update: installmentUpdate,
    },
    transaction: {
      createMany: transactionCreateMany,
      deleteMany: transactionDeleteMany,
      count: transactionCount,
    },
  } as any;

  const subscriptionMock = {
    checkNotExceeding: jest.fn(),
  } as any;

  const encryptionMock = {
    isEnabled: () => false,
    encryptDecimal: (value: string | number) => String(value),
    decryptDecimal: (value: string) => value,
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    creditCardFindFirst.mockResolvedValue({ id: 'card-1', userId: 'user-1' });
    accountFindFirst.mockResolvedValue({ id: 'account-1', userId: 'user-1' });
    categoryFindFirst.mockResolvedValue({ id: 'category-1', userId: 'user-1' });
    installmentCreate.mockImplementation(async (args: any) => ({
      id: installmentCreate.mock.calls.length === 1 ? 'installment-1' : 'installment-2',
      ...args.data,
    }));
    installmentFindFirst.mockImplementation(async ({ where }: any) => {
      if (where.userId === 'user-1') {
        return {
          id: 'installment-1',
          description: 'Notebook',
          installmentCount: 3,
          creditCardId: 'card-1',
          userId: 'user-1',
          totalAmount: '900',
          amountPerMonth: '300',
          entryAmount: null,
          startDate: new Date('2026-08-15T12:00:00.000Z'),
          dueDay: 10,
          currentInstallment: 1,
          category: null,
          account: null,
          creditCard: { id: 'card-1', userId: 'user-1' },
        };
      }
      return null;
    });
    installmentDeleteMany.mockResolvedValue({ count: 1 });
    installmentUpdate.mockResolvedValue({ id: 'installment-1' });
    transactionCreateMany.mockResolvedValue({ count: 3 });
    transactionDeleteMany.mockResolvedValue({ count: 3 });
    transactionCount.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditCardsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SubscriptionService, useValue: subscriptionMock },
        { provide: EncryptionService, useValue: encryptionMock },
      ],
    }).compile();

    service = module.get(CreditCardsService);
  });

  it('keeps same-description purchases isolated by installment group id', async () => {
    const dto = {
      description: 'Notebook',
      totalAmount: 900,
      installmentCount: 3,
      dueDay: 10,
      accountId: 'account-1',
      categoryId: 'category-1',
    } as any;

    await service.createInstallment('card-1', dto, 'user-1');
    await service.createInstallment('card-1', dto, 'user-1');

    expect(transactionCreateMany).toHaveBeenCalledTimes(2);

    const firstRows = transactionCreateMany.mock.calls[0][0].data;
    const secondRows = transactionCreateMany.mock.calls[1][0].data;

    expect(firstRows.every((row: any) => row.installmentId === 'installment-1')).toBe(
      true,
    );
    expect(secondRows.every((row: any) => row.installmentId === 'installment-2')).toBe(
      true,
    );
  });

  it('refuses deletion when legacy transactions remain ambiguous', async () => {
    transactionDeleteMany.mockResolvedValueOnce({ count: 0 });
    transactionCount.mockResolvedValueOnce(1);

    await expect(
      service.deleteInstallment('installment-1', 'user-1'),
    ).rejects.toThrow(ConflictException);
    expect(installmentDeleteMany).not.toHaveBeenCalled();
  });

  it('deletes only the targeted installment group and blocks cross-user access', async () => {
    await service.deleteInstallment('installment-1', 'user-1');

    expect(transactionDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        installmentId: 'installment-1',
        invoiceId: null,
      },
    });
    expect(installmentDeleteMany).toHaveBeenCalledWith({
      where: { id: 'installment-1', userId: 'user-1' },
    });

    await expect(service.deleteInstallment('installment-1', 'user-2')).rejects.toThrow(
      NotFoundException,
    );
    expect(transactionDeleteMany).toHaveBeenCalledTimes(1);
  });
});
