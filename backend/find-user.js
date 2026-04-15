const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUser() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 's.elmo@live.com' },
            select: { email: true, name: true }
        });
        if (user) {
            console.log("Usuário encontrado:", user);
        } else {
            console.log("Usuário NÃO encontrado: s.elmo@live.com");
        }
    } catch (error) {
        console.error("Erro Prisma:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}
findUser();
