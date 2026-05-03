# Plano: Frontend de Recorrentes + Parcelas de Cartão + Notificações Interativas

> **Para Hermes:** Use subagent-driven-development skill para implementar task por task.

**Data:** 2026-05-03

**Meta:** Implementar as interfaces web e mobile para gerenciar Recorrentes (com peso) e Parcelas de Cartão de Crédito, com notificações interativas no vencimento em vez de auto-lançamento silencioso.

**Contexto:** O backend (v1.7.39) já tem os modelos `RecurringTransaction` + `CreditCardInstallment` com CRUD completo. Mas ninguém consegue usar porque o frontend/mobile não foram feitos. O scheduler atual faz lançamento automático sem perguntar — o usuário quer notificações interativas ("Já pagou o Aluguel de R$ 1.500?") com ação de confirmar.

**Arquitetura:**
1. Backend: converter `AutoTransactionScheduler` de auto-lançamento para gerar notificações com ação
2. Backend: endpoint `POST /v1/notifications/:id/action` para confirmar/adiar notificação e criar transação
3. Frontend: nova view `RecurringView.tsx` substituindo o antigo `FixedItems`
4. Frontend: seção de parcelas dentro da view de Contas/Cartões
5. Mobile: tab "Recorrentes" + seção de parcelas nos Cartões
6. Remover dependência do antigo `isFixed` e `useFixedTransactions`

**Tech Stack:** NestJS 11, Prisma 5, React 19 + Vite, Expo SDK 54, Tailwind, Framer Motion

---

## ⚠️ PITFALLS (leia antes de implementar qualquer task)

- **Prisma Decimal → Number()**: campos `amount` dos modelos são `Decimal`. Sempre converter com `Number()` antes de operações matemáticas ou exibição.
- **Response envelope**: toda resposta da API é `{ statusCode, data, timestamp }`. O interceptor do frontend (`api.ts:49-54`) já faz unwrap de `.data`. As responses dos novos endpoints DEVEM retornar o valor diretamente (o TransformInterceptor wrappa sozinho). NÃO retornar `{ data: ... }` manualmente.
- **User-scoped queries**: todo service deve incluir `userId` no `where`. Sem exceção.
- **Versionamento**: endpoints novos precisam de `version: '1'` no controller. Sem isso dá 404.
- **Balance update**: criar transação + atualizar saldo da conta DEVE ser atômico via `$transaction`.
- **Mobile**: `expo-file-system/legacy` (SDK 54+). `Platform.Version` é `number` no Android.
- **Mobile tabs**: layout é `mobile/app/(tabs)/_layout.tsx`. Cada tab precisa de um arquivo na pasta.
- **Lucide icons podem falhar no build** — preferir emoji ou SVG inline quando possível.

---

## FASE 0 — Backend: Notificações Interativas

### Task 0.1: Estender modelo Notification com campos de ação

**Objetivo:** Adicionar campos para notificações interativas (tipo de ação, payload para confirmar/adiar).

**Arquivos:**
- Modificar: `backend/prisma/schema.prisma`

**Implementação:**

Adicionar ao modelo `Notification`:
```prisma
model Notification {
  id          String   @id @default(uuid())
  userId      String
  title       String
  message     String
  type        String   // info, warning, success, ACTION_RECURRING, ACTION_INSTALLMENT
  isRead      Boolean  @default(false)
  // NOVOS CAMPOS:
  actionType  String?  // CONFIRM_PAYMENT, POSTPONE
  actionMeta  Json?    // { recurringTransactionId, installmentId, amount, description, accountId, categoryId }
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([userId, isRead])
}
```

**Verificação:** `npx prisma migrate dev --name add_notification_actions` deve criar migration sem erros.

---

### Task 0.2: Criar endpoint de ação em notificações

**Objetivo:** Endpoint que processa a ação do usuário (confirmar pagamento) e cria a transação.

**Arquivos:**
- Modificar: `backend/src/notifications/notifications.controller.ts`
- Modificar: `backend/src/notifications/notifications.service.ts`

**Implementação:**

No controller, adicionar:
```typescript
@Post(':id/action')
async handleAction(
  @Param('id') id: string,
  @Body() body: { action: string }, // 'confirm' | 'postpone'
  @Request() req,
) {
  return this.notificationsService.handleAction(id, body.action, req.user.userId);
}
```

No service, adicionar método `handleAction`:
```typescript
async handleAction(id: string, action: string, userId: string) {
  const notif = await this.prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notif) throw new NotFoundException('Notificação não encontrada');
  
  const meta = notif.actionMeta as any;
  
  if (action === 'confirm') {
    if (notif.actionType === 'CONFIRM_PAYMENT') {
      // Criar transação com $transaction (atomicidade)
      const [transaction] = await this.prisma.$transaction([
        this.prisma.transaction.create({
          data: {
            description: meta.description,
            amount: meta.amount,
            date: new Date(),
            type: 'EXPENSE',
            categoryId: meta.categoryId,
            accountId: meta.accountId,
            creditCardId: meta.creditCardId || null,
            userId,
            isFixed: true,
          },
        }),
        // Se tem accountId, atualizar saldo
        ...(meta.accountId ? [
          this.prisma.account.update({
            where: { id: meta.accountId },
            data: { balance: { decrement: Number(meta.amount) } },
          }),
        ] : []),
      ]);

      // Se for parcela de cartão, incrementar installment
      if (meta.installmentId) {
        const inst = await this.prisma.creditCardInstallment.findFirst({
          where: { id: meta.installmentId, userId },
        });
        if (inst) {
          const next = inst.currentInstallment + 1;
          await this.prisma.creditCardInstallment.update({
            where: { id: meta.installmentId },
            data: {
              currentInstallment: next,
              isActive: next < inst.installmentCount,
            },
          });
        }
      }
      
      // Marcar notificação como lida
      await this.prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
      
      return { success: true, transactionId: transaction.id };
    }
  }
  
  if (action === 'postpone') {
    // Marcar como lida sem criar transação
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return { success: true, postponed: true };
  }
  
  throw new BadRequestException('Ação inválida');
}
```

**Verificação:** Compilar backend sem erros: `cd backend && npx tsc --noEmit`

---

### Task 0.3: Modificar scheduler para gerar notificações (não transações)

**Objetivo:** Trocar o comportamento do `AutoTransactionScheduler` — em vez de criar transação direto, criar notificação interativa.

**Arquivos:**
- Modificar: `backend/src/scheduler/auto-transaction.scheduler.ts`

**Implementação:**

Substituir o método `processRecurringTransactions`:
```typescript
private async processRecurringTransactions() {
    const today = new Date();
    const dueDay = today.getDate();
    const currentMonth = today.getMonth() + 1;

    const recorrentes = await this.prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        dueDay,
        startMonth: { lte: currentMonth },
        OR: [
          { endMonth: null },
          { endMonth: { gte: currentMonth } },
        ],
      },
    });

    let notified = 0;
    for (const r of recorrentes) {
      // Check if already notified this month
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: r.userId,
          type: 'ACTION_RECURRING',
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
          actionMeta: { path: ['recurringTransactionId'], equals: r.id },
        },
      });

      if (existing) {
        this.logger.debug(`  ⏭️ Skipping "${r.description}" — already notified`);
        continue;
      }

      await this.prisma.notification.create({
        data: {
          userId: r.userId,
          title: '💰 Despesa Recorrente',
          message: `"${r.description}" de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.amount))} vence hoje. Já foi pago?`,
          type: 'ACTION_RECURRING',
          actionType: 'CONFIRM_PAYMENT',
          actionMeta: {
            recurringTransactionId: r.id,
            description: r.description,
            amount: r.amount,
            accountId: r.accountId,
            categoryId: r.categoryId,
            creditCardId: r.creditCardId,
          },
        },
      });

      this.logger.log(`  🔔 Notified: "${r.description}" — R$ ${Number(r.amount).toFixed(2)}`);
      notified++;
    }

    if (notified > 0) {
      this.logger.log(`📋 Generated ${notified} recurring notification(s)`);
    }
  }
```

Substituir o método `processInstallments` similarmente, com `type: 'ACTION_INSTALLMENT'` e `actionMeta` incluindo `installmentId`.

**Verificação:** `cd backend && npx tsc --noEmit` sem erros.

---

### Task 0.4: Commit Fase 0

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/ backend/src/notifications/ backend/src/scheduler/
git commit -m "feat: convert auto-scheduler to interactive notifications with confirm/postpone actions"
```

---

## FASE 1 — Frontend Web: Services

### Task 1.1: Criar recurringService.ts

**Objetivo:** Service layer para chamadas de API de recorrentes.

**Arquivos:**
- Criar: `frontend/services/recurringService.ts`

**Implementação:**

```typescript
import api from './api';

export interface RecurringTransactionDTO {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  dueDay: number;
  startMonth: number;
  endMonth: number | null;
  isActive: boolean;
  categoryId: string | null;
  accountId: string | null;
  creditCardId: string | null;
  category: any;
  account: any;
  creditCard: any;
}

export interface WeightData {
  totalFixedExpense: number;
  monthlyIncome: number;
  weight: number;
  count: number;
}

export const recurringService = {
  getAll: () => api.get('/recurring-transactions'),
  
  getWeight: () => api.get('/recurring-transactions/weight'),
  
  create: (data: {
    description: string;
    amount: number;
    type: string;
    dueDay: number;
    startMonth?: number;
    endMonth?: number | null;
    categoryId?: string | null;
    accountId?: string | null;
    creditCardId?: string | null;
  }) => api.post('/recurring-transactions', data),
  
  update: (id: string, data: any) => api.patch(`/recurring-transactions/${id}`, data),
  
  remove: (id: string) => api.delete(`/recurring-transactions/${id}`),
  
  toggle: (id: string) => api.patch(`/recurring-transactions/${id}/toggle`),
};
```

**Verificação:** Compilar sem erros.

---

### Task 1.2: Criar creditCardService.ts (estender existente ou criar)

**Objetivo:** Service para chamadas de parcelas de cartão.

**Arquivos:**
- Criar: `frontend/services/creditCardService.ts`

**Implementação:**

```typescript
import api from './api';

export interface CreditCardInstallmentDTO {
  id: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  currentInstallment: number;
  amountPerMonth: number;
  dueDay: number;
  isActive: boolean;
  accountId: string | null;
  creditCardId: string;
  categoryId: string | null;
  category: any;
  account: any;
  creditCard: any;
}

export const creditCardService = {
  getInstallments: (cardId?: string) => 
    cardId 
      ? api.get(`/credit-cards/${cardId}/installments`)
      : api.get('/credit-cards/installments/all'),
  
  createInstallment: (cardId: string, data: {
    description: string;
    totalAmount: number;
    installmentCount: number;
    dueDay: number;
    accountId?: string | null;
    categoryId?: string | null;
  }) => api.post(`/credit-cards/${cardId}/installments`, data),
  
  updateInstallment: (id: string, data: any) => 
    api.patch(`/credit-cards/installments/${id}`, data),
  
  deleteInstallment: (id: string) => 
    api.delete(`/credit-cards/installments/${id}`),
};
```

**Verificação:** Compilar sem erros.

---

### Task 1.3: Commit Fase 1

```bash
git add frontend/services/recurringService.ts frontend/services/creditCardService.ts
git commit -m "feat: add recurring and installment service layers"
```

---

## FASE 2 — Frontend Web: Views

### Task 2.1: Criar RecurringView.tsx (substitui FixedItems)

**Objetivo:** Nova view completa de Recorrentes com indicador de peso, lista CRUD e toggle ativo/inativo.

**Arquivos:**
- Criar: `frontend/views/RecurringView.tsx`

**Implementação:**

Componente React com:
- **Card de Peso**: barra de progresso colorida (verde <30%, amarelo 30-50%, vermelho >50%). Mostra "X% da renda comprometida" com indicador visual.
- **Lista de recorrentes**: cards com ícone da categoria, descrição, valor, dia do vencimento, toggle ativo/inativo.
- **Botão "+ Novo Recorrente"**: abre modal com formulário (descrição, valor, tipo, dia, categoria, conta).
- **Editar/Excluir**: ícones de ação em cada card.

Usar `useState` + `useEffect` para buscar dados via `recurringService`. Estado local para modal de criação. Loading/empty states.

**Layout base:**
```tsx
import React, { useState, useEffect } from 'react';
import { recurringService, RecurringTransactionDTO, WeightData } from '../services/recurringService';
import { useData } from '../context/DataProvider';
import { useCurrency } from '../context/CurrencyContext';
// ... lucide icons ou emoji

export const RecurringView: React.FC = () => {
  const [recorrentes, setRecorrentes] = useState<RecurringTransactionDTO[]>([]);
  const [weight, setWeight] = useState<WeightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { accounts, categories, refreshData } = useData();
  const { formatCurrency } = useCurrency();

  // fetch data on mount + refresh
  // render weight bar + list + form modal
  // ...
};
```

**Estilo:** Seguir padrão visual existente (cards rounded-2xl, cores cyan/slate, fonte bold, etc.). Manter consistência com AccountsView e BudgetsView.

**Verificação:** Ao abrir a aba "Recorrentes", deve mostrar a view (mesmo que vazia inicialmente).

---

### Task 2.2: Adicionar seção de Parcelas no AccountsView

**Objetivo:** Dentro da view de Contas & Cartões, cada cartão expandido mostra suas parcelas.

**Arquivos:**
- Modificar: `frontend/views/AccountsView.tsx`

**Implementação:**

No card expandido de cada cartão de crédito, adicionar seção "Compras Parceladas":
- Lista de parcelas com: descrição, valor/mês, progresso (ex: "3/12"), status (ativa/concluída).
- Botão "+ Nova Compra Parcelada" que abre modal com formulário (descrição, valor total, nº parcelas, dia vencimento, categoria, conta para débito).

Importar e usar `creditCardService`. Manter estado local para parcelas de cada cartão via `useEffect`.

**Verificação:** Expandir um cartão deve mostrar lista de parcelas (vazia ou com dados). Botão de adicionar deve abrir formulário.

---

### Task 2.3: Atualizar NotificationCenter para notificações de ação

**Objetivo:** NotificationCenter existente já mostra convites sociais. Agora também deve mostrar notificações de `ACTION_RECURRING` e `ACTION_INSTALLMENT` com botões "Confirmar" / "Adiar".

**Arquivos:**
- Modificar: `frontend/components/NotificationCenter.tsx`

**Implementação:**

No `fetchInvites` (ou renomear para `fetchNotifications`):
- Fazer GET `/v1/notifications` para buscar notificações não lidas
- Filtrar por `type: 'ACTION_RECURRING'` ou `'ACTION_INSTALLMENT'` (além dos invites sociais existentes)

Para notificações de ação, renderizar card com:
- Ícone (💰 para recorrente, 💳 para parcela)
- Mensagem da notificação
- Botões: "✅ Confirmar" (chama `POST /v1/notifications/:id/action` com `{ action: 'confirm' }`) e "⏰ Adiar" (chama com `{ action: 'postpone' }`)

Manter polling de 60s existente. Após confirmar/adiar, fazer `refreshData()`.

**Verificação:** Quando houver notificação de ação, deve aparecer no sino com badge e mostrar modal com botões de ação.

---

### Task 2.4: Commit Fase 2

```bash
git add frontend/views/RecurringView.tsx frontend/views/AccountsView.tsx frontend/components/NotificationCenter.tsx
git commit -m "feat: add RecurringView, installment section in AccountsView, and action notifications"
```

---

## FASE 3 — Frontend Web: Integração e Limpeza

### Task 3.1: Atualizar App.tsx para usar RecurringView

**Objetivo:** Trocar a aba "fixed" de FixedItems para RecurringView.

**Arquivos:**
- Modificar: `frontend/App.tsx`

**Implementação:**

No `renderContent`, trocar o case `'fixed'`:
```tsx
case 'fixed':
  return <RecurringView />;
```

Remover imports não usados (`FixedItems`, `useFixedTransactions`) se não forem mais referenciados.

**Verificação:** Clicar em "Recorrentes" no sidebar deve abrir a nova view.

---

### Task 3.2: Remover dependências do antigo sistema isFixed

**Objetivo:** Limpar código obsoleto após migração para novo sistema de recorrentes.

**Arquivos:**
- Verificar: `frontend/components/FixedItems.tsx` (remoção segura?)
- Verificar: `frontend/hooks/useFixedTransactions.ts` (remoção segura?)
- Verificar: `frontend/App.tsx` (uso de `forecast`)

**Implementação:**

Verificar se `FixedItems` e `useFixedTransactions` são usados em outro lugar além do App.tsx. Se não forem:
- Remover imports do App.tsx
- Opcionalmente manter os arquivos (não quebrar build, só não importar)

O `forecast` é calculado mas usado no FixedItems. Remover a chamada `useFixedTransactions` do App.tsx também.

**Verificação:** `cd frontend && npx vite build` — build deve passar sem erros.

---

### Task 3.3: Commit Fase 3

```bash
git add frontend/App.tsx frontend/components/FixedItems.tsx frontend/hooks/useFixedTransactions.ts
git commit -m "refactor: switch to RecurringView, deprecate isFixed-based system"
```

---

## FASE 4 — Mobile: Tab de Recorrentes

### Task 4.1: Criar recurringService para mobile

**Objetivo:** Service layer mobile compatível com Expo.

**Arquivos:**
- Criar: `mobile/services/recurringService.ts`

**Implementação:**

Idêntico ao `frontend/services/recurringService.ts`, mas importar `api` de `mobile/services/api.ts`.

**Verificação:** Compilar mobile sem erros.

---

### Task 4.2: Criar tab de Recorrentes

**Objetivo:** Nova tela na tab bar para listar e gerenciar recorrentes.

**Arquivos:**
- Criar: `mobile/app/(tabs)/recurring.tsx`
- Modificar: `mobile/app/(tabs)/_layout.tsx`

**Implementação:**

Em `_layout.tsx`, adicionar nova tab:
```tsx
<Tabs.Screen
  name="recurring"
  options={{
    title: 'Recorrentes',
    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔁</Text>,
  }}
/>
```

Em `recurring.tsx`, criar componente similar ao padrão das outras tabs:
- `FlatList` com cards de recorrentes
- Indicador de peso no header
- Botão "+" para novo recorrente (modal com formulário)
- Toggle ativo/inativo
- Swipe para deletar ou botão de editar

**Verificação:** Rodar `cd mobile && npm start` — deve aparecer a tab "Recorrentes".

---

### Task 4.3: Commit Fase 4

```bash
git add mobile/services/recurringService.ts mobile/app/(tabs)/recurring.tsx mobile/app/(tabs)/_layout.tsx
git commit -m "feat(mobile): add Recurring tab with weight indicator"
```

---

## FASE 5 — Mobile: Parcelas nos Cartões

### Task 5.1: Adicionar seção de parcelas na tela de Cartões

**Objetivo:** Extender a tela existente de cartões de crédito para mostrar e gerenciar parcelas.

**Arquivos:**
- Modificar: `mobile/app/(tabs)/credit-cards.tsx`
- Criar (se não existir): `mobile/services/creditCardService.ts`

**Implementação:**

Na tela de cartões, para cada cartão expandido:
- `SectionList` ou sub-lista com as parcelas
- Progresso visual (barra ou texto "3/12")
- Botão "+ Nova compra parcelada" com modal de formulário

Se não existir service, criar `mobile/services/creditCardService.ts` similar ao web.

**Verificação:** Expandir um cartão na tab "Cartões" deve mostrar suas parcelas.

---

### Task 5.2: Commit Fase 5

```bash
git add mobile/app/(tabs)/credit-cards.tsx mobile/services/creditCardService.ts
git commit -m "feat(mobile): add installment management in credit cards tab"
```

---

## FASE 6 — Integração Final

### Task 6.1: Bump versão para v1.8.0

```bash
npm run release:minor
```

Corrigir `version-meta.json` manualmente se necessário (bug do bump.sh).

**Verificação:** `cat version-meta.json` deve mostrar `"version": "1.8.0"`.

---

### Task 6.2: Build e deploy local

```bash
# Backend build
cd backend && npm run build

# Frontend build  
cd frontend && npm run build

# Deploy no VPS
./scripts/deploy.sh
```

---

### Task 6.3: Build APK local

```bash
cd mobile
npx eas build --platform android --profile preview --local
```

---

### Task 6.4: Upload APK pro VPS

```bash
# Copiar APK pro VPS
scp mobile/build-*.apk selmo@2.24.211.92:/var/www/finanzaai.tech/downloads/Financa_new_v1.8.0.apk

# Atualizar symlink no VPS
ssh selmo@2.24.211.92 "cd /var/www/finanzaai.tech/downloads && rm -f Financa_new.apk && ln -s Financa_new_v1.8.0.apk Financa_new.apk"

# Atualizar version-meta.json no VPS com APK URL
```

---

## Validação Final

1. ✅ Criar recorrente "Aluguel" (R$ 1.500, dia 5, despesa) → peso deve mostrar % atualizado
2. ✅ Criar recorrente "Salário" (R$ 5.000, dia 30, receita) → peso deve cair
3. ✅ No dia do vencimento, notification center deve mostrar "Aluguel vence hoje. Já pagou?"
4. ✅ Clicar "Confirmar" → transação criada, saldo debitado, notificação marcada lida
5. ✅ Adicionar compra parcelada "iPhone" (12x R$ 500) no cartão → deve aparecer na lista
6. ✅ No vencimento da parcela, mesma lógica de notificação
7. ✅ Mobile: tab Recorrentes funcional, parcelas visíveis nos cartões
8. ✅ Build web e APK sem erros
