
# 🚀 Finanza AI - Dashboard Financeiro (v1.1.0)

![App Icon](https://raw.githubusercontent.com/selmocastro/finanza-new/main/frontend/public/icon.png)

Dashboard financeiro moderno e minimalista construído com **React (Vite)** e **NestJS**. Focado em produtividade visual, controle de gastos e planejamento financeiro (Regra 50/30/20).

---

## ✨ Features (Novidades AI & Importação)

- **Cérebro AI (OpenRouter + Gemini)**: Categorização automática hiper-precisa baseada nas *suas* categorias reais.
- **Insights Inteligentes**: Dicas financeiras geradas por IA baseadas nos seus gastos e orçamentos do mês.
- **Leitor de Cupons Fiscais (Vision)**: Importação de gastos enviando fotos de notas fiscais.
- **Importação OFX Robusta**: Motor anti-duplicidade em 4 camadas (FITID, Histórico, Content Match e Fuzzy Hash).
- **Dashboard Visual**: Gráficos interativos (Recharts) com alocação por despesas e receitas mensais.
- **Orçamentos**: Defina tetos de gastos por categoria e acompanhe o percentual em tempo real.
- **Metas & Sonhos**: Crie cofres para seus objetivos (Viagem, Carro, Reserva) e registre seus aportes.
- **Regra 50/30/20**: Análise visual automática (Necessidades, Desejos e Objetivos).
- **Controle de Fixos**: Separação clara entre o que é custo de vida obrigatório e gastos variáveis.
- **Privacidade Total**: Modo "Blur" protege todos os valores da tela com um clique.

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
- **PostgreSQL** (Banco de Dados @ Neon Serverless)
- **OpenRouter (Google Gemini)** (Inteligência Artificial e LLM)
- **Multer** (Processamento de uploads / fotos)
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
# Edite .env com:
# - DATABASE_URL
# - JWT_SECRET
# - OPENROUTER_API_KEY (Para habilitar a IA)
npx prisma generate
npx prisma migrate dev
npm run start:dev
```
*O backend rodará em `http://localhost:3000` (API: `/v1`)*

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
