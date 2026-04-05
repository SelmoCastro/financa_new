# INDEX — Finanza AI

> Gerado por `[ID]` em 03/04/2026. Mapa completo do projeto.

---

## Visão Geral

**Finanza AI** é um sistema de gestão financeira pessoal full-stack com três camadas:

| Camada | Stack | Versão | Deploy |
|--------|-------|--------|--------|
| **Frontend** (Web) | React 19 + Vite + Tailwind + Recharts | 1.1.0 | Vercel |
| **Backend** (API) | NestJS 11 + Prisma 5 + PostgreSQL (Neon) | 0.0.1 | Vercel |
| **Mobile** | Expo 54 + Expo Router + NativeWind | 1.0.0 | EAS Build |

---

## 🗄️ Banco de Dados — Modelos Prisma

```
User ──┬── Account ──── CreditCard
       ├── Transaction ──┬── Account?
       │                ├── Category?
       │                └── CreditCard?
       ├── Category
       ├── Budget
       ├── Goal
       ├── Feedback
       ├── Notification
       ├── TransactionInvite (Social - enviadas/recebidas)
       ├── ImportedFitId (deduplicação OFX)
       └── VerificationToken (email verification)
```

| Modelo | Campos Chave |
|--------|-------------|
| `User` | id, email, password, name, isAdmin, isEmailVerified |
| `Account` | id, name, type, balance |
| `CreditCard` | id, name, limit, closingDay, dueDay |
| `Category` | id, name, color, icon, type |
| `Transaction` | id, description, amount, date, type, isFixed, receiptUrl, fitId, installmentCount |
| `Budget` | id, category, amount — único por (userId, category) |
| `Goal` | id, title, targetAmount, currentAmount, deadline |
| `Notification` | id, title, message, type, isRead, metadata (JSON) |
| `TransactionInvite` | id, amount, status (PENDING), senderId, recipientEmail |
| `ImportedFitId` | fitId, status — evita re-importação de OFX |

---

## 🔧 Backend — NestJS Modules

```
src/
├── app.module.ts        ← root, Throttler 100req/60s global
├── auth/               ← JWT, Refresh Token, Passport
├── users/              ← CRUD + perfil
├── transactions/        ← CRUD + filtros + OFX import
├── accounts/           ← contas bancárias
├── credit-cards/       ← cartões de crédito
├── categories/         ← categorias custom
├── budgets/            ← orçamentos por categoria
├── goals/              ← metas financeiras
├── notifications/      ← centro de notificações
├── reports/            ← relatórios e exportações
├── ai/                 ← integração Google Gemini (@google/genai)
├── social/             ← convites de transação compartilhada
├── feedback/           ← feedbacks de usuários
├── email/              ← Nodemailer + Resend
└── prisma/             ← PrismaService
```

**Dependências externas:** `@google/genai`, `openai`, `nodemailer`, `resend`, `xml2js` (OFX), `bcrypt`, `helmet`

---

## 🖥️ Frontend — React Web

```
frontend/
├── App.tsx             ← roteamento, auth, contexto global
├── Main.tsx            ← providers
├── types.ts            ← interfaces TypeScript
├── constants.tsx       ← categorias padrão, constantes
├── context/            ← AuthContext, TransactionContext
├── hooks/              ← useTransactions, etc.
├── services/           ← axios API client
├── utils/              ← formatCurrency, datas
├── components/
│   ├── Sidebar.tsx       ← nav desktop + bottom nav mobile
│   ├── StatCard.tsx      ← cards KPI (grid 2x2 mobile)
│   ├── TransactionForm.tsx ← formulário principal (21k)
│   ├── ImportOverlay.tsx  ← importação OFX/CSV (40k)
│   ├── NotificationCenter.tsx ← notificações (16k)
│   ├── ChatWidget.tsx     ← chat IA Gemini
│   ├── ActionMenu.tsx     ← menu de ações header
│   └── MonthSelector.tsx  ← seletor de mês
└── views/
    ├── DashboardView.tsx  ← overview + Regra 50/30/20 (31k)
    ├── AccountsView.tsx   ← contas & cartões (21k)
    ├── GoalsView.tsx      ← metas (26k)
    ├── BudgetsView.tsx    ← orçamentos (18k)
    ├── HistoryView.tsx    ← extrato (12k)
    ├── TimelineView.tsx   ← linha do tempo (5k)
    ├── FixedItems.tsx     ← controle de fixos (12k)
    ├── SettingsView.tsx   ← ajustes (8k)
    └── FeedbackAdminView.tsx ← admin feedbacks
```

**Stack:** React 19 · Framer Motion · Recharts · Lucide · TailwindCSS 3 · Vite 6

---

## 📱 Mobile — Expo / React Native

```
mobile/
├── app/
│   ├── _layout.tsx       ← root layout + autenticação
│   ├── index.tsx         ← login screen
│   ├── signup.tsx        ← cadastro
│   └── (tabs)/           ← navegação principal por abas
├── components/
│   ├── TransactionModal.tsx   ← form de transação (38k)
│   ├── ImportModal.tsx        ← importação OFX (30k)
│   ├── AiInsightsWidget.tsx   ← insights IA (10k)
│   ├── AiChatWidget.tsx       ← chat IA (9k)
│   ├── InviteNotification.tsx ← convites sociais (14k)
│   ├── CategoryChart.tsx      ← gráfico de categorias
│   ├── MonthlyBarChart.tsx    ← gráfico mensal
│   └── MonthSelector.tsx      ← seletor de mês
├── context/
│   ├── AuthContext.tsx
│   ├── TransactionsContext.tsx
│   └── CurrencyContext.tsx
└── services/             ← chamadas API
```

**Stack:** Expo 54 · Expo Router 6 · NativeWind 4 · react-native-gifted-charts · expo-image-picker · expo-secure-store

---

## 🔑 Funcionalidades Implementadas

| Feature | Web | Mobile |
|---------|-----|--------|
| Auth (login / signup / email verify) | ✅ | ✅ |
| Dashboard com KPIs | ✅ | ✅ |
| Transações CRUD | ✅ | ✅ |
| Importação OFX/CSV | ✅ | ✅ |
| Contas & Cartões | ✅ | ✅ |
| Orçamentos (Budget) | ✅ | ✅ |
| Metas (Goals) | ✅ | ✅ |
| Controle de Fixos | ✅ | ⚠️ parcial |
| Chat IA (Gemini) | ✅ | ✅ |
| Insights IA | ✅ | ✅ |
| Notificações | ✅ | ✅ |
| Convites Sociais | ✅ | ✅ |
| Relatórios | ✅ | ❌ |
| Comprovantes (foto AI) | ⚠️ campo | ⚠️ picker ok |
| Dark Mode | ✅ | ✅ |

---

## 🚧 Pontos de Atenção / Débito Técnico

1. **Scripts de debug soltos no backend** — `check-users.js`, `test_db.ts`, `debug-db.ts` etc. na raiz (devem ir para `/scripts`)
2. **Budget usa categoria como string** — não usa FK para `Category`, quebrando consistência
3. **`receiptUrl` existe no schema** — mas a funcionalidade de IA Vision não está completa
4. **Mobile sem tela de Relatórios** — presente no web, ausente no mobile
5. **Sem testes automatizados ativos** — estrutura de test/ existe mas cobertura mínima
6. **`Categorizer.ts` é stub** — arquivo de 12 bytes, feature planejada não implementada

---

## 📁 Arquivos Raiz Relevantes

| Arquivo | Função |
|---------|--------|
| `BACKLOG.md` | Épicos e histórias pendentes |
| `BMAD-GUIDE.md` | Guia do framework BMad |
| `INDEX.md` | Este arquivo (mapa do projeto) |
| `fix_icons.js` | Script de correção one-off |
| `.env.local` | Variáveis de ambiente (não commitado) |
