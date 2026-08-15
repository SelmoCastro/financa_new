# QA ponta a ponta

## Teste completo de menus e lançamentos

O teste `qa/full-menu-smoke.spec.ts` cobre:

- navegação por todos os menus acessíveis;
- inclusão de uma despesa controlada;
- presença no Histórico;
- atualização do valor no Dashboard;
- exclusão no Histórico;
- remoção do lançamento do Dashboard;
- respostas HTTP `/api/*` sem status 4xx/5xx durante o fluxo.

Executar com uma conta de QA, nunca com dados pessoais de produção:

```bash
export E2E_BASE_URL="https://finanzaai.tech"
export E2E_EMAIL="[REDACTED]"
export E2E_PASSWORD="[REDACTED]"
npx playwright install chromium
npm run test:e2e
```

O teste cria somente o registro identificado por `E2E despesa consistente` e o remove ao final. Se o processo for interrompido, apagar manualmente apenas esse registro da conta de QA.
