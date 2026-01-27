
# 🚀 Finanza AI - Dashboard Financeiro Simplificado

![App Icon](https://raw.githubusercontent.com/selmocastro/finanza-new/main/frontend/public/icon.png)

Dashboard financeiro moderno e minimalista construído com **React (Vite)** e **NestJS**. Focado em produtividade visual, controle de gastos e planejamento financeiro (Regra 50/30/20).

---

## ✨ Features

- **Dashboard Visual**: Gráficos de fluxo de caixa e alocação de despesas.
- **Timeline**: Visualize suas transações em uma linha do tempo vertical.
- **Controle de Fixos**: Gerencie assinaturas e contas fixas separado dos gastos variáveis.
- **Regra 50/30/20**: Feedback visual automático sobre sua saúde financeira.
- **Privacidade**: Modo "Blur" para ocultar valores sensíveis.
- **PWA Ready**: Instale no celular ou desktop.

---

## 🛠️ Tecnologias

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (Estilização Moderna)
- **Recharts** (Visualização de Dados)
- **Lucide React** (Ícones)
- **Axios** (Comunicação API)

### Backend (API v1)
- **NestJS** (Framework Progressivo)
- **Prisma ORM** (Acesso a Dados)
- **PostgreSQL** (Banco de Dados @ Neon/Supabase)
- **Passport/JWT** (Autenticação Segura)
- **Swagger** (Documentação Automática)

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL (Local ou Neon/Supabase)

### 1. Clonar e Instalar
```bash
git clone https://github.com/seu-usuario/financa-new.git
cd financa-new
```

### 2. Configurar Backend
```bash
cd backend
npm install
cp .env.example .env
# Edite .env com sua DATABASE_URL e JWT_SECRET
npx prisma generate
npx prisma migrate dev
npm run start:dev
```
*O backend rodará em `http://localhost:3000` (API: `/api/v1`)*

### 3. Configurar Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*O frontend rodará em `http://localhost:5173`*

---

## 📦 Deploy

### Backend (Vercel)
O projeto está configurado para deploy serverless na Vercel:
1. Instale o Vercel CLI: `npm i -g vercel`
2. Na pasta `backend`: `vercel`
3. Configure as variáveis de ambiente no dashboard da Vercel (`DATABASE_URL`, `JWT_SECRET`).

### Frontend (Vercel)
1. Na pasta `frontend`: `vercel`
2. Adicione a variável `VITE_API_URL` apontando para a URL do seu backend.

---

## 🔐 Segurança

- **Helmet**: Headers de segurança configurados.
- **CORS**: Restrito a origens confiáveis (configurar em produção).
- **Rate Limiting**: Preparado para implementação.
- **Sanatização**: Inputs validados via DTOs.

---

## 📝 Licença
MIT
