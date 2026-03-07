import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) { }

  async create(createAccountDto: CreateAccountDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the account
      const account = await tx.account.create({
        data: {
          ...createAccountDto,
          userId,
        },
      });

      // 2. If initial balance is not zero, create a matching transaction record
      if (createAccountDto.balance !== 0) {
        // Find or create 'Saldo Inicial' category
        let category = await tx.category.findFirst({
          where: { userId, name: 'Saldo Inicial' },
        });

        if (!category) {
          category = await tx.category.create({
            data: {
              name: 'Saldo Inicial',
              userId,
              type: createAccountDto.balance > 0 ? 'INCOME' : 'EXPENSE',
              icon: '💰',
              rule: 20, // Objectives/Savings by default
            },
          });
        }

        await tx.transaction.create({
          data: {
            userId,
            accountId: account.id,
            categoryId: category.id,
            description: 'Saldo Inicial',
            amount: Math.abs(createAccountDto.balance),
            type: createAccountDto.balance > 0 ? 'INCOME' : 'EXPENSE',
            date: new Date(), // Current date as starting point
          },
        });
      }

      return account;
    });
  }

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');
    return account;
  }

  async update(id: string, updateAccountDto: UpdateAccountDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.account.update({
      where: { id },
      data: updateAccountDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.account.delete({
      where: { id },
    });
  }
}
