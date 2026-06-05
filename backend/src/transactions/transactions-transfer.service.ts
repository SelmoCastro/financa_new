import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TransferTransactionDto } from './dto/transfer-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EncryptionService } from '../common/services/encryption.service';
import {
  encryptAmount,
  decryptAmount,
  atomicBalanceUpdate,
} from '../common/services/balance-helper';
import * as crypto from 'crypto';

type AccountRow = {
  id: string;
  userId: string;
  balance: string;
  deletedAt: Date | null;
};

@Injectable()
export class TransactionsTransferService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private encryption: EncryptionService,
  ) {}

  async transfer(transferDto: TransferTransactionDto, userId: string) {
    const amount = Number(transferDto.amount);
    const date = new Date(transferDto.date);
    if (date > new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)) {
      throw new BadRequestException(
        'Data não pode ser mais que 2 dias no futuro',
      );
    }
    const { sourceAccountId, destinationAccountId, description } = transferDto;

    return this.prisma.$transaction(async (tx) => {
      // CRITICAL: Balance check + row lock for source account before transfer
      const sourceRows = await tx.$queryRaw<
        AccountRow[]
      >`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${sourceAccountId} AND "userId" = ${userId} FOR UPDATE`;
      const sourceAccount = sourceRows[0];
      if (!sourceAccount)
        throw new NotFoundException('Conta de origem não encontrada');
      if (decryptAmount(sourceAccount.balance, this.encryption) < amount) {
        throw new BadRequestException('Saldo insuficiente para transferência');
      }

      // Lock the destination account row too
      const destRows = await tx.$queryRaw<
        AccountRow[]
      >`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${destinationAccountId} AND "userId" = ${userId} FOR UPDATE`;
      if (!destRows[0]) {
        throw new NotFoundException(
          'Conta de destino não encontrada ou não pertence ao usuário',
        );
      }

      // Ensure a "Transferência" category exists for the user
      let transferCat = await tx.category.findFirst({
        where: { userId, type: 'TRANSFER', deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });

      if (!transferCat) {
        transferCat = await tx.category.create({
          data: {
            name: 'Transferência',
            type: 'TRANSFER',
            icon: '🔄',
            color: '#6366f1',
            userId,
          },
        });
      }

      const txDescription = description || 'Transferência';
      const transferGroupId = crypto.randomUUID();

      // Create the OUT transaction (Expense)
      const outTx = await tx.transaction.create({
        data: {
          description: `${txDescription} (Saída)`,
          amount: encryptAmount(amount, this.encryption),
          date,
          type: 'EXPENSE',
          categoryId: transferCat.id,
          accountId: sourceAccountId,
          transferGroupId,
          userId,
        },
      });

      // Create the IN transaction (Income)
      const inTx = await tx.transaction.create({
        data: {
          description: `${txDescription} (Entrada)`,
          amount: encryptAmount(amount, this.encryption),
          date,
          type: 'INCOME',
          categoryId: transferCat.id,
          accountId: destinationAccountId,
          transferGroupId,
          userId,
        },
      });

      // Update balances
      await atomicBalanceUpdate(
        tx,
        sourceAccountId,
        userId,
        -amount,
        this.encryption,
      );
      await atomicBalanceUpdate(
        tx,
        destinationAccountId,
        userId,
        amount,
        this.encryption,
      );

      // Audit log
      void this.auditService.log({
        action: 'transaction.transfer',
        actorId: userId,
        targetType: 'Transaction',
        details: { sourceAccountId, destinationAccountId, amount },
      });

      return { outTx, inTx };
    });
  }
}
