import { PrismaClient } from '@prisma/client';
import { TransactionsService } from './src/transactions/transactions.service';
import { ReportsService } from './src/reports/reports.service';

const prisma = new PrismaClient();
const aiService = {} as any;
const txService = new TransactionsService(prisma, aiService);
const reportsService = new ReportsService(prisma);

async function run() {
  const user = await prisma.user.findFirst();
  if(!user) return console.log("No user");

  // Get initial state for February (month 1)
  const initial = await reportsService.getDashboardSummary(user.id, 2026, 1);
  console.log("Initial Feb:", initial.currentMonth);

  // Add transaction
  await txService.create({
    description: "TESTE SCRIPT",
    amount: 100,
    type: "EXPENSE",
    date: "2026-02-15T12:00:00.000Z", // Middle of February
    isFixed: false,
    classificationRule: 50
  }, user.id);

  // Check state again
  const after = await reportsService.getDashboardSummary(user.id, 2026, 1);
  console.log("After Add Feb:", after.currentMonth);

  // Cleanup
  await prisma.transaction.deleteMany({ where: { description: "TESTE SCRIPT" }});
}
run().finally(() => prisma.$disconnect());
