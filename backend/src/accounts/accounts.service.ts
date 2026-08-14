/**
 * Service do domínio de contas bancárias; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EncryptionService } from '../common/services/encryption.service';
import {
  encryptAmount,
  decryptAmount,
  atomicBalanceUpdate,
} from '../common/services/balance-helper';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private encryption: EncryptionService,
  ) {}

  async create(createAccountDto: CreateAccountDto, userId: string) {
    // V15: Atomic limit check + create to prevent race conditions
    return this.subscriptionService.createWithLimitCheck(
      userId,
      'account',
      async () => {
        return this.prisma.$transaction(async (tx) => {
          // 1. Create the account — balance starts at 0; the atomicBalanceUpdate below applies the initial balance.
          // Using ...createAccountDto would set balance twice (once from DTO, once from update).
          const accountData = { ...createAccountDto, balance: undefined };
          const account = await tx.account.create({
            data: {
              ...accountData,
              balance: encryptAmount(0, this.encryption),
              userId,
            },
          });

          // 2. If initial balance is not zero, create a matching transaction record
          const initialBalance = Number(createAccountDto.balance) || 0;
          if (initialBalance !== 0) {
            // Find or create 'Saldo Inicial' category
            let category = await tx.category.findFirst({
              where: { userId, name: 'Saldo Inicial', deletedAt: null },
            });

            if (!category) {
              category = await tx.category.create({
                data: {
                  name: 'Saldo Inicial',
                  userId,
                  type: initialBalance > 0 ? 'INCOME' : 'EXPENSE',
                  icon: '💰',
                },
              });
            }

            await tx.transaction.create({
              data: {
                userId,
                accountId: account.id,
                categoryId: category.id,
                description: 'Saldo Inicial',
                amount: encryptAmount(
                  Math.abs(initialBalance),
                  this.encryption,
                ),
                type: initialBalance > 0 ? 'INCOME' : 'EXPENSE',
                date: new Date(), // Current date as starting point
                classificationRule: 20, // Objectives/Savings by default
              },
            });

            // 3. Update account balance with the initial balance
            await atomicBalanceUpdate(
              tx,
              account.id,
              userId,
              initialBalance,
              this.encryption,
            );
          }

          return account;
        });
      },
    );
  }

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');
    return account;
  }

  async update(id: string, updateAccountDto: UpdateAccountDto, userId: string) {
    await this.subscriptionService.checkNotExceeding(userId, 'account', id);
    await this.findOne(id, userId);
    const { version, ...data } = updateAccountDto;
    const result = await this.prisma.account.updateMany({
      where: { id, userId, deletedAt: null, ...(version !== undefined ? { version } : {}) },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      if (version !== undefined)
        throw new ConflictException('Conta foi modificada por outro usuário');
      throw new NotFoundException('Conta não encontrada');
    }
    // IDOR fix: include userId in findFirst to prevent cross-tenant data access
    return this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async remove(id: string, userId: string) {
    await this.subscriptionService.checkNotExceeding(userId, 'account', id);
    await this.findOne(id, userId);
    return this.prisma.$transaction(async (tx) => {
      // V8: Reverse balance contributions from all active transactions BEFORE soft-deleting them
      const transactions = await tx.transaction.findMany({
        where: { accountId: id, userId, deletedAt: null },
        select: { id: true, amount: true, type: true },
      });
      let delta = 0;
      for (const t of transactions) {
        if (t.type === 'INCOME')
          delta += decryptAmount(t.amount, this.encryption);
        else if (t.type === 'EXPENSE')
          delta -= decryptAmount(t.amount, this.encryption);
        // TRANSFER handled by the other side
      }
      // Reverse the delta to bring account balance back to zero net contribution
      if (delta !== 0) {
        await atomicBalanceUpdate(tx, id, userId, -delta, this.encryption);
      }

      // Soft-delete all transactions belonging to this account
      await tx.transaction.updateMany({
        where: { accountId: id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // Unlink credit cards from this account (set accountId = null)
      await tx.creditCard.updateMany({
        where: { accountId: id, userId, deletedAt: null },
        data: { accountId: { set: null } },
      });

      // Unlink recurring transactions from this account
      await tx.recurringTransaction.updateMany({
        where: { accountId: id, userId },
        data: { accountId: null },
      });

      // Soft-delete the account
      const result = await tx.account.updateMany({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (result.count === 0)
        throw new NotFoundException('Conta não encontrada');
      return { deleted: true };
    });
  }

  /**
   * Reconcile account balance from transaction history.
   * Recalculates the correct balance by summing all active (non-soft-deleted) transactions.
   */
  async reconcile(id: string, userId: string) {
    await this.subscriptionService.checkNotExceeding(userId, 'account', id);
    // V18: Lock the account row to prevent concurrent balance changes during reconciliation
    return this.prisma.$transaction(async (tx) => {
      const accounts = await tx.$queryRaw<
        Array<{ id: string; balance: string }>
      >`
        SELECT id, balance FROM "Account" WHERE id = ${id} AND "userId" = ${userId} AND "deletedAt" IS NULL FOR UPDATE
      `;
      if (accounts.length === 0)
        throw new NotFoundException('Conta não encontrada');

      // Sum all active transactions for this account
      const transactions = await tx.transaction.findMany({
        where: { accountId: id, userId, deletedAt: null },
        select: { amount: true, type: true },
      });

      let calculatedBalance = 0;
      for (const t of transactions) {
        if (t.type === 'INCOME')
          calculatedBalance += decryptAmount(t.amount, this.encryption);
        else if (t.type === 'EXPENSE')
          calculatedBalance -= decryptAmount(t.amount, this.encryption);
      }

      const currentBalance = decryptAmount(
        accounts[0].balance,
        this.encryption,
      );
      const drift = calculatedBalance - currentBalance;

      if (drift !== 0) {
        // Set the balance directly to the calculated value
        await tx.account.update({
          where: { id },
          data: { balance: encryptAmount(calculatedBalance, this.encryption) },
        });
      }

      return {
        accountId: id,
        previousBalance: currentBalance,
        calculatedBalance,
        drift,
        fixed: drift !== 0,
        transactionCount: transactions.length,
      };
    });
  }
}
