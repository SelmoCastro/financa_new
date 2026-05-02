# Changelog

All notable changes to this project will be documented in this file.

## [1.7.39](https://github.com/SelmoCastro/financa_new/compare/v1.7.38...v1.7.39) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.38](https://github.com/SelmoCastro/financa_new/compare/v1.7.37...v1.7.38) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.37](https://github.com/SelmoCastro/financa_new/compare/v1.7.36...v1.7.37) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.36](https://github.com/SelmoCastro/financa_new/compare/v1.7.35...v1.7.36) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.35](https://github.com/SelmoCastro/financa_new/compare/v1.7.34...v1.7.35) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.34](https://github.com/SelmoCastro/financa_new/compare/v1.7.33...v1.7.34) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.33](https://github.com/SelmoCastro/financa_new/compare/v1.7.32...v1.7.33) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.32](https://github.com/SelmoCastro/financa_new/compare/v1.7.31...v1.7.32) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.31](https://github.com/SelmoCastro/financa_new/compare/v1.7.30...v1.7.31) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.30](https://github.com/SelmoCastro/financa_new/compare/v1.7.29...v1.7.30) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.29](https://github.com/SelmoCastro/financa_new/compare/v1.7.28...v1.7.29) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.28](https://github.com/SelmoCastro/financa_new/compare/v1.7.27...v1.7.28) (2026-05-02)

All notable changes to this project will be documented in this file.

## [1.7.27](https://github.com/SelmoCastro/financa_new/compare/v1.7.26...v1.7.27) (2026-05-02)

### 🐛 Bug Fixes

* corrige mobileVersion 1.7.26 e releaseNotes no version-meta.json

All notable changes to this project will be documented in this file.

## [1.7.26](https://github.com/SelmoCastro/financa_new/compare/v1.7.25...v1.7.26) (2026-05-02)

### ✨ Features

* (auth) require terms acceptance on signup (web + mobile + backend)
* (legal) add privacy policy + terms of service, fix adaptive icon, configure AAB
* (subscription) free plan upgraded to 5/5/5/10 + goals limit

### 🐛 Bug Fixes

* (backend) use cascade delete for user records and simplify remove logic
* (mobile) resolve token expiry race condition and improve session resilience
* (mobile) remove auto-install, open APK in browser instead (simpler, no REQUEST_INSTALL_PACKAGES)
* (backend) account balance doubled when creating account with initial balance
* (backend) version-meta.json path resolution — controller now finds the file
* (mobile) critical APK install failure — remove corrupted FileProvider + multi-fallback install
* (mobile) break infinite update dialog loop + allow dismiss in all phases
* (mobile) corrigir erros de TypeScript e bugs de runtime
* (mobile) prevent infinite update loop on install failure
* (mobile) corrije AppState handler para usar novo RefreshResult
* (mobile) corrije fluxo de refresh token ao reabrir app apos 15min

### 📝 Documentation

* update CHANGELOG for v1.7.20

### 🧹 Chores

* bump version to 1.7.20
* remove temp fix_balances script
* bump version to 1.7.15 (versionCode 17)
* fix package.json bump to 1.7.14
* bump version 1.7.13 → 1.7.14

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.7.20](https://github.com/SelmoCastro/financa_new/compare/v1.7.19...v1.7.20) (2026-05-01)

### Features
* **subscription**: Free plan upgraded — 5 accounts, 5 budgets, 5 credit cards, 5 goals, 10 AI requests/day
* **subscription**: Premium plan remains unlimited
* **goals**: Added plan limit enforcement on goal creation (was missing)

### Bug Fixes
* **accounts**: Fixed balance doubled when creating account with initial balance

## [1.4.0](https://github.com/SelmoCastro/financa_new/compare/v1.3.0...v1.4.0) (2026-04-17)


### ⚠ BREAKING CHANGES

* **release:** versão 1.3.0 requer rebuild de todos os packages

### 🧹 Chores

* **release:** 1.3.0 - refatoração geral, documentação e scripts de debug ([e857d68](https://github.com/SelmoCastro/financa_new/commit/e857d684bb65f7f28cfaafa261ba23e69ece7ce4))


### 📝 Documentation

* add implementation roadmap with 7 sections ([b0b137c](https://github.com/SelmoCastro/financa_new/commit/b0b137cc73dd1324ab825b0961c06f6691b0bcb8))
* add technical debts and security implementation plan ([ce19012](https://github.com/SelmoCastro/financa_new/commit/ce190128cab6cad15b4cd017a648f4690130ccdf))


### ♻️ Code Refactoring

* **budgets:** remove legacy category string, use categoryId only ([2bdbc19](https://github.com/SelmoCastro/financa_new/commit/2bdbc194b2f9b85823d6185df987b06db267d09e))


### ✅ Tests

* **backend:** add 40 unit tests for AccountsService and BudgetsService + fix app.controller spec ([52912a1](https://github.com/SelmoCastro/financa_new/commit/52912a1de0e15e23da91847234179c3d4deb5e61))


### 🐛 Bug Fixes

* **auth:** auto-verify emails and disable VerifiedEmailGuard until Resend domain is configured ([3c89830](https://github.com/SelmoCastro/financa_new/commit/3c8983060899bcaa1b6cbe362b54965d35d006a6))
* **auth:** corrigir loop infinito de login por inconsistência de chave do token ([bd51b0f](https://github.com/SelmoCastro/financa_new/commit/bd51b0fe9d4174034c315f8be3df8ebc4f28ae70))
* **cors:** add X-CSRF-Token to allowed headers for cross-origin requests ([7da6e25](https://github.com/SelmoCastro/financa_new/commit/7da6e25efb9d6e427559902dd894280de6611a59))
* **cors:** use Vercel proxy rewrite to eliminate cross-origin requests and CSRF cookie issues ([7625a7f](https://github.com/SelmoCastro/financa_new/commit/7625a7f6fcc26196c79495f71d57f98740ec84ac))
* **db:** consolidate migrations - add Subscription + AiRequestLog tables and fix Budget categoryId ([7833627](https://github.com/SelmoCastro/financa_new/commit/7833627fa1b88605ed64cd88250bb54b4b1e498a))
* **security:** add CSRF protection with double-submit cookie pattern ([73ce96f](https://github.com/SelmoCastro/financa_new/commit/73ce96f5fd1b9cae5e2d895ca238de741de186b9))
* **security:** fix CSRF token mismatch on login - generate token once per session and match excluded paths correctly ([536c0b5](https://github.com/SelmoCastro/financa_new/commit/536c0b5c3a420293c3e36ad2d574473d5c9549bd))
* **subscription:** fix imports and reports category field after subscription module ([1f9498e](https://github.com/SelmoCastro/financa_new/commit/1f9498e1031835dc9605272ffde0c8372affc1b8))


### ✨ Features

* **auth:** add password strength validation on register ([fe601c3](https://github.com/SelmoCastro/financa_new/commit/fe601c395d930b713975f9728b7255276e299e52))
* **auth:** add verified email guard + banner + resend endpoint ([f8d2518](https://github.com/SelmoCastro/financa_new/commit/f8d251816f074f7a4a4eb9cae4e5e3d0f77d1787))
* **auth:** implementar recuperação de senha funcional com Resend ([36ce6cd](https://github.com/SelmoCastro/financa_new/commit/36ce6cdf8f7dc4e5153015edbed55927d9ed0e85))
* **debug:** add email health check endpoint at /health/email ([605007a](https://github.com/SelmoCastro/financa_new/commit/605007a688960815ec5d5e8ea46a7e4e3c70c9e1))
* **domain:** migrate to finanzaai.tech custom domain ([3424ae8](https://github.com/SelmoCastro/financa_new/commit/3424ae84f9f21ec816ef424e0c38d765ea4ebc6e))
* **mobile:** add Reports screen with charts + fix budgets JSX + fix useFixedTransactions type ([45a4e7c](https://github.com/SelmoCastro/financa_new/commit/45a4e7c2d661f3dfc6c6323878d54e13206fed93))
* **mobile:** mount AiChatWidget on Home screen + fix chat response field ([a22f17d](https://github.com/SelmoCastro/financa_new/commit/a22f17d57bb0b390a5201a227a56d372d789dece))
* **security:** add env variable validation on backend startup + fix app.controller spec ([d0a512d](https://github.com/SelmoCastro/financa_new/commit/d0a512ddc5f15f44f82a10c25d2337e0d707c85b))
* **subscription:** add Subscription module with plan guard and AI rate limiting ([36c87e4](https://github.com/SelmoCastro/financa_new/commit/36c87e4269ee0d3b0fb171f438c1215f8d344bb0))

## [1.3.0](https://github.com/SelmoCastro/financa_new/compare/v1.2.2...v1.3.0) (2026-04-08)


### ✨ Features

* **mobile:** unify dashboard and add CRUD for budgets and goals ([8e4f81c](https://github.com/SelmoCastro/financa_new/commit/8e4f81cc0fda7f79ed64206c3d5aad3cf60e1622))

### [1.2.2](https://github.com/SelmoCastro/financa_new/compare/v1.2.1...v1.2.2) (2026-04-07)


### 🐛 Bug Fixes

* **reports:** corrigir gráfico Performance Mensal mostrando meses futuros e duplicados ([0fbb704](https://github.com/SelmoCastro/financa_new/commit/0fbb704f593490c16c528146799a5a6517b141e1))

### [1.2.1](https://github.com/SelmoCastro/financa_new/compare/v1.2.0...v1.2.1) (2026-04-07)


### 📝 Documentation

* make conventional commits and versioning mandatory for all agents ([4d6b8ae](https://github.com/SelmoCastro/financa_new/commit/4d6b8aeaa22db815cb7cd7b771f2419e80ed9280))


### ✨ Features

* **mobile:** port Part 2 AI Vision improvements — PDF support, error feedback, editable amounts, receipt preview ([cdec795](https://github.com/SelmoCastro/financa_new/commit/cdec7959403dc0027bf6d9b87e644d40704acc16))


### 🐛 Bug Fixes

* **web:** corrigir edição de contas, dark mode no extrato/fixos e dropdowns ([1cbb768](https://github.com/SelmoCastro/financa_new/commit/1cbb76849d91b53235fba4ed002e68766e226094))

## [1.2.0](https://github.com/SelmoCastro/financa_new/compare/v1.1.0...v1.2.0) (2026-04-05)

### ⚠ BREAKING CHANGES

* **reports:** dashboard balance now sums account balances instead of all transactions
* **backend:** migration baseline required (P3005 fix)

### Features

* **ai:** enhance receipt AI engine — PDF support, detailed error feedback, editable amounts, image preview, multi-transaction extraction ([7d71294](https://github.com/SelmoCastro/financa_new/commit/7d71294))
* **ai:** add Pet and Fuel categories to 50/30/20 rule ([6640d1b](https://github.com/SelmoCastro/financa_new/commit/6640d1b))
* **backend:** add Pets and Vehicle categories with AI classification rules ([da6f4bf](https://github.com/SelmoCastro/financa_new/commit/da6f4bf))
* **frontend:** redesign Dashboard, Budgets, Goals, Accounts, History views ([21d08c3](https://github.com/SelmoCastro/financa_new/commit/21d08c3))
* **frontend:** add ActionMenu component, update tailwind config and types ([21d08c3](https://github.com/SelmoCastro/financa_new/commit/21d08c3))
* **mobile:** update ImportModal, TransactionModal, CategoryChart, contexts ([21d08c3](https://github.com/SelmoCastro/financa_new/commit/21d08c3))
* **mobile:** expo SDK 54 upgrade with React Native 0.81 ([f7717f2](https://github.com/SelmoCastro/financa_new/commit/f7717f2))
* **docs:** complete README with full project documentation, architecture, API docs, feature matrix ([c2c0ded](https://github.com/SelmoCastro/financa_new/commit/c2c0ded))

### Bug Fixes

* **reports:** exclude only real transfers from dashboard calculations ([34c6efa](https://github.com/SelmoCastro/financa_new/commit/34c6efa))
* **deploy:** resolve P3005 migration error on Render with baseline ([a2af47a](https://github.com/SelmoCastro/financa_new/commit/a2af47a))
* **git:** remove non-code files from tracking and update .gitignore ([9b00da7](https://github.com/SelmoCastro/financa_new/commit/9b00da7))

### Chores

* remove .agent/skills directory (2739 files) ([ec5d5b9](https://github.com/SelmoCastro/financa_new/commit/ec5d5b9))
* add project backlog, BMad config and migration scripts ([e85896c](https://github.com/SelmoCastro/financa_new/commit/e85896c))

---

## [1.1.0](https://github.com/SelmoCastro/financa_new/compare/v1.0.0...v1.1.0) (2026-03-13)

### Features

* **mobile:** multi-currency support (BRL/USD/EUR) with CurrencyContext, SettingsModal ([6c0a8da](https://github.com/SelmoCastro/financa_new/commit/6c0a8da))
* **frontend:** multi-currency support and compact UI design ([17693e9](https://github.com/SelmoCastro/financa_new/commit/17693e9))
* **frontend:** finance rigor 50/30/20 and Available Real metric ([b0fe97e](https://github.com/SelmoCastro/financa_new/commit/b0fe97e))
* **social:** transaction invites and shared billing across web and mobile ([6959a6f](https://github.com/SelmoCastro/financa_new/commit/6959a6f), [883b6d9](https://github.com/SelmoCastro/financa_new/commit/883b6d9), [b4741bc](https://github.com/SelmoCastro/financa_new/commit/b4741bc))
* **frontend:** simplify dashboard layout, clean header, move APK link to sidebar ([afde98a](https://github.com/SelmoCastro/financa_new/commit/afde98a))

### Bug Fixes

* **timeline:** display full history instead of filtered month ([cda7419](https://github.com/SelmoCastro/financa_new/commit/cda7419))
* **auth:** return refreshToken in login body for mobile compatibility ([157570c](https://github.com/SelmoCastro/financa_new/commit/157570c))
* **mobile:** update budgets/goals/fixed to useCurrency, fix balance input ([159827d](https://github.com/SelmoCastro/financa_new/commit/159827d))
* **social:** fix inverted invite acceptance and update notification modal UI ([8ae54aa](https://github.com/SelmoCastro/financa_new/commit/8ae54aa))
* **social:** render notification modal in React Portal for centering ([ac01d45](https://github.com/SelmoCastro/financa_new/commit/ac01d45))
* **deploy:** remove migrate deploy from render start script ([740a0f0](https://github.com/SelmoCastro/financa_new/commit/740a0f0))
* **prisma:** map directUrl to DATABASE_URL for Render compatibility ([4fdb9f0](https://github.com/SelmoCastro/financa_new/commit/4fdb9f0))
* **auth:** fix login email regexp pattern ([604edcb](https://github.com/SelmoCastro/financa_new/commit/604edcb))
* **filters:** unify date filters, fix category cleaning bug, add account diagnostics ([32926ec](https://github.com/SelmoCastro/financa_new/commit/32926ec))
* **categories:** prevent aggressive category cleanup, improve data fetching resilience ([ea701d3](https://github.com/SelmoCastro/financa_new/commit/ea701d3))
* **backend:** resolve build errors in accounts service ([ef27c34](https://github.com/SelmoCastro/financa_new/commit/ef27c34))

---

## 1.0.0 (2026-03-07)

### Features

* **auth:** JWT authentication with access + refresh tokens
* **auth:** email verification and password reset flow
* **transactions:** full CRUD with installment support
* **transactions:** OFX import with 4-layer deduplication (FITID, history, content match, fuzzy hash)
* **transactions:** AI auto-classification of bank statement transactions
* **accounts:** bank account management with real-time balance
* **credit-cards:** credit card management with limit, closing day, due day
* **categories:** customizable income/expense categories with icons and colors
* **budgets:** budget limits per category with percentage tracking
* **goals:** financial goals with target amount, current amount, deadline
* **reports:** dashboard summary with 50/30/20 rule, pie charts, bar charts, month-over-month trends
* **reports:** financial profile for AI brain (goals, budgets, top expenses, recent transactions)
* **ai:** financial chat assistant with Gemini via OpenRouter
* **ai:** monthly insights generation (3 golden tips)
* **ai:** subscription/recurring expense detection
* **ai:** monthly forecasting (red/green prediction)
* **notifications:** in-app notification system
* **frontend:** responsive dashboard with Recharts + Framer Motion
* **frontend:** dark mode support
* **frontend:** privacy blur mode
* **frontend:** fixed/recurring transaction management
* **frontend:** ImportOverlay for OFX/CSV/AI Vision
* **frontend:** ChatWidget for AI assistant
* **frontend:** NotificationCenter with real-time updates
* **mobile:** Expo app with tab navigation
* **mobile:** transaction management and import
* **mobile:** AI chat and insights
* **mobile:** dark mode and privacy blur
* **backend:** Swagger API documentation
* **backend:** Helmet security headers
* **backend:** Global rate limiting (100 req/60s)
* **backend:** Feedback collection system
