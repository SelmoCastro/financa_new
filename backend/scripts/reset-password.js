const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetPassword() {
  const saltRounds = 10;
  const hash = await bcrypt.hash('Selmo1010', saltRounds);
  console.log('Generated hash:', hash.substring(0, 20) + '...');
  
  const user = await prisma.user.update({
    where: { email: 's.elmo@live.com' },
    data: {
      password: hash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    }
  });
  
  console.log('Password reset for:', user.name);
  await prisma.$disconnect();
}

resetPassword().catch(e => { console.error(e); process.exit(1); });
