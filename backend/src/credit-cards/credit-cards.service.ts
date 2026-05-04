import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { CreateInstallmentDto } from './dto/create-installment.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService, PLAN_LIMITS } from '../subscription/subscription.service';

@Injectable()
export class CreditCardsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async create(createCreditCardDto: CreateCreditCardDto, userId: string) {
    // V15: Check credit card limit based on plan
    const plan = await this.subscriptionService.getPlan(userId);
    const limits = PLAN_LIMITS[plan];
    const currentCount = await this.prisma.creditCard.count({
      where: { userId, deletedAt: null },
    });
    if (limits.maxCreditCards !== -1 && currentCount >= limits.maxCreditCards) {
      throw new ForbiddenException(
        `Limite de ${limits.maxCreditCards} cartões atingido. Faça upgrade para Premium para cartões ilimitados.`,
      );
    }

    // V4: Validate accountId ownership
    if (createCreditCardDto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: createCreditCardDto.accountId, userId, deletedAt: null },
      });
      if (!account) {
        throw new BadRequestException('Conta não encontrada ou não pertence a este usuário');
      }
    }
    return this.prisma.creditCard.create({
      data: {
        ...createCreditCardDto,
        userId,
      },
    });
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
    await this.findOne(id, userId);
    // V4: Validate accountId ownership if being changed
    if (updateCreditCardDto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: updateCreditCardDto.accountId, userId, deletedAt: null },
      });
      if (!account) {
        throw new BadRequestException('Conta não encontrada ou não pertence a este usuário');
      }
    }
    const result = await this.prisma.creditCard.updateMany({
      where: { id, userId, deletedAt: null },
      data: updateCreditCardDto,
    });
    if (result.count === 0) throw new NotFoundException('Cartão de crédito não encontrado');
    return this.prisma.creditCard.findUnique({ where: { id } });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    const result = await this.prisma.creditCard.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Cartão de crédito não encontrado');
    return { deleted: true };
  }

  // ─── Installment Methods ───

  async createInstallment(creditCardId: string, dto: CreateInstallmentDto, userId: string) {
    // Validate card belongs to user
    await this.findOne(creditCardId, userId);

    const entryAmount = dto.entryAmount ? Number(dto.entryAmount) : 0;
    const totalAmount = Number(dto.totalAmount);
    const installmentCount = dto.installmentCount;

    // Calculate amount per month considering entry
    // Entry (1st installment) = entryAmount (or equal share if no entry specified)
    // Remaining installments = (totalAmount - entryAmount) / (installmentCount - 1)
    let amountPerMonth: number;
    if (entryAmount > 0 && installmentCount > 1) {
      amountPerMonth = Math.round(((totalAmount - entryAmount) / (installmentCount - 1)) * 100) / 100;
    } else {
      amountPerMonth = Math.round((totalAmount / installmentCount) * 100) / 100;
    }

    return this.prisma.creditCardInstallment.create({
      data: {
        description: dto.description,
        totalAmount: dto.totalAmount,
        installmentCount: dto.installmentCount,
        amountPerMonth,
        entryAmount: dto.entryAmount ?? null,
        startDate: new Date(),
        dueDay: dto.dueDay,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        creditCardId,
        userId,
      },
      include: { category: true, account: true, creditCard: true },
    });
  }

  async getInstallments(userId: string, creditCardId?: string) {
    const where: any = { userId };
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

  async updateInstallment(id: string, dto: UpdateInstallmentDto, userId: string) {
    await this.findOneInstallment(id, userId);
    return this.prisma.creditCardInstallment.update({
      where: { id },
      data: dto,
      include: { category: true, account: true, creditCard: true },
    });
  }

  async deleteInstallment(id: string, userId: string) {
    await this.findOneInstallment(id, userId);
    await this.prisma.creditCardInstallment.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Returns the payment schedule for an installment:
   * list of { month, year, dueDate, amount } for each installment
   */
  getInstallmentSchedule(inst: {
    installmentCount: number;
    totalAmount: number;
    amountPerMonth: number;
    entryAmount: number | null;
    startDate: Date;
    dueDay: number;
  }) {
    const entryAmount = inst.entryAmount ? Number(inst.entryAmount) : 0;
    const schedule: { installmentNumber: number; month: number; year: number; dueDate: string; amount: number }[] = [];
    const start = new Date(inst.startDate);

    for (let i = 1; i <= inst.installmentCount; i++) {
      // Calculate month offset: 1st installment starts at startDate month
      const monthOffset = i - 1;
      const dueDate = new Date(start.getFullYear(), start.getMonth() + monthOffset, inst.dueDay);
      // Clamp day if month has fewer days (e.g. dueDay=31 in Feb → Feb 28)
      // JS Date already handles this by rolling over, but we want the last day instead
      const expectedMonth = (start.getMonth() + monthOffset) % 12;
      if (dueDate.getMonth() !== expectedMonth) {
        // Rolled over — use last day of the expected month
        dueDate.setDate(0); // goes to last day of previous month (which is the expected month)
      }

      const amount = (entryAmount > 0 && i === 1) ? entryAmount : Number(inst.amountPerMonth);

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