import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';

const STANDARD_CATEGORIES = [
  // Entradas (Rendas)
  { name: 'Salário', type: 'INCOME', color: '#10b981', icon: 'Banknote' },
  { name: 'Renda Extra', type: 'INCOME', color: '#059669', icon: 'TrendingUp' },
  {
    name: 'Rendimento de Investimentos',
    type: 'INCOME',
    color: '#34d399',
    icon: 'Building2',
  },
  {
    name: 'Transferência Recebida',
    type: 'TRANSFER',
    color: '#6ee7b7',
    icon: 'RefreshCw',
  },
  { name: 'Empréstimo Recebido', type: 'INCOME', color: '#a7f3d0', icon: 'Handshake' },

  // Necessidades (Essencial)
  { name: 'Moradia', type: 'EXPENSE', color: '#ef4444', icon: 'Home' },
  {
    name: 'Contas Residenciais',
    type: 'EXPENSE',
    color: '#dc2626',
    icon: 'Lightbulb',
  },
  { name: 'Mercado / Padaria', type: 'EXPENSE', color: '#f87171', icon: 'ShoppingCart' },
  { name: 'Transporte Fixo', type: 'EXPENSE', color: '#b91c1c', icon: 'Bus' },
  {
    name: 'Combustível / Gasolina',
    type: 'EXPENSE',
    color: '#ea580c',
    icon: 'Fuel',
  },
  { name: 'Saúde e Farmácia', type: 'EXPENSE', color: '#fca5a5', icon: 'Stethoscope' },
  { name: 'Educação', type: 'EXPENSE', color: '#991b1b', icon: 'GraduationCap' },
  {
    name: 'Impostos Anuais e Seguros',
    type: 'EXPENSE',
    color: '#7f1d1d',
    icon: 'Shield',
  },
  { name: 'Impostos Mensais', type: 'EXPENSE', color: '#fecaca', icon: 'FileText' },

  // Desejos (Estilo de Vida)
  {
    name: 'Restaurante / Delivery',
    type: 'EXPENSE',
    color: '#f59e0b',
    icon: 'Utensils',
  },
  { name: 'Transporte App', type: 'EXPENSE', color: '#d97706', icon: 'Car' },
  {
    name: 'Lazer / Assinaturas',
    type: 'EXPENSE',
    color: '#fbbf24',
    icon: 'Clapperboard',
  },
  {
    name: 'Compras / Vestuário',
    type: 'EXPENSE',
    color: '#b45309',
    icon: 'ShoppingBag',
  },
  { name: 'Cuidados Pessoais', type: 'EXPENSE', color: '#fcd34d', icon: 'Sparkles' },
  { name: 'Cuidados com Pets', type: 'EXPENSE', color: '#fb923c', icon: 'Dog' },
  { name: 'Viagens', type: 'EXPENSE', color: '#78350f', icon: 'Plane' },

  // Objetivos (Quitação e Reserva)
  {
    name: 'Aplicações / Poupança',
    type: 'EXPENSE',
    color: '#3b82f6',
    icon: 'PiggyBank',
  },
  {
    name: 'Pagamento de Dívidas',
    type: 'EXPENSE',
    color: '#2563eb',
    icon: 'CreditCard',
  },

  // Sistema
  { name: 'Saldo Inicial', type: 'INCOME', color: '#06b6d4', icon: 'Banknote' },
];

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

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
      where: { userId, deletedAt: null },
      orderBy: { name: 'asc' },
    });

    console.log(`[CATEGORIES-SVC] findAll - userId: ${userId}, existing: ${existing.length} categories`);

    const existingNamesLower = existing.map((c) => c.name.toLowerCase().trim());

    // ONLY Seed missing standard categories. NEVER delete user data automatically.
    const missing = STANDARD_CATEGORIES.filter(
      (s) => !existingNamesLower.includes(s.name.toLowerCase().trim()),
    );
    if (missing.length > 0) {
      console.log(`[CATEGORIES-SVC] Seeding ${missing.length} missing categories for userId: ${userId} - types: ${missing.map(m => m.type).join(',')}`);
      await this.prisma.category.createMany({
        data: missing.map((c) => ({ ...c, userId })),
        skipDuplicates: true,
      });
      // Re-fetch after seeding
      const seeded = await this.prisma.category.findMany({
        where: { userId, deletedAt: null },
        orderBy: { name: 'asc' },
      });
      console.log(`[CATEGORIES-SVC] After seed - userId: ${userId}, total: ${seeded.length} categories`);
      return seeded;
    }

    return existing;
  }

  async findOne(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ) {
    await this.findOne(id, userId);
    const result = await this.prisma.category.updateMany({
      where: { id, userId, deletedAt: null },
      data: updateCategoryDto,
    });
    if (result.count === 0) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.category.findUnique({ where: { id } });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    const result = await this.prisma.category.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Categoria não encontrada');
    return { deleted: true };
  }
}
