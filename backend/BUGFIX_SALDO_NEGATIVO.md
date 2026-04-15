# 🔧 Correção de Bug de Saldo Negativo

## Problema Relatado

Ao criar uma nova conta (ex: poupança) com saldo inicial e depois editar uma transação, o saldo da conta ficava **negativo incorretamente**.

## Causa Raiz

Foram encontrados **DOIS bugs**:

### Bug 1: `accounts.service.ts` - Saldo inicial não era atualizado

Quando uma conta era criada com `balance` inicial:
1. ✅ A transação de "Saldo Inicial" era criada
2. ❌ **O saldo da conta NÃO era atualizado**

**Arquivo:** `backend/src/accounts/accounts.service.ts`

**Antes:**
```typescript
await tx.transaction.create({
  data: {
    userId,
    accountId: account.id,
    // ... dados da transação de saldo inicial
  },
});
// ❌ Faltava atualizar o balance da conta!
```

**Depois:**
```typescript
await tx.transaction.create({
  data: {
    userId,
    accountId: account.id,
    // ... dados da transação de saldo inicial
  },
});

// ✅ Agora atualiza o saldo também
await tx.account.update({
  where: { id: account.id },
  data: { balance: { increment: initialBalance } },
});
```

---

## Como Corrigir Dados Existentes

Se você já tem contas com saldos incorretos no banco, use um dos scripts abaixo:

### Opção 1: Script de Debug (apenas visualização)

```bash
cd backend
node debug_account_balance.js
```

Este script mostra:
- Saldo atual no DB
- Saldo calculado baseado nas transações
- Diferença entre eles
- Últimas 10 transações

### Opção 2: Script de Correção (atualiza o banco)

```bash
cd backend
node scripts/fix_account_balances.js
```

Este script:
- Recalcula o saldo de TODAS as contas baseado nas transações
- Atualiza o banco de dados
- Mostra relatório do que foi corrigido

---

## Como Testar a Correção

1. **Crie uma nova conta com saldo inicial:**
   ```
   Nome: Poupança BB
   Tipo: savings
   Saldo Inicial: R$ 1000,00
   ```

2. **Verifique no dashboard:**
   - Saldo da conta deve mostrar R$ 1000,00
   - Dashboard geral deve incluir esse valor

3. **Edite uma transação:**
   - Mude o valor de R$ 100,00 para R$ 150,00
   - Saldo deve ser recalculated corretamente

4. **Rode o script de debug:**
   ```bash
   node debug_account_balance.js
   ```
   - Diferença deve ser R$ 0,00

---

## Prevenção Futura

Sempre que criar uma transação **diretamente** em um service (não via `TransactionsService`):

✅ **SEMPRE** atualize o saldo da conta manualmente:
```typescript
await tx.account.update({
  where: { id: accountId },
  data: { balance: { increment: valor } },
});
```

Ou melhor ainda: **delegue para `TransactionsService.create()`** que já faz isso automaticamente.

---

## Arquivos Modificados

- `backend/src/accounts/accounts.service.ts` - Correção do bug
- `backend/debug_account_balance.js` - Script de debug (novo)
- `backend/scripts/fix_account_balances.js` - Script de correção (novo)
