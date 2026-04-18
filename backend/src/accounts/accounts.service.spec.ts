import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: {
    account: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    category: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    transaction: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const userId = 'user-1';
  const accountId = 'account-1';

  const mockAccount = {
    id: accountId,
    userId,
    name: 'Nubank',
    type: 'CHECKING',
    balance: 0,
    color: null,
    initialBalance: 0,
    createdAt: new Date('2025-01-01'),
  };

  const mockCategory = {
    id: 'cat-1',
    userId,
    name: 'Saldo Inicial',
    type: 'INCOME',
    icon: '💰',
  };

  beforeEach(async () => {
    // Build a fresh tx mock for each test so $transaction callback
    // receives a clean interactive-transaction client.
    const txMock = {
      account: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      category: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    prisma = {
      account: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(txMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  // ---------------------------------------------------------------
  // create
  // ---------------------------------------------------------------
  describe('create', () => {
    it('should create an account with zero balance and skip transaction/category', async () => {
      const dto = { name: 'Nubank', type: 'CHECKING', balance: 0 };

      // $transaction callback will use tx.account.create
      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          account: {
            create: jest.fn().mockResolvedValue({ ...mockAccount, balance: 0 }),
            update: jest.fn(),
          },
          category: { findFirst: jest.fn(), create: jest.fn() },
          transaction: { create: jest.fn() },
        };
        return cb(tx);
      });

      const result = await service.create(dto, userId);

      expect(result.balance).toBe(0);
      // The tx.account.create should have been called once (account creation)
      // but tx.category and tx.transaction should NOT have been called
    });

    it('should create account and set initial positive balance with INCOME transaction', async () => {
      const dto = { name: 'Nubank', type: 'CHECKING', balance: 500 };

      const createdAccount = { ...mockAccount, balance: 0 };

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          account: {
            create: jest.fn().mockResolvedValue(createdAccount),
            update: jest.fn().mockResolvedValue({ ...createdAccount, balance: 500 }),
          },
          category: {
            findFirst: jest.fn().mockResolvedValue(null), // category doesn't exist yet
            create: jest.fn().mockResolvedValue(mockCategory),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
          },
        };
        const result = await cb(tx);

        // Verify category was looked up and created
        expect(tx.category.findFirst).toHaveBeenCalledWith({
          where: { userId, name: 'Saldo Inicial', deletedAt: null },
        });
        expect(tx.category.create).toHaveBeenCalledWith({
          data: {
            name: 'Saldo Inicial',
            userId,
            type: 'INCOME',
            icon: '💰',
          },
        });

        // Verify transaction was created
        expect(tx.transaction.create).toHaveBeenCalledWith({
          data: {
            userId,
            accountId: createdAccount.id,
            categoryId: mockCategory.id,
            description: 'Saldo Inicial',
            amount: 500,
            type: 'INCOME',
            date: expect.any(Date),
            classificationRule: 20,
          },
        });

        // Verify balance increment
        expect(tx.account.update).toHaveBeenCalledWith({
          where: { id: createdAccount.id },
          data: { balance: { increment: 500 } },
        });

        return result;
      });

      await service.create(dto, userId);
    });

    it('should create account and set initial negative balance with EXPENSE transaction', async () => {
      const dto = { name: 'Cartão', type: 'CREDIT', balance: -200 };

      const createdAccount = { ...mockAccount, balance: 0 };

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          account: {
            create: jest.fn().mockResolvedValue(createdAccount),
            update: jest.fn().mockResolvedValue({ ...createdAccount, balance: -200 }),
          },
          category: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ ...mockCategory, type: 'EXPENSE' }),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-2' }),
          },
        };
        const result = await cb(tx);

        // Verify category type is EXPENSE for negative balance
        expect(tx.category.create).toHaveBeenCalledWith({
          data: {
            name: 'Saldo Inicial',
            userId,
            type: 'EXPENSE',
            icon: '💰',
          },
        });

        // Verify transaction type
        expect(tx.transaction.create).toHaveBeenCalledWith({
          data: {
            userId,
            accountId: createdAccount.id,
            categoryId: expect.any(String),
            description: 'Saldo Inicial',
            amount: 200, // Math.abs(-200)
            type: 'EXPENSE',
            date: expect.any(Date),
            classificationRule: 20,
          },
        });

        // Verify balance decrement (increment with negative value)
        expect(tx.account.update).toHaveBeenCalledWith({
          where: { id: createdAccount.id },
          data: { balance: { increment: -200 } },
        });

        return result;
      });

      await service.create(dto, userId);
    });

    it('should reuse existing Saldo Inicial category if found', async () => {
      const dto = { name: 'Nubank', type: 'CHECKING', balance: 1000 };

      const createdAccount = { ...mockAccount, balance: 0 };

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          account: {
            create: jest.fn().mockResolvedValue(createdAccount),
            update: jest.fn().mockResolvedValue({ ...createdAccount, balance: 1000 }),
          },
          category: {
            findFirst: jest.fn().mockResolvedValue(mockCategory), // category already exists
            create: jest.fn(),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-3' }),
          },
        };
        const result = await cb(tx);

        // Category found, so create should NOT be called
        expect(tx.category.create).not.toHaveBeenCalled();
        // Transaction should use existing category id
        expect(tx.transaction.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ categoryId: mockCategory.id }),
        });

        return result;
      });

      await service.create(dto, userId);
    });

    it('should pass userId to account creation', async () => {
      const dto = { name: 'Nubank', type: 'CHECKING' };

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          account: {
            create: jest.fn().mockResolvedValue(mockAccount),
            update: jest.fn(),
          },
          category: { findFirst: jest.fn(), create: jest.fn() },
          transaction: { create: jest.fn() },
        };
        const result = await cb(tx);

        expect(tx.account.create).toHaveBeenCalledWith({
          data: { ...dto, userId },
        });

        return result;
      });

      await service.create(dto, userId);
    });
  });

  // ---------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------
  describe('findAll', () => {
    it('should return all accounts for the given userId', async () => {
      const accounts = [
        { ...mockAccount, id: 'a1' },
        { ...mockAccount, id: 'a2' },
      ];
      prisma.account.findMany.mockResolvedValue(accounts);

      const result = await service.findAll(userId);

      expect(result).toEqual(accounts);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no accounts', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });

    it('should scope query to the provided userId only', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      await service.findAll('other-user');

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'other-user', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ---------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------
  describe('findOne', () => {
    it('should return an account when found', async () => {
      prisma.account.findFirst.mockResolvedValue(mockAccount);

      const result = await service.findOne(accountId, userId);

      expect(result).toEqual(mockAccount);
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: accountId, userId, deletedAt: null },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(service.findOne(accountId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(accountId, userId)).rejects.toThrow(
        'Conta não encontrada',
      );
    });

    it('should scope lookup to userId so users cannot access others accounts', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(accountId, 'different-user'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: accountId, userId: 'different-user', deletedAt: null },
      });
    });
  });

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  describe('update', () => {
    const updateDto = { name: 'Nubank Updated', type: 'SAVINGS' };

    it('should update an account after verifying ownership', async () => {
      prisma.account.findFirst.mockResolvedValue(mockAccount);
      prisma.account.updateMany.mockResolvedValue({ count: 1 });
      prisma.account.findUnique = jest.fn().mockResolvedValue({ ...mockAccount, ...updateDto });

      const result = await service.update(accountId, updateDto, userId);

      expect(result.name).toBe('Nubank Updated');
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: accountId, userId, deletedAt: null },
      });
      expect(prisma.account.updateMany).toHaveBeenCalledWith({
        where: { id: accountId, userId, deletedAt: null },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.update(accountId, updateDto, userId),
      ).rejects.toThrow(NotFoundException);

      // updateMany should NOT have been called
      expect(prisma.account.updateMany).not.toHaveBeenCalled();
    });

    it('should not allow updating an account belonging to another user', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.update(accountId, updateDto, 'other-user'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.account.updateMany).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------
  describe('remove', () => {
    it('should soft-delete an account and its transactions after verifying ownership', async () => {
      prisma.account.findFirst.mockResolvedValue(mockAccount);

      const result = await service.remove(accountId, userId);

      expect(result).toEqual({ deleted: true });
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: accountId, userId, deletedAt: null },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(service.remove(accountId, userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.account.updateMany).not.toHaveBeenCalled();
    });

    it('should not allow deleting an account belonging to another user', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(accountId, 'other-user'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.account.updateMany).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // Balance increment / decrement on transactions
  // ---------------------------------------------------------------
  describe('balance increment/decrement on transactions', () => {
    it('should increment balance when initial balance is positive', async () => {
      const dto = { name: 'Bank', type: 'CHECKING', balance: 250 };

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          account: {
            create: jest.fn().mockResolvedValue({ ...mockAccount, balance: 0 }),
            update: jest.fn().mockResolvedValue({ ...mockAccount, balance: 250 }),
          },
          category: {
            findFirst: jest.fn().mockResolvedValue(mockCategory),
            create: jest.fn(),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
          },
        };
        await cb(tx);

        expect(tx.account.update).toHaveBeenCalledWith({
          where: { id: expect.any(String) },
          data: { balance: { increment: 250 } },
        });
      });

      await service.create(dto, userId);
    });

    it('should decrement balance (negative increment) when initial balance is negative', async () => {
      const dto = { name: 'Credit', type: 'CREDIT', balance: -100 };

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          account: {
            create: jest.fn().mockResolvedValue({ ...mockAccount, balance: 0 }),
            update: jest.fn().mockResolvedValue({ ...mockAccount, balance: -100 }),
          },
          category: {
            findFirst: jest.fn().mockResolvedValue({ ...mockCategory, type: 'EXPENSE' }),
            create: jest.fn(),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-2' }),
          },
        };
        await cb(tx);

        expect(tx.account.update).toHaveBeenCalledWith({
          where: { id: expect.any(String) },
          data: { balance: { increment: -100 } },
        });
      });

      await service.create(dto, userId);
    });

    it('should not update balance when initial balance is zero', async () => {
      const dto = { name: 'Bank', type: 'CHECKING', balance: 0 };

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          account: {
            create: jest.fn().mockResolvedValue({ ...mockAccount, balance: 0 }),
            update: jest.fn(),
          },
          category: { findFirst: jest.fn(), create: jest.fn() },
          transaction: { create: jest.fn() },
        };
        await cb(tx);

        // No balance update should happen when balance is 0
        expect(tx.account.update).not.toHaveBeenCalled();
        expect(tx.transaction.create).not.toHaveBeenCalled();
      });

      await service.create(dto, userId);
    });

    it('should not update balance when balance field is undefined', async () => {
      const dto = { name: 'Bank', type: 'CHECKING' }; // no balance field

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          account: {
            create: jest.fn().mockResolvedValue({ ...mockAccount, balance: 0 }),
            update: jest.fn(),
          },
          category: { findFirst: jest.fn(), create: jest.fn() },
          transaction: { create: jest.fn() },
        };
        await cb(tx);

        expect(tx.account.update).not.toHaveBeenCalled();
        expect(tx.transaction.create).not.toHaveBeenCalled();
      });

      await service.create(dto, userId);
    });
  });
});