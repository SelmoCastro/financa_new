import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // 1. Clean existing data (optional, but good for idempotency if not resetting)
    // Since DB was reset, it's empty.

    const password = await bcrypt.hash('123456', 10);

    // 2. Create User
    const user = await prisma.user.upsert({
        where: { email: 'user@example.com' },
        update: {},
        create: {
            email: 'user@example.com',
            name: 'Usuário Teste',
            password: password,
        },
    });

    console.log({ user });

    // 3. Create Transactions (Income/Expense/Fixed) for dashboard data
    // Current Month Data
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const transactions = [
        // Income
        { description: 'Salário', amount: 5000, type: 'INCOME', category: 'Salário', isFixed: true, date: new Date(currentYear, currentMonth, 5) },
        { description: 'Freelance', amount: 1500, type: 'INCOME', category: 'Extra', isFixed: false, date: new Date(currentYear, currentMonth, 15) },

        // Fixed Expenses
        { description: 'Aluguel', amount: 1200, type: 'EXPENSE', category: 'Moradia', isFixed: true, date: new Date(currentYear, currentMonth, 10) },
        { description: 'Internet', amount: 150, type: 'EXPENSE', category: 'Contas e Serviços', isFixed: true, date: new Date(currentYear, currentMonth, 10) },
        { description: 'Energia', amount: 200, type: 'EXPENSE', category: 'Contas e Serviços', isFixed: true, date: new Date(currentYear, currentMonth, 12) },

        // Variable Expenses (Needs/Wants)
        { description: 'Supermercado', amount: 800, type: 'EXPENSE', category: 'Alimentação', isFixed: false, date: new Date(currentYear, currentMonth, 2) },
        { description: 'Restaurante', amount: 120, type: 'EXPENSE', category: 'Lazer', isFixed: false, date: new Date(currentYear, currentMonth, 20) },
        { description: 'Uber', amount: 45, type: 'EXPENSE', category: 'Transporte', isFixed: false, date: new Date(currentYear, currentMonth, 18) },
        { description: 'Netflix', amount: 55.90, type: 'EXPENSE', category: 'Assinaturas', isFixed: true, date: new Date(currentYear, currentMonth, 15) },
    ];

    for (const t of transactions) {
        await prisma.transaction.create({
            data: {
                ...t,
                userId: user.id,
            },
        });
    }

    console.log('Seed completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
