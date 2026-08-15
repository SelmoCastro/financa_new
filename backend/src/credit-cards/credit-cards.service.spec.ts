import { Test, TestingModule } from '@nestjs/testing';
import { CreditCardsService } from './credit-cards.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EncryptionService } from '../common/services/encryption.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

type InstallmentRecord = {
  id: string;
  description: string;
  installmentCount: number;
  creditCardId: string;
  userId: string;
  totalAmount: string;
  amountPerMonth: string;
  entryAmount: null;
  startDate: Date;
  dueDay: number;
  currentInstallment: number;
  category: null;
  account: null;
  creditCard: { id: string; userId: string };
};

type CreateInstallmentDto = {
  description: string;
  totalAmount: number;
  installmentCount: number;
  dueDay: number;
  accountId: string;
  categoryId: string;
};

type TransactionCreateManyArgs = {
  data: Array<{ installmentId: string }>;
};

type InstallmentCreateArgs = {
  data: Omit<InstallmentRecord, 'id'>;
};

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
  const transactionUpdateMany = jest.fn();
  const transactionCount = jest.fn();

  const createdTransactionRows: Array<Array<{ installmentId: string }>> = [];
  let installmentCounter = 0;

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
      updateMany: transactionUpdateMany,
      count: transactionCount,
    },
    $transaction: jest.fn(),
  };

  const subscriptionMock = {
    checkNotExceeding: jest.fn(),
  };

  const encryptionMock = {
    isEnabled: () => false,
    encryptDecimal: (value: string | number) => String(value),
    decryptDecimal: (value: string) => value,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    createdTransactionRows.length = 0;
    installmentCounter = 0;

    creditCardFindFirst.mockResolvedValue({ id: 'card-1', userId: 'user-1' });
    accountFindFirst.mockResolvedValue({ id: 'account-1', userId: 'user-1' });
    categoryFindFirst.mockResolvedValue({ id: 'category-1', userId: 'user-1' });
    installmentCreate.mockImplementation((args: InstallmentCreateArgs) => {
      installmentCounter += 1;
      return Promise.resolve({
        id: installmentCounter === 1 ? 'installment-1' : 'installment-2',
        ...args.data,
      });
    });
    installmentFindFirst.mockImplementation(
      ({ where }: { where: { userId?: string } }) => {
        if (where.userId === 'user-1') {
          return Promise.resolve({
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
          });
        }
        return Promise.resolve(null);
      },
    );
    installmentDeleteMany.mockResolvedValue({ count: 1 });
    installmentUpdate.mockResolvedValue({ id: 'installment-1' });
    transactionCreateMany.mockImplementation(
      (args: TransactionCreateManyArgs) => {
        createdTransactionRows.push(args.data);
        return Promise.resolve({ count: 3 });
      },
    );
    transactionUpdateMany.mockResolvedValue({ count: 3 });
    transactionCount.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );

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
    const dto: CreateInstallmentDto = {
      description: 'Notebook',
      totalAmount: 900,
      installmentCount: 3,
      dueDay: 10,
      accountId: 'account-1',
      categoryId: 'category-1',
    };

    await service.createInstallment('card-1', dto, 'user-1');
    await service.createInstallment('card-1', dto, 'user-1');

    expect(transactionCreateMany).toHaveBeenCalledTimes(2);

    const firstRows = createdTransactionRows[0];
    const secondRows = createdTransactionRows[1];

    expect(
      firstRows.every((row) => row.installmentId === 'installment-1'),
    ).toBe(true);
    expect(
      secondRows.every((row) => row.installmentId === 'installment-2'),
    ).toBe(true);
  });

  it('refuses deletion when legacy transactions remain ambiguous', async () => {
    transactionCount.mockResolvedValueOnce(1);

    await expect(
      service.deleteInstallment('installment-1', 'user-1'),
    ).rejects.toThrow(ConflictException);
    expect(installmentDeleteMany).not.toHaveBeenCalled();
  });

  it('deletes only the targeted installment group and blocks cross-user access', async () => {
    await service.deleteInstallment('installment-1', 'user-1');

    const calls = transactionUpdateMany.mock.calls as unknown as unknown[][];
    const updateCall = calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(updateCall.where).toEqual({
      userId: 'user-1',
      installmentId: 'installment-1',
      invoiceId: null,
      deletedAt: null,
    });
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
    expect(installmentDeleteMany).toHaveBeenCalledWith({
      where: { id: 'installment-1', userId: 'user-1' },
    });

    await expect(
      service.deleteInstallment('installment-1', 'user-2'),
    ).rejects.toThrow(NotFoundException);
    expect(transactionUpdateMany).toHaveBeenCalledTimes(1);
  });
});
