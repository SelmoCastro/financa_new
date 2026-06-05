1|import { Injectable } from '@nestjs/common';
2|import { PrismaService } from '../prisma/prisma.service';
3|import { EncryptionService } from '../common/services/encryption.service';
4|import { decryptAmount } from '../common/services/balance-helper';
5|
6|@Injectable()
7|export class ReportsService {
8|  constructor(
9|    private prisma: PrismaService,
10|    private encryption: EncryptionService,
11|  ) {}
12|
13|  private dec(val: string | null | undefined): number {
14|    if (!val) return 0;
15|    return decryptAmount(val, this.encryption);
16|  }
17|
18|  async getDashboardSummary(userId: string, year?: number, month?: number) {
19|    const now = new Date();
20|    const targetYear = year !== undefined ? year : now.getFullYear();
21|    const targetMonth = month !== undefined ? month : now.getMonth();
22|
23|    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1));
24|    const endOfMonth = new Date(
25|      Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999),
26|    );
27|
28|    const filterOutTransfers = {
29|      transferGroupId: null,
30|    };
31|
32|    // 1. General Balance (sum of encrypted account balances)
33|    const userAccounts = await this.prisma.account.findMany({
34|      where: { userId, deletedAt: null },
35|      select: { balance: true },
36|    });
37|    const balance = userAccounts.reduce(
38|      (acc, account) => acc + this.dec(account.balance),
39|      0,
40|    );
41|
42|    // 2. Current Month Totals (manual sum since _sum doesn't work on encrypted strings)
43|    const currentMonthTxs = await this.prisma.transaction.findMany({
44|      where: {
45|        userId,
46|        deletedAt: null,
47|        ...filterOutTransfers,
48|        date: { gte: startOfMonth, lte: endOfMonth },
49|      },
50|      select: { type: true, amount: true },
51|    });
52|
53|    let currentIncome = 0;
54|    let currentExpense = 0;
55|    for (const t of currentMonthTxs) {
56|      const val = this.dec(t.amount);
57|      if (t.type === 'INCOME') currentIncome += val;
58|      else if (t.type === 'EXPENSE') currentExpense += val;
59|    }
60|
61|    // 2.5 Previous Month for Trends
62|    const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
63|    const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
64|    const startOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 1));
65|    const endOfPrevMonth = new Date(
66|      Date.UTC(prevYear, prevMonth + 1, 0, 23, 59, 59, 999),
67|    );
68|
69|    const prevMonthTxs = await this.prisma.transaction.findMany({
70|      where: {
71|        userId,
72|        deletedAt: null,
73|        ...filterOutTransfers,
74|        date: { gte: startOfPrevMonth, lte: endOfPrevMonth },
75|      },
76|      select: { type: true, amount: true },
77|    });
78|
79|    let prevIncome = 0;
80|    let prevExpense = 0;
81|    for (const t of prevMonthTxs) {
82|      const val = this.dec(t.amount);
83|      if (t.type === 'INCOME') prevIncome += val;
84|      else if (t.type === 'EXPENSE') prevExpense += val;
85|    }
86|
87|    const incomeTrend =
88|      prevIncome === 0 && currentIncome > 0
89|        ? 100
90|        : prevIncome === 0
91|          ? 0
92|          : ((currentIncome - prevIncome) / prevIncome) * 100;
93|    const expenseTrend =
94|      prevExpense === 0 && currentExpense > 0
95|        ? 100
96|        : prevExpense === 0
97|          ? 0
98|          : ((currentExpense - prevExpense) / prevExpense) * 100;
99|
100|    // 3. Rule 50/30/20 (Expenses by category)
101|    const categoryTxs = await this.prisma.transaction.findMany({
102|      where: {
103|        userId,
104|        type: 'EXPENSE',
105|        deletedAt: null,
106|        ...filterOutTransfers,
107|        date: { gte: startOfMonth, lte: endOfMonth },
108|      },
109|      select: { categoryId: true, categoryLegacy: true, amount: true },
110|    });
111|
112|    const categoryAliases: Record<string, string> = {
113|      'Assinaturas': 'Lazer / Assinaturas',
114|      'Lazer': 'Lazer / Assinaturas',
115|      'Alimentação': 'Mercado / Padaria',
116|      'Mercado': 'Mercado / Padaria',
117|      'Transporte': 'Transporte Fixo',
118|      'Compras': 'Compras / Vestuário',
119|      'Saúde': 'Saúde e Farmácia',
120|      'Moradia': 'Moradia',
121|      'Contas': 'Contas Residenciais',
122|      'Contas e Serviços': 'Contas Residenciais',
123|      'Educação': 'Educação',
124|      'Investimentos (Aporte)': 'Aplicações / Poupança',
125|      'Investimentos': 'Aplicações / Poupança',
126|      'Poupança': 'Aplicações / Poupança',
127|      'Dívidas': 'Pagamento de Dívidas',
128|      'Celular': 'Contas Residenciais',
129|      'Manutenção Veicular': 'Transporte Fixo',
130|      'Roupas': 'Compras / Vestuário',
131|      'Cartao Credito': 'Compras / Vestuário',
132|      'Cuidados Pessoais': 'Cuidados Pessoais',
133|    };
134|
135|    const transferCategoryNames = ['Transferência Recebida', 'Transferência Enviada'];
136|
137|    const needsCategories = [
138|      'Moradia', 'Contas Residenciais', 'Mercado / Padaria',
139|      'Transporte Fixo', 'Combustível / Gasolina', 'Saúde e Farmácia',
140|      'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais',
141|    ];
142|    const wantsCategories = [
143|      'Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas',
144|      'Compras / Vestuário', 'Cuidados Pessoais', 'Cuidados com Pets',
145|      'Viagens', 'Outros', 'Cartao Credito',
146|    ];
147|    const savingsCategories = ['Aplicações / Poupança', 'Pagamento de Dívidas'];
148|
149|    let needs = 0;
150|    let wants = 0;
151|    let savings = 0;
152|    let uncategorized = 0;
153|
154|    const categories = await this.prisma.category.findMany({
155|      where: { userId, deletedAt: null },
156|    });
157|    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
158|
159|    const classifyCategory = (catName: string): { name: string; isTransfer: boolean } => {
160|      if (!catName || catName === 'null' || catName === 'undefined') return { name: 'Outros', isTransfer: false };
161|      if (transferCategoryNames.includes(catName)) return { name: catName, isTransfer: true };
162|      return { name: categoryAliases[catName] || catName, isTransfer: false };
163|    };
164|
165|    const excludedExpenseCategories = ['Outras Receitas', 'Entradas', 'Rendimento de Investimentos'];
166|
167|    // Build category sums manually
168|    const categorySums = new Map<string, number>();
169|    for (const t of categoryTxs) {
170|      const val = this.dec(t.amount);
171|      const rawCatName =
172|        t.categoryId
173|          ? categoryMap.get(t.categoryId)
174|          : (t.categoryLegacy && t.categoryLegacy !== 'null' ? t.categoryLegacy : null);
175|
176|      const classified = classifyCategory(rawCatName || 'Outros');
177|      if (classified.isTransfer) continue;
178|      if (excludedExpenseCategories.includes(rawCatName || '')) continue;
179|
180|      const catName = classified.name;
181|      categorySums.set(catName, (categorySums.get(catName) || 0) + val);
182|
183|      if (needsCategories.includes(catName)) needs += val;
184|      else if (wantsCategories.includes(catName)) wants += val;
185|      else if (savingsCategories.includes(catName)) savings += val;
186|      else uncategorized += val;
187|    }
188|
189|    const expenseBase = needs + wants + savings + uncategorized;
190|
191|    // 4. Category Summary (Pie Chart)
192|    const categorySummary: { name: string; value: number }[] = [];
193|    for (const [name, val] of categorySums) {
194|      if (val > 0) categorySummary.push({ name, value: val });
195|    }
196|    categorySummary.sort((a, b) => b.value - a.value);
197|
198|    // 5. Monthly History (Bar Chart)
199|    const twelveMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11, 1));
200|    const allTxs = await this.prisma.transaction.findMany({
201|      where: {
202|        userId,
203|        deletedAt: null,
204|        ...filterOutTransfers,
205|        date: { gte: twelveMonthsAgo, lte: endOfMonth },
206|      },
207|      select: { date: true, amount: true, type: true },
208|      orderBy: { date: 'asc' },
209|    });
210|
211|    const monthlyMap = new Map<string, { income: number; expenses: number; month: string }>();
212|    for (const t of allTxs) {
213|      const d = new Date(t.date);
214|      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
215|      if (!monthlyMap.has(monthKey)) {
216|        const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
217|        const monthName = formatter.format(d);
218|        monthlyMap.set(monthKey, {
219|          income: 0,
220|          expenses: 0,
221|          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
222|        });
223|      }
224|      const stats = monthlyMap.get(monthKey)!;
225|      const val = this.dec(t.amount);
226|      if (t.type === 'INCOME') stats.income += val;
227|      else if (t.type === 'EXPENSE') stats.expenses += val;
228|    }
229|
230|    const monthlyHistory = Array.from(monthlyMap.entries())
231|      .sort(([a], [b]) => a.localeCompare(b))
232|      .map(([, value]) => value);
233|
234|    // 6. Credit Card Debt
235|    const unpaidInvoices = await this.prisma.creditCardInvoice.findMany({
236|      where: { userId, isPaid: false },
237|      select: {
238|        id: true,
239|        creditCardId: true,
240|        referenceMonth: true,
241|        referenceYear: true,
242|        totalAmount: true,
243|        paidAmount: true,
244|        closingDate: true,
245|        dueDate: true,
246|        creditCard: { select: { name: true, deletedAt: true } },
247|      },
248|      orderBy: { dueDate: 'asc' },
249|    });
250|
251|    const validUnpaidInvoices = unpaidInvoices.filter(
252|      (inv) => inv.creditCard?.deletedAt === null,
253|    );
254|
255|    const creditCards = await this.prisma.creditCard.findMany({
256|      where: { userId, deletedAt: null },
257|      select: { id: true, name: true, closingDay: true, dueDay: true },
258|    });
259|
260|    const closedCardIds = new Set(validUnpaidInvoices.map((inv) => inv.creditCardId));
261|    const currentMonth = new Date().getMonth() + 1;
262|    const currentYear = new Date().getFullYear();
263|
264|    const openInvoices: Array<{
265|      id: string;
266|      creditCardId: string;
267|      creditCardName: string;
268|      referenceMonth: number;
269|      referenceYear: number;
270|      totalAmount: number;
271|      paidAmount: number;
272|      remaining: number;
273|      closingDate: Date;
274|      dueDate: Date;
275|    }> = [];
276|
277|    for (const card of creditCards) {
278|      if (closedCardIds.has(card.id)) continue;
279|      // Manual sum since _sum doesn't work on encrypted strings
280|      const unlinkedTxs = await this.prisma.transaction.findMany({
281|        where: {
282|          userId,
283|          creditCardId: card.id,
284|          deletedAt: null,
285|          invoiceId: null,
286|          type: 'EXPENSE',
287|        },
288|        select: { amount: true },
289|      });
290|      const total = unlinkedTxs.reduce((sum, t) => sum + this.dec(t.amount), 0);
291|      if (total === 0) continue;
292|
293|      const closingDate = new Date(currentYear, currentMonth - 1, card.closingDay);
294|      const dueDate = new Date(currentYear, currentMonth, card.dueDay);
295|
296|      openInvoices.push({
297|        id: `open-${card.id}`,
298|        creditCardId: card.id,
299|        creditCardName: card.name,
300|        referenceMonth: currentMonth,
301|        referenceYear: currentYear,
302|        totalAmount: total,
303|        paidAmount: 0,
304|        remaining: total,
305|        closingDate,
306|        dueDate,
307|      });
308|    }
309|
310|    const allPendingInvoices = [...validUnpaidInvoices.map((inv) => ({
311|      ...inv,
312|      remaining: this.dec(inv.totalAmount) - this.dec(inv.paidAmount),
313|      creditCardName: inv.creditCard.name,
314|    })), ...openInvoices];
315|
316|    const creditCardDebt = allPendingInvoices.reduce(
317|      (sum, inv) => sum + (inv.remaining || (this.dec(inv.totalAmount as any) - this.dec(inv.paidAmount as any))),
318|      0,
319|    );
320|
321|    return {
322|      balance,
323|      creditCardDebt,
324|      currentMonth: {
325|        income: currentIncome,
326|        expense: currentExpense,
327|        incomeTrend,
328|        expenseTrend,
329|      },
330|      rule503020: {
331|        needs: {
332|          value: needs,
333|          percent: expenseBase > 0 ? Math.round((needs / expenseBase) * 1000) / 10 : 0,
334|        },
335|        wants: {
336|          value: wants,
337|          percent: expenseBase > 0 ? Math.round((wants / expenseBase) * 1000) / 10 : 0,
338|        },
339|        savings: {
340|          value: savings,
341|          percent: expenseBase > 0 ? Math.round((savings / expenseBase) * 1000) / 10 : 0,
342|        },
343|        uncategorized: {
344|          value: uncategorized,
345|          percent: expenseBase > 0 ? Math.round((uncategorized / expenseBase) * 1000) / 10 : 0,
346|        },
347|      },
348|      categorySummary,
349|      monthlyHistory,
350|      pendingInvoices: allPendingInvoices,
351|    };
352|  }
353|
354|  async getFinancialProfile(userId: string, year?: number, month?: number) {
355|    const now = new Date();
356|    const y = year !== undefined ? year : now.getFullYear();
357|    const m = month !== undefined ? month : now.getMonth();
358|
359|    const filterOutTransfers = { transferGroupId: null };
360|
361|    const monthSummary = await this.getDashboardSummary(userId, y, m);
362|
363|    const goals = await this.prisma.goal.findMany({
364|      where: { userId, deletedAt: null },
365|      select: {
366|        title: true,
367|        targetAmount: true,
368|        currentAmount: true,
369|        deadline: true,
370|      },
371|    });
372|
373|    const budgets = await this.prisma.budget.findMany({
374|      where: { userId, deletedAt: null },
375|      select: { categoryId: true, amount: true },
376|    });
377|
378|    const targetStart = new Date(Date.UTC(y, m, 1));
379|    const targetEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
380|    const topExpenseTxs = await this.prisma.transaction.findMany({
381|      where: {
382|        userId,
383|        type: 'EXPENSE',
384|        deletedAt: null,
385|        ...filterOutTransfers,
386|        date: { gte: targetStart, lte: targetEnd },
387|      },
388|      select: { categoryId: true, categoryLegacy: true, amount: true },
389|      take: 500,
390|    });
391|
392|    const categories = await this.prisma.category.findMany({
393|      where: { userId, deletedAt: null },
394|    });
395|    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
396|
397|    // Aggregate manually and sort by amount desc
398|    const categoryAgg = new Map<string, number>();
399|    for (const t of topExpenseTxs) {
400|      const catName = (t.categoryId ? categoryMap.get(t.categoryId) : t.categoryLegacy) || 'Outros';
401|      categoryAgg.set(catName, (categoryAgg.get(catName) || 0) + this.dec(t.amount));
402|    }
403|    const formattedTopExpenses = Array.from(categoryAgg.entries())
404|      .map(([category, amount]) => ({ category, amount }))
405|      .sort((a, b) => b.amount - a.amount)
406|      .slice(0, 5);
407|
408|    const recentTransactions = await this.prisma.transaction.findMany({
409|      where: { userId, deletedAt: null },
410|      select: { description: true, amount: true, date: true, type: true },
411|      orderBy: { date: 'desc' },
412|      take: 50,
413|    });
414|
415|    return {
416|      userSummary: monthSummary,
417|      activeGoals: goals,
418|      activeBudgets: budgets,
419|      topMonthlyExpenses: formattedTopExpenses,
420|      recentTransactions,
421|    };
422|  }
423|
424|  async getHistoricalSpending(userId: string) {
425|    const now = new Date();
426|    const startOfHistory = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 3, 1));
427|    const endOfHistory = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
428|
429|    const transactions = await this.prisma.transaction.findMany({
430|      where: {
431|        userId,
432|        type: 'EXPENSE',
433|        deletedAt: null,
434|        date: { gte: startOfHistory, lte: endOfHistory },
435|      },
436|      select: { amount: true, date: true, categoryId: true, categoryLegacy: true },
437|    });
438|
439|    const categories = await this.prisma.category.findMany({
440|      where: { userId, deletedAt: null },
441|    });
442|    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
443|
444|    return transactions.map((t) => ({
445|      amount: this.dec(t.amount),
446|      date: t.date,
447|      category:
448|        (t.categoryId ? categoryMap.get(t.categoryId) : t.categoryLegacy) || 'Outros',
449|    }));
450|  }
451|
452|  async getRecentTransactionsForAudit(userId: string) {
453|    const now = new Date();
454|    const ninetyDaysAgo = new Date();
455|    ninetyDaysAgo.setDate(now.getDate() - 90);
456|
457|    return await this.prisma.transaction.findMany({
458|      where: {
459|        userId,
460|        type: 'EXPENSE',
461|        deletedAt: null,
462|        date: { gte: ninetyDaysAgo, lte: now },
463|      },
464|      select: { description: true, amount: true, date: true },
465|      orderBy: { date: 'desc' },
466|      take: 100,
467|    });
468|  }
469|
470|  async getProjection(userId: string) {
471|    const now = new Date();
472|    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
473|
474|    const userAccounts = await this.prisma.account.findMany({
475|      where: { userId, deletedAt: null },
476|      select: { balance: true },
477|    });
478|    const currentBalance = userAccounts.reduce(
479|      (acc, a) => acc + this.dec(a.balance),
480|      0,
481|    );
482|
483|    const unpaidInvoices = await this.prisma.creditCardInvoice.findMany({
484|      where: { userId, isPaid: false },
485|    });
486|    const creditCardDebt = unpaidInvoices.reduce(
487|      (sum, inv) => sum + this.dec(inv.totalAmount) - this.dec(inv.paidAmount),
488|      0,
489|    );
490|
491|    const currentMonth = now.getMonth();
492|    const currentYear = now.getFullYear();
493|    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
494|    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
495|
496|    const activeRecurring = await this.prisma.recurringTransaction.findMany({
497|      where: {
498|        userId,
499|        isActive: true,
500|        OR: [{ endMonth: null }, { endMonth: { gte: currentMonth + 1 } }],
501|      },
502|    });
503|
504|    const confirmedDescriptions = await this.prisma.transaction.findMany({
505|      where: {
506|        userId,
507|        isFixed: true,
508|        deletedAt: null,
509|        date: { gte: startOfMonth, lte: endOfMonth },
510|      },
511|      select: { description: true },
512|    });
513|    const confirmedSet = new Set(confirmedDescriptions.map((t) => t.description.toLowerCase().trim()));
514|
515|    const upcomingIncome = activeRecurring
516|      .filter((r) => r.type === 'INCOME' && !confirmedSet.has(r.description.toLowerCase().trim()))
517|      .reduce((sum, r) => sum + this.dec(r.amount), 0);
518|
519|    const upcomingExpenses = activeRecurring
520|      .filter((r) => r.type === 'EXPENSE' && !confirmedSet.has(r.description.toLowerCase().trim()))
521|      .reduce((sum, r) => sum + this.dec(r.amount), 0);
522|
523|    const projectedBalance = currentBalance + upcomingIncome - upcomingExpenses - creditCardDebt;
524|
525|    const days: Array<{ date: string; balance: number; events: string[] }> = [];
526|    const startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
527|
528|    const recentTxs = await this.prisma.transaction.findMany({
529|      where: {
530|        userId,
531|        deletedAt: null,
532|        date: { gte: startDate },
533|      },
534|      select: { date: true, type: true, amount: true, description: true },
535|      orderBy: { date: 'asc' },
536|    });
537|
538|    const txByDate = new Map<string, { type: string; amount: number; desc: string }[]>();
539|    for (const tx of recentTxs) {
540|      const key = tx.date.toISOString().split('T')[0];
541|      if (!txByDate.has(key)) txByDate.set(key, []);
542|      txByDate.get(key)!.push({ type: tx.type, amount: this.dec(tx.amount), desc: tx.description });
543|    }
544|
545|    // Manual sum instead of aggregate _sum
546|    const incomeBeforeTxs = await this.prisma.transaction.findMany({
547|      where: {
548|        userId,
549|        accountId: { not: null },
550|        deletedAt: null,
551|        date: { lt: startDate },
552|        type: 'INCOME',
553|      },
554|      select: { amount: true },
555|    });
556|    const expenseBeforeTxs = await this.prisma.transaction.findMany({
557|      where: {
558|        userId,
559|        accountId: { not: null },
560|        deletedAt: null,
561|        date: { lt: startDate },
562|        type: 'EXPENSE',
563|      },
564|      select: { amount: true },
565|    });
566|    let runningBalance = incomeBeforeTxs.reduce((s, t) => s + this.dec(t.amount), 0)
567|      - expenseBeforeTxs.reduce((s, t) => s + this.dec(t.amount), 0);
568|
569|    for (let i = 0; i < 30; i++) {
570|      const day = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
571|      const dayKey = day.toISOString().split('T')[0];
572|      const dayDueDay = day.getDate();
573|      const dayMonth = day.getMonth() + 1;
574|
575|      const events: string[] = [];
576|
577|      const dayTxs = txByDate.get(dayKey) || [];
578|      for (const tx of dayTxs) {
579|        if (tx.type === 'INCOME') {
580|          runningBalance += tx.amount;
581|          events.push(`+ ${tx.desc}: R$${tx.amount.toFixed(2)}`);
582|        } else {
583|          runningBalance -= tx.amount;
584|          events.push(`- ${tx.desc}: R$${tx.amount.toFixed(2)}`);
585|        }
586|      }
587|
588|      if (day >= now) {
589|        const dayItems = activeRecurring.filter(
590|          (r) => r.dueDay === dayDueDay && !confirmedSet.has(r.description.toLowerCase().trim()),
591|        );
592|        for (const item of dayItems) {
593|          const val = this.dec(item.amount);
594|          if (item.type === 'INCOME') {
595|            runningBalance += val;
596|            events.push(`+ ${item.description}: R$${val.toFixed(2)}`);
597|          } else {
598|            runningBalance -= val;
599|            events.push(`- ${item.description}: R$${val.toFixed(2)}`);
600|          }
601|        }
602|
603|        for (const inv of unpaidInvoices) {
604|          const dueDate = new Date(inv.dueDate);
605|          if (dueDate.getDate() === dayDueDay && dueDate.getMonth() + 1 === dayMonth) {
606|            const remaining = this.dec(inv.totalAmount) - this.dec(inv.paidAmount);
607|            if (remaining > 0) {
608|              events.push(`Fatura cartão vence: R$${remaining.toFixed(2)}`);
609|            }
610|          }
611|        }
612|      }
613|
614|      days.push({ date: dayKey, balance: runningBalance, events });
615|    }
616|
617|    return {
618|      currentBalance,
619|      upcomingIncome,
620|      upcomingExpenses,
621|      creditCardDebt,
622|      projectedBalance,
623|      days,
624|      upcomingItems: activeRecurring
625|        .filter((r) => !confirmedSet.has(r.description.toLowerCase().trim()))
626|        .map((r) => ({
627|          description: r.description,
628|          amount: this.dec(r.amount),
629|          type: r.type,
630|          dueDay: r.dueDay,
631|        })),
632|      unpaidInvoices: unpaidInvoices.map((inv) => ({
633|        id: inv.id,
634|        referenceMonth: inv.referenceMonth,
635|        referenceYear: inv.referenceYear,
636|        remaining: this.dec(inv.totalAmount) - this.dec(inv.paidAmount),
637|        dueDate: inv.dueDate,
638|      })),
639|    };
640|  }
641|}