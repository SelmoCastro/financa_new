/**
 * Service do domínio de cartões de crédito; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { CreateInstallmentDto } from './dto/create-installment.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EncryptionService } from '../common/services/encryption.service';
import {
  encryptAmount,
  decryptAmount,
} from '../common/services/balance-helper';

@Injectable()
export class CreditCardsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private encryption: EncryptionService,
  ) {}

  private async validateInstallmentFkOwnership(
    dto: { accountId?: string | null; categoryId?: string | null },
    userId: string,
  ) {
    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId, deletedAt: null },
      });
      if (!account) {
        throw new BadRequestException(
          'Conta não encontrada ou não pertence a este usuário',
        );
      }
    }
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId, deletedAt: null },
      });
      if (!category) {
        throw new BadRequestException(
          'Categoria não encontrada ou não pertence a este usuário',
        );
      }
    }
  }

  async create(createCreditCardDto: CreateCreditCardDto, userId: string) {
    // V15: Atomic limit check + create to prevent race conditions
    return this.subscriptionService.createWithLimitCheck(
      userId,
      'creditCard',
      async () => {
        // V4: Validate accountId ownership
        if (createCreditCardDto.accountId) {
          const account = await this.prisma.account.findFirst({
            where: {
              id: createCreditCardDto.accountId,
              userId,
              deletedAt: null,
            },
          });
          if (!account) {
            throw new BadRequestException(
              'Conta não encontrada ou não pertence a este usuário',
            );
          }
        }
        return this.prisma.creditCard.create({
          data: {
            name: createCreditCardDto.name,
            limit: encryptAmount(createCreditCardDto.limit, this.encryption),
            closingDay: createCreditCardDto.closingDay,
            dueDay: createCreditCardDto.dueDay,
            userId,
            ...(createCreditCardDto.accountId
              ? { accountId: createCreditCardDto.accountId }
              : {}),
          },
        });
      },
    );
  }

  async findAll(userId: string) {
    return this.prisma.creditCard.findMany({
      where: { userId, deletedAt: null },
      include: { account: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const creditCard = await this.prisma.creditCard.findFirst({
      where: { id, userId, deletedAt: null },
      include: { account: true },
    });
    if (!creditCard)
      throw new NotFoundException('Cartão de crédito não encontrado');
    return creditCard;
  }

  async update(
    id: string,
    updateCreditCardDto: UpdateCreditCardDto,
    userId: string,
  ) {
    await this.subscriptionService.checkNotExceeding(userId, 'creditCard', id);
    await this.findOne(id, userId);
    // V4: Validate accountId ownership if being changed
    if (updateCreditCardDto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: updateCreditCardDto.accountId, userId, deletedAt: null },
      });
      if (!account) {
        throw new BadRequestException(
          'Conta não encontrada ou não pertence a este usuário',
        );
      }
    }
    // Extract limit if provided and encrypt it
    const { limit, version, ...rest } = updateCreditCardDto;
    const data: Record<string, unknown> = { ...rest };
    if (limit !== undefined) {
      data.limit = encryptAmount(limit, this.encryption);
    }
    const result = await this.prisma.creditCard.updateMany({
      where: { id, userId, deletedAt: null, ...(version !== undefined ? { version } : {}) },
      data: { ...data, version: { increment: 1 } } as any,
    });
    if (result.count === 0)
      throw version !== undefined
        ? new ConflictException('Cartão foi modificado por outro usuário')
        : new NotFoundException('Cartão de crédito não encontrado');
    // IDOR fix: include userId in findFirst to prevent cross-tenant data access
    return this.prisma.creditCard.findFirst({
      where: { id, userId, deletedAt: null },
      include: { account: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.subscriptionService.checkNotExceeding(userId, 'creditCard', id);
    await this.findOne(id, userId);
    const result = await this.prisma.creditCard.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0)
      throw new NotFoundException('Cartão de crédito não encontrado');
    return { deleted: true };
  }

  // ─── Installment Methods ───

  async createInstallment(
    creditCardId: string,
    dto: CreateInstallmentDto,
    userId: string,
  ) {
    // Bloquear se cartão é excedente (read-only)
    await this.subscriptionService.checkNotExceeding(
      userId,
      'creditCard',
      creditCardId,
    );
    // Validate card belongs to user
    await this.findOne(creditCardId, userId);
    await this.validateInstallmentFkOwnership(dto, userId);

    const totalAmount = Number(dto.totalAmount);
    const installmentCount = dto.installmentCount;

    // Determine the amount for each installment
    let amounts: number[];

    if (dto.installmentValues && dto.installmentValues.length > 0) {
      // Custom amounts per installment
      if (dto.installmentValues.length !== installmentCount) {
        throw new BadRequestException(
          `installmentValues length (${dto.installmentValues.length}) must match installmentCount (${installmentCount})`,
        );
      }
      amounts = dto.installmentValues.map((iv) => Number(iv.amount));
      const sumValues =
        Math.round(amounts.reduce((a, b) => a + b, 0) * 100) / 100;
      if (Math.abs(sumValues - totalAmount) > 0.02) {
        throw new BadRequestException(
          `Sum of installment values (${sumValues}) must match totalAmount (${totalAmount})`,
        );
      }
    } else {
      // Equal split (or with entry)
      const entryAmount = dto.entryAmount ? Number(dto.entryAmount) : 0;
      let amountPerMonth: number;
      if (entryAmount > 0 && installmentCount > 1) {
        amountPerMonth =
          Math.round(
            ((totalAmount - entryAmount) / (installmentCount - 1)) * 100,
          ) / 100;
      } else {
        amountPerMonth =
          Math.round((totalAmount / installmentCount) * 100) / 100;
      }
      amounts = Array.from({ length: installmentCount }, (_, i) =>
        entryAmount > 0 && installmentCount > 1 && i === 0
          ? entryAmount
          : amountPerMonth,
      );
    }

    const amountPerMonth =
      amounts.length > 1
        ? Math.round(
            (amounts.slice(1).reduce((a, b) => a + b, 0) /
              (amounts.length - 1)) *
              100,
          ) / 100
        : amounts[0];

    const installment = await this.prisma.creditCardInstallment.create({
      data: {
        description: dto.description,
        totalAmount: encryptAmount(dto.totalAmount, this.encryption),
        installmentCount: dto.installmentCount,
        amountPerMonth: encryptAmount(amountPerMonth, this.encryption),
        entryAmount:
          dto.entryAmount != null
            ? encryptAmount(dto.entryAmount, this.encryption)
            : null,
        startDate: new Date(),
        dueDay: dto.dueDay,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        creditCardId,
        userId,
      },
      include: { category: true, account: true, creditCard: true },
    });

    // Generate transactions for each installment with individual amounts
    const startDate = new Date();
    const transactionData: any[] = [];

    for (let i = 0; i < installmentCount; i++) {
      const monthOffset = i;
      const dueDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + monthOffset,
        dto.dueDay,
      );
      // Clamp day if month has fewer days
      const expectedMonth = (startDate.getMonth() + monthOffset) % 12;
      if (dueDate.getMonth() !== expectedMonth) {
        dueDate.setDate(0); // last day of previous month (= expected month)
      }

      transactionData.push({
        description: `${dto.description}${installmentCount > 1 ? ` (${i + 1}/${installmentCount})` : ''}`,
        amount: encryptAmount(amounts[i], this.encryption),
        date: dueDate,
        type: 'EXPENSE',
        creditCardId,
        userId,
        categoryId: dto.categoryId || null,
        // CRITICAL: NUNCA definir accountId em transações de cartão de crédito.
        // O saldo da conta só é afetado quando a FATURA é paga (payInvoice).
        // Se accountId fosse setado aqui, o saldo seria debitado 2x:
        //   1) na criação da compra  2) no pagamento da fatura = double-counting.
        accountId: null,
        currentInstallment: i + 1,
        installmentCount,
        installmentId: installment.id,
      });
    }

    await this.prisma.transaction.createMany({ data: transactionData });

    // Update currentInstallment on the installment record
    await this.prisma.creditCardInstallment.update({
      where: { id: installment.id },
      data: { currentInstallment: 1 },
    });

    return installment;
  }

  async getInstallments(userId: string, creditCardId?: string) {
    const where: { userId: string; creditCardId?: string } = { userId };
    if (creditCardId) where.creditCardId = creditCardId;

    return this.prisma.creditCardInstallment.findMany({
      where,
      include: { category: true, account: true, creditCard: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneInstallment(id: string, userId: string) {
    const inst = await this.prisma.creditCardInstallment.findFirst({
      where: { id, userId },
      include: { category: true, account: true, creditCard: true },
    });
    if (!inst) throw new NotFoundException('Parcela não encontrada');
    return inst;
  }

  async updateInstallment(
    id: string,
    dto: UpdateInstallmentDto,
    userId: string,
  ) {
    const inst = await this.findOneInstallment(id, userId);
    await this.subscriptionService.checkNotExceeding(
      userId,
      'creditCard',
      inst.creditCardId,
    );
    await this.validateInstallmentFkOwnership(dto, userId);
    // Extract financial fields and encrypt them
    const { totalAmount, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (totalAmount !== undefined) {
      data.totalAmount = encryptAmount(totalAmount, this.encryption);
    }
    const result = await this.prisma.creditCardInstallment.updateMany({
      where: { id, userId },
      data: data as any,
    });
    if (result.count === 0)
      throw new NotFoundException('Parcela não encontrada');
    // IDOR fix: include userId in findFirst to prevent cross-tenant data access
    return this.prisma.creditCardInstallment.findFirst({
      where: { id, userId },
      include: { category: true, account: true, creditCard: true },
    });
  }

  async deleteInstallment(id: string, userId: string) {
    const inst = await this.findOneInstallment(id, userId);
    await this.subscriptionService.checkNotExceeding(
      userId,
      'creditCard',
      inst.creditCardId,
    );

    const deletedTransactions = await this.prisma.transaction.deleteMany({
      where: {
        userId,
        installmentId: inst.id,
        invoiceId: null, // Apenas transações não faturadas
      },
    });

    if (deletedTransactions.count === 0) {
      const ambiguousLegacyTransactions = await this.prisma.transaction.count({
        where: {
          userId,
          creditCardId: inst.creditCardId,
          description: { startsWith: inst.description },
          installmentCount: inst.installmentCount,
          installmentId: null,
          invoiceId: null,
        },
      });
      if (ambiguousLegacyTransactions > 0) {
        throw new ConflictException(
          'Este parcelamento legado possui transações sem vínculo seguro e não pode ser excluído automaticamente.',
        );
      }
    }

    const result = await this.prisma.creditCardInstallment.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0)
      throw new NotFoundException('Parcela não encontrada');
    return { deleted: true };
  }

  /**
   * Controller-facing method: fetches installment, decrypts financial fields,
   * and returns the schedule with numeric amounts.
   */
  async getInstallmentScheduleForUser(id: string, userId: string) {
    const inst = await this.findOneInstallment(id, userId);
    return this.getInstallmentSchedule({
      ...inst,
      totalAmount: inst.totalAmount,
      amountPerMonth: inst.amountPerMonth,
      entryAmount: inst.entryAmount,
      startDate: inst.startDate,
      dueDay: inst.dueDay,
      installmentCount: inst.installmentCount,
    });
  }

  /**
   * Returns the payment schedule for an installment:
   * list of { month, year, dueDate, amount } for each installment
   */
  getInstallmentSchedule(inst: {
    installmentCount: number;
    totalAmount: string; // Now a string (encrypted or plaintext)
    amountPerMonth: string; // Now a string (encrypted or plaintext)
    entryAmount: string | null; // Now a string | null (encrypted or plaintext)
    startDate: Date;
    dueDay: number;
  }) {
    const entryAmount = inst.entryAmount
      ? decryptAmount(inst.entryAmount, this.encryption)
      : 0;
    const schedule: {
      installmentNumber: number;
      month: number;
      year: number;
      dueDate: string;
      amount: number;
    }[] = [];
    const start = new Date(inst.startDate);

    for (let i = 1; i <= inst.installmentCount; i++) {
      // Calculate month offset: 1st installment starts at startDate month
      const monthOffset = i - 1;
      const dueDate = new Date(
        start.getFullYear(),
        start.getMonth() + monthOffset,
        inst.dueDay,
      );
      // Clamp day if month has fewer days (e.g. dueDay=31 in Feb → Feb 28)
      // JS Date already handles this by rolling over, but we want the last day instead
      const expectedMonth = (start.getMonth() + monthOffset) % 12;
      if (dueDate.getMonth() !== expectedMonth) {
        // Rolled over — use last day of the expected month
        dueDate.setDate(0); // goes to last day of previous month (which is the expected month)
      }

      const amount =
        entryAmount > 0 && i === 1
          ? entryAmount
          : decryptAmount(inst.amountPerMonth, this.encryption);

      schedule.push({
        installmentNumber: i,
        month: dueDate.getMonth() + 1,
        year: dueDate.getFullYear(),
        dueDate: dueDate.toISOString().split('T')[0],
        amount,
      });
    }
    return schedule;
  }
}
