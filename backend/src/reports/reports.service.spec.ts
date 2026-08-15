import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

type DashboardSummary = {
  currentMonth: {
    income: number;
    expense: number;
    incomeTrend: number;
    expenseTrend: number;
  };
  monthlyHistory: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
};

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    account: { findMany: jest.Mock };
    transaction: { findMany: jest.Mock };
    category: { findMany: jest.Mock };
    creditCardInvoice: { findMany: jest.Mock };
    creditCard: { findMany: jest.Mock };
  };
  let encryption: {
    isEnabled: jest.Mock;
    decryptDecimal: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      account: { findMany: jest.fn() },
      transaction: { findMany: jest.fn() },
      category: { findMany: jest.fn() },
      creditCardInvoice: { findMany: jest.fn() },
      creditCard: { findMany: jest.fn() },
    };

    encryption = {
      isEnabled: jest.fn().mockReturnValue(false),
      decryptDecimal: jest.fn((value: string) => value),
    };

    service = new ReportsService(
      prisma as unknown as PrismaService,
      encryption as unknown as EncryptionService,
    );
  });

  it('keeps the requested empty month instead of falling back to the previous month', async () => {
    prisma.account.findMany.mockResolvedValue([{ balance: '2500' }]);
    prisma.category.findMany.mockResolvedValue([]);
    prisma.creditCardInvoice.findMany.mockResolvedValue([]);
    prisma.creditCard.findMany.mockResolvedValue([]);

    prisma.transaction.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { type: 'INCOME', amount: '1000' },
        { type: 'EXPENSE', amount: '400' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          date: new Date('2026-05-15T12:00:00.000Z'),
          amount: '1000',
          type: 'INCOME',
        },
        {
          date: new Date('2026-05-20T12:00:00.000Z'),
          amount: '400',
          type: 'EXPENSE',
        },
      ]);

    const summary: DashboardSummary = await service.getDashboardSummary(
      'user-1',
      2026,
      5,
    );

    expect(summary.currentMonth).toEqual({
      income: 0,
      expense: 0,
      incomeTrend: -100,
      expenseTrend: -100,
    });
    expect(summary.monthlyHistory).toHaveLength(1);
    expect(summary.monthlyHistory[0].month).toMatch(/^Mai/i);
    expect(summary.monthlyHistory[0].income).toBe(1000);
    expect(summary.monthlyHistory[0].expenses).toBe(400);

    const calls = prisma.transaction.findMany.mock
      .calls as unknown as unknown[][];
    const firstCall = calls[0]?.[0] as {
      where: { date: { gte: Date; lte: Date } };
    };
    expect(firstCall.where.date).toEqual({
      gte: new Date(Date.UTC(2026, 5, 1)),
      lte: new Date(Date.UTC(2026, 6, 0, 23, 59, 59, 999)),
    });
  });
});
