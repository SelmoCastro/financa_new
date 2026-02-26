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

  async validateImport(transactionsData: any[], userId: string) {
    if (!transactionsData || transactionsData.length === 0) return { valid: [], duplicateFitIds: [] };

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

    // 3. Fuzzy Hash (mesma data + valor na mesma conta, FITID diferente)
    const minDate = new Date(Math.min(...transactionsData.map(t => new Date(t.date).getTime())));
    const maxDate = new Date(Math.max(...transactionsData.map(t => new Date(t.date).getTime())));

    const fuzzyExisting = await this.prisma.transaction.findMany({
      where: { userId, accountId: targetAccountId, date: { gte: minDate, lte: maxDate } },
      select: { date: true, amount: true }
    });

    const fuzzySet = new Set(
      fuzzyExisting.map(t => `${t.date.toISOString().split('T')[0]}_${t.amount}`)
    );

    const toReview: any[] = [];
    const descriptionsToClassify = new Set<string>();

    for (const raw of transactionsData) {
      // Silent Skip: FITID já existe como transação salva no banco
      if (raw.fitId && existingFitIds.has(raw.fitId)) {
        continue;
      }

      // Silent Skip: FITID foi ACEITO em importação anterior (mas pode ter sido deletado do banco)
      // Somente skip definitivo se estiver no banco de transações. Se foi apagado, mostramos de novo.
      // Para REJECTED: sempre mostrar, mas com flag de aviso.

      const txDate = new Date(raw.date);
      const hash = `${txDate.toISOString().split('T')[0]}_${raw.amount}`;
      const isFuzzyDuplicate = fuzzySet.has(hash);
      const historyStatus = raw.fitId ? historyMap.get(raw.fitId) : undefined;
      const isPreviouslyRejected = historyStatus === 'REJECTED';

      toReview.push({
        ...raw,
        isFuzzyDuplicate,
        isPreviouslyRejected, // true = usuário rejeitou essa transação em importação anterior
      });

      descriptionsToClassify.add(raw.description);
    }

    // Camada IA: limpa nomes e classifica categorias
    let aiClassifications = {};
    let cleanNames: Record<string, string> = {};

    if (descriptionsToClassify.size > 0) {
      const descriptionsArray = Array.from(descriptionsToClassify);
      [aiClassifications, cleanNames] = await Promise.all([
        this.aiService.classifyTransactions(descriptionsArray),
        this.aiService.cleanDescriptions(descriptionsArray)
      ]);
    }

    const finalPreview = toReview.map(tx => {
      const suggestion = aiClassifications[tx.description];
      const cleanedDescription = cleanNames[tx.description] || tx.description;
      return {
        ...tx,
        description: cleanedDescription, // Sobrescreve com o nome limpo pela IA
        originalDescription: tx.description, // Mantém o original para referência se necessário
        suggestedCategory: suggestion?.category || 'Outros',
        suggestedRule: suggestion?.rule || 30,
        suggestedIcon: suggestion?.icon || '🏷️'
      };
    });

    return {
      preview: finalPreview,
      skippedCount: transactionsData.length - toReview.length
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

      return tx.transaction.findFirst({ where: { id, userId } });
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
