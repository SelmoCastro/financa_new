# Finanza AI — Dashboard Financeiro Inteligente

> App financeiro pessoal com Web, API NestJS e Android. Foco em controle de gastos, importação OFX, cartões, metas, assinaturas, IA financeira e segurança de dados.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.8.75-blue" alt="Version" />
  <img src="https://img.shields.io/badge/backend-NestJS%2011-ea2845" alt="Backend" />
  <img src="https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite%206-61dafb" alt="Frontend" />
  <img src="https://img.shields.io/badge/mobile-Expo%20SDK%2054-000020" alt="Mobile" />
  <img src="https://img.shields.io/badge/database-PostgreSQL-336791" alt="Database" />
  <img src="https://img.shields.io/badge/IA-OpenRouter%20GPT--4o--mini-4285f4" alt="AI" />
</p>

---

## Visão geral

O Finanza AI é um sistema financeiro full-stack com:

- Backend NestJS + Prisma + PostgreSQL.
- Frontend React + Vite servido por Nginx na VPS.
- App Android em Expo/React Native para uso real em produção.
- IA via OpenRouter para chat financeiro, categorização, insights e leitura de comprovantes.
- Assinaturas via Mercado Pago.
- Controles de segurança para autenticação, CSRF, LGPD, criptografia e isolamento por usuário.

Repositório público deve conter apenas código-fonte, configs e documentação. APKs, builds, `.env`, sidecars de assinatura e artefatos de agentes não devem ser versionados.

---

## Funcionalidades principais

### Gestão financeira

- Transações de receita/despesa com filtros, edição e exclusão.
- Transferência entre contas.
- Contas bancárias com saldo calculado.
- Cartões de crédito, compras parceladas, faturas e pagamento de fatura.
- Categorias, orçamentos, metas e recorrências.
- Dashboard com resumo mensal, gráficos e regra 50/30/20.
- Exportação e importação de extratos.

### IA financeira

- Chat financeiro em PT-BR com contexto do usuário.
- Categorização automática de transações importadas.
- Insights e previsão mensal.
- Detecção de assinaturas/recorrências.
- Leitura de comprovantes/imagens/PDFs com extração de dados.
- Normalização de descrições de extrato.

### Mobile Android

- App Expo com rotas protegidas.
- Login, signup, refresh token e logout.
- Dashboard, transações, contas, cartões, orçamentos, metas e mais recursos essenciais.
- Modal de consentimento LGPD.
- Verificação de versão e fluxo de atualização para APK sideloaded.

### Plano Free/Premium

- Plano Free com limites de uso.
- Plano Premium com recursos ampliados.
- Recursos excedentes ficam visíveis em modo somente leitura quando o Premium expira.
- Checkout e webhooks Mercado Pago.

---

## Arquitetura

```text
Financa_new/
├── backend/                 # NestJS 11 + Prisma + PostgreSQL
│   ├── src/
│   │   ├── accounts/         # Contas
│   │   ├── admin/            # Administração
│   │   ├── ai/               # Chat, insights, vision, prompts
│   │   ├── audit/            # Auditoria/eventos
│   │   ├── auth/             # JWT, refresh token, senha, email
│   │   ├── budgets/          # Orçamentos
│   │   ├── categories/       # Categorias
│   │   ├── credit-cards/     # Cartões e parcelas
│   │   ├── credit-card-invoices/
│   │   ├── errors/           # Error reporting client-side
│   │   ├── goals/            # Metas/cofres
│   │   ├── payments/         # Mercado Pago
│   │   ├── recurring-transactions/
│   │   ├── reports/          # Dashboard e relatórios
│   │   ├── social/           # Compartilhamento
│   │   ├── subscription/     # Limites e planos
│   │   └── transactions/     # CRUD, OFX, recibos
│   └── prisma/schema.prisma
├── frontend/                # React 19 + Vite 6 + TypeScript
│   ├── components/
│   ├── context/
│   ├── services/
│   └── views/
├── mobile/                  # Expo SDK 54 + React Native 0.81
│   ├── app/                 # Expo Router
│   ├── components/
│   ├── context/
│   ├── hooks/
│   └── services/
└── docker-compose.prod.yml
```

---

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | NestJS 11, Prisma 5, PostgreSQL, JWT, Passport, Helmet, Throttler, Swagger |
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS, Recharts, Framer Motion |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router, SecureStore, NativeWind |
| IA | OpenRouter, GPT-4o-mini, OpenAI SDK |
| Pagamentos | Mercado Pago Checkout + Webhooks HMAC |
| Infra | VPS Hostinger, Nginx, PM2, Docker/PostgreSQL, Let's Encrypt |

---

## Segurança

Medidas implementadas:

- JWT access token curto + refresh token.
- Refresh tokens persistidos e revogáveis.
- Logout/troca de senha revogam sessões sensíveis.
- Auth via bearer/cookie conforme cliente.
- CSRF double-submit para rotas de escrita.
- Helmet + CSP + HSTS + headers de segurança.
- Throttling global e em endpoints sensíveis.
- `ValidationPipe` com whitelist e bloqueio de campos não permitidos.
- DTOs protegendo campos financeiros críticos.
- Validação de ownership em relações por `userId` para reduzir risco de IDOR/BOLA.
- Criptografia opcional de campos sensíveis com `ENCRYPTION_KEY`/rotação via `ENCRYPTION_KEYS`.
- Logs de produção sem payloads sensíveis, tokens ou respostas completas de login.
- Mercado Pago exige webhook secret em produção.
- Swagger apenas fora de produção.
- Consentimento LGPD com GTM Consent Mode v2.

Checklist antes de subir alteração:

```bash
cd backend && npm run build && npm audit
cd ../frontend && npm run build && npm audit --omit=dev
cd ../mobile && npx expo-doctor && npm audit --omit=dev
```

Observação: o mobile pode reportar vulnerabilidades moderadas herdadas do Expo/PostCSS que exigem upgrade major do Expo. Não aplicar `npm audit fix --force` sem janela de teste.

---

## Variáveis de ambiente

### Backend

| Variável | Obrigatória | Descrição |
|---|---:|---|
| `DATABASE_URL` | Sim | Connection string PostgreSQL usada pela API |
| `DIRECT_URL` | Não | URL direta para Prisma Migrate, quando necessário |
| `JWT_SECRET` | Sim | Mínimo 32 caracteres; nunca usar valor padrão |
| `ENCRYPTION_KEY` | Recomendado | Chave hex de 64 caracteres para criptografia de campos |
| `ENCRYPTION_KEYS` | Não | Rotação de chaves no formato `v1:64hex,v2:64hex` |
| `FRONTEND_URL` | Sim | Origem liberada no CORS |
| `OPENROUTER_API_KEY` | Sim p/ IA | Chave OpenRouter |
| `AI_TEXT_MODEL` | Não | Modelo de texto; padrão do app usa GPT-4o-mini via OpenRouter |
| `AI_VISION_MODEL` | Não | Modelo para vision/recibos |
| `RESEND_API_KEY` | Sim p/ email | Envio de emails transacionais |
| `EMAIL_FROM` | Sim p/ email | Remetente configurado no provedor |
| `MERCADOPAGO_ACCESS_TOKEN` | Sim p/ pagamentos | Token de produção em ambiente real |
| `MERCADOPAGO_WEBHOOK_SECRET` | Sim em produção | Assinatura HMAC dos webhooks |
| `MERCADOPAGO_WEBHOOK_URL` | Não | URL pública de webhook, se diferente do padrão |
| `PORT` | Não | Porta da API; padrão `3000` |
| `HOST` | Não | Host bind; padrão seguro `127.0.0.1` |

### Frontend

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API, ex.: `https://api.finanzaai.tech/v1` |

### Mobile

- O app Android usa API pública de produção.
- Para build nativo, manter `mobile/android/app/build.gradle` como fonte real de `versionName`/`versionCode`.
- `mobile/app.json` é configuração Expo; não confiar nele sozinho para versionamento Android.

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18+.
- npm.
- PostgreSQL local, Docker ou banco remoto.
- Android Studio/SDK apenas se for rodar build nativo mobile.

### Backend

```bash
cd backend
npm install
cp .env.example .env  # se existir; senão criar .env local
npx prisma generate
npx prisma db push
npm run start:dev
```

API local: `http://localhost:3000/v1`
Swagger dev: `http://localhost:3000/api/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Web local: `http://localhost:5173`

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Para Android nativo local:

```bash
cd mobile
npx expo run:android
```

---

## Endpoints principais

Base versionada: `/v1`

| Área | Endpoints |
|---|---|
| Auth | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/change-password` |
| Usuário | `/users`, `/auth/me`, `/auth/change-email`, `/auth/delete-account` |
| Financeiro | `/accounts`, `/transactions`, `/categories`, `/budgets`, `/goals` |
| Cartões | `/credit-cards`, `/credit-card-invoices` |
| Importação | `/transactions/import/validate`, `/transactions/import/confirm`, `/transactions/import/receipt` |
| Relatórios | `/reports/dashboard-summary`, `/reports/financial-profile` |
| IA | `/ai/chat` e recursos de categorização/insights |
| Recorrentes | `/recurring-transactions` |
| Assinatura | `/subscription`, `/payments` |
| Admin | `/admin` |
| App | `/app/version` |

---

## Deploy

O projeto roda na VPS com Nginx servindo o frontend e proxy para backend PM2.

Fluxo seguro:

1. Testar localmente antes de deploy.
2. Bump de versão quando for release:

```bash
npm run release:patch
# ou npm run release:minor / release:major
```

3. Subir código:

```bash
git status
git push origin master
```

4. Na VPS:

```bash
cd /opt/finanza
git pull origin master
npm install
npm run build
# backend via PM2, frontend via dist/ + nginx conforme deploy.sh do servidor
```

Nota operacional: antes de rebuild backend na VPS, limpar `dist/` para evitar artefato antigo em PM2.

---

## Build Android / APK

O app é sideloaded, então assinatura e versionamento precisam ser consistentes.

Regras importantes:

- Atualizar `mobile/android/app/build.gradle` para `versionName` e `versionCode`.
- Não assinar novamente um APK já assinado pelo Gradle.
- Verificar APK com `apksigner verify`.
- Não versionar APK, `.idsig`, `build/`, `.expo/` ou artefatos temporários.

Exemplo:

```bash
cd mobile
npx expo-doctor
# build local/EAS conforme rotina de release Android
```

---

## Higiene do Git

Arquivos que NÃO devem ir para o GitHub:

- `.env`, `.env.local`, `.env.production` reais.
- APKs, `.idsig`, `.apk.gz` e builds nativos.
- `node_modules/`, `dist/`, `coverage/`, `.expo/`, `.vercel/`.
- Artefatos de agentes (`.agent/`, `.opencode/`).
- Exports temporários, posts sociais gerados e arquivos de debug.
- Keystores/chaves privadas fora do que já estiver explicitamente decidido no projeto.

Antes de commitar:

```bash
git status --short
git diff --check
git ls-files -ci --exclude-standard
```

---

## Scripts úteis

| Local | Script | Descrição |
|---|---|---|
| raiz | `npm run release:patch` | Bump patch com conventional commits |
| raiz | `npm run release:minor` | Bump minor |
| raiz | `npm run release:major` | Bump major |
| backend | `npm run build` | Compila API NestJS |
| backend | `npm run start:dev` | API em modo dev |
| backend | `npm run start:prod` | Prisma generate/migrate + Node dist |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | Build web de produção |
| mobile | `npx expo start` | Expo dev server |
| mobile | `npx expo-doctor` | Validação do projeto Expo |

---

## Status de qualidade

Última varredura local executada:

- Backend build: OK.
- Frontend build: OK.
- Mobile Expo Doctor: 17/17 OK.
- Backend audit: 0 vulnerabilidades.
- Frontend audit: 0 vulnerabilidades.
- Mobile audit: 4 moderadas herdadas do Expo/PostCSS; tratar em upgrade planejado do Expo.
- Git hygiene: sem binários/artefatos gerados rastreados após limpeza.

---

## Convenções

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`).
- Releases: usar scripts `npm run release:*`.
- Segurança: nunca commitar segredos; usar `[REDACTED]` em documentação/exemplos.
- Mudanças de UI: remover apenas o elemento solicitado, sem mexer em outros por conta própria.
- Deploy: validar localmente antes de atualizar VPS.

---

<p align="center">
  Feito com ❤️ por <a href="https://github.com/SelmoCastro">Selmo Castro</a>
</p>
