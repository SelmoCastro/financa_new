const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.user.updateMany({
        where: { email: { not: 's.elmo@live.com' } },
        data: { isAdmin: false }
    });
    
    await prisma.user.update({
        where: { email: 's.elmo@live.com' },
        data: { isAdmin: true }
    });
    console.log("Fixed admin roles!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
