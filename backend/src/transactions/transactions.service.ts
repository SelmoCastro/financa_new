import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService
  ) { }

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const amount = Number(createTransactionDto.amount);
    const date = new Date(createTransactionDto.date);
    const { type, accountId } = createTransactionDto;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          ...createTransactionDto,
          amount,
          date,
          userId,
        },
        include: { category: true }
      });

      if (accountId) {
        const adjustment = type === 'INCOME' ? amount : (type === 'EXPENSE' ? -amount : 0);
        if (adjustment !== 0) {
          await tx.account.updateMany({
            where: { id: accountId, userId },
            data: { balance: { increment: adjustment } },
          });
        }
      }

      return transaction;
    });
  }

  async getUserCategories(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, icon: true }
    });
  }

  async validateImport(transactionsData: any[], userId: string) {
    if (!transactionsData || transactionsData.length === 0) return { valid: [], duplicateFitIds: [] };

    // 0. Busca categorias do usuário para alimentar a IA
    const userCategories = await this.getUserCategories(userId);
    const categoryNames = userCategories.map(c => c.name);
    const categoryNameToId = new Map(userCategories.map(c => [c.name.toLowerCase().trim(), c.id]));

    const fitIds = transactionsData.map(t => t.fitId).filter(Boolean);
    const targetAccountId = transactionsData[0]?.accountId;

    // 1. Silent Skip: FITIDs já confirmados no banco (transação salva)
    let existingFitIds = new Set<string>();
    if (fitIds.length > 0) {
      const existing = await this.prisma.transaction.findMany({
        where: { userId, fitId: { in: fitIds } },
        select: { fitId: true }
      });
      existingFitIds = new Set(existing.map(e => e.fitId!));
    }

    // 2. Histórico de importação: FITIDs já ACEITOS ou REJEITADOS anteriormente
    let historyMap = new Map<string, string>(); // fitId -> 'ACCEPTED' | 'REJECTED'
    if (fitIds.length > 0) {
      const history = await this.prisma.importedFitId.findMany({
        where: { userId, fitId: { in: fitIds } },
        select: { fitId: true, status: true }
      });
      history.forEach(h => historyMap.set(h.fitId, h.status));
    }

    // 3. Content Match - Busca transações que batem exatamente em Data + Valor + Descrição
    // Isso resolve o problema de transações importadas antes do sistema de FITID ou inseridas manualmente.
    const minDate = new Date(Math.min(...transactionsData.map(t => new Date(t.date).getTime())));
    const maxDate = new Date(Math.max(...transactionsData.map(t => new Date(t.date).getTime())));

    const existingContent = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: minDate, lte: maxDate }
      },
      select: { date: true, amount: true, description: true, fitId: true, accountId: true }
    });

    // Set para busca ultra-rápida de duplicatas exatas por conteúdo
    const contentSet = new Set(
      existingContent.map(t => `${t.date.toISOString().split('T')[0]}_${t.amount}_${t.description.toUpperCase().trim()}`)
    );

    // 4. Fuzzy Hash (mesma data + valor apenas, para avisar possível erro)
    const fuzzySet = new Set(
      existingContent
        .filter(t => t.accountId === targetAccountId)
        .map(t => `${t.date.toISOString().split('T')[0]}_${t.amount}`)
    );

    const toReview: any[] = [];
    const descriptionsToClassify = new Set<string>();

    for (const raw of transactionsData) {
      const txDate = new Date(raw.date);
      const dateStr = txDate.toISOString().split('T')[0];
      const contentKey = `${dateStr}_${raw.amount}_${raw.description.toUpperCase().trim()}`;
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

    // Camada IA: limpa nomes e classifica categorias
    let aiClassifications = {};
    let cleanNames: Record<string, string> = {};

    if (descriptionsToClassify.size > 0) {
      const descriptionsArray = Array.from(descriptionsToClassify);
      [aiClassifications, cleanNames] = await Promise.all([
        this.aiService.classifyTransactions(descriptionsArray, categoryNames),
        this.aiService.cleanDescriptions(descriptionsArray)
      ]);
    }

    const finalPreview = toReview.map(tx => {
      return this.enrichTransactionWithAi(tx, aiClassifications[tx.description], cleanNames[tx.description], categoryNameToId);
    });

    return {
      preview: finalPreview,
      skippedCount: transactionsData.length - toReview.length
    };
  }

  /**
   * Helper para enriquecer uma transação com sugestões da IA e fallbacks de match
   */
  enrichTransactionWithAi(tx: any, suggestion: any, cleanedName: string | undefined, categoryNameToId: Map<string, string>) {
    const cleanedDescription = cleanedName || tx.description;

    // Tenta bater o nome sugerido pela IA com um ID real do banco
    let matchedCategoryId = suggestion
      ? categoryNameToId.get((suggestion.category || suggestion.c || '').toLowerCase().trim())
      : undefined;

    // Fallback: Busca difusa se a IA sugeriu um nome parecido mas não exato
    if (suggestion && !matchedCategoryId) {
      const suggestedLow = (suggestion.category || suggestion.c || '').toLowerCase().trim();
      if (suggestedLow) {
        for (const [name, id] of categoryNameToId.entries()) {
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
      if (desc.includes('IFOOD') || desc.includes('UBER EATS')) matchedCategoryId = categoryNameToId.get('restaurante / delivery');
      if (desc.includes('UBER') || desc.includes('99APP')) matchedCategoryId = categoryNameToId.get('transporte app');
      if (desc.includes('MERCADO') || desc.includes('PADARIA') || desc.includes('CONFIANCA')) matchedCategoryId = categoryNameToId.get('mercado / padaria');
      if (desc.includes('POSTO') || desc.includes('GASOLINA')) matchedCategoryId = categoryNameToId.get('transporte fixo');
      if (desc.includes('SALARIO') || desc.includes('VENCIMENTO')) matchedCategoryId = categoryNameToId.get('salário');
      if (desc.includes('TRANSF') || desc.includes('PIX') || desc.includes('TED')) {
        matchedCategoryId = categoryNameToId.get(tx.amount > 0 ? 'transferência recebida' : 'outros');
      }
    }

    return {
      ...tx,
      description: cleanedDescription,
      originalDescription: tx.originalDescription || tx.description,
      suggestedCategory: suggestion?.category || suggestion?.c || 'Outros',
      suggestedCategoryId: matchedCategoryId,
      suggestedRule: suggestion?.rule || suggestion?.r || 30,
      suggestedIcon: suggestion?.icon || suggestion?.i || '🏷️'
    };
  }

  async confirmImport(transactionsData: any[], userId: string, rejectedFitIds: string[] = []) {
    if (!transactionsData || transactionsData.length === 0) {
      // Mesmo sem transações, registra os rejeitados
      if (rejectedFitIds.length > 0) {
        await this.saveImportHistory(userId, [], rejectedFitIds);
      }
      return { importedCount: 0 };
    }

    return this.prisma.$transaction(async (tx) => {
      // Verificação final de FITIDs duplicados antes de inserir
      const fitIds = transactionsData.map(t => t.fitId).filter(Boolean);
      let existingFitIds = new Set<string>();
      if (fitIds.length > 0) {
        const existing = await tx.transaction.findMany({
          where: { userId, fitId: { in: fitIds } },
          select: { fitId: true }
        });
        existingFitIds = new Set(existing.map(e => e.fitId!));
      }

      const toInsert = transactionsData
        .filter(t => !(t.fitId && existingFitIds.has(t.fitId)))
        .map(t => ({
          description: t.description,
          amount: Number(t.amount),
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
        skipDuplicates: true
      });

      // Atualizar saldo das contas
      const accountDeltas: Record<string, number> = {};
      for (const t of toInsert) {
        if (t.accountId) {
          const adj = t.type === 'INCOME' ? t.amount : (t.type === 'EXPENSE' ? -t.amount : 0);
          accountDeltas[t.accountId] = (accountDeltas[t.accountId] || 0) + adj;
        }
      }

      for (const [accId, delta] of Object.entries(accountDeltas)) {
        if (delta !== 0) {
          await tx.account.updateMany({
            where: { id: accId, userId },
            data: { balance: { increment: delta } }
          });
        }
      }

      // Persistir histórico de importação (fora da transaction principal para não bloquear)
      const acceptedFitIds = toInsert.map(t => t.fitId).filter(Boolean) as string[];
      await this.saveImportHistory(userId, acceptedFitIds, rejectedFitIds);

      return { importedCount: result.count };
    });
  }

  /**
   * Persiste o histórico de FITIDs aceitos e rejeitados.
   * Usa upsert para que reimports atualizem o status sem criar duplicatas.
   */
  private async saveImportHistory(userId: string, acceptedFitIds: string[], rejectedFitIds: string[]) {
    const upserts: Promise<any>[] = [];

    for (const fitId of acceptedFitIds) {
      upserts.push(
        this.prisma.importedFitId.upsert({
          where: { userId_fitId: { userId, fitId } },
          create: { fitId, userId, status: 'ACCEPTED' },
          update: { status: 'ACCEPTED' },
        })
      );
    }

    for (const fitId of rejectedFitIds) {
      // Só gravamos REJECTED se não foi ACCEPTED antes (não sobreescrevemos uma confirmação)
      upserts.push(
        this.prisma.importedFitId.upsert({
          where: { userId_fitId: { userId, fitId } },
          create: { fitId, userId, status: 'REJECTED' },
          update: { status: 'REJECTED' }, // Se um dia foi aceito e o usuário deletou, não mudamos o status retroativamente
        })
      );
    }

    await Promise.all(upserts);
  }


  findAll(userId: string, year?: number, month?: number) {
    let whereClause: any = { userId };

    if (year !== undefined && month !== undefined) {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      whereClause.date = {
        gte: startOfMonth,
        lte: endOfMonth
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
      where: { userId },
      orderBy: { date: 'desc' },
      include: { category: true }
    });

    // CSV Header
    const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria'];
    const rows = transactions.map(t => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const amount = t.amount.toString().replace('.', ','); // Excel PT-BR uses comma for decimals
      const type = t.type === 'INCOME' ? 'Receita' : 'Despesa';
      const categoryName = t.category?.name || t.categoryLegacy || 'Sem categoria';
      return [date, `"${t.description}"`, amount, type, `"${categoryName}"`].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
  }

  findOne(id: string, userId: string) {
    return this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId }
      });

      if (!oldTx) return null;

      // 1. Reverter saldo antigo se houver accountId
      if (oldTx.accountId) {
        const revertAdj = oldTx.type === 'INCOME' ? -oldTx.amount : (oldTx.type === 'EXPENSE' ? oldTx.amount : 0);
        if (revertAdj !== 0) {
          await tx.account.updateMany({
            where: { id: oldTx.accountId, userId },
            data: { balance: { increment: revertAdj } }
          });
        }
      }

      // 2. Atualizar a transação
      const newAmount = updateTransactionDto.amount !== undefined ? Number(updateTransactionDto.amount) : oldTx.amount;
      const newType = updateTransactionDto.type || oldTx.type;

      let newAccountId = oldTx.accountId;
      if (updateTransactionDto.accountId !== undefined) {
        newAccountId = updateTransactionDto.accountId; // Pode ser null se o cliente remover a conta na edição
      }

      await tx.transaction.updateMany({
        where: { id, userId },
        data: {
          ...updateTransactionDto,
          amount: updateTransactionDto.amount ? Number(updateTransactionDto.amount) : undefined,
          date: updateTransactionDto.date ? new Date(updateTransactionDto.date) : undefined,
        }
      });

      // 3. Aplicar saldo novo se houver accountId
      if (newAccountId) {
        const applyAdj = newType === 'INCOME' ? newAmount : (newType === 'EXPENSE' ? -newAmount : 0);
        if (applyAdj !== 0) {
          await tx.account.updateMany({
            where: { id: newAccountId, userId },
            data: { balance: { increment: applyAdj } }
          });
        }
      }

      return tx.transaction.findFirst({
        where: { id, userId },
        include: { category: true },
      });
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId }
      });

      if (!oldTx) return { count: 0 };

      if (oldTx.accountId) {
        const revertAdj = oldTx.type === 'INCOME' ? -oldTx.amount : (oldTx.type === 'EXPENSE' ? oldTx.amount : 0);
        if (revertAdj !== 0) {
          await tx.account.updateMany({
            where: { id: oldTx.accountId, userId },
            data: { balance: { increment: revertAdj } }
          });
        }
      }

      return tx.transaction.deleteMany({
        where: { id, userId },
      });
    });
  }
}
