const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({ select: { email: true, name: true } });
    console.log("Usuários no banco de dados Neon:", users);
  } catch (error) {
    console.error("Erro Prisma:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}
check();
