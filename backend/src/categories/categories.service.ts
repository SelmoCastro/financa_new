import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';

const STANDARD_CATEGORIES = [
  // Entradas (Rendas)
  { name: 'Salário', type: 'INCOME', color: '#10b981', icon: '💰' },
  { name: 'Renda Extra', type: 'INCOME', color: '#059669', icon: '📈' },
  { name: 'Rendimento de Investimentos', type: 'INCOME', color: '#34d399', icon: '🏦' },
  { name: 'Transferência Recebida', type: 'INCOME', color: '#6ee7b7', icon: '🔄' },
  { name: 'Empréstimo Recebido', type: 'INCOME', color: '#a7f3d0', icon: '🤝' },

  // Necessidades (Essencial)
  { name: 'Moradia', type: 'EXPENSE', color: '#ef4444', icon: '🏠' },
  { name: 'Contas Residenciais', type: 'EXPENSE', color: '#dc2626', icon: '💡' },
  { name: 'Mercado / Padaria', type: 'EXPENSE', color: '#f87171', icon: '🛒' },
  { name: 'Transporte Fixo', type: 'EXPENSE', color: '#b91c1c', icon: '🚌' },
  { name: 'Saúde e Farmácia', type: 'EXPENSE', color: '#fca5a5', icon: '⚕️' },
  { name: 'Educação', type: 'EXPENSE', color: '#991b1b', icon: '📚' },
  { name: 'Impostos Anuais e Seguros', type: 'EXPENSE', color: '#7f1d1d', icon: '🛡️' },
  { name: 'Impostos Mensais', type: 'EXPENSE', color: '#fecaca', icon: '📄' },

  // Desejos (Estilo de Vida)
  { name: 'Restaurante / Delivery', type: 'EXPENSE', color: '#f59e0b', icon: '🍔' },
  { name: 'Transporte App', type: 'EXPENSE', color: '#d97706', icon: '🚕' },
  { name: 'Lazer / Assinaturas', type: 'EXPENSE', color: '#fbbf24', icon: '🎬' },
  { name: 'Compras / Vestuário', type: 'EXPENSE', color: '#b45309', icon: '🛍️' },
  { name: 'Cuidados Pessoais', type: 'EXPENSE', color: '#fcd34d', icon: '💅' },
  { name: 'Viagens', type: 'EXPENSE', color: '#78350f', icon: '✈️' },

  // Objetivos (Quitação e Reserva)
  { name: 'Aplicações / Poupança', type: 'EXPENSE', color: '#3b82f6', icon: '🐷' },
  { name: 'Pagamento de Dívidas', type: 'EXPENSE', color: '#2563eb', icon: '💳' },

  // Sistema
  { name: 'Saldo Inicial', type: 'INCOME', color: '#6366f1', icon: '💰' },
];

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) { }

  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        userId,
      },
    });
  }

  /**
   * Returns all categories for a user.
   * Auto-seeds missing standard categories AND removes non-standard ones.
   * Ensures the UI is pixel-perfect as defined by the user.
   */
  async findAll(userId: string) {
    const existing = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    const existingNamesLower = existing.map(c => c.name.toLowerCase().trim());
    const standardNamesLower = STANDARD_CATEGORIES.map(s => s.name.toLowerCase().trim());

    // 1. Seed missing standard categories
    const missing = STANDARD_CATEGORIES.filter(s => !existingNamesLower.includes(s.name.toLowerCase().trim()));
    if (missing.length > 0) {
      await this.prisma.category.createMany({
        data: missing.map(c => ({ ...c, userId })),
        skipDuplicates: true,
      });
    }

    // 2. Identify and remove non-standard categories (cleanup)
    const toRemove = existing.filter(c => !standardNamesLower.includes(c.name.toLowerCase().trim()));
    if (toRemove.length > 0) {
      const freshStandard = await this.prisma.category.findMany({
        where: { userId, name: { in: STANDARD_CATEGORIES.map(s => s.name) } }
      });

      for (const cat of toRemove) {
        let fallbackId: string | undefined;
        const name = cat.name.toLowerCase();

        // Smart Mapping
        if (name.includes('aliment') || name.includes('mercado') || name.includes('padaria')) {
          fallbackId = freshStandard.find(s => s.name === 'Mercado / Padaria')?.id;
        } else if (name.includes('transp') || name.includes('uber') || name.includes('99')) {
          fallbackId = freshStandard.find(s => s.name === 'Transporte App')?.id;
        } else if (cat.type === 'INCOME') {
          fallbackId = freshStandard.find(s => s.name === 'Renda Extra')?.id;
        } else {
          fallbackId = freshStandard.find(s => s.name === 'Cuidados Pessoais')?.id;
        }

        const fallbackCat = freshStandard.find(s => s.id === fallbackId);

        // Migrate transactions referencing this category
        await this.prisma.transaction.updateMany({
          where: { categoryId: cat.id },
          data: {
            categoryId: fallbackId,
            categoryLegacy: fallbackCat?.name || 'Outros'
          }
        });

        // Finally delete the intruder
        await this.prisma.category.delete({ where: { id: cat.id } });
      }
    }

    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
