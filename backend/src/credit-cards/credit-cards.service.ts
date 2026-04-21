import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
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
}
