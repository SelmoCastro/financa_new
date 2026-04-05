---
type: bmad-distillate
sources:
  - "README.md"
  - "BACKLOG.md"
  - "INDEX.md"
  - "backend/prisma/schema.prisma"
downstream_consumer: "general LLM agent — code generation, planning, debugging, feature dev"
created: "2026-04-03"
token_estimate: 1200
parts: 1
---

## PROJECT

- Name: Finanza AI | v1.1.0 | personal financial mgmt SaaS
- Monorepo: `frontend/` (web) · `backend/` (api) · `mobile/` (app)
- Deploy: Vercel (frontend + backend serverless) · EAS Build (mobile APK)
- DB: PostgreSQL via Neon Serverless (pooled + direct URLs)

## STACK

- **Frontend**: React 19 · Vite 6 · TS · TailwindCSS 3 · Recharts · Framer Motion · Lucide · `@google/genai`
- **Backend**: NestJS 11 · Prisma 5 · PostgreSQL · JWT (access+refresh) · Passport · Helmet · Throttler (100/60s) · Nodemailer · Resend · `openai` · `@google/genai` · `xml2js` (OFX) · Multer · Swagger
- **Mobile**: Expo 54 · Expo Router 6 · RN 0.81.5 · NativeWind 4 · react-native-gifted-charts · expo-image-picker · expo-secure-store · expo-file-system · FlashList

## DATA MODEL (Prisma — PostgreSQL)

- `User`: id(uuid) email(unique) password name isAdmin isEmailVerified hashedRefreshToken → owns all below
- `Account`: id name type balance userId → has CreditCards + Transactions
- `CreditCard`: id name limit closingDay dueDay accountId userId
- `Category`: id name color icon type(income|expense) userId → used by Transactions
- `Transaction`: id description amount date type(income|expense) isFixed userId accountId? categoryId? creditCardId? receiptUrl? fitId? installmentCount? currentInstallment? classificationRule? sharedWithEmail? | indexes: (userId) (date) (userId,date) (userId,type,date) (userId,categoryId,date)
- `Budget`: id category(String—NOT FK) amount userId | unique(userId,category)
- `Goal`: id title targetAmount currentAmount deadline? userId
- `ImportedFitId`: fitId userId accountId? status | unique(userId,fitId) — OFX deduplication
- `Feedback`: id content platform userId
- `VerificationToken`: id token(unique) type expiresAt userId
- `TransactionInvite`: id amount description date type status(PENDING) senderId recipientEmail recipientId? originalTransactionId? — social sharing
- `Notification`: id title message type isRead metadata(Json)? userId

## BACKEND MODULES (NestJS src/)

auth · users · transactions · accounts · credit-cards · categories · budgets · goals · ai · reports · notifications · social · feedback · email · prisma

## FRONTEND VIEWS (frontend/views/)

DashboardView (31k) · AccountsView (21k) · GoalsView (26k) · BudgetsView (18k) · HistoryView · TimelineView · FixedItems · SettingsView · FeedbackAdminView

## FRONTEND COMPONENTS (frontend/components/)

Sidebar (desktop+mobile float nav) · StatCard (grid 2×2 mobile) · TransactionForm (21k) · ImportOverlay (40k — OFX+CSV+AI Vision) · NotificationCenter (16k) · ChatWidget (Gemini) · ActionMenu · MonthSelector · VoiceInput · BankIcon · OnboardingWidget · Login · ResetPassword · VerifyEmail · FeedbackModal · Toast · Skeleton · CreditCardForm · AccountForm

## MOBILE STRUCTURE (Expo Router)

- Routes: `app/index.tsx` (login) · `app/signup.tsx` · `app/(tabs)/` (main tabs)
- Components: TransactionModal(38k) · ImportModal(30k) · AiInsightsWidget · AiChatWidget · InviteNotification · CategoryChart · MonthlyBarChart · MonthSelector · SettingsModal · FeedbackModal · BankIcon · Skeleton
- Contexts: AuthContext · TransactionsContext · CurrencyContext

## FEATURE MATRIX

| Feature | Web | Mobile |
|---|---|---|
| Auth (login/signup/email-verify) | ✅ | ✅ |
| Dashboard KPIs + Regra 50/30/20 | ✅ | ✅ |
| Transactions CRUD | ✅ | ✅ |
| OFX/CSV Import (4-layer dedup) | ✅ | ✅ |
| Accounts & Credit Cards | ✅ | ✅ |
| Budgets | ✅ | ✅ |
| Goals | ✅ | ✅ |
| Fixed Cost Control | ✅ | ⚠️ partial |
| AI Chat (Gemini) | ✅ | ✅ |
| AI Insights | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| Transaction Invites (social) | ✅ | ✅ |
| Reports/Export | ✅ | ❌ |
| Receipt Photo AI Vision | ⚠️ schema+field | ⚠️ picker ready |
| Dark Mode | ✅ | ✅ |
| Privacy Blur Mode | ✅ | ✅ |

## ACTIVE BACKLOG — Epic v1.2.0: AI Vision + Receipts

- P1 Env: `OPENROUTER_API_KEY` in Vercel/Render env · validate `google/gemini-2.0-flash-exp:free` in prod · fix CORS
- P2 Vision Engine: refine prompt in `backend/src/ai/prompts.ts` (CNPJ, Date, Amount, Desc) · error handling for bad images · test PIX/TED/Cupom Fiscal/PDF
- P3 UI: finalize `ImportOverlay.tsx` for AI-extracted value editing · Confidence Score % for category suggestions · `rejectedFitIds` logic
- P4 QA: unified deploy with Dark Mode · smoke test "Upload→AI→Confirm→Dashboard" · monitor OpenRouter latency+cost 48h

## TECH DEBT / KNOWN ISSUES

- `Budget.category` is plain String, not FK to `Category` — breaks relational consistency
- `Categorizer.ts` is 12-byte stub — auto-categorization not implemented
- Debug scripts loose in `backend/` root: `check-users.js test_db.ts debug-db.ts diagnose.ts compare-*.ts` → should move to `scripts/`
- No active automated tests (jest/e2e structure exists, coverage minimal)
- `Transaction.receiptUrl` field present but full AI Vision flow incomplete
- Mobile missing: Reports/Export, Full Fixed Control screen
- README says "React 18" but actual dep is React 19

## SECURITY NOTES

- Helmet enabled · JWT access+refresh tokens · bcrypt · class-validator DTOs · ThrottlerGuard global
- CORS not fully configured for production (backlog P1)
- Rate limiting needs verification in prod (Vercel serverless context)
