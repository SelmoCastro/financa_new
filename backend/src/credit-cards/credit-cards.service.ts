import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditCardsService {
  constructor(private prisma: PrismaService) {}

  async create(createCreditCardDto: CreateCreditCardDto, userId: string) {
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
