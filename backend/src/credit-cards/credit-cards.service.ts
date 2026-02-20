import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditCardsService {
  constructor(private prisma: PrismaService) { }

  async create(createCreditCardDto: CreateCreditCardDto, userId: string) {
    return this.prisma.creditCard.create({
      data: {
        ...createCreditCardDto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.creditCard.findMany({
      where: { userId },
      include: { account: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const creditCard = await this.prisma.creditCard.findFirst({
      where: { id, userId },
      include: { account: true }
    });
    if (!creditCard) throw new NotFoundException('Cartão de crédito não encontrado');
    return creditCard;
  }

  async update(id: string, updateCreditCardDto: UpdateCreditCardDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.creditCard.update({
      where: { id },
      data: updateCreditCardDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.creditCard.delete({
      where: { id },
    });
  }
}
