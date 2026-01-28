
import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) { }

  create(createTransactionDto: CreateTransactionDto, userId: string) {
    return this.prisma.transaction.create({
      data: {
        ...createTransactionDto,
        amount: Number(createTransactionDto.amount), // Ensure number
        date: new Date(createTransactionDto.date),   // Ensure Date object
        userId,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async export(userId: string): Promise<string> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    // CSV Header
    const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria'];
    const rows = transactions.map(t => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const amount = t.amount.toString().replace('.', ','); // Excel PT-BR uses comma for decimals
      const type = t.type === 'INCOME' ? 'Receita' : 'Despesa';
      return [date, `"${t.description}"`, amount, type, `"${t.category}"`].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
  }

  findOne(id: string, userId: string) {
    return this.prisma.transaction.findFirst({
      where: { id, userId },
    });
  }

  update(id: string, updateTransactionDto: UpdateTransactionDto, userId: string) {
    return this.prisma.transaction.updateMany({
      where: { id, userId }, // basic security check
      data: {
        ...updateTransactionDto,
        amount: updateTransactionDto.amount ? Number(updateTransactionDto.amount) : undefined,
        date: updateTransactionDto.date ? new Date(updateTransactionDto.date) : undefined,
      },
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.transaction.deleteMany({
      where: { id, userId },
    });
  }
}
