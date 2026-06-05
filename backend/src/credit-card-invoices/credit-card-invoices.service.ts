import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { PrismaService } from '../prisma/prisma.service';

import { EncryptionService } from '../common/services/encryption.service';
import {
  encryptAmount,
  decryptAmount,
  atomicBalanceUpdate,
} from '../common/services/balance-helper';

/**
 * Serviço de faturas de cartão de crédito.
 *
 * Responsável por gerenciar o ciclo de vida das faturas:
 * - Cálculo da fatura aberta (período atual, não fechada)
 * - Fechamento da fatura (vincula transações ao invoice, calcula total)
 * - Registro de pagamento (parcial ou total)
 * - Histórico de faturas por cartão
 */
@Injectable()
export class CreditCardInvoiceService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  // ─── Helpers internos ───

  /**
   * Valida que o cartão pertence ao usuário e retorna o registro.
   */
  private async getCardOrThrow(creditCardId: string, userId: string) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: creditCardId, userId, deletedAt: null },
    });
    if (!card) {
      throw new NotFoundException(
        'Cartão de crédito não encontrado ou não pertence a este usuário',
      );
    }
    return card;
  }

  /**
   * Valida que a fatura pertence ao usuário (via cartão) e retorna o registro.
   */
  private async getInvoiceOrThrow(invoiceId: string, userId: string) {
    const invoice = await this.prisma.creditCardInvoice.findFirst({
      where: { id: invoiceId, userId },
      include: { creditCard: true },
    });
    if (!invoice) {
      throw new NotFoundException(
        'Fatura não encontrada ou não pertence a este usuário',
      );
    }
    return invoice;
  }

  /**
   * Calcula as datas de fechamento e vencimento para um determinado mês/ano,
   * baseado no closingDay e dueDay do cartão.
   *
   * Exemplo: cartão com closingDay=10, dueDay=20, mês ref=5 (maio), ano=2026
   *   → closingDate = 10/05/2026
   *   → dueDate = 20/06/2026 (mês seguinte, a menos que dueDay <= closingDay)
   */
  private calcInvoiceDates(
    closingDay: number,
    dueDay: number,
    refMonth: number,
    refYear: number,
  ) {
    // Data de fechamento no mês de referência
    // O último dia do mês pode ser 28, 29, 30 ou 31 — usamos Date para resolver
    const closingDate = new Date(
      refYear,
      refMonth - 1,
      Math.min(closingDay, 28),
    );
    // Ajusta para o último dia do mês se closingDay > dias do mês
    if (closingDate.getMonth() !== refMonth - 1) {
      closingDate.setDate(0); // último dia do mês anterior (refMonth - 1)
    }

    // Data de vencimento: se dueDay > closingDay, mesmo mês; senão, mês seguinte
    let dueMonth = refMonth;
    let dueYear = refYear;
    if (dueDay <= closingDay) {
      dueMonth += 1;
      if (dueMonth > 12) {
        dueMonth = 1;
        dueYear += 1;
      }
    }
    const dueDate = new Date(dueYear, dueMonth - 1, Math.min(dueDay, 28));
    if (dueDate.getMonth() !== dueMonth - 1) {
      dueDate.setDate(0);
    }

    return { closingDate, dueDate };
  }

  /**
   * Determina o mês/ano de referência ATUAL para um cartão.
   *
   * Regra: o período de fatura corrente é aquele cuja data de fechamento
   * ainda NÃO passou. Se hoje é dia 15 e o fechamento é dia 10,
   * a fatura atual é a do MÊS SEGUINTE (já que a do mês atual fechou dia 10).
   */
  private getCurrentReference(closingDay: number) {
    const today = new Date();
    let refMonth = today.getMonth() + 1; // 1-12
    let refYear = today.getFullYear();

    // Se hoje já passou do dia de fechamento, a fatura atual é do mês seguinte
    if (today.getDate() > closingDay) {
      refMonth += 1;
      if (refMonth > 12) {
        refMonth = 1;
        refYear += 1;
      }
    }

    return { refMonth, refYear };
  }

  /**
   * Retorna o período de competência (data inicial e final) para as transações
   * de uma fatura com mês de referência e closingDay informados.
   *
   * O período começa no dia seguinte ao fechamento do mês anterior e termina
   * no dia do fechamento do mês atual.
   *
   * Exemplo: refMonth=5/2026, closingDay=10
   *   → startDate = 11/04/2026 (dia seguinte ao fechamento de abril)
   *   → endDate   = 10/05/2026 (fechamento de maio)
   */
  private getTransactionPeriod(
    refMonth: number,
    refYear: number,
    closingDay: number,
  ) {
    // Mês anterior
    let prevMonth = refMonth - 1;
    let prevYear = refYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const startDate = new Date(prevYear, prevMonth - 1, closingDay + 1);
    const endDate = new Date(
      refYear,
      refMonth - 1,
      closingDay,
      23,
      59,
      59,
      999,
    );

    return { startDate, endDate };
  }

  // ─── Métodos públicos ───

  /**
   * Retorna a fatura ABERTA atual do cartão (ou null se não existir).
   *
   * Se a fatura ainda não foi criada no banco, retorna os dados calculados
   * (total provisório, datas) sem persistir — a persistência só ocorre no closeInvoice.
   */
  async getCurrentInvoice(creditCardId: string, userId: string) {
    const card = await this.getCardOrThrow(creditCardId, userId);
    const { refMonth, refYear } = this.getCurrentReference(card.closingDay);

    // Busca fatura já fechada ou em aberto para este mês/ano
    const existing = await this.prisma.creditCardInvoice.findUnique({
      where: {
        creditCardId_referenceMonth_referenceYear: {
          creditCardId,
          referenceMonth: refMonth,
          referenceYear: refYear,
        },
      },
      include: { transactions: { include: { category: true } } },
    });

    if (existing) {
      return existing; // já foi fechada ou criada
    }

    // Fatura ainda não existe → calcula projeção
    const { closingDate, dueDate } = this.calcInvoiceDates(
      card.closingDay,
      card.dueDay,
      refMonth,
      refYear,
    );

    // Busca TODAS as transações de crédito não faturadas (sem filtro de data restrito)
    // Isso garante que qualquer lançamento no cartão apareça imediatamente,
    // mesmo que esteja fora do período de fechamento calculado
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        creditCardId,
        deletedAt: null,
        invoiceId: null,
        type: 'EXPENSE',
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const totalAmount = transactions.reduce(
      (sum, t) => sum + decryptAmount(t.amount, this.encryption),
      0,
    );

    return {
      creditCardId,
      creditCardName: card.name,
      referenceMonth: refMonth,
      referenceYear: refYear,
      closingDate,
      dueDate,
      totalAmount,
      paidAmount: 0,
      isPaid: false,
      paidAt: null,
      transactions,
      isProjection: true,
    };
  }

  /**
   * Fecha a fatura atual do cartão:
   * - Cria o registro CreditCardInvoice
   * - Vincula as transações do período ao invoice (seta invoiceId)
   * - Calcula o totalAmount
   *
   * Se a fatura já estiver fechada, lança erro.
   */
  async closeInvoice(creditCardId: string, userId: string) {
    const card = await this.getCardOrThrow(creditCardId, userId);
    const { refMonth, refYear } = this.getCurrentReference(card.closingDay);

    // Verifica se já existe fatura para este período
    const existing = await this.prisma.creditCardInvoice.findUnique({
      where: {
        creditCardId_referenceMonth_referenceYear: {
          creditCardId,
          referenceMonth: refMonth,
          referenceYear: refYear,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Já existe uma fatura fechada para este período',
      );
    }

    const { closingDate, dueDate } = this.calcInvoiceDates(
      card.closingDay,
      card.dueDay,
      refMonth,
      refYear,
    );

    const { startDate, endDate } = this.getTransactionPeriod(
      refMonth,
      refYear,
      card.closingDay,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Cria a fatura
      const invoice = await tx.creditCardInvoice.create({
        data: {
          creditCardId,
          referenceMonth: refMonth,
          referenceYear: refYear,
          closingDate,
          dueDate,
          totalAmount: encryptAmount(0, this.encryption), // será atualizado após vincular transações
          userId,
        },
      });

      // 2. Busca transações do período (EXPENSE, com creditCardId, não faturadas)
      const transactions = await tx.transaction.findMany({
        where: {
          userId,
          creditCardId,
          deletedAt: null,
          invoiceId: null,
          date: { gte: startDate, lte: endDate },
          type: 'EXPENSE',
        },
        select: { id: true, amount: true },
      });

      if (transactions.length === 0) {
        // Fatura vazia — mantém totalAmount=0
        return tx.creditCardInvoice.findUnique({
          where: { id: invoice.id },
          include: { transactions: { include: { category: true } } },
        });
      }

      // 3. Vincula transações à fatura
      const transactionIds = transactions.map((t) => t.id);
      await tx.transaction.updateMany({
        where: { id: { in: transactionIds }, userId },
        data: { invoiceId: invoice.id },
      });

      // 4. Calcula totalAmount
      const totalAmount = transactions.reduce(
        (sum, t) => sum + decryptAmount(t.amount, this.encryption),
        0,
      );

      // 5. Atualiza totalAmount na fatura (scoped to userId)
      await tx.creditCardInvoice.updateMany({
        where: { id: invoice.id, userId },
        data: { totalAmount: encryptAmount(totalAmount, this.encryption) },
      });

      // 6. Retorna fatura completa
      return tx.creditCardInvoice.findUnique({
        where: { id: invoice.id },
        include: { transactions: { include: { category: true } } },
      });
    });
  }

  /**
   * Registra um pagamento (parcial ou total) em uma fatura.
   *
   * - Valida que a conta de débito pertence ao usuário
   * - Se amount não informado, paga o valor restante (totalAmount - paidAmount)
   * - Debita da conta (accountId)
   * - Se paidAmount >= totalAmount, marca isPaid=true e paidAt=now
   * - Se a fatura já está paga (isPaid=true), lança erro
   */
  async payInvoice(invoiceId: string, dto: PayInvoiceDto, userId: string) {
    const invoice = await this.getInvoiceOrThrow(invoiceId, userId);
    if (invoice.isPaid) {
      throw new BadRequestException('Esta fatura já está paga');
    }

    // Valida que a conta de débito pertence ao usuário
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException(
        'Conta não encontrada ou não pertence a este usuário',
      );
    }

    const remaining =
      decryptAmount(invoice.totalAmount, this.encryption) -
      decryptAmount(invoice.paidAmount, this.encryption);
    const payAmount = dto.amount !== undefined ? dto.amount : remaining;

    if (payAmount <= 0) {
      throw new BadRequestException('Valor de pagamento deve ser positivo');
    }

    if (payAmount > remaining) {
      throw new BadRequestException(
        `Valor de pagamento (${payAmount}) excede o valor restante (${remaining})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Debita da conta using atomic balance update with overdraft check
      await atomicBalanceUpdate(
        tx,
        dto.accountId,
        userId,
        -payAmount,
        this.encryption,
        true,
      );

      const newPaidAmount =
        decryptAmount(invoice.paidAmount, this.encryption) + payAmount;
      const isPaid =
        newPaidAmount >= decryptAmount(invoice.totalAmount, this.encryption);

      // Atualiza a fatura (updateMany não aceita include, fazemos em seguida)
      await tx.creditCardInvoice.updateMany({
        where: { id: invoiceId, userId },
        data: {
          paidAmount: encryptAmount(newPaidAmount, this.encryption),
          isPaid,
          paidAt: isPaid ? new Date() : null,
        },
      });

      const updated = await tx.creditCardInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          transactions: { include: { category: true } },
          creditCard: true,
        },
      });

      // Cria transação de pagamento da fatura para rastreabilidade
      await tx.transaction.create({
        data: {
          description: `Pagamento fatura ${invoice.creditCard.name} - ${String(invoice.referenceMonth).padStart(2, '0')}/${invoice.referenceYear}`,
          amount: encryptAmount(payAmount, this.encryption),
          date: new Date(),
          type: 'EXPENSE',
          accountId: dto.accountId,
          invoiceId,
          userId,
        },
      });

      return updated;
    });
  }

  /**
   * Retorna o histórico de faturas de um cartão (ordenado da mais recente para a mais antiga).
   */
  async getInvoiceHistory(creditCardId: string, userId: string) {
    await this.getCardOrThrow(creditCardId, userId);

    return this.prisma.creditCardInvoice.findMany({
      where: { creditCardId, userId },
      include: {
        transactions: {
          include: { category: true },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
    });
  }

  /**
   * Fecha faturas de TODOS os cartões cujo closingDay é hoje.
   * Chamado pelo scheduler diário. Retorna contagem de faturas fechadas.
   *
   * Para cada cartão ativo:
   * - Determina o mês de referência da fatura que fecha hoje
   * - Se já existe fatura para esse período, pula
   * - Senão, cria a fatura e vincula as transações do período
   */
  async closeAllDueInvoices(): Promise<{ closed: number; skipped: number }> {
    const today = new Date();
    const closingDay = today.getDate();

    // Busca todos os cartões ativos cujo fechamento é hoje
    const cards = await this.prisma.creditCard.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        userId: true,
        closingDay: true,
        dueDay: true,
        name: true,
      },
    });

    const dueCards = cards.filter((c) => c.closingDay === closingDay);
    if (dueCards.length === 0) {
      return { closed: 0, skipped: 0 };
    }

    let closed = 0;
    let skipped = 0;

    for (const card of dueCards) {
      const { refMonth, refYear } = this.getCurrentReference(card.closingDay);

      // Verifica se já existe fatura para este período
      const existing = await this.prisma.creditCardInvoice.findUnique({
        where: {
          creditCardId_referenceMonth_referenceYear: {
            creditCardId: card.id,
            referenceMonth: refMonth,
            referenceYear: refYear,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      try {
        await this.closeInvoice(card.id, card.userId);
        closed++;
      } catch (error) {
        // Log but don't fail the batch — one failing card shouldn't block others
        console.error(
          `Failed to close invoice for card ${card.id.slice(0, 8)}...:`,
          (error as Error).message,
        );
        skipped++;
      }
    }

    return { closed, skipped };
  }

  /**
   * Remove uma fatura e reverte qualquer impacto no saldo da conta.
   *
   * - Se a fatura tem pagamentos (paidAmount > 0), reverte o débito na conta
   * - Desvincula transações de compra (seta invoiceId=null, NÃO deleta)
   * - Deleta as transações de pagamento (aquelas criadas pelo payInvoice)
   * - Deleta a fatura
   */
  async remove(invoiceId: string, userId: string) {
    await this.getInvoiceOrThrow(invoiceId, userId);
    return this.prisma.$transaction(async (tx) => {
      // 1. Busca transações de PAGAMENTO vinculadas a esta fatura
      //    (criadas pelo payInvoice — são EXPENSE com accountId + invoiceId)
      const paymentTxs = await tx.transaction.findMany({
        where: {
          invoiceId,
          userId,
          deletedAt: null,
          type: 'EXPENSE',
          accountId: { not: null },
          description: { startsWith: 'Pagamento fatura' },
        },
        select: { id: true, amount: true, accountId: true },
      });

      // 2. Para cada pagamento, reverte o débito na conta (com lock)
      for (const p of paymentTxs) {
        if (p.accountId) {
          const payAmount = decryptAmount(p.amount, this.encryption);
          // Reverte: pagamento é EXPENSE que decrementou → agora incrementa
          await atomicBalanceUpdate(
            tx,
            p.accountId,
            userId,
            payAmount,
            this.encryption,
          );
        }
      }

      // 3. Deleta as transações de pagamento (hard delete — não faz sentido mantê-las)
      if (paymentTxs.length > 0) {
        await tx.transaction.deleteMany({
          where: { id: { in: paymentTxs.map((t) => t.id) }, userId },
        });
      }

      // 4. Desvincula transações de COMPRA (seta invoiceId=null, NÃO deleta)
      //    São as transações que representam gastos no cartão
      await tx.transaction.updateMany({
        where: { invoiceId, userId, deletedAt: null },
        data: { invoiceId: null },
      });

      // 5. Deleta a fatura (scoped to userId)
      await tx.creditCardInvoice.deleteMany({
        where: { id: invoiceId, userId },
      });

      return {
        deleted: true,
        revertedAmount: paymentTxs.reduce(
          (sum, t) => sum + decryptAmount(t.amount, this.encryption),
          0,
        ),
        revertedPayments: paymentTxs.length,
      };
    });
  }
}
