# Auditoria de Segurança — Financa_new — Maio 2026

**Data:** 2026-05-23
**Escopo:** Backend (NestJS), Frontend (React/Vite), Mobile (React Native/Expo), Infraestrutura (Nginx/Docker)
**Metodologia:** Revisão manual de código, análise de configuração, verificação de padrões de segurança

---

## Sumário Executivo

Foram identificadas **7 vulnerabilidades** (1 Crítica, 2 Altas, 3 Médias, 1 Baixa). A falha mais grave (Crítica) torna todo o sistema de auditoria (tamper-evident audit log) não funcional — nenhum evento de segurança é persistido. Recomenda-se correção imediata do item Crítico e planejamento das correções de itens Altos na próxima sprint.

---

## 1. CRÍTICO — Audit Log completamente quebrado

**Arquivo:** `backend/src/audit/audit.service.ts:72`
**Tipo:** Runtime failure — referência indefinida

### Descrição
O módulo de auditoria importa `createHash` do módulo `crypto`, mas na linha 72 chama `crypto.randomUUID()` — que não está definido. `crypto` nunca foi importado como namespace.

```typescript
import { createHash } from 'crypto'; // Só importa createHash, não o namespace

// ...

const id = crypto.randomUUID(); // ReferenceError: crypto is not defined
```

### Impacto
- **Nenhum evento de auditoria é persistido.** O erro é capturado pelo `try/catch` no método `log()`, que loga um warning mas não relança — falha silenciosa.
- Eventos críticos como `auth.login`, `auth.password_change`, `user.delete_account`, `admin.action`, todos os eventos de pagamento (`payments.*`) e operações financeiras não são registrados.
- A cadeia de hash (tamper-evident chain) nunca é construída — `verifyChain()` sempre retornará vazio.
- Em caso de incidente de segurança (ex: acesso não autorizado, alteração de dados), **não há trilha de auditoria para investigação forense**.

### Correção
Substituir a importação por:
```typescript
import * as crypto from 'crypto';
```

Ou usar `crypto.randomUUID()` → `randomUUID()` se usar named import:
```typescript
import { createHash, randomUUID } from 'crypto';
```

---

## 2. ALTO — JWT Context Validation não faz validação

**Arquivo:** `backend/src/auth/jwt.strategy.ts:57-67`
**Tipo:** Lógica de segurança não funcional

### Descrição
A flag `STRICT_JWT_CONTEXT` está documentada como uma camada de segurança que valida se o IP e User-Agent da requisição correspondem ao contexto original do JWT. Porém, o código apenas *loga* o contexto atual — nunca compara com valores armazenados nem rejeita requisições com contexto diferente.

```typescript
if (strictContext) {
  const currentIp = ...;     // Obtém IP
  const currentUa = ...;     // Obtém User-Agent
  // Log context for audit (always, regardless of strict mode)
  this.logger.debug(`JWT context: ip=${currentIp} ua=${currentUa.substring(0, 40)}`);
  // NENHUMA VALIDAÇÃO ACONTECE — não compara, não rejeita mismatch
}
```

### Impacto
- Um atacante que obtiver um JWT válido pode usá-lo de qualquer IP/dispositivo, mesmo com `STRICT_JWT_CONTEXT=true`.
- O administrador que ativar essa flag acredita estar protegido contra token theft, mas a proteção é ilusória.
- A funcionalidade está implementada ~50% (obtém o contexto, loga) mas falta a outra metade (validar).

### Correção
Armazenar IP e User-Agent no payload do JWT ou em cache Redis no login/refresh, e comparar em `validate()`:

```typescript
if (strictContext) {
  const currentIp = ...;
  const currentUa = ...;
  const storedIp = payload.ip; // ou buscar de cache
  const storedUa = payload.userAgent; // ou buscar de cache
  if (currentIp !== storedIp || currentUa !== storedUa) {
    throw new UnauthorizedException('Token context mismatch');
  }
}
```

---

## 3. MÉDIA — BehavioralThrottleMiddleware — vazamento de memória (Map infinito)

**Arquivo:** `backend/src/common/middleware/behavioral-throttle.middleware.ts:25`
**Tipo:** Resource leak — possível DoS

### Descrição
O `BehavioralThrottleMiddleware` mantém um `Map<string, Tracker>` em memória (público, inclusive) que cresce indefinidamente com IPs distintos. O cleanup a cada 10 minutos remove apenas entradas inativas há 30+ minutos que não estejam em período de penalidade. Um atacante com 10k+ IPs distintos (ex: botnet, VPN rotation) pode:

1. Inflar o Map para milhões de entradas, causando OOM no processo Node.
2. Cada entrada é pequena (~200 bytes), mas 1M IPs = ~200MB.
3. O Map é público (`public ipTracker`) — qualquer código pode lê-lo ou modificá-lo.

### Impacto
- Exaustão de memória em cenário de ataque distribuído.
- Sem limite superior de entradas — DoS de resource exhaustion.
- Propriedade pública `ipTracker` expõe dados internos.

### Correção
- Limitar o número máximo de entradas (ex: 100k).
- Usar `Map` privado ou `WeakMap`.
- Implementar LRU cleanup (remover entradas mais antigas quando atingir o limite).
- Tornar `ipTracker` privado e expor apenas leitura controlada via método.

---

## 4. MÉDIA — `GET /v1/auth/export-data` sem rate limiting

**Arquivo:** `backend/src/auth/auth.controller.ts:285-292`
**Tipo:** Falta de proteção contra abuso

### Descrição
O endpoint de portabilidade de dados (LGPD) não possui decorator `@Throttle()`. Retorna todos os dados do usuário: transações, contas, cartões, metas, orçamentos, notificações, logs de IA. Uma requisição bem formada com JWT válido exporta o dataset completo sem limitação de frequência.

```typescript
@Get('export-data')
@UseGuards(AuthGuard('jwt'))
async exportData(@Request() req, @Res() res: Response) {
  const data = await this.authService.exportAllData(req.user.userId);
  res.header('Content-Type', 'application/json; charset=utf-8');
  res.header('Content-Disposition', 'attachment; filename=finanza-dados-pessoais.json');
  res.send(JSON.stringify(data, null, 2));
}
```

### Impacto
- JWT comprometido → exfiltração completa dos dados financeiros do usuário.
- Potencial para DoS no banco de dados (consultas pesadas em todas as tabelas do usuário).
- Dados financeiros sensíveis (decifrados) retornados em cada requisição.

### Correção
Adicionar rate limiting e logging de auditoria:
```typescript
@Throttle({ default: { limit: 3, ttl: 60000 } })
@AuditLog({ action: 'user.export_data', targetType: 'User' })
@Get('export-data')
```

---

## 5. MÉDIA — CSP sem `report-uri`/`report-to` para monitoramento de violações

**Arquivo:** `backend/src/setup.ts:93-121`
**Tipo:** Falta de observabilidade de segurança

### Descrição
A Content Security Policy implementada com Helmet usa nonces e diretivas restritivas, mas não configura `report-uri` ou `report-to`. Violações de CSP (que podem indicar tentativas de XSS) não são reportadas a nenhum endpoint de coleta.

### Impacto
- Tentativas de XSS bem-sucedidas ou bloqueadas passam despercebidas.
- Não há capacidade de detectar e responder a ataques baseados em injeção de conteúdo.
- Degrada a capacidade de hardening progressivo da CSP.

### Correção
Adicionar diretiva `report-uri` apontando para um endpoint de coleta:
```typescript
contentSecurityPolicy: {
  directives: {
    // ...
    reportUri: '/api/v1/errors/csp-report',
  },
},
```

Ou configurar `report-to` com endpoint externo (ex: https://report-uri.com).

---

## 6. MÉDIA — DecryptInterceptor global decifra todos os campos `enc:` em toda resposta

**Arquivo:** `backend/src/common/interceptors/decrypt.interceptor.ts`
**Tipo:** Exposição de superfície de ataque

### Descrição
O `DecryptInterceptor` é um interceptor global (aplicado a todas as rotas via `app.useGlobalInterceptors`) que percorre recursivamente todo objeto de resposta e decifra qualquer campo que comece com `enc:`. Embora seja o design intencional, isso significa que:

1. Qualquer endpoint, mesmo que retorne dados não-financeiros, passa pelo processo de decifra.
2. Um bug no `decryptDeep()` que trate `null`/`undefined` incorretamente pode vazar dados.
3. Dados financeiros decifrados viajam por toda a cadeia de transformação (interceptors, serializers, etc.).

### Impacto
- Superfície de ataque maior que o necessário.
- JWT comprometido → acesso total a todos os dados financeiros decifrados.
- Performance impactada em toda resposta (recursão em objetos grandes).

### Correção
Aplicar o `DecryptInterceptor` apenas nos módulos/controllers que realmente retornam dados financeiros, em vez de globalmente. Ou usar decorator customizado para marcar endpoints que precisam de decifra.

---

## 7. BAIXA — Webhook HTTP retorna 200 mesmo quando assinatura está ausente (produção)

**Arquivo:** `backend/src/payments/payments.controller.ts:62-65`
**Tipo:** Observabilidade

### Descrição
Em produção, quando o webhook do Mercado Pago chega sem o header `x-signature`, o controller retorna `200 OK` sem processar nada. Embora a requisição não seja processada (correto), o Mercado Pago interpreta 200 como "recebido com sucesso" e não tentará novamente ou alertará o operador.

### Impacto
- Webhooks legítimos que chegam sem assinatura (ex: problema de rede, proxy mal configurado) são silenciosamente engolidos.
- Sem notificação para o operador de que algo está errado com a configuração do webhook.

### Correção
Retornar 400 ou 401 quando a assinatura estiver ausente, e logar um alerta crítico. O Mercado Pago respeita retry em não-200.

---

## Recomendações Adicionais

### Práticas de Segurança

1. **Executar `npm audit` semanalmente** no backend para identificar vulnerabilidades em dependências.
2. **Configurar GitHub Secret Scanning** para detectar segredos em commits.
3. **Implementar rotação de chaves** para `ENCRYPTION_KEY` (já suportado via `ENCRYPTION_KEYS`).
4. **Monitorar os logs de auditoria** após o reparo do item #1.

### Arquiteturais

5. **Adicionar `request size limiter`** para prevenir DoS via payloads JSON grandes.
6. **Revisar se `audit.service.ts` é o único local com `crypto.randomUUID()` sem import** — possível padrão.
7. **Considerar implementar `report-to` CSP endpoint** para detecção precoce de XSS.

---

## Histórico de Auditorias Anteriores

- **2026-04-18** — `auditoria-seguranca-2026-04-18.md`: Auditoria inicial com 20 vulnerabilidades (5 CRÍTICO, 10 ALTO, 5 MÉDIO). Reportado como corrigido.
- **2026-05-23** — Presente documento: 7 vulnerabilidades (1 CRÍTICO, 2 ALTO, 4 MÉDIO, 1 BAIXO). Pendentes de correção.

---

*Documento gerado em 2026-05-23. Revisão recomendada: após cada ciclo de deploy significativo.*
