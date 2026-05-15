import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransferTransactionDto } from './dto/transfer-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SocialService } from '../social/social.service';
import { AuditService } from '../audit/audit.service';
import { ImportTransactionData, AiSuggestion, AccountLockRow } from './interfaces/import-transaction.interface';
import { Prisma } from '@prisma/client';
import { EncryptionService } from '../common/services/encryption.service';
import { encryptAmount, decryptAmount, atomicBalanceUpdate } from '../common/services/balance-helper';
import { normalizeDesc } from '../common/utils/normalize';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private socialService: SocialService,
    private auditService: AuditService,
    private encryption: EncryptionService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const amount = Number(createTransactionDto.amount);
    const date = new Date(createTransactionDto.date);
    if (date > new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)) {
      throw new BadRequestException('Data não pode ser mais que 2 dias no futuro');
    }

    // TRANSFER type must go through the dedicated /transfer endpoint
    if (createTransactionDto.type === 'TRANSFER') {
      throw new BadRequestException('Use o endpoint de transferência para criar transferências');
    }

    const { type, accountId, categoryId, creditCardId } = createTransactionDto;

    // Validate FK ownership: accountId, categoryId, creditCardId must belong to the user
    if (accountId) {
      const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
      if (!account) throw new NotFoundException('Account not found or does not belong to user');
    }
    if (categoryId) {
      const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
      if (!category) throw new NotFoundException('Category not found or does not belong to user');
    }
    if (creditCardId) {
      const card = await this.prisma.creditCard.findFirst({ where: { id: creditCardId, userId } });
      if (!card) throw new NotFoundException('Credit card not found or does not belong to user');
    }

    return this.prisma.$transaction(async (tx) => {
      // CRITICAL: Balance check + row lock before EXPENSE to prevent overdraft
      if (type === 'EXPENSE' && accountId) {
        const rows = await tx.$queryRaw`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${accountId} AND "userId" = ${userId} FOR UPDATE` as AccountLockRow[];
        const account = rows[0];
        if (!account) throw new NotFoundException('Account not found');
        const currentBalance = decryptAmount(account.balance, this.encryption);
        if (currentBalance < amount) {
          throw new BadRequestException('Saldo insuficiente');
        }
      }

      const { amount: _amount, ...dtoRest } = createTransactionDto;
      const encryptedAmount = encryptAmount(amount, this.encryption);

      const transaction = await tx.transaction.create({
        data: {
          ...dtoRest,
          amount: encryptedAmount,
          date,
          userId,
        },
        include: { category: true },
      });

      if (accountId) {
        const adjustment =
          type === 'INCOME' ? amount : type === 'EXPENSE' ? -amount : 0;
        if (adjustment !== 0) {
          await atomicBalanceUpdate(tx, accountId, userId, adjustment, this.encryption);
        }
      }

      // 4. Social Feature: Create invite if sharedWithEmail is present
      if (createTransactionDto.sharedWithEmail) {
        await this.socialService.sendInvite(userId, {
          amount,
          description: createTransactionDto.description,
          date: createTransactionDto.date,
          type: createTransactionDto.type,
          recipientEmail: createTransactionDto.sharedWithEmail,
          originalTransactionId: transaction.id,
        });
      }

      // Audit log
      this.auditService.log({ action: 'transaction.create', actorId: userId, targetType: 'Transaction', targetId: transaction.id });

      return transaction;
    });
  }

  async getUserCategories(userId: string) {
    return this.prisma.category.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, type: true, icon: true },
    });
  }

  async validateImport(transactionsData: ImportTransactionData[], userId: string) {
    if (!transactionsData || transactionsData.length === 0)
      return { valid: [], duplicateFitIds: [] };

    // Filtro: Remove entradas de saldo OFX que não são transações reais
    const BALANCE_KEYWORDS = [
      'saldo do dia',
      'saldo anterior',
      'saldo atual',
      'saldo devedor',
      'saldo em conta',
      'opening balance',
      'closing balance',
      'saldo inicial',
      'saldo final',
      'resgate automatico',
      'aplicacao',
    ];
    transactionsData = transactionsData.filter((t) => {
      const desc = (t.description || '').toLowerCase().trim();
      const isBalance = BALANCE_KEYWORDS.some((kw) => desc.includes(kw));
      const isInvalidDate = t.date && new Date(t.date).getFullYear() < 2000;
      return !isBalance && !isInvalidDate;
    });

    if (transactionsData.length === 0)
      return { valid: [], duplicateFitIds: [] };

    // 0. Busca categorias do usuário para alimentar a IA
    const userCategories = await this.getUserCategories(userId);
    const categoryNames = userCategories.map((c) => c.name);
    const categoryNameToId = new Map(
      userCategories.map((c) => [c.name.toLowerCase().trim(), c.id]),
    );

    const fitIds = transactionsData.map((t) => t.fitId).filter(Boolean) as string[];
    const targetAccountId = transactionsData[0]?.accountId;

    // 1. Silent Skip: FITIDs já confirmados no banco (transação salva)
    let existingFitIds = new Set<string>();
    if (fitIds.length > 0) {
      const existing = await this.prisma.transaction.findMany({
        where: { userId, fitId: { in: fitIds }, deletedAt: null },
        select: { fitId: true },
      });
      existingFitIds = new Set(existing.map((e) => e.fitId!));
    }

    // 2. Histórico de importação: FITIDs já ACEITOS ou REJEITADOS anteriormente
    const historyMap = new Map<string, string>(); // fitId -> 'ACCEPTED' | 'REJECTED'
    if (fitIds.length > 0) {
      const history = await this.prisma.importedFitId.findMany({
        where: { userId, fitId: { in: fitIds } },
        select: { fitId: true, status: true },
      });
      history.forEach((h) => historyMap.set(h.fitId, h.status));
    }

    // 3. Content Match - Busca transações que batem exatamente em Data + Valor + Descrição
    // Isso resolve o problema de transações importadas antes do sistema de FITID ou inseridas manualmente.
    const minDate = new Date(
      Math.min(...transactionsData.map((t) => new Date(t.date).getTime())),
    );
    const maxDate = new Date(
      Math.max(...transactionsData.map((t) => new Date(t.date).getTime())),
    );

    const existingContent = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: minDate, lte: maxDate },
      },
      select: {
        date: true,
        amount: true,
        description: true,
        fitId: true,
        accountId: true,
      },
    });

    // BUG-C1.02: Descriptografar amount antes de comparar (campo pode estar criptografado)
    // BUG-C1.08: normalizeDesc importado de common/utils/normalize para deduplicação robusta

    const contentSet = new Set(
      existingContent.map(
        (t) =>
          `${t.date.toISOString().split('T')[0]}_${decryptAmount(t.amount, this.encryption)}_${normalizeDesc(t.description)}`,
      ),
    );

    // 4. Fuzzy Hash (mesma data + valor apenas, para avisar possível erro)
    const fuzzySet = new Set(
      existingContent
        .filter((t) => t.accountId === targetAccountId)
        .map((t) => `${t.date.toISOString().split('T')[0]}_${decryptAmount(t.amount, this.encryption)}`),
    );

    const toReview: ImportTransactionData[] = [];
    const descriptionsToClassify = new Set<string>();

    for (const raw of transactionsData) {
      const txDate = new Date(raw.date);
      const dateStr = txDate.toISOString().split('T')[0];
      const contentKey = `${dateStr}_${raw.amount}_${normalizeDesc(raw.description)}`;
      const fuzzyKey = `${dateStr}_${raw.amount}`;

      // A. Silent Skip: FITID já existe
      if (raw.fitId && existingFitIds.has(raw.fitId)) {
        continue;
      }

      // B. Silent Skip: FITID já foi aceito antes no histórico (backup da regra A)
      if (raw.fitId && historyMap.get(raw.fitId) === 'ACCEPTED') {
        continue;
      }

      // C. Silent Skip: Conteúdo IDÊNTICO já existe (previne duplicar manual ou importação antiga sem fitId)
      if (contentSet.has(contentKey)) {
        continue;
      }

      const isFuzzyDuplicate = fuzzySet.has(fuzzyKey);
      const historyStatus = raw.fitId ? historyMap.get(raw.fitId) : undefined;
      const isPreviouslyRejected = historyStatus === 'REJECTED';

      toReview.push({
        ...raw,
        isFuzzyDuplicate,
        isPreviouslyRejected,
      });

      descriptionsToClassify.add(raw.description);
    }

    // Camada IA: classifica categorias e limpa nomes (tudo em 1 chamada para economia)
    let aiClassifications: Record<string, AiSuggestion> = {};

    if (descriptionsToClassify.size > 0) {
      const descriptionsArray = Array.from(descriptionsToClassify);
      aiClassifications = await this.aiService.classifyTransactions(descriptionsArray, categoryNames);
    }

    const finalPreview = toReview.map((tx) => {
      const suggestion = aiClassifications[tx.description];
      // Extrai cleanName direto do resultado do CLASSIFIER (campo "n")
      const cleanName = suggestion?.cleanName || suggestion?.n;
      return this.enrichTransactionWithAi(
        tx,
        suggestion,
        cleanName,
        categoryNameToId,
      );
    });

    return {
      preview: finalPreview,
      skippedCount: transactionsData.length - toReview.length,
    };
  }

  /**
   * Helper para enriquecer uma transação com sugestões da IA e fallbacks de match
   */
  enrichTransactionWithAi(
    tx: ImportTransactionData,
    suggestion: AiSuggestion | undefined,
    cleanedName: string | undefined,
    categoryNameToId: Map<string, string>,
  ) {
    const cleanedDescription = cleanedName || tx.description;

    // Tenta bater o nome sugerido pela IA com um ID real do banco
    let matchedCategoryId = suggestion
      ? categoryNameToId.get(
          (suggestion.category || suggestion.c || '').toLowerCase().trim(),
        )
      : undefined;

    // Fallback: Busca difusa se a IA sugeriu um nome parecido mas não exato
    if (suggestion && !matchedCategoryId) {
      const suggestedLow = (suggestion.category || suggestion.c || '')
        .toLowerCase()
        .trim();
      if (suggestedLow) {
        for (const [name, id] of Array.from(categoryNameToId.entries())) {
          if (name.includes(suggestedLow) || suggestedLow.includes(name)) {
            matchedCategoryId = id;
            break;
          }
        }
      }
    }

    // Fallback Final: Keywords clássicas de extrato para quando a IA falha/timeout
    if (!matchedCategoryId) {
      const desc = cleanedDescription.toUpperCase();
      if (desc.includes('IFOOD') || desc.includes('UBER EATS'))
        matchedCategoryId = categoryNameToId.get('restaurante / delivery');
      if (desc.includes('UBER') || desc.includes('99APP'))
        matchedCategoryId = categoryNameToId.get('transporte app');
      if (
        desc.includes('MERCADO') ||
        desc.includes('PADARIA') ||
        desc.includes('CONFIANCA')
      )
        matchedCategoryId = categoryNameToId.get('mercado / padaria');
      if (desc.includes('POSTO') || desc.includes('GASOLINA'))
        matchedCategoryId = categoryNameToId.get('transporte fixo');
      if (desc.includes('SALARIO') || desc.includes('VENCIMENTO'))
        matchedCategoryId = categoryNameToId.get('salário');
      if (
        desc.includes('TRANSF') ||
        desc.includes('PIX') ||
        desc.includes('TED')
      ) {
        matchedCategoryId = categoryNameToId.get(
          tx.amount > 0 ? 'transferência recebida' : 'outros',
        );
      }
    }

    return {
      ...tx,
      description: cleanedDescription,
      originalDescription: tx.originalDescription || tx.description,
      suggestedCategory: suggestion?.category || suggestion?.c || 'Outros',
      suggestedCategoryId: matchedCategoryId,
      suggestedRule: suggestion?.rule || suggestion?.r || 30,
      suggestedIcon: suggestion?.icon || suggestion?.i || '🏷️',
      confidence: suggestion?.confidence || 100,
    };
  }

  async confirmImport(
    transactionsData: ImportTransactionData[],
    userId: string,
    rejectedFitIds: string[] = [],
  ) {
    if (!transactionsData || transactionsData.length === 0) {
      // Mesmo sem transações, registra os rejeitados
      if (rejectedFitIds.length > 0) {
        await this.saveImportHistory(userId, [], rejectedFitIds);
      }
      return { importedCount: 0 };
    }

    // V10: Map TRANSFER type to INCOME/EXPENSE based on amount sign (TRANSFER not allowed in import)
    for (const t of transactionsData) {
      if (t.type === 'TRANSFER') {
        t.type = Number(t.amount) >= 0 ? 'INCOME' : 'EXPENSE';
        t.amount = Math.abs(Number(t.amount));
      }
    }

    // Validate all amounts are positive (after TRANSFER mapping)
    for (const t of transactionsData) {
      const amt = Number(t.amount);
      if (!amt || amt <= 0) {
        throw new BadRequestException('Import amounts must be positive');
      }
    }

    // Validate no transaction dates are more than 2 days in the future
    const maxFutureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    for (const t of transactionsData) {
      if (new Date(t.date) > maxFutureDate) {
        throw new BadRequestException('Transaction dates cannot be more than 2 days in the future');
      }
    }

    // Validate FK ownership for all imported transactions
    const uniqueAccountIds = Array.from(new Set(transactionsData.map((t) => t.accountId).filter(Boolean))) as string[];
    const uniqueCategoryIds = Array.from(new Set(transactionsData.map((t) => t.categoryId).filter(Boolean))) as string[];
    const uniqueCreditCardIds = Array.from(new Set(transactionsData.map((t) => t.creditCardId).filter(Boolean))) as string[];

    if (uniqueAccountIds.length > 0) {
      const ownedAccounts = await this.prisma.account.findMany({
        where: { id: { in: uniqueAccountIds }, userId },
        select: { id: true },
      });
      const ownedAccountSet = new Set(ownedAccounts.map((a) => a.id));
      const invalidIds = uniqueAccountIds.filter((id) => !ownedAccountSet.has(id));
      if (invalidIds.length > 0) {
        throw new ForbiddenException('One or more accountIds do not belong to the authenticated user');
      }
    }

    if (uniqueCategoryIds.length > 0) {
      const ownedCategories = await this.prisma.category.findMany({
        where: { id: { in: uniqueCategoryIds }, userId },
        select: { id: true },
      });
      const ownedCategorySet = new Set(ownedCategories.map((c) => c.id));
      const invalidIds = uniqueCategoryIds.filter((id) => !ownedCategorySet.has(id));
      if (invalidIds.length > 0) {
        throw new ForbiddenException('One or more categoryIds do not belong to the authenticated user');
      }
    }

    if (uniqueCreditCardIds.length > 0) {
      const ownedCards = await this.prisma.creditCard.findMany({
        where: { id: { in: uniqueCreditCardIds }, userId },
        select: { id: true },
      });
      const ownedCardSet = new Set(ownedCards.map((c) => c.id));
      const invalidIds = uniqueCreditCardIds.filter((id) => !ownedCardSet.has(id));
      if (invalidIds.length > 0) {
        throw new ForbiddenException('One or more creditCardIds do not belong to the authenticated user');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Verificação final de FITIDs duplicados antes de inserir
      const fitIds = transactionsData.map((t) => t.fitId).filter(Boolean) as string[];
      let existingFitIds = new Set<string>();
      if (fitIds.length > 0) {
        const existing = await tx.transaction.findMany({
          where: { userId, fitId: { in: fitIds }, deletedAt: null },
          select: { fitId: true },
        });
        existingFitIds = new Set(existing.map((e) => e.fitId!));
      }

      const toInsert = transactionsData
        .filter((t) => !(t.fitId && existingFitIds.has(t.fitId)))
        .map((t) => ({
          description: t.description,
          amount: encryptAmount(Number(t.amount), this.encryption),
          date: new Date(t.date),
          type: t.type,
          isFixed: t.isFixed || false,
          fitId: t.fitId,
          classificationRule: t.classificationRule || 30,
          categoryId: t.categoryId,
          categoryLegacy: t.categoryLegacy,
          accountId: t.accountId,
          creditCardId: t.creditCardId,
          userId,
        }));

      if (toInsert.length === 0) {
        await this.saveImportHistory(userId, [], rejectedFitIds);
        return { importedCount: 0 };
      }

      const result = await tx.transaction.createMany({
        data: toInsert,
        skipDuplicates: true,
      });

      // Atualizar saldo das contas
      const accountDeltas: Record<string, number> = {};
      for (const t of toInsert) {
        if (t.accountId) {
          const amt = Number(t.amount);
          const adj =
            t.type === 'INCOME'
              ? amt
              : t.type === 'EXPENSE'
                ? -amt
                : 0;
          accountDeltas[t.accountId] = (accountDeltas[t.accountId] || 0) + adj;
        }
      }

      // V3: Overdraft check — fetch current balances and validate no account goes negative
      const accountIdsWithDeltas = Object.keys(accountDeltas).filter(id => accountDeltas[id] < 0);
      if (accountIdsWithDeltas.length > 0) {
        const currentBalances = await tx.account.findMany({
          where: { id: { in: accountIdsWithDeltas }, userId },
          select: { id: true, balance: true },
        });
        for (const acc of currentBalances) {
          const currentBal = decryptAmount(acc.balance, this.encryption);
          const projected = currentBal + (accountDeltas[acc.id] || 0);
          if (projected < 0) {
            throw new BadRequestException(
              `Import would cause negative balance on account ${acc.id}. Current: ${currentBal}, projected: ${projected}`
            );
          }
        }
      }

      for (const [accId, delta] of Object.entries(accountDeltas)) {
        if (delta !== 0) {
          await atomicBalanceUpdate(tx, accId, userId, delta, this.encryption);
        }
      }

      // Persistir histórico de importação (fora da transaction principal para não bloquear)
      const acceptedFitIds = toInsert
        .map((t) => t.fitId)
        .filter(Boolean) as string[];
      await this.saveImportHistory(userId, acceptedFitIds, rejectedFitIds, tx);

      // Audit log
      this.auditService.log({ action: 'transaction.import', actorId: userId, targetType: 'Transaction', details: { importedCount: result.count } });

      return { importedCount: result.count };
    });
  }

  /**
   * Persiste o histórico de FITIDs aceitos e rejeitados.
   * Usa upsert para que reimports atualizem o status sem criar duplicatas.
   */
  private async saveImportHistory(
    userId: string,
    acceptedFitIds: string[],
    rejectedFitIds: string[],
    tx?: Prisma.TransactionClient, // Prisma transaction client
  ) {
    const client = tx || this.prisma;
    const upserts: Promise<unknown>[] = [];

    for (const fitId of acceptedFitIds) {
      upserts.push(
        client.importedFitId.upsert({
          where: { userId_fitId: { userId, fitId } },
          create: { fitId, userId, status: 'ACCEPTED' },
          update: { status: 'ACCEPTED' },
        }),
      );
    }

    for (const fitId of rejectedFitIds) {
      // BUG-C1.05: Nunca rebaixar ACCEPTED para REJECTED — upsert cria como REJECTED,
      // mas se já existe mantém o status (não sobreescreve confirmação anterior)
      upserts.push(
        client.importedFitId.upsert({
          where: { userId_fitId: { userId, fitId } },
          create: { fitId, userId, status: 'REJECTED' },
          update: {},  // Não atualiza se já existe — preserva ACCEPTED
        }),
      );
    }

    await Promise.all(upserts);
  }

  findAll(userId: string, year?: number, month?: number) {
    const whereClause: Prisma.TransactionWhereInput = { userId, deletedAt: null };

    if (year !== undefined && month !== undefined) {
      const startOfMonth = new Date(Date.UTC(year, month, 1));
      const endOfMonth = new Date(
        Date.UTC(year, month + 1, 0, 23, 59, 59, 999),
      );
      whereClause.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    return this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { category: true },
    });
  }

  async export(userId: string): Promise<string> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: 'desc' },
      include: { category: true },
    });

    // CSV Header
    const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria'];
    const rows = transactions.map((t) => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const amount = t.amount.toString().replace('.', ','); // Excel PT-BR uses comma for decimals
      const type = t.type === 'INCOME' ? 'Receita' : 'Despesa';
      const categoryName =
        t.category?.name || t.categoryLegacy || 'Sem categoria';
      return [
        date,
        `"${t.description}"`,
        amount,
        type,
        `"${categoryName}"`,
      ].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
  }

  async exportReport(userId: string) {
    const [transactions, accounts, creditCards, categories, invoices] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        orderBy: { date: 'desc' },
        include: { category: true, account: true, creditCard: true },
      }),
      this.prisma.account.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.creditCard.findMany({
        where: { userId, deletedAt: null },
        include: { invoices: { where: { isPaid: false } } },
      }),
      this.prisma.category.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.creditCardInvoice.findMany({
        where: { userId },
        orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
        include: { creditCard: true },
        take: 12,
      }),
    ]);

    // Group by month for summaries
    const byMonth = new Map<string, { income: number; expense: number }>();
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, { income: 0, expense: 0 });
      const m = byMonth.get(key)!;
      if (t.type === 'INCOME') m.income += Number(t.amount);
      else if (t.type === 'EXPENSE') m.expense += Number(t.amount);
    });

    const balance = accounts.reduce((sum, a) => sum + decryptAmount(a.balance, this.encryption), 0);
    const creditCardDebt = creditCards.reduce(
      (sum, c) =>
        sum + c.invoices.reduce(
          (invSum, inv) => invSum + decryptAmount(inv.totalAmount, this.encryption) - decryptAmount(inv.paidAmount, this.encryption),
          0,
        ),
      0,
    );

    return {
      exportedAt: new Date().toISOString(),
      balance,
      creditCardDebt,
      accounts: accounts.map((a) => ({ name: a.name, balance: decryptAmount(a.balance, this.encryption) })),
      creditCards: creditCards.map((c) => ({
        name: c.name,
        limit: Number(c.limit),
        debt: c.invoices.reduce((s, i) => s + decryptAmount(i.totalAmount, this.encryption) - decryptAmount(i.paidAmount, this.encryption), 0),
      })),
      monthlySummary: Array.from(byMonth.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, data]) => ({ month, ...data })),
      invoices: invoices.map((i) => ({
        creditCardName: i.creditCard.name,
        reference: `${String(i.referenceMonth).padStart(2, '0')}/${i.referenceYear}`,
        totalAmount: decryptAmount(i.totalAmount, this.encryption),
        paidAmount: decryptAmount(i.paidAmount, this.encryption),
        remaining: decryptAmount(i.totalAmount, this.encryption) - decryptAmount(i.paidAmount, this.encryption),
        isPaid: i.isPaid,
        dueDate: i.dueDate,
      })),
      categories: categories.map((c) => ({ name: c.name, type: c.type })),
      transactions: transactions.slice(0, 200).map((t) => ({
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        category: t.category?.name || t.categoryLegacy || 'Outros',
        account: t.account?.name || null,
        creditCard: t.creditCard?.name || null,
      })),
    };
  }

  findOne(id: string, userId: string) {
    return this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true },
    });
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    userId: string,
  ) {
    // V9: Future date validation (same as create/transfer/import)
    if (updateTransactionDto.date) {
      const date = new Date(updateTransactionDto.date);
      if (date > new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)) {
        throw new BadRequestException('Data não pode ser mais que 2 dias no futuro');
      }
    }

    // VULN-04: Validate FK ownership before entering the transaction
    if (updateTransactionDto.accountId) {
      const account = await this.prisma.account.findFirst({ where: { id: updateTransactionDto.accountId, userId } });
      if (!account) throw new NotFoundException('Account not found or does not belong to user');
    }
    if (updateTransactionDto.categoryId) {
      const category = await this.prisma.category.findFirst({ where: { id: updateTransactionDto.categoryId, userId } });
      if (!category) throw new NotFoundException('Category not found or does not belong to user');
    }
    if (updateTransactionDto.creditCardId) {
      const card = await this.prisma.creditCard.findFirst({ where: { id: updateTransactionDto.creditCardId, userId } });
      if (!card) throw new NotFoundException('Credit card not found or does not belong to user');
    }

    return this.prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!oldTx) return null;

      // VULN-05: Lock the old account row with userId scoping to prevent concurrent balance modifications
      if (oldTx.accountId) {
        await tx.$queryRaw`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${oldTx.accountId} AND "userId" = ${userId} FOR UPDATE`;
      }

      // 1. Reverter saldo antigo se houver accountId
      if (oldTx.accountId) {
        const oldAmount = Number(oldTx.amount);
        const revertAdj =
          oldTx.type === 'INCOME'
            ? -oldAmount
            : oldTx.type === 'EXPENSE'
              ? oldAmount
              : 0;
        if (revertAdj !== 0) {
          await atomicBalanceUpdate(tx, oldTx.accountId, userId, revertAdj, this.encryption);
        }
      }

      // 2. Atualizar a transação
      const newAmount =
        updateTransactionDto.amount !== undefined
          ? Number(updateTransactionDto.amount)
          : Number(oldTx.amount);
      const newType = updateTransactionDto.type || oldTx.type;

      let newAccountId = oldTx.accountId;
      if (updateTransactionDto.accountId !== undefined) {
        newAccountId = updateTransactionDto.accountId; // Pode ser null se o cliente remover a conta na edição
      }

      // VULN-05: Lock the new account row with userId scoping if it's different from the old one
      if (newAccountId && newAccountId !== oldTx.accountId) {
        await tx.$queryRaw`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${newAccountId} AND "userId" = ${userId} FOR UPDATE`;
      }

      // VULN-03: Overdraft check — after reverting old balance, before applying new one
      if (newType === 'EXPENSE' && newAccountId) {
        const rows = await tx.$queryRaw`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${newAccountId} AND "userId" = ${userId} FOR UPDATE` as AccountLockRow[];
        const account = rows[0];
        if (!account) throw new NotFoundException('Account not found');
        if (decryptAmount(account.balance, this.encryption) < newAmount) {
          throw new BadRequestException('Saldo insuficiente');
        }
      }

      const { amount: updateAmount, ...updateRest } = updateTransactionDto;
      await tx.transaction.updateMany({
        where: { id, userId },
        data: {
          ...updateRest,
          amount: updateAmount ? encryptAmount(Number(updateAmount), this.encryption) : undefined,
          date: updateTransactionDto.date
            ? new Date(updateTransactionDto.date)
            : undefined,
        },
      });

      // 3. Aplicar saldo novo se houver accountId
      if (newAccountId) {
        const applyAdj =
          newType === 'INCOME'
            ? newAmount
            : newType === 'EXPENSE'
              ? -newAmount
              : 0;
        if (applyAdj !== 0) {
          await atomicBalanceUpdate(tx, newAccountId, userId, applyAdj, this.encryption);
        }
      }

      // Audit log
      this.auditService.log({ action: 'transaction.update', actorId: userId, targetType: 'Transaction', targetId: id });

      return tx.transaction.findFirst({
        where: { id, userId, deletedAt: null },
        include: { category: true },
      });
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!oldTx) return { count: 0 };

      // Prevent double-delete - use conditional soft delete
      const deleteResult = await tx.transaction.updateMany({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (deleteResult.count === 0) return { count: 0 };

      // If this transaction is part of an installment, soft-delete all sibling
      // installments (e.g. "Compra (2/5)" deletes also (1/5), (3/5), (4/5), (5/5))
      let siblingCount = 0;
      const deletedIds: string[] = [id];
      if (oldTx.currentInstallment && oldTx.installmentCount) {
        // Extract base description: "Compra (2/5)" → "Compra"
        const baseDescription = oldTx.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
        const siblingIds = await tx.transaction.findMany({
          where: {
            userId,
            deletedAt: null,
            description: { startsWith: baseDescription + ' (' },
            creditCardId: oldTx.creditCardId,
            installmentCount: oldTx.installmentCount,
            id: { not: id },
          },
          select: { id: true },
        });
        if (siblingIds.length > 0) {
          const siblingResult = await tx.transaction.updateMany({
            where: {
              id: { in: siblingIds.map(s => s.id) },
              userId,
              deletedAt: null,
            },
            data: { deletedAt: new Date() },
          });
          siblingCount = siblingResult.count;
          deletedIds.push(...siblingIds.map(s => s.id));

          // Revert balance for each sibling that has an accountId
          for (const sibling of siblingIds) {
            const sibTx = await tx.transaction.findFirst({
              where: { id: sibling.id, userId },
            });
            if (sibTx?.accountId) {
              const sibAmount = Number(sibTx.amount);
              const revertAdj =
                sibTx.type === 'INCOME' ? -sibAmount : sibTx.type === 'EXPENSE' ? sibAmount : 0;
              if (revertAdj !== 0) {
          await atomicBalanceUpdate(tx, sibTx.accountId, userId, revertAdj, this.encryption);
        }
            }
          }
        }
      }

      if (oldTx.accountId) {
        const oldAmount = Number(oldTx.amount);
        const revertAdj =
          oldTx.type === 'INCOME'
            ? -oldAmount
            : oldTx.type === 'EXPENSE'
              ? oldAmount
              : 0;
        if (revertAdj !== 0) {
          await atomicBalanceUpdate(tx, oldTx.accountId, userId, revertAdj, this.encryption);
        }
      }

      // Soft-delete the installment record if all transactions are deleted
      // (future enhancement — currently no installmentId on transactions)

      // Audit log
      this.auditService.log({ action: 'transaction.delete', actorId: userId, targetType: 'Transaction', targetId: id, severity: 'warn' });

      return { count: deleteResult.count + siblingCount, deletedIds };
    });
  }

  async transfer(transferDto: TransferTransactionDto, userId: string) {
    const amount = Number(transferDto.amount);
    const date = new Date(transferDto.date);
    if (date > new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)) {
      throw new BadRequestException('Data não pode ser mais que 2 dias no futuro');
    }
    const { sourceAccountId, destinationAccountId, description } = transferDto;

    return this.prisma.$transaction(async (tx) => {
      // CRITICAL: Balance check + row lock for source account before transfer
      const sourceRows = await tx.$queryRaw`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${sourceAccountId} AND "userId" = ${userId} FOR UPDATE` as AccountLockRow[];
      const sourceAccount = sourceRows[0];
      if (!sourceAccount) throw new NotFoundException('Conta de origem não encontrada');
      if (decryptAmount(sourceAccount.balance, this.encryption) < amount) {
        throw new BadRequestException('Saldo insuficiente para transferência');
      }

      // Lock the destination account row too — and validate it belongs to the user
      const destRows = await tx.$queryRaw`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${destinationAccountId} AND "userId" = ${userId} FOR UPDATE` as AccountLockRow[];
      if (!destRows[0]) {
        throw new NotFoundException('Conta de destino não encontrada ou não pertence ao usuário');
      }

      // 1. Ensure a "Transferência" category exists for the user
      // Search by type: 'TRANSFER' to handle both 'Transferência' and 'Transferência Recebida'
      let transferCat = await tx.category.findFirst({
        where: { userId, type: 'TRANSFER', deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });

      if (!transferCat) {
        transferCat = await tx.category.create({
          data: {
            name: 'Transferência',
            type: 'TRANSFER',
            icon: '🔄',
            color: '#6366f1',
            userId,
          },
        });
      }

      const txDescription = description || 'Transferência';

      // Generate a shared ID to link the two sides of this transfer
      const transferGroupId = crypto.randomUUID();

      // 2. Create the OUT transaction (Expense)
      const outTx = await tx.transaction.create({
        data: {
          description: `${txDescription} (Saída)`,
          amount: encryptAmount(amount, this.encryption),
          date,
          type: 'EXPENSE',
          categoryId: transferCat.id,
          accountId: sourceAccountId,
          transferGroupId,
          userId,
        },
      });

      // 3. Create the IN transaction (Income)
      const inTx = await tx.transaction.create({
        data: {
          description: `${txDescription} (Entrada)`,
          amount: encryptAmount(amount, this.encryption),
          date,
          type: 'INCOME',
          categoryId: transferCat.id,
          accountId: destinationAccountId,
          transferGroupId,
          userId,
        },
      });

      // 4. Update balances
      await atomicBalanceUpdate(tx, sourceAccountId, userId, -amount, this.encryption);
      await atomicBalanceUpdate(tx, destinationAccountId, userId, amount, this.encryption);

      // Audit log
      this.auditService.log({ action: 'transaction.transfer', actorId: userId, targetType: 'Transaction', details: { sourceAccountId, destinationAccountId, amount } });

      return { outTx, inTx };
    });
  }
}
