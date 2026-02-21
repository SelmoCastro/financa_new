import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCategories() {
    console.log('Iniciando migração de dados antigos de Categoria...');

    // Pegar todos os usuários para garantir que categorias sejam criadas por usuário
    const users = await prisma.user.findMany({ select: { id: true } });

    for (const user of users) {
        // Buscar todas as categorias únicas que este usuário já usou em suas transações
        const uniqueCategories = await prisma.transaction.findMany({
            where: { userId: user.id },
            distinct: ['categoryLegacy'],
            select: { categoryLegacy: true },
        });

        for (const { categoryLegacy } of uniqueCategories) {
            if (!categoryLegacy) continue;

            // Definir um tipo genérico (vamos usar EXPENSE como padrão, se não der para adivinhar)
            const isIncome = categoryLegacy.toLowerCase().includes('receita') ||
                categoryLegacy.toLowerCase().includes('salário') ||
                categoryLegacy.toLowerCase().includes('salario') ||
                categoryLegacy.toLowerCase().includes('pagamento');
            const type = isIncome ? 'INCOME' : 'EXPENSE';

            // Criar a categoria no banco
            const category = await prisma.category.create({
                data: {
                    name: categoryLegacy,
                    type: type,
                    userId: user.id,
                    // Cor aleatória simples
                    color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
                }
            });

            console.log(`Categoria criada: ${category.name} [${category.type}] para Usuario ${user.id}`);

            // Atualizar todas as transações deste usuário com esta categoria
            await prisma.transaction.updateMany({
                where: {
                    userId: user.id,
                    categoryLegacy: categoryLegacy
                },
                data: {
                    categoryId: category.id
                }
            });

            console.log(`Transações atualizadas para a categoria ${category.name}.`);
        }

        // Além disso, vamos criar uma Conta Padrão para os usuários antigos para não quebrar o front-end
        const account = await prisma.account.create({
            data: {
                name: 'Conta Principal (Legado)',
                type: 'CHECKING',
                userId: user.id,
            }
        });

        // E associar todas as transações a essa conta padrão
        await prisma.transaction.updateMany({
            where: { userId: user.id },
            data: { accountId: account.id }
        });
        console.log(`Conta legado criada e transações vinculadas para usuário ${user.id}`);
    }

    console.log('Migração concluída com sucesso!');
}

migrateCategories()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
