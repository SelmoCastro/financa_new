# 🚀 Finanza AI — Dashboard Financeiro Inteligente

> Controle financeiro pessoal com IA, importação de extratos OFX, leitura de comprovantes por visão computacional e app mobile.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.0--dev-blue" alt="Version" />
  <img src="https://img.shields.io/badge/backend-NestJS%20v11-ea2845" alt="Backend" />
  <img src="https://img.shields.io/badge/frontend-React%2019-61dafb" alt="Frontend" />
  <img src="https://img.shields.io/badge/mobile-Expo%20SDK%2054-000020" alt="Mobile" />
  <img src="https://img.shields.io/badge/database-PostgreSQL-336791" alt="Database" />
  <img src="https://img.shields.io/badge/AI-Gemini%20via%20OpenRouter-4285f4" alt="AI" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## ✨ Funcionalidades

### 💰 Gestão Financeira Completa
- **Transações** — CRUD com parcelas, itens fixos e compartilhamento entre usuários
- **Contas Bancárias** — Múltiplas contas com saldo em tempo real
- **Cartões de Crédito** — Limite, dia de fechamento e vencimento
- **Categorias** — Personalizáveis com ícones e cores
- **Orçamentos** — Tetos de gastos por categoria com acompanhamento percentual
- **Metas** — Cofres para objetivos com prazo e progresso

### 🤖 Inteligência Artificial (Gemini via OpenRouter)
| Capacidade | Descrição |
|---|---|
| **Chat Financeiro** | Assistente em PT-BR com contexto real dos seus dados |
| **Categorização Automática** | Classifica transações OFX nas suas categorias |
| **Insights Inteligentes** | 3 dicas de ouro baseadas no seu mês |
| **Previsão Mensal** | Prevê se terminará no vermelho ou verde |
| **Detecção de Assinaturas** | Audita gastos recorrentes |
| **Leitor de Comprovantes** | Extrai dados de fotos/PDFs (PIX, TED, cupons, extratos) |
| **Limpeza de Descrições** | Normaliza descrições confusas de extratos |

### 📊 Dashboard & Relatórios
- **Regra 50/30/20** — Necessidades, Desejos e Objetivos
- **Gráficos Interativos** — Pizza, barras, tendências month-over-month
- **Modo Privacidade** — Blur em todos os valores com um clique
- **Dark Mode** — Tema escuro completo (web + mobile)

### 📥 Importação Inteligente
- **OFX/QFX** — Deduplicação em 4 camadas (FITID, histórico, content match, fuzzy hash)
- **Comprovantes (AI Vision)** — JPG/PNG/WEBP/PDF com extração de valor, data, descrição e CNPJ
- **CSV Export** — Exportação para planilhas

### 📱 App Mobile (Expo)
- Abas: Dashboard, Transações, Contas, Orçamentos, Metas
- Captura de comprovantes pela câmera
- Chat AI integrado

### 🔔 Social & Notificações
- Compartilhamento de transações por e-mail
- Notificações in-app em tempo real
- Verificação de e-mail no signup

---

## 🏗️ Arquitetura

```
financa-new/
├── backend/              # NestJS v11 — API REST
│   ├── src/
│   │   ├── accounts/     # Contas bancárias
│   │   ├── ai/           # IA (chat, insights, vision)
│   │   ├── auth/         # JWT + refresh tokens
│   │   ├── budgets/      # Orçamentos
│   │   ├── categories/   # Categorias
│   │   ├── credit-cards/ # Cartões de crédito
│   │   ├── email/        # Nodemailer + Resend
│   │   ├── feedback/     # Feedback
│   │   ├── goals/        # Metas
│   │   ├── notifications/# Notificações
│   │   ├── reports/      # Dashboard, perfis, histórico
│   │   ├── social/       # Compartilhamento
│   │   ├── transactions/ # CRUD, imports, receipts
│   │   └── users/        # Usuários
│   └── prisma/schema.prisma
├── frontend/             # React 19 + Vite 6 + TypeScript
│   ├── views/            # Dashboard, Accounts, Budgets...
│   ├── components/       # Sidebar, ChatWidget, ImportOverlay...
│   └── context/          # Auth, Currency, Data
└── mobile/               # Expo SDK 54 + React Native
    ├── app/              # Expo Router
    ├── components/       # TransactionModal, ImportModal...
    └── context/          # Auth, Transactions, Currency
```

---

## 🛠️ Stack

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite 6 · Tailwind CSS 3 · Recharts · Framer Motion |
| **Backend** | NestJS 11 · Prisma 5 · PostgreSQL · JWT · Passport · Helmet · Throttler · Swagger |
| **Mobile** | Expo 54 · RN 0.81 · Expo Router · NativeWind · Gifted Charts · FlashList |
| **IA** | OpenRouter · Gemini 2.0 Flash · `@google/genai` · `openai` SDK |
| **Infra** | Neon PostgreSQL · Vercel · Render · Docker (dev) |

---

## 🗄️ Modelo de Dados

```
User ───┬─── Account ───┬─── Transaction ─── Category
        │               ├─── CreditCard
        │               └─── Budget
        ├─── Category
        ├─── Goal
        ├─── Notification
        └─── TransactionInvite ─── User
```

---

## 🚀 Começando

### Pré-requisitos
- Node.js 18+
- PostgreSQL (Docker ou cloud)

### 1. Clone
```bash
git clone https://github.com/SelmoCastro/financa_new.git
cd financa_new
```

### 2. Banco de Dados (Docker)
```bash
cd backend
docker-compose up -d
```

### 3. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edite: DATABASE_URL, JWT_SECRET, OPENROUTER_API_KEY, FRONTEND_URL
npx prisma generate
npx prisma migrate dev
npm run start:dev
```
API: `http://localhost:3000` | Swagger: `http://localhost:3000/api/docs`

### 4. Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Web: `http://localhost:5173`

### 5. Mobile (opcional)
```bash
cd ../mobile
npm install
npm start
```

### ⚡ Setup Automático
```bash
chmod +x start.sh
./start.sh
# Opção 6 = setup completo
```

---

## 🔑 Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Chave JWT |
| `OPENROUTER_API_KEY` | ✅ | API key OpenRouter |
| `FRONTEND_URL` | ✅ | URL do frontend (CORS) |
| `DIRECT_URL` | ❌ | URL direta Prisma Migrate |
| `AI_TEXT_MODEL` | ❌ | Default: `google/gemini-2.0-flash-exp:free` |
| `AI_VISION_MODEL` | ❌ | Default: `google/gemini-2.0-flash-exp:free` |
| `PORT` | ❌ | Default: `3000` |

---

## 📡 API Endpoints

Base: `/api/v1` (todos protegidos por JWT, exceto `/auth`)

### Transações
| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/transactions` | Criar transação |
| `POST` | `/transactions/transfer` | Transferência entre contas |
| `POST` | `/transactions/import/validate` | Validar OFX |
| `POST` | `/transactions/import/receipt` | Upload comprovante (JPG/PNG/WEBP/PDF) |
| `POST` | `/transactions/import/confirm` | Confirmar importação |
| `GET` | `/transactions` | Listar (`?year=` `?month=`) |
| `GET` | `/transactions/dashboard-summary` | Dados do dashboard |
| `GET` | `/transactions/export` | Exportar CSV |
| `GET/PATCH/DELETE` | `/transactions/:id` | CRUD individual |

### Auth
| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Registrar |
| `POST` | `/auth/login` | Login |
| `POST` | `/auth/refresh` | Refresh token |
| `POST` | `/auth/forgot-password` | Reset de senha |

### Outros
- `/accounts`, `/credit-cards`, `/categories`, `/budgets`, `/goals`
- `/reports/dashboard-summary`, `/reports/financial-profile`
- `/ai/chat`, `/notifications`, `/social/invite`

---

## 📊 Feature Matrix

| Feature | Web | Mobile |
|---|:---:|:---:|
| Auth (login/signup/email) | ✅ | ✅ |
| Dashboard + Regra 50/30/20 | ✅ | ✅ |
| Transações CRUD | ✅ | ✅ |
| Importação OFX (4-layer dedup) | ✅ | ✅ |
| Contas & Cartões | ✅ | ✅ |
| Orçamentos | ✅ | ✅ |
| Metas | ✅ | ✅ |
| Controle de Fixos | ✅ | ⚠️ |
| AI Chat | ✅ | ✅ |
| AI Insights | ✅ | ✅ |
| Notificações | ✅ | ✅ |
| Social Invites | ✅ | ✅ |
| Reports/Export | ✅ | ❌ |
| Receipt AI Vision | ✅ | ⚠️ |
| Dark Mode | ✅ | ✅ |
| Privacy Blur | ✅ | ✅ |

---

## 🚀 Deploy

### Backend (Render)
1. Conecte o repo no Render
2. Configure env vars: `DATABASE_URL`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `FRONTEND_URL`
3. Push para `master` → auto-deploy

### Frontend (Vercel)
```bash
cd frontend && npx vercel
```
Configure `VITE_API_URL` → URL do backend.

### Banco (Neon)
Crie projeto em [neon.tech](https://neon.tech), copie a connection string.

---

## 🔐 Segurança
- Helmet · JWT access+refresh · bcrypt · class-validator · ThrottlerGuard (100 req/60s) · CORS · Prisma parameterized queries

---

## 🧪 Testes
```bash
cd backend
npm run test          # Unit
npm run test:cov      # Coverage
npm run test:e2e      # E2E
```

---

## 🗺️ Roadmap (v1.2.0)
- [ ] Otimização do motor Vision (múltiplos tipos de comprovantes)
- [ ] Confidence Score + edição de valores no review
- [ ] Dark Mode aprimorado no mobile
- [ ] Testes E2E: Upload → IA → Dashboard
- [ ] Monitoramento de custos OpenRouter

---

<p align="center">
  Feito com ❤️ por <a href="https://github.com/SelmoCastro">Selmo Castro</a>
</p>
