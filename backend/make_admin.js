const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.user.updateMany({
        data: { isAdmin: true }
    });
    console.log(`Updated ${updated.count} users to admin.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
