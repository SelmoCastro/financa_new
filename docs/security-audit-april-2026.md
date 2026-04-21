# Auditoria de Seguranca — Financa_new

**Data:** Abril 2026
**Status:** Aberto — 5 CRITICAS, 10 HIGH, 5 MEDIAS

---

## CRITICO (5)

| ID | Vulnerabilidade | Arquivo | Risco |
|----|----------------|---------|-------|
| V1 | Refresh token vazado no body em primeiro login web | `auth.controller.ts:55-63,81-87` | isMobile detection falha com `!req.cookies?.['access_token']`, web recebe refreshToken no JSON na primeira vez |
| V2 | `decodeJwt()` NAO verifica assinatura JWT | `auth.service.ts:305` | `jwtService.decode()` permite forgery, extrai userId arbitrario do token |
| V3 | Import sem overdraft check | `transactions.service.ts:447-468` | confirmacao de import aplica expenses sem verificar `Account.balance >= amount`, saldo negativo |
| V4 | CreditCard FK ownership NAO validado | `credit-cards.service.ts:10-17` | accountId do body nao verificado contra userId, permite vincular CC a conta de outro usuario |
| V5 | PII (emails) logado em producao | `auth.controller.ts:49,51,69,72,76` | `console.log` com email em prod, viola LGPD/GDPR |

---

## HIGH (10)

| ID | Vulnerabilidade | Arquivo | Risco |
|----|----------------|---------|-------|
| V6 | Rate limit faltando em verify-email e reset-password | `auth.controller.ts:150,161` | Sem `@Throttle`, permite brute force de tokens |
| V7 | ChangePasswordDto aceita senha fraca | `account-settings.dto.ts:8-9` | `@MinLength(6)` sem regex, registro exige 8+char+digito |
| V8 | Account soft-delete SEM reverter saldo | `accounts.service.ts:89-105` | Transacoes deletadas mas balance nao revertido, saldo inflado permanentemente |
| V9 | Transaction update SEM validacao de data futura | `transactions.service.ts:575-687` | create/transfer/import validam, update nao. Data 2099 quebra relatorios |
| V10 | Import aceita TRANSFER type | `transactions.service.ts:419-434` | Cria registro orfao sem par, quebra modelo de transferencia |
| V11 | AdminGuard inconsistente | `auth.controller.ts:173-186` | verify-all-emails com check ad-hoc no controller, sem guard reusavel |
| V12 | Subscription controller sem versionamento | `subscription.controller.ts:5` | Sem `version:'1'`, diferente de todos outros controllers |
| V13 | delete-account sem DTO validation | `auth.controller.ts:216` | `@Body() body: { password: string }` inline type bypassa ValidationPipe |
| V14 | Plano default premium para novos usuarios | `subscription.service.ts:19` | Todo user novo ganha premium gratis, abuso de features pagas |
| V15 | PlanGuard/AiRequestGuard NAO aplicado | `plan.guard.ts` | Guards existem mas sem `@UseGuards` em nenhum controller |

---

## MEDIO (5)

| ID | Vulnerabilidade | Arquivo | Risco |
|----|----------------|---------|-------|
| V16 | Debug request logger ativo em producao | `setup.ts:84-95` | Loga toda request com auth status, PII exposure + perf overhead |
| V17 | Goal permite targetAmount=0 | `create-goal.dto.ts:18` | `@Min(0)` deveria ser `@Min(0.01)` |
| V18 | reconcile() sem FOR UPDATE lock | `accounts.service.ts:111-147` | Race condition durante reconciliacao de saldo |
| V19 | Nginx config nao versionado no repo | — | Sem arquivo auditavel, header inheritance pode faltar |
| V20 | UFW/firewall sem config documentada na VPS | — | Portas podem estar expostas |

---

## Ja Corrigido (confirmado e deployado)

- JWT fallback hardcoded: CORRIGIDO (crasha se JWT_SECRET ausente)
- POST /users com plaintext: NAO existe mais
- Helmet, trust proxy, CORS: CORRIGIDO
- CSRF sameSite=lax: CORRIGIDO
- Swagger em prod: CORRIGIDO (gated por NODE_ENV)
- isAdmin no JWT payload: CORRIGIDO
- Balance check em create/transfer: CORRIGIDO (FOR UPDATE + check)
- TRANSFER bloqueado no create regular: CORRIGIDO
- Double-remove guard: CORRIGIDO
- Import amount validation: CORRIGIDO
- FK ownership em transactions: CORRIGIDO
- Future date em create/transfer/import: CORRIGIDO
- Error sanitization em prod: CORRIGIDO
- **V1**: Refresh token leak — x-platform header (mobile+backend)
- **V2**: jwtService.decode() → jwtService.verify() (assinatura verificada)
- **V3**: Import overdraft check (balance negativo bloqueado)
- **V4**: CreditCard FK ownership validation
- **V5**: PII logs gated behind NODE_ENV
- **V6**: Rate limit on verify-email and reset-password
- **V7**: ChangePasswordDto min 8 + regex
- **V8**: Account soft-delete WITH balance reversal
- **V9**: Transaction update future date validation (max 2 dias)
- **V10**: Import TRANSFER mapeado para INCOME/EXPENSE
- **V11**: AdminGuard reusável com DB check
- **V12**: Subscription controller versioning
- **V13**: DeleteAccountDto com validação
- **V14**: Plano default FREE (migração SQL executada no VPS)
- **V15**: PlanGuard + AiRequestGuard aplicados (3 contas, 3 orçamentos, 3 cartões, 3 AI/dia)
- **V16**: Debug request logger gated to non-prod
- **V17**: Goal targetAmount min 0.01
- **V18**: FOR UPDATE lock on reconcile
- **V19**: Nginx config versionado no repo
- **V20**: UFW firewall script documentado
- **Bind 127.0.0.1**: NestJS nao exposto direto (nginx proxy)
- **Admin self-plan-change blocked**: Admin não pode alterar próprio plano
- **health/email**: Removido fromEmail da resposta

---

## Fixes Sugeridos (resumo)

### V1 — Refresh token body leak
Usar header explicito `x-platform: mobile` ou `platform` query param. Nunca usar ausencia de cookie como deteccao.

### V2 — decodeJwt() sem verify
Trocar `this.jwtService.decode(token)` por `this.jwtService.verify(token, { ignoreExpiration: true })`.

### V3 — Import sem overdraft check
Adicionar FOR UPDATE lock + `balance >= totalExpenses` antes de aplicar increments no confirmImport.

### V4 — CreditCard FK ownership
Validar `findFirst({ where: { id: accountId, userId } })` no create e update de credit-cards.

### V5 — PII em logs
Gatear logs com email atraz de `NODE_ENV !== 'production'` ou usar `maskEmail()` helper.

### V6 — Rate limit
Adicionar `@Throttle({ default: { limit: 10, ttl: 60000 } })` em verify-email e reset-password.

### V7 — ChangePasswordDto fraco
`@MinLength(8)` + `@Matches(/^(?=.*[a-zA-Z])(?=.*\d)/)` igual ao CreateUserDto.

### V8 — Soft-delete sem reverter saldo
No account remove, executar $transaction que reverte increment/decrement de todas transacoes ativas antes de soft-deletar.

### V9 — Update sem future date
Adicionar mesma validacao de `maxDate = now + 2 dias` do create.

### V10 — Import TRANSFER type
Rejeitar type TRANSFER no confirmImport: `if (type === 'TRANSFER') throw BadRequestException`.

### V11 — AdminGuard
Criar `AdminGuard` dedicado com DB check consistente, aplicar em todos endpoints admin.

### V12 — Subscription version
Adicionar `version: '1'` ao `@Controller('subscription')`.

### V13 — DeleteAccountDto
Criar DTO com `@IsString() @MinLength(8) @MaxLength(72) password: string`.

### V14 — Plano default
Trocar `plan: 'premium'` para `plan: 'free'` no subscription.service.ts.

### V15 — PlanGuard aplicacao
Aplicar `@UseGuards(PlanGuard)` + `@SetMetadata('requiredPlan', 'premium')` em endpoints AI e premium.

### V16 — Debug logger
Remover ou gatear com `NODE_ENV !== 'production'`.

### V17 — Goal targetAmount
Trocar `@Min(0)` para `@Min(0.01)`.

### V18 — Reconcile FOR UPDATE
Adicionar `$queryRaw SELECT ... FOR UPDATE` no reconcile antes do update.

### V19 — Nginx config
Adicionar nginx.conf ao repo com security headers e `include` em cada location.

### V20 — UFW firewall
Documentar regras: `ufw default deny incoming && ufw allow 22,80,443 && ufw enable`.

---

## Analise de Risco de Regressao por Fix

| Fix | Risco | Mobile | Web | Acao ANTES de deploy |
|-----|-------|--------|-----|---------------------|
| V1 | **ALTO** | **CRITICO** — auth quebra completamente | Nenhum | Adicionar header `x-platform: mobile` no axios do mobile |
| V2 | MEDIO | Users logados ha 7+ dias sao deslogados (esperado) | Mesmo | Nenhum, comportamento correto |
| V3 | MEDIO | Import inteiro falha se UMA transacao causar overdraft | Mesmo | Adicionar check no preview (validateImport) ou logica de skip por TX |
| V4 | BAIXO | Nenhum | Nenhum | Validacao simples de FK |
| V5 | BAIXO | Nenhum | Nenhum | Gatear logs com NODE_ENV |
| V6 | BAIXO | Nenhum | Nenhum | Adicionar @Throttle decorator |
| V7 | BAIXO | Nenhum (nao tem tela de trocar senha) | Atualizar placeholder "min. 6" → "min. 8" | Atualizar SettingsView.tsx |
| V8 | **CRITICO** — dupla reversao se implementado errado | Mesmo | Ler transacoes ANTES do soft-delete, computar, entao deletar |
| V9 | BAIXO-MEDIO | Nenhum | Transacoes com data futura ficam read-only | Validar so se campo date for fornecido no PATCH |
| V10 | MEDIO | Imports pendentes com TRANSFER falham | Mesmo | Mapear TRANSFER para INCOME/EXPENSE no validateImport baseado no amount |
| V11 | BAIXO | Nenhum | Nenhum | Criar AdminGuard reusavel |
| V12 | BAIXO | Nenhum (mobile nao chama /subscription) | Minimo (ja usa /v1) | Verificar Vite proxy config |
| V13 | BAIXO | Nenhum (nao tem tela deletar conta) | Nenhum | DTO simples |
| V14 | **ALTO** | Users novos limitados a 3 contas/3 AI | Mesmo | Migracao DB: criar subscription FREE para existentes sem registro; adicionar UI de upgrade |
| V15 | MEDIO | Endpoints premium voltam 403 | Mesmo | Aplicar guards SOMENTE quando V14 estiver deployado |
| V16 | BAIXO | Nenhum | Nenhum | Gatear com NODE_ENV |
| V17 | BAIXO | Nenhum | Nenhum | Decorator simples |
| V18 | BAIXO | Nenhum | Nenhum | Adicionar FOR UPDATE |
| V19 | BAIXO | Nenhum | Nenhum | Adicionar nginx.conf ao repo |
| V20 | BAIXO | Nenhum | Nenhum | Documentar/script |

---

### Riscos Detalhados

**V1 — MAIS PERIGOSO:** Mobile nao envia header `x-platform`. Se mudar isMobile sem atualizar o app, login/register respostas nao incluem `refreshToken` → mobile auth morre inteiramente. Precisar: (1) adicionar `x-platform: mobile` no axios do mobile, (2) mudar backend para checar esse header.

**V8 — IMPLEMENTACAO TRICKY:** Ordem de operacoes e critica. Precisa: (1) ler transacoes ativas ANTES do soft-delete, (2) computar soma de reversao, (3) soft-deletar transacoes, (4) aplicar ajuste de saldo. Se ler DEPOIS do soft-delete, o filtro `deletedAt: null` exclui tudo e nenhuma reversao acontece.

**V14 — MAIOR BLAST RADIUS:** Todo user novo fica limitado a 3 contas, 3 budgets, 3 AI/dia. Users existentes sem registro de Subscription serao afetados. Precisar: (1) migracao SQL para criar Subscription FREE para todos users existentes sem a tabela, (2) adicionar V15 (PlanGuard) SOMENTE DEPOIS, (3) UI de upgrade antes de deployar.

**V3 + V10 — PRECISA DE UX:** Import tem tratamento all-or-nothing. Uma unica transacao ruim mata o import inteiro. Ambos fixes precisam ser pareados com: (a) validacao no preview validateImport, OU (b) logica de skip por transacao com feedback de quais falharam.

**V2 — COMPORTAMENTO ESPERADO:** Tokens expirados (>7d) param de funcionar. Users sao deslogados. Isso e CORRETO mas pode parecer bug para usuarios. O interceptor do mobile ja trata 401 gracefully.

---

## Tudo Corrigido — Auditoria Completa

Todas as 20 vulnerabilidades foram identificadas, corrigidas e deployadas em produção.

### Itens futuros (nao-bloqueantes, para evolution do produto)
- **2FA**: Autenticação de dois fatores para operações críticas (saque, alteração de senha)
- **Encryption at rest**: pgcrypto para dados sensíveis no banco
- **CSP com nonces**: Content Security Policy com nonces dinâmicos
- **Anomaly monitoring**: Detecção de padrões suspeitos (múltiplas falhas de login, requests anormais)
- **Active premium revocation**: Revogar premium ativo quando subscription expira