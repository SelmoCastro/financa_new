import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { EncryptionService } from '../common/services/encryption.service';
import {
  ImportTransactionData,
  AiSuggestion,
} from './interfaces/import-transaction.interface';
import { Prisma } from '@prisma/client';
import {
  encryptAmount,
  decryptAmount,
  atomicBalanceUpdate,
} from '../common/services/balance-helper';
import { normalizeDesc } from '../common/utils/normalize';

@Injectable()
export class TransactionsImportService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private auditService: AuditService,
    private encryption: EncryptionService,
  ) {}

  async validateImport(
    transactionsData: ImportTransactionData[],
    userId: string,
  ) {
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
    const userCategories = await this.prisma.category.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, type: true, icon: true },
    });
    const categoryNames = userCategories.map((c) => c.name);
    const categoryNameToId = new Map(
      userCategories.map((c) => [c.name.toLowerCase().trim(), c.id]),
    );

    const fitIds = transactionsData
      .map((t) => t.fitId)
      .filter(Boolean) as string[];
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
    const historyMap = new Map<string, string>();
    if (fitIds.length > 0) {
      const history = await this.prisma.importedFitId.findMany({
        where: { userId, fitId: { in: fitIds } },
        select: { fitId: true, status: true },
      });
      history.forEach((h) => historyMap.set(h.fitId, h.status));
    }

    // 3. Content Match - Busca transações que batem exatamente em Data + Valor + Descrição
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
        .map(
          (t) =>
            `${t.date.toISOString().split('T')[0]}_${decryptAmount(t.amount, this.encryption)}`,
        ),
    );

    const toReview: ImportTransactionData[] = [];
    const descriptionsToClassify = new Set<string>();

    for (const raw of transactionsData) {
      const txDate = new Date(raw.date);
      const dateStr = txDate.toISOString().split('T')[0];
      const contentKey = `${dateStr}_${raw.amount}_${normalizeDesc(raw.description)}`;
      const fuzzyKey = `${dateStr}_${raw.amount}`;

      if (raw.fitId && existingFitIds.has(raw.fitId)) continue;
      if (raw.fitId && historyMap.get(raw.fitId) === 'ACCEPTED') continue;
      if (contentSet.has(contentKey)) continue;

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

    // Camada IA: classifica categorias e limpa nomes
    let aiClassifications: Record<string, AiSuggestion> = {};

    if (descriptionsToClassify.size > 0) {
      const descriptionsArray = Array.from(descriptionsToClassify);
      aiClassifications = await this.aiService.classifyTransactions(
        descriptionsArray,
        categoryNames,
      );
    }

    const finalPreview = toReview.map((tx) => {
      const suggestion = aiClassifications[tx.description];
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
      if (rejectedFitIds.length > 0) {
        await this.saveImportHistory(userId, [], rejectedFitIds);
      }
      return { importedCount: 0 };
    }

    // Map TRANSFER type to INCOME/EXPENSE based on amount sign
    for (const t of transactionsData) {
      if (t.type === 'TRANSFER') {
        t.type = Number(t.amount) >= 0 ? 'INCOME' : 'EXPENSE';
        t.amount = Math.abs(Number(t.amount));
      }
    }

    // Validate all amounts are positive
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
        throw new BadRequestException(
          'Transaction dates cannot be more than 2 days in the future',
        );
      }
    }

    // Validate FK ownership for all imported transactions
    const uniqueAccountIds = Array.from(
      new Set(transactionsData.map((t) => t.accountId).filter(Boolean)),
    ) as string[];
    const uniqueCategoryIds = Array.from(
      new Set(transactionsData.map((t) => t.categoryId).filter(Boolean)),
    ) as string[];
    const uniqueCreditCardIds = Array.from(
      new Set(transactionsData.map((t) => t.creditCardId).filter(Boolean)),
    ) as string[];

    if (uniqueAccountIds.length > 0) {
      const ownedAccounts = await this.prisma.account.findMany({
        where: { id: { in: uniqueAccountIds }, userId },
        select: { id: true },
      });
      const ownedAccountSet = new Set(ownedAccounts.map((a) => a.id));
      const invalidIds = uniqueAccountIds.filter(
        (id) => !ownedAccountSet.has(id),
      );
      if (invalidIds.length > 0) {
        throw new ForbiddenException(
          'One or more accountIds do not belong to the authenticated user',
        );
      }
    }

    if (uniqueCategoryIds.length > 0) {
      const ownedCategories = await this.prisma.category.findMany({
        where: { id: { in: uniqueCategoryIds }, userId },
        select: { id: true },
      });
      const ownedCategorySet = new Set(ownedCategories.map((c) => c.id));
      const invalidIds = uniqueCategoryIds.filter(
        (id) => !ownedCategorySet.has(id),
      );
      if (invalidIds.length > 0) {
        throw new ForbiddenException(
          'One or more categoryIds do not belong to the authenticated user',
        );
      }
    }

    if (uniqueCreditCardIds.length > 0) {
      const ownedCards = await this.prisma.creditCard.findMany({
        where: { id: { in: uniqueCreditCardIds }, userId },
        select: { id: true },
      });
      const ownedCardSet = new Set(ownedCards.map((c) => c.id));
      const invalidIds = uniqueCreditCardIds.filter(
        (id) => !ownedCardSet.has(id),
      );
      if (invalidIds.length > 0) {
        throw new ForbiddenException(
          'One or more creditCardIds do not belong to the authenticated user',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Verificação final de FITIDs duplicados antes de inserir
      const fitIds = transactionsData
        .map((t) => t.fitId)
        .filter(Boolean) as string[];
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
            t.type === 'INCOME' ? amt : t.type === 'EXPENSE' ? -amt : 0;
          accountDeltas[t.accountId] = (accountDeltas[t.accountId] || 0) + adj;
        }
      }

      // Overdraft check
      const accountIdsWithDeltas = Object.keys(accountDeltas).filter(
        (id) => accountDeltas[id] < 0,
      );
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
              `Import would cause negative balance on account ${acc.id}. Current: ${currentBal}, projected: ${projected}`,
            );
          }
        }
      }

      for (const [accId, delta] of Object.entries(accountDeltas)) {
        if (delta !== 0) {
          await atomicBalanceUpdate(tx, accId, userId, delta, this.encryption);
        }
      }

      // Persistir histórico de importação
      const acceptedFitIds = toInsert
        .map((t) => t.fitId)
        .filter(Boolean) as string[];
      await this.saveImportHistory(userId, acceptedFitIds, rejectedFitIds, tx);

      // Audit log
      void this.auditService.log({
        action: 'transaction.import',
        actorId: userId,
        targetType: 'Transaction',
        details: { importedCount: result.count },
      });

      return { importedCount: result.count };
    });
  }

  /**
   * Persiste o histórico de FITIDs aceitos e rejeitados.
   */
  private async saveImportHistory(
    userId: string,
    acceptedFitIds: string[],
    rejectedFitIds: string[],
    tx?: Prisma.TransactionClient,
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
      upserts.push(
        client.importedFitId.upsert({
          where: { userId_fitId: { userId, fitId } },
          create: { fitId, userId, status: 'REJECTED' },
          update: {},
        }),
      );
    }

    await Promise.all(upserts);
  }
}
