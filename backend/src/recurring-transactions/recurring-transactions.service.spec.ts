import { RecurringTransactionsService } from './recurring-transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

describe('RecurringTransactionsService', () => {
  let service: RecurringTransactionsService;
  let prisma: {
    recurringTransaction: { findMany: jest.Mock };
    transaction: { findMany: jest.Mock };
  };
  let encryption: {
    isEnabled: jest.Mock;
    decryptDecimal: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      recurringTransaction: { findMany: jest.fn() },
      transaction: { findMany: jest.fn() },
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
    prisma.recurringTransaction.findMany.mockResolvedValue([
      { amount: '132' },
    ]);
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
    prisma.transaction.findMany.mockResolvedValue([
      { amount: '1000' },
    ]);

    const result = await service.getWeight('user-1');

    expect(result).toEqual({
      totalFixedExpense: 200,
      monthlyIncome: 1000,
      weight: 20,
      count: 2,
    });
  });
});
