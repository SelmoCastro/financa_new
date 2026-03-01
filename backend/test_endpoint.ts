import { PrismaClient } from '@prisma/client';
import { ReportsService } from './src/reports/reports.service';

const prisma = new PrismaClient();
const reportsService = new ReportsService(prisma as any);

async function run() {
  const user = await prisma.user.findFirst();
  if(!user) return console.log("No user");

  const feb = await reportsService.getDashboardSummary(user.id, 2026, 1);
  console.log("FEB:", feb);

  const mar = await reportsService.getDashboardSummary(user.id, 2026, 2);
  console.log("MAR:", mar);
}
run().finally(() => prisma.$disconnect());
