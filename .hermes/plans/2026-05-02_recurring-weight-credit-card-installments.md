# Plano: Recorrentes com Peso + Cartões de Crédito com Parcelas e Auto-Lançamento

**Data:** 2026-05-02
**Contexto:** O usuário quer dar utilidade real a duas funcionalidades que hoje existem mas são "vazias":
- **Recorrentes**: só marcam flag `isFixed` e agrupam. Precisa de modelo dedicado com "peso" (impacto no orçamento).
- **Cartões de Crédito**: só armazenam nome, limite, data de fechamento/vencimento. Precisam de parcelas associadas e auto-lançamento da despesa na conta vinculada quando vencer.

---

## Parte 1: Recorrentes com "Peso"

### Situação Atual

| Componente | Estado |
|---|---|
| Modelo | Não existe. Usa flag `isFixed` em Transaction |
| Backend | Nenhum endpoint dedicado a recorrentes |
| Frontend | `FixedItems.tsx` + `useFixedTransactions.ts` agrupam por descrição |
| Mobile | Não tem tela de recorrentes |
| Auto-lançamento | Não existe |

### Proposta

Criar um modelo `RecurringTransaction` dedicado, com scheduler que gera transações reais automaticamente, e indicador visual de "peso" (comprometimento da renda).

### Etapas

#### 1.1 — Modelo Prisma

**Arquivo:** `backend/prisma/schema.prisma`

```prisma
model RecurringTransaction {
  id          String        @id @default(uuid())
  description String
  amount      Decimal       @db.Decimal(15, 2)
  type        String        // INCOME, EXPENSE
  categoryId  String?
  accountId   String?
  creditCardId String?
  dueDay      Int           // 1-31
  startMonth  Int           // 1-12 (mês de início, default 1)
  endMonth    Int?          // 1-12 (mês de fim, null = indefinido)
  isActive    Boolean       @default(true)
  userId      String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  category     Category?    @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  account      Account?     @relation(fields: [accountId], references: [id], onDelete: SetNull)
  creditCard   CreditCard?  @relation(fields: [creditCardId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([userId, isActive])
}
```

**Peso** é calculado, não armazenado:
```
weight = (monthlyExpenseOfAllActiveRecurring / monthlyIncome) * 100
```

#### 1.2 — Migração

```bash
cd backend && npx prisma migrate dev --name add_recurring_transactions
```

#### 1.3 — Backend: Módulo, Service, Controller

**Novos arquivos:**
- `backend/src/recurring-transactions/recurring-transactions.module.ts`
- `backend/src/recurring-transactions/recurring-transactions.service.ts`
- `backend/src/recurring-transactions/recurring-transactions.controller.ts`
- `backend/src/recurring-transactions/dto/create-recurring-transaction.dto.ts`
- `backend/src/recurring-transactions/dto/update-recurring-transaction.dto.ts`

**Endpoints:**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/v1/recurring-transactions` | Listar recorrentes do usuário (ativos/inativos) |
| GET | `/v1/recurring-transactions/weight` | Retorna peso total (comprometimento da renda) |
| POST | `/v1/recurring-transactions` | Criar novo recorrente |
| PATCH | `/v1/recurring-transactions/:id` | Atualizar recorrente |
| DELETE | `/v1/recurring-transactions/:id` | Remover recorrente |
| PATCH | `/v1/recurring-transactions/:id/toggle` | Ativar/desativar |

#### 1.4 — Scheduler de Auto-Lançamento

**Arquivo:** `backend/src/recurring-transactions/recurring-scheduler.service.ts`

Usar `@nestjs/schedule` (já deve estar disponível no NestJS):
```typescript
@Cron('0 2 * * *') // Todo dia às 2h da manhã
async processRecurringTransactions() {
  // 1. Buscar todos os recorrentes ativos
  // 2. Para cada um, verificar se hoje é o dia de vencimento (dueDay)
  // 3. Verificar se já foi lançado este mês (por description + mês/ano)
  // 4. Criar Transaction com os dados do recorrente
  // 5. Atualizar saldo da conta (se accountId)
}
```

#### 1.5 — Frontend Web: Nova View de Recorrentes

**Novos arquivos:**
- `frontend/views/RecurringView.tsx`
- `frontend/services/recurringService.ts`

**Componentes:**
- Card de "Peso Total": barra de progresso colorida (verde <30%, amarelo 30-50%, vermelho >50%)
- Lista de recorrentes com toggle ativo/inativo
- Formulário de criação (descrição, valor, dia, tipo, categoria, conta)
- Indicador visual de cada recorrente (ícone da categoria, valor, próximo vencimento)

#### 1.6 — Mobile: Nova Tab de Recorrentes

**Arquivos a modificar:**
- `mobile/app/(tabs)/_layout.tsx` — adicionar tab "Recorrentes"
- `mobile/app/(tabs)/recurring.tsx` — NOVO
- `mobile/services/recurringService.ts` — NOVO

---

## Parte 2: Cartões de Crédito com Parcelas e Auto-Lançamento

### Situação Atual

| Componente | Estado |
|---|---|
| Modelo CreditCard | `name`, `limit`, `closingDay`, `dueDay`, `accountId` |
| Parcelas | Só existem como campos em Transaction (`currentInstallment`, `installmentCount`) |
| Auto-lançamento | Não existe |

### Proposta

Criar modelo `CreditCardInstallment` para compras parceladas, e scheduler que no dia do vencimento cria a transação de despesa na conta vinculada ao cartão.

### Etapas

#### 2.1 — Modelo Prisma

**Arquivo:** `backend/prisma/schema.prisma`

```prisma
model CreditCardInstallment {
  id                 String   @id @default(uuid())
  description        String
  totalAmount        Decimal  @db.Decimal(15, 2)
  installmentCount   Int
  currentInstallment Int      @default(0)
  amountPerMonth     Decimal  @db.Decimal(15, 2)
  startDate          DateTime
  dueDay             Int      // 1-31
  isActive           Boolean  @default(true)
  accountId          String?  // conta que será debitada
  creditCardId       String
  categoryId         String?
  userId             String
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  creditCard CreditCard @relation(fields: [creditCardId], references: [id], onDelete: Cascade)
  account    Account?   @relation(fields: [accountId], references: [id], onDelete: SetNull)
  category   Category?  @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([creditCardId])
  @@index([isActive])
}
```

E adicionar ao modelo `CreditCard`:
```prisma
  installments CreditCardInstallment[]
```

#### 2.2 — Migração

```bash
cd backend && npx prisma migrate dev --name add_credit_card_installments
```

#### 2.3 — Backend: Estender módulo de Credit Cards

**Novos arquivos:**
- `backend/src/credit-cards/dto/create-installment.dto.ts`
- `backend/src/credit-cards/dto/update-installment.dto.ts`

**Novos métodos no `CreditCardsService`:**
- `createInstallment(userId, dto)`
- `getInstallments(userId, creditCardId?)`
- `updateInstallment(id, userId, dto)`
- `deleteInstallment(id, userId)`

**Novos endpoints no `CreditCardsController`:**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/v1/credit-cards/:cardId/installments` | Adicionar compra parcelada |
| GET | `/v1/credit-cards/:cardId/installments` | Listar parcelas do cartão |
| GET | `/v1/credit-cards/installments` | Listar todas as parcelas do usuário |
| PATCH | `/v1/credit-cards/installments/:id` | Atualizar parcela |
| DELETE | `/v1/credit-cards/installments/:id` | Remover parcela |

#### 2.4 — Scheduler de Auto-Lançamento

**Mesmo scheduler dos recorrentes, estendido:**

```typescript
@Cron('0 2 * * *')
async processAutoTransactions() {
  await this.processRecurringTransactions();
  await this.processInstallments();
}

async processInstallments() {
  // 1. Buscar parcelas ativas
  // 2. Verificar se hoje é dia de vencimento (dueDay)
  // 3. Verificar se currentInstallment < installmentCount
  // 4. Criar Transaction de EXPENSE na conta vinculada
  // 5. Incrementar currentInstallment
  // 6. Se currentInstallment >= installmentCount → isActive = false
}
```

#### 2.5 — Frontend Web: Extensão da View de Cartões

**Arquivos a modificar:**
- `frontend/views/CreditCardView.tsx` — adicionar seção de parcelas
- `frontend/components/CreditCardDetails.tsx` — mostrar progresso das parcelas
- `frontend/services/creditCardService.ts` — adicionar métodos de parcela

**Funcionalidades visuais:**
- Barra de progresso da parcela (ex: "3/12 — Restam R$ 4.500,00")
- Lista de compras parceladas com status (ativa/concluída)
- Botão "Nova compra parcelada" com formulário:
  - Descrição, valor total, número de parcelas, dia de vencimento, categoria

#### 2.6 — Mobile: Extensão da View de Cartões

**Arquivos a modificar:**
- `mobile/app/(tabs)/credit-cards.tsx` — adicionar seção de parcelas
- `mobile/services/creditCardService.ts` — adicionar métodos de parcela

---

## Resumo de Arquivos

### Backend (11 novos/modificados)

| Arquivo | Ação |
|---|---|
| `backend/prisma/schema.prisma` | Adicionar 2 modelos |
| `backend/src/recurring-transactions/recurring-transactions.module.ts` | NOVO |
| `backend/src/recurring-transactions/recurring-transactions.service.ts` | NOVO |
| `backend/src/recurring-transactions/recurring-transactions.controller.ts` | NOVO |
| `backend/src/recurring-transactions/dto/create-recurring-transaction.dto.ts` | NOVO |
| `backend/src/recurring-transactions/dto/update-recurring-transaction.dto.ts` | NOVO |
| `backend/src/recurring-transactions/recurring-scheduler.service.ts` | NOVO |
| `backend/src/app.module.ts` | Adicionar imports dos novos módulos |
| `backend/src/credit-cards/credit-cards.service.ts` | Adicionar métodos de parcela |
| `backend/src/credit-cards/credit-cards.controller.ts` | Adicionar endpoints de parcela |
| `backend/src/credit-cards/dto/create-installment.dto.ts` | NOVO |

### Frontend Web (5 novos/modificados)

| Arquivo | Ação |
|---|---|
| `frontend/views/RecurringView.tsx` | NOVO |
| `frontend/services/recurringService.ts` | NOVO |
| `frontend/views/CreditCardView.tsx` | MODIFICAR — adicionar parcelas |
| `frontend/services/creditCardService.ts` | MODIFICAR — adicionar métodos |
| `frontend/App.tsx` | MODIFICAR — adicionar rota/aba "Recorrentes" |

### Mobile (4 novos/modificados)

| Arquivo | Ação |
|---|---|
| `mobile/app/(tabs)/recurring.tsx` | NOVO |
| `mobile/app/(tabs)/_layout.tsx` | MODIFICAR — adicionar tab |
| `mobile/services/recurringService.ts` | NOVO |
| `mobile/app/(tabs)/credit-cards.tsx` | MODIFICAR — adicionar parcelas |

---

## Validação

1. Criar recorrente "Aluguel" (R$ 1.500, dia 5, despesa) → verificar que peso atualiza
2. Criar recorrente "Salário" (R$ 5.000, dia 30, receita) → verificar que peso cai
3. Simular dia 5 → scheduler deve criar transação de R$ 1.500 na conta
4. Adicionar compra parcelada "iPhone" (12x R$ 500, vencimento dia 10) → ver barra de progresso
5. Simular dia 10 → scheduler deve criar transação, incrementar parcela

---

## Riscos

- **Scheduler em VPS de baixo recurso**: O `@nestjs/schedule` usa `setInterval` internamente. Precisa garantir que o processo PM2 não morra. Alternativa: cronjob externo que chama um endpoint.
- **Duplicidade de lançamento**: O scheduler precisa verificar se a transação do mês já existe (por `description + mês/ano + userId`) para não criar duplicatas.
- **Fuso horário**: Garantir que o scheduler use o fuso de Brasília (America/Sao_Paulo) para bater com `dueDay`.
- **Migração com dados existentes**: Transações antigas com `isFixed=true` podem ser migradas para o novo modelo, ou podem coexistir (depreciar `isFixed` aos poucos).
