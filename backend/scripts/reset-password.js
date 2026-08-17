const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetPassword() {
  const email = process.env.TARGET_EMAIL;
  const newPassword = process.env.NEW_PASSWORD;

  if (!email || !newPassword) {
    throw new Error('TARGET_EMAIL and NEW_PASSWORD are required');
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(newPassword, saltRounds);
  console.log('Generated hash:', hash.substring(0, 20) + '...');
  
  const user = await prisma.user.update({
    where: { email },
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
