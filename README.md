# Finanza AI

> Controle financeiro pessoal com IA, dashboard web e app Android.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.8.75-blue" alt="Version" />
  <img src="https://img.shields.io/badge/backend-NestJS-ea2845" alt="Backend" />
  <img src="https://img.shields.io/badge/frontend-React%20%2B%20Vite-61dafb" alt="Frontend" />
  <img src="https://img.shields.io/badge/mobile-Expo-000020" alt="Mobile" />
  <img src="https://img.shields.io/badge/database-PostgreSQL-336791" alt="Database" />
</p>

---

## Sobre

Finanza AI é uma aplicação full-stack para organizar finanças pessoais, acompanhar gastos, controlar cartões, metas e orçamentos, além de usar IA para ajudar na análise financeira.

O projeto possui:

- API em NestJS.
- Web app em React + Vite.
- App Android em Expo/React Native.
- Banco PostgreSQL com Prisma.
- Recursos de IA para chat, insights, categorização e leitura de comprovantes.

---

## Funcionalidades

- Dashboard financeiro com resumo mensal.
- Cadastro de receitas, despesas e transferências.
- Contas bancárias e cartões de crédito.
- Controle de faturas e compras parceladas.
- Categorias, orçamentos, metas e recorrências.
- Importação de extratos e comprovantes.
- Chat financeiro com IA.
- Insights e previsões financeiras.
- App mobile Android.
- Planos Free e Premium.

---

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | NestJS, Prisma, PostgreSQL, JWT |
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Mobile | Expo, React Native, Expo Router |
| IA | OpenRouter / OpenAI SDK |
| Infra | Nginx, PM2, Docker |

---

## Estrutura

```text
Financa_new/
├── backend/    # API NestJS + Prisma
├── frontend/   # Web app React + Vite
├── mobile/     # App Android Expo
└── README.md
```

---

## Rodando localmente

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

---

## Segurança

O projeto usa autenticação JWT, refresh token, validação de DTOs, proteção CSRF, headers de segurança, controle de acesso por usuário e cuidados para evitar vazamento de dados sensíveis em logs.

Arquivos de ambiente, builds, APKs, chaves privadas e artefatos temporários não devem ser enviados ao repositório.

---

## Scripts úteis

| Local | Script | Descrição |
|---|---|---|
| raiz | `npm run release:patch` | Atualiza versão patch |
| backend | `npm run build` | Build da API |
| backend | `npm run start:dev` | API em desenvolvimento |
| frontend | `npm run build` | Build do frontend |
| frontend | `npm run dev` | Frontend em desenvolvimento |
| mobile | `npx expo start` | App mobile em desenvolvimento |
| mobile | `npx expo-doctor` | Valida configuração Expo |

---

## Qualidade

Antes de publicar alterações importantes:

```bash
cd backend && npm run build
cd ../frontend && npm run build
cd ../mobile && npx expo-doctor
```

---

<p align="center">
  Feito com ❤️ por <a href="https://github.com/SelmoCastro">Selmo Castro</a>
</p>
