import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: createUserDto,
    });

    // Criar categorias padrão para o novo usuário
    await this.prisma.category.createMany({
      data: [
        // Entradas (Rendas)
        { name: 'Salário', type: 'INCOME', color: '#10b981', icon: '💰', userId: user.id },
        { name: 'Renda Extra', type: 'INCOME', color: '#059669', icon: '📈', userId: user.id },
        { name: 'Rendimento de Investimentos', type: 'INCOME', color: '#34d399', icon: '🏦', userId: user.id },
        { name: 'Transferência Recebida', type: 'INCOME', color: '#6ee7b7', icon: '🔄', userId: user.id },
        { name: 'Empréstimo Recebido', type: 'INCOME', color: '#a7f3d0', icon: '🤝', userId: user.id },

        // Necessidades (Essencial)
        { name: 'Moradia', type: 'EXPENSE', color: '#ef4444', icon: '🏠', userId: user.id },
        { name: 'Contas Residenciais', type: 'EXPENSE', color: '#dc2626', icon: '💡', userId: user.id },
        { name: 'Mercado / Padaria', type: 'EXPENSE', color: '#f87171', icon: '🛒', userId: user.id },
        { name: 'Transporte Fixo', type: 'EXPENSE', color: '#b91c1c', icon: '🚌', userId: user.id },
        { name: 'Saúde e Farmácia', type: 'EXPENSE', color: '#fca5a5', icon: '⚕️', userId: user.id },
        { name: 'Educação', type: 'EXPENSE', color: '#991b1b', icon: '📚', userId: user.id },
        { name: 'Impostos Anuais e Seguros', type: 'EXPENSE', color: '#7f1d1d', icon: '🛡️', userId: user.id },
        { name: 'Impostos Mensais', type: 'EXPENSE', color: '#fecaca', icon: '📄', userId: user.id },

        // Desejos (Estilo de Vida)
        { name: 'Restaurante / Delivery', type: 'EXPENSE', color: '#f59e0b', icon: '🍔', userId: user.id },
        { name: 'Transporte App', type: 'EXPENSE', color: '#d97706', icon: '🚕', userId: user.id },
        { name: 'Lazer / Assinaturas', type: 'EXPENSE', color: '#fbbf24', icon: '🎬', userId: user.id },
        { name: 'Compras / Vestuário', type: 'EXPENSE', color: '#b45309', icon: '🛍️', userId: user.id },
        { name: 'Cuidados Pessoais', type: 'EXPENSE', color: '#fcd34d', icon: '💅', userId: user.id },
        { name: 'Viagens', type: 'EXPENSE', color: '#78350f', icon: '✈️', userId: user.id },

        // Objetivos (Quitação e Reserva)
        { name: 'Aplicações / Poupança', type: 'EXPENSE', color: '#3b82f6', icon: '🐷', userId: user.id },
        { name: 'Pagamento de Dívidas', type: 'EXPENSE', color: '#2563eb', icon: '💳', userId: user.id },
      ],
      skipDuplicates: true
    });

    return user;
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
