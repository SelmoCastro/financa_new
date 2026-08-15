import { RecurringTransactionsService } from './recurring-transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

describe('RecurringTransactionsService', () => {
  let service: RecurringTransactionsService;
  let prisma: {
    recurringTransaction: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      deleteMany: jest.Mock;
    };
    transaction: { findMany: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let encryption: {
    isEnabled: jest.Mock;
    decryptDecimal: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      recurringTransaction: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(
        async (callback: (tx: typeof prisma) => Promise<unknown>) =>
          callback(prisma),
      ),
    };

    encryption = {
      isEnabled: jest.fn().mockReturnValue(false),
      decryptDecimal: jest.fn((value: string) => value),
    };

    service = new RecurringTransactionsService(
      prisma as unknown as PrismaService,
      encryption as unknown as EncryptionService,
    );
  });

  it('returns zero weight when there is no income in the current month', async () => {
    prisma.recurringTransaction.findMany.mockResolvedValue([{ amount: '132' }]);
    prisma.transaction.findMany.mockResolvedValue([]);

    const result = await service.getWeight('user-1');

    expect(result).toEqual({
      totalFixedExpense: 132,
      monthlyIncome: 0,
      weight: 0,
      count: 1,
    });
  });

  it('calculates the percentage normally when the month has income', async () => {
    prisma.recurringTransaction.findMany.mockResolvedValue([
      { amount: '132' },
      { amount: '68' },
    ]);
    prisma.transaction.findMany.mockResolvedValue([{ amount: '1000' }]);

    const result = await service.getWeight('user-1');

    expect(result).toEqual({
      totalFixedExpense: 200,
      monthlyIncome: 1000,
      weight: 20,
      count: 2,
    });
  });

  it('removes a migrated recurring transaction without recreating it from legacy fixed entries', async () => {
    prisma.recurringTransaction.findFirst.mockResolvedValue({
      id: 'recurring-1',
      userId: 'user-1',
      description: 'Aluguel',
      amount: '100',
      type: 'EXPENSE',
      categoryId: 'category-1',
      accountId: 'account-1',
      creditCardId: null,
    });
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 'legacy-1',
        amount: '100',
        description: 'Aluguel',
        type: 'EXPENSE',
        categoryId: 'category-1',
        accountId: 'account-1',
        creditCardId: null,
      },
    ]);

    await expect(service.remove('recurring-1', 'user-1')).resolves.toEqual({
      deleted: true,
    });

    expect(prisma.recurringTransaction.deleteMany).toHaveBeenCalledWith({
      where: { id: 'recurring-1', userId: 'user-1' },
    });
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['legacy-1'] }, userId: 'user-1', isFixed: true },
      data: { isFixed: false },
    });
  });
});
