# Finanza AI — Dashboard Financeiro Inteligente

> Controle financeiro pessoal com IA, importação de extratos OFX, leitura de comprovantes por visão computacional e app mobile.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.5.4-blue" alt="Version" />
  <img src="https://img.shields.io/badge/backend-NestJS%20v11-ea2845" alt="Backend" />
  <img src="https://img.shields.io/badge/frontend-React%2019-61dafb" alt="Frontend" />
  <img src="https://img.shields.io/badge/mobile-Expo%20SDK%2054-000020" alt="Mobile" />
  <img src="https://img.shields.io/badge/database-PostgreSQL-336791" alt="Database" />
  <img src="https://img.shields.io/badge/AI-GPT--4o--mini%20via%20OpenRouter-4285f4" alt="AI" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## Funcionalidades

### Gestão Financeira Completa
- **Transações** — CRUD com parcelas, itens fixos e compartilhamento entre usuários
- **Contas Bancárias** — Múltiplas contas com saldo em tempo real
- **Cartões de Crédito** — Limite, dia de fechamento e vencimento
- **Categorias** — 25+ categorias BR pré-seed (Receita, Despesa, Transferência)
- **Orçamentos** — Tetos de gastos por categoria com acompanhamento percentual
- **Metas** — Cofres para objetivos com prazo e progresso
- **Recorrentes** — Controle de despesas fixas mensais

### Inteligência Artificial (GPT-4o-mini via OpenRouter)
| Capacidade | Descrição |
|---|---|
| **Chat Financeiro** | Assistente em PT-BR com contexto real dos seus dados |
| **Categorização Automática** | Classifica transações OFX nas suas categorias |
| **Insights Inteligentes** | 3 dicas de ouro baseadas no seu mês |
| **Previsão Mensal** | Prevê se terminará no vermelho ou verde |
| **Detecção de Assinaturas** | Audita gastos recorrentes |
| **Leitor de Comprovantes** | Extrai dados de fotos/PDFs (PIX, TED, cupons, extratos) |
| **Limpeza de Descrições** | Normaliza descrições confusas de extratos |

### Dashboard & Relatórios
- **Regra 50/30/20** — Necessidades, Desejos e Objetivos
- **Gráficos Interativos** — Pizza, barras, tendências month-over-month
- **Modo Privacidade** — Blur em todos os valores com um clique
- **Dark Mode** — Tema escuro completo (web + mobile)
- **Onboarding** — Widget de primeiros passos para novos usuários

### Importação Inteligente
- **OFX/QFX** — Deduplicação em 4 camadas (FITID, histórico, content match, fuzzy hash)
- **Comprovantes (AI Vision)** — JPG/PNG/WEBP/PDF com extração de valor, data, descrição e CNPJ
- **CSV Export** — Exportação para planilhas

### App Mobile (Expo)
- 7 abas: Dashboard, Transações, Contas, Orçamentos, Metas, Recorrentes, Extrato
- Captura de comprovantes pela câmera
- Chat AI integrado (FAB)
- Download direto: finanzaai.tech/Finanza_new.apk

### Social & Notificações
- Compartilhamento de transações por e-mail
- Notificações in-app
- Verificação de e-mail no signup

---

## Arquitetura

```
financa_new/
├── backend/              # NestJS v11 — API REST
│   ├── src/
│   │   ├── accounts/      # Contas bancárias
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

## Stack

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite 6 · Tailwind CSS 3 · Recharts · Framer Motion |
| **Backend** | NestJS 11 · Prisma 5 · PostgreSQL · JWT · Passport · Helmet · Throttler · Swagger |
| **Mobile** | Expo 54 · RN 0.81 · Expo Router · NativeWind · Gifted Charts · FlashList |
| **IA** | OpenRouter · GPT-4o-mini · `openai` SDK |
| **Infra** | VPS Hostinger · Nginx · PM2 · Docker (PostgreSQL) · Let's Encrypt |

---

## Modelo de Dados

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

## Começando

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
docker compose -f docker-compose.prod.yml up -d
```

### 3. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edite: DATABASE_URL, JWT_SECRET, OPENROUTER_API_KEY, FRONTEND_URL
npx prisma generate
npx prisma db push
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
npx expo start
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | PostgreSQL connection string |
| `JWT_SECRET` | Sim | Chave JWT |
| `OPENROUTER_API_KEY` | Sim | API key OpenRouter |
| `FRONTEND_URL` | Sim | URL do frontend (CORS) |
| `DIRECT_URL` | Não | URL direta Prisma Migrate |
| `AI_TEXT_MODEL` | Não | Default: `openai/gpt-4o-mini` |
| `AI_VISION_MODEL` | Não | Default: `openai/gpt-4o-mini` |
| `PORT` | Não | Default: `3000` |

---

## API Endpoints

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
| `POST` | `/auth/resend-verification` | Reenviar verificação de e-mail |

### Outros
- `/accounts`, `/credit-cards`, `/categories`, `/budgets`, `/goals`
- `/reports/dashboard-summary`, `/reports/financial-profile`
- `/ai/chat`, `/notifications`, `/social/invites`, `/feedback`

---

## Feature Matrix

| Feature | Web | Mobile |
|---|:---:|:---:|
| Auth (login/signup/email) | Sim | Sim |
| Dashboard + Regra 50/30/20 | Sim | Sim |
| Transações CRUD | Sim | Sim |
| Importação OFX (4-layer dedup) | Sim | Sim |
| Contas & Cartões | Sim | Sim |
| Orçamentos | Sim | Sim |
| Metas | Sim | Sim |
| Recorrentes | Sim | Sim |
| AI Chat | Sim | Sim |
| AI Insights | Sim | Sim |
| Notificações | Sim | Sim |
| Social Invites | Sim | Sim |
| Reports/Export | Sim | Não |
| Receipt AI Vision | Sim | Parcial |
| Dark Mode | Sim | Sim |
| Privacy Blur | Sim | Sim |
| Onboarding Widget | Sim | Não |

---

## Deploy (VPS)

O app roda inteiramente em uma VPS (Hostinger) com Nginx + PM2 + PostgreSQL (Docker).

### Deploy automático
```bash
# Na VPS:
cd /opt/finanza
git pull origin master
bash deploy.sh          # all (backend + frontend)
bash deploy.sh backend  # só backend
bash deploy.sh frontend # só frontend
systemctl reload nginx
```

### Build Mobile (EAS)
```bash
cd mobile
npx eas build --platform android --profile preview --non-interactive
# APK baixado e deployado via SCP para /var/www/finanzaai.tech/downloads/
```

---

## Segurança
- Helmet · JWT access (15min) + refresh (7d) · bcrypt · class-validator
- ThrottlerGuard (100 req/60s global, login 10/min, /auth/me e /auth/refresh isentos)
- CORS · Prisma parameterized queries · Dual auth (cookie + bearer)

---

## Scripts Úteis

| Script | Descrição |
|---|---|
| `bash deploy.sh all` | Deploy completo na VPS |
| `bash cleanup-and-push.sh` | Limpa repo + push GitHub |
| `bash cleanup-and-push.sh --dry-run` | Preview do que será limpo |
| `bash cleanup-and-push.sh --force` | Force push (após filter-repo) |
| `npm run release:patch/minor/major` | Bump versão (conventional commits) |

---

## Contribuindo

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para convenções de commits, branching e versionamento.

---

<p align="center">
  Feito com ❤️ por <a href="https://github.com/SelmoCastro">Selmo Castro</a>
</p>