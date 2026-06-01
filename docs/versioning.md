# Versionamento do Finanza AI

Este repositório usa **Semantic Versioning** (`MAJOR.MINOR.PATCH`) com uma única versão compartilhada pelo monorepo.

## Regra prática

- **PATCH** (`1.8.97` → `1.8.98`)
  - bug fix
  - ajuste visual
  - hardening
  - refactor sem nova capability principal

- **MINOR** (`1.8.x` → `1.9.0`)
  - feature nova relevante para o usuário
  - capability nova que atravessa múltiplos módulos
  - mudança material na operação do app, mesmo sem breaking change

- **MAJOR** (`1.x` → `2.0.0`)
  - breaking change real
  - incompatibilidade forte de API/fluxo/dados
  - migração manual ou remoção de comportamento esperado

## Regra específica do projeto

No Finanza, prefira **MINOR** quando a release:
- cria uma capability nova grande;
- toca vários módulos/telas/serviços;
- muda claramente a experiência do usuário.

Exemplos típicos:
- offline-first / sync engine
- novo importador principal
- módulo novo inteiro (ex.: relatórios completos no mobile)
- reestruturação grande do fluxo de autenticação ou atualização

## `mobileVersion` vs `minRequiredVersion`

Esses campos **não** significam a mesma coisa.

- `mobileVersion`: versão publicada do APK
- `minRequiredVersion`: versão mínima que ainda pode rodar sem update forçado

Então:
- uma release pode ser **`1.9.0`** e manter `minRequiredVersion: "1.7.0"` se continuar compatível;
- só aumente `minRequiredVersion` quando versões antigas ficarem incompatíveis, inseguras ou funcionalmente quebradas.

## Exemplo histórico: offline-first

Reclassificação histórica recomendada:

- **`v1.8.89` deveria ter sido `v1.9.0`**

Motivo:
- introduziu base offline-first no mobile;
- adicionou fila offline de transações e recorrentes;
- adicionou cache local, warmup, NetworkContext, guardas offline e banner offline;
- alterou dezenas de arquivos e mudou materialmente a experiência do app.

A expansão posterior em **`v1.8.95`** ficou mais próxima de um **`1.9.1`** ou **`1.9.2`**, porque ampliou a mesma capability com `localDb`, offline de budgets e goals.

## Fonte da versão no monorepo

A versão do release nasce no `package.json` raiz e é sincronizada para:
- `backend/package.json`
- `frontend/package.json`
- `mobile/package.json`
- `mobile/app.json`
- `mobile/android/app/build.gradle`
- `backend/src/version-meta.json`

## Fluxo obrigatório

1. Escolha corretamente `patch`, `minor` ou `major`
2. Rode o bump a partir da raiz
3. Verifique sincronização de versão
4. Só então faça commit/tag/deploy

### Comandos

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

## Regras de segurança para release mobile

- Não editar `version-meta.json` manualmente como atalho de release
- Não esquecer `mobile/android/app/build.gradle`
- Não subir `minRequiredVersion` só porque subiu `mobileVersion`
- Não tratar feature grande como patch só porque não quebrou API
