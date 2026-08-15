import { CreditCardInvoiceService } from './credit-card-invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

type CreditCardRecord = {
  id: string;
  userId: string;
  name: string;
  closingDay: number;
  dueDay: number;
  deletedAt: null;
};

type InvoiceTransactionRange = {
  date?: {
    gte?: Date;
    lte?: Date;
  };
};

type CurrentInvoiceProjection = {
  isProjection?: boolean;
  referenceMonth: number;
  referenceYear: number;
  transactions: Array<{ id: string }>;
  totalAmount: number;
};

describe('CreditCardInvoiceService', () => {
  let service: CreditCardInvoiceService;
  let prisma: {
    creditCard: { findFirst: jest.Mock };
    creditCardInvoice: { findUnique: jest.Mock };
    transaction: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let encryption: {
    isEnabled: jest.Mock;
    decryptDecimal: jest.Mock;
    encryptDecimal: jest.Mock;
  };

  const userId = 'user-1';
  const creditCardId = 'card-1';

  const card: CreditCardRecord = {
    id: creditCardId,
    userId,
    name: 'Cartão principal',
    closingDay: 10,
    dueDay: 20,
    deletedAt: null,
  };

  const makeTx = (id: string, date: Date, amount: string) => ({
    id,
    date,
    amount,
    category: { id: 'cat-1', name: 'Geral' },
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));

    prisma = {
      creditCard: { findFirst: jest.fn() },
      creditCardInvoice: { findUnique: jest.fn() },
      transaction: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };

    encryption = {
      isEnabled: jest.fn().mockReturnValue(false),
      decryptDecimal: jest.fn((value: string) => value),
      encryptDecimal: jest.fn((value: number) => String(value)),
    };

    service = new CreditCardInvoiceService(
      prisma as unknown as PrismaService,
      encryption as unknown as EncryptionService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns only transactions inside the current invoice cycle before, inside, and after the bounds', async () => {
    prisma.creditCard.findFirst.mockResolvedValue(card);
    prisma.creditCardInvoice.findUnique.mockResolvedValue(null);

    const beforeCycle = makeTx(
      'tx-before',
      new Date(2026, 4, 10, 9, 0, 0),
      '10',
    );
    const insideCycle = makeTx(
      'tx-inside',
      new Date(2026, 4, 15, 9, 0, 0),
      '25',
    );
    const afterCycle = makeTx('tx-after', new Date(2026, 5, 11, 9, 0, 0), '40');

    prisma.transaction.findMany.mockImplementation(
      ({ where }: { where?: { date?: InvoiceTransactionRange['date'] } }) => {
        const range = where?.date;
        return [beforeCycle, insideCycle, afterCycle].filter((tx) => {
          if (!range) return true;
          const gteOk = !range.gte || tx.date >= range.gte;
          const lteOk = !range.lte || tx.date <= range.lte;
          return gteOk && lteOk;
        });
      },
    );

    const result = (await service.getCurrentInvoice(
      creditCardId,
      userId,
    )) as CurrentInvoiceProjection;

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date: {
            gte: new Date(2026, 4, 11),
            lte: new Date(2026, 5, 10, 23, 59, 59, 999),
          },
          invoiceId: null,
          creditCardId,
          userId,
          deletedAt: null,
          type: 'EXPENSE',
        },
      }),
    );

    expect(result.isProjection).toBe(true);
    expect(result.referenceMonth).toBe(6);
    expect(result.referenceYear).toBe(2026);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].id).toBe('tx-inside');
    expect(result.totalAmount).toBe(25);
  });
});
