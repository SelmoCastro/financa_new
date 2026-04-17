jest.mock('../prisma/prisma.service');

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
    },
    budget: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
    },
  };

  const userId = 'user-123';
  const categoryId = 'cat-456';
  const budgetId = 'budget-789';

  const mockCategory = {
    id: categoryId,
    userId,
    name: 'Alimentação',
    icon: 'food',
    color: '#FF0000',
  };

  const mockBudget = {
    id: budgetId,
    userId,
    categoryId,
    amount: 1500,
    spent: 0,
    period: '2026-04',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    categoryObj: mockCategory,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Wire mock functions onto the prisma instance so service calls hit mocks
    prisma.category = mockPrismaService.category as any;
    prisma.budget = mockPrismaService.budget as any;
    prisma.transaction = mockPrismaService.transaction as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /* ── CREATE ─────────────────────────────────────────────────────── */

  describe('create', () => {
    const createBudgetDto = { categoryId, amount: 1500 };

    it('should create a new budget when category exists and belongs to user', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.budget.upsert.mockResolvedValue(mockBudget);

      const result = await service.create(createBudgetDto, userId);

      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
      expect(mockPrismaService.budget.upsert).toHaveBeenCalledWith({
        where: {
          userId_categoryId: { userId, categoryId },
        },
        update: { amount: 1500 },
        create: {
          userId,
          categoryId,
          amount: 1500,
        },
      });
      expect(result).toEqual(mockBudget);
    });

    it('should throw BadRequestException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create(createBudgetDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createBudgetDto, userId)).rejects.toThrow(
        'Category not found',
      );

      expect(mockPrismaService.budget.upsert).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when category belongs to another user', async () => {
      const otherUserCategory = { ...mockCategory, userId: 'other-user-999' };
      mockPrismaService.category.findUnique.mockResolvedValue(otherUserCategory);

      await expect(service.create(createBudgetDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createBudgetDto, userId)).rejects.toThrow(
        'Category not found',
      );

      expect(mockPrismaService.budget.upsert).not.toHaveBeenCalled();
    });

    it('should convert amount string to number on create', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.budget.upsert.mockResolvedValue(mockBudget);

      const dtoWithStringAmount = { categoryId, amount: '2000' as any };

      await service.create(dtoWithStringAmount, userId);

      expect(mockPrismaService.budget.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { amount: 2000 },
          create: expect.objectContaining({ amount: 2000 }),
        }),
      );
    });
  });

  /* ── FIND ALL ───────────────────────────────────────────────────── */

  describe('findAll', () => {
    it('should return budgets with spent and percentage for user', async () => {
      const budgets = [
        { ...mockBudget, amount: 1000 },
        { ...mockBudget, id: 'budget-2', categoryId: 'cat-2', amount: 500 },
      ];

      mockPrismaService.budget.findMany.mockResolvedValue(budgets);
      mockPrismaService.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 400 } }) // first budget
        .mockResolvedValueOnce({ _sum: { amount: 100 } }); // second budget

      const result = await service.findAll(userId);

      expect(mockPrismaService.budget.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { amount: 'desc' },
        include: { categoryObj: true },
      });

      expect(result).toHaveLength(2);
      expect(result[0].spent).toBe(400);
      expect(result[0].percentage).toBe(40); // 400/1000 * 100
      expect(result[0].isOverBudget).toBe(false);
      expect(result[1].spent).toBe(100);
      expect(result[1].percentage).toBe(20); // 100/500 * 100
      expect(result[1].isOverBudget).toBe(false);
    });

    it('should cap percentage at 100 and flag over-budget', async () => {
      const budgets = [{ ...mockBudget, amount: 500 }];

      mockPrismaService.budget.findMany.mockResolvedValue(budgets);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 800 },
      });

      const result = await service.findAll(userId);

      expect(result[0].spent).toBe(800);
      expect(result[0].percentage).toBe(100); // capped at 100
      expect(result[0].isOverBudget).toBe(true); // 800 > 500
    });

    it('should use provided year and month for expense calculation', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      await service.findAll(userId, 2025, 11); // December 2025

      expect(mockPrismaService.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date(Date.UTC(2025, 11, 1)),
              lte: new Date(Date.UTC(2025, 12, 0, 23, 59, 59, 999)),
            },
          }),
        }),
      );
    });

    it('should default to current year and month when not provided', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      const now = new Date();
      const expectedYear = now.getFullYear();
      const expectedMonth = now.getMonth();

      await service.findAll(userId);

      expect(mockPrismaService.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date(Date.UTC(expectedYear, expectedMonth, 1)),
              lte: new Date(
                Date.UTC(expectedYear, expectedMonth + 1, 0, 23, 59, 59, 999),
              ),
            },
          }),
        }),
      );
    });

    it('should handle null aggregate sum as 0', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.findAll(userId);

      expect(result[0].spent).toBe(0);
      expect(result[0].percentage).toBe(0);
      expect(result[0].isOverBudget).toBe(false);
    });

    it('should filter expenses by userId and EXPENSE type', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 200 },
      });

      await service.findAll(userId);

      expect(mockPrismaService.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            type: 'EXPENSE',
            categoryId: mockBudget.categoryId,
          }),
        }),
      );
    });
  });

  /* ── UPDATE ──────────────────────────────────────────────────────── */

  describe('update', () => {
    it('should update a budget and return the updated record', async () => {
      const updateBudgetDto = { amount: 2000 };
      const updatedBudget = { ...mockBudget, amount: 2000 };

      mockPrismaService.budget.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.budget.findFirst.mockResolvedValue(updatedBudget);

      const result = await service.update(budgetId, updateBudgetDto, userId);

      expect(mockPrismaService.budget.updateMany).toHaveBeenCalledWith({
        where: { id: budgetId, userId },
        data: { amount: 2000 },
      });
      expect(mockPrismaService.budget.findFirst).toHaveBeenCalledWith({
        where: { id: budgetId, userId },
        include: { categoryObj: true },
      });
      expect(result).toEqual(updatedBudget);
    });

    it('should verify new categoryId belongs to user when updating categoryId', async () => {
      const newCategoryId = 'cat-new-999';
      const updateBudgetDto = { categoryId: newCategoryId };

      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        id: newCategoryId,
      });
      mockPrismaService.budget.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.budget.findFirst.mockResolvedValue(mockBudget);

      const result = await service.update(budgetId, updateBudgetDto, userId);

      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: newCategoryId },
      });
      expect(result).toEqual(mockBudget);
    });

    it('should throw BadRequestException when updating to invalid categoryId', async () => {
      const updateBudgetDto = { categoryId: 'non-existent-cat' };

      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update(budgetId, updateBudgetDto, userId),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.budget.updateMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when updating to categoryId belonging to another user', async () => {
      const updateBudgetDto = { categoryId: 'cat-other-user' };

      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        id: 'cat-other-user',
        userId: 'different-user',
      });

      await expect(
        service.update(budgetId, updateBudgetDto, userId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(budgetId, updateBudgetDto, userId),
      ).rejects.toThrow('Category not found');

      expect(mockPrismaService.budget.updateMany).not.toHaveBeenCalled();
    });

    it('should convert amount to number on update', async () => {
      const updateBudgetDto = { amount: '3000' as any };

      mockPrismaService.budget.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.budget.findFirst.mockResolvedValue(mockBudget);

      await service.update(budgetId, updateBudgetDto, userId);

      expect(mockPrismaService.budget.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 3000 }),
        }),
      );
    });

    it('should not check category when only amount is updated', async () => {
      const updateBudgetDto = { amount: 2500 };

      mockPrismaService.budget.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.budget.findFirst.mockResolvedValue(mockBudget);

      await service.update(budgetId, updateBudgetDto, userId);

      expect(mockPrismaService.category.findUnique).not.toHaveBeenCalled();
    });
  });

  /* ── REMOVE ─────────────────────────────────────────────────────── */

  describe('remove', () => {
    it('should delete a budget scoped by userId', async () => {
      const deleteResult = { count: 1 };
      mockPrismaService.budget.deleteMany.mockResolvedValue(deleteResult);

      const result = await service.remove(budgetId, userId);

      expect(mockPrismaService.budget.deleteMany).toHaveBeenCalledWith({
        where: { id: budgetId, userId },
      });
      expect(result).toEqual(deleteResult);
    });

    it('should return count 0 when no budget matches id+userId', async () => {
      const deleteResult = { count: 0 };
      mockPrismaService.budget.deleteMany.mockResolvedValue(deleteResult);

      const result = await service.remove('non-existent-id', userId);

      expect(result).toEqual({ count: 0 });
    });
  });
});