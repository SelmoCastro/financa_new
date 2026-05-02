# Plano: Automatizar Deploy VPS via GitHub Actions (sem scripts manuais)

**Data:** 2026-05-02
**Objetivo:** Todo push/merge em master dispara deploy automático na VPS. Sem rodar `deploy.sh` manualmente. Sem clicar botão no GitHub. APK continua à parte.

---

## Situação Atual

| Componente | Como funciona hoje |
|---|---|
| Version bump | `./scripts/bump.sh patch` manual + commit + tag manual |
| Deploy backend | `ssh + git pull + npm install + build + pm2 restart` manual |
| APK build | EAS cloud (`npx eas build`) manual, ou local no SSD |
| Workflows GitHub | `bump.yml` (manual dispatch), `release.yml` (on tag push, não usado), `ci.yml` (lint/typecheck) |

**Problemas:**
- `bump.sh` não atualiza `mobileVersion` no `version-meta.json` (bug — já visto hoje)
- `release.yml` existe mas não usamos — fazemos tudo manual
- `bump.yml` requer clique no botão do GitHub Actions
- Deploy na VPS é manual com SSH

---

## Objetivo do Plano

1. **Push no master = deploy automático na VPS** — sem scripts, sem SSH manual
2. **Versionamento automático** — conventional commits definem o bump (feat=minor, fix=patch, BREAKING=major)
3. **APK continua separado** — build só quando mobilVersion mudar, sempre no SSD local
4. **Corrigir `bump.sh`** — sincronizar `mobileVersion` corretamente no `version-meta.json`

---

## Etapas

### Etapa 1: Corrigir `bump.sh`

**Arquivo:** `scripts/bump.sh`

**O que mudar:**
- Quando bumpa versão, atualizar `mobileVersion` = `version` no `backend/src/version-meta.json`
- Corrigir bug do `--notes` que insere literal `"--notes"` nos releaseNotes

**Implementação:** Alterar o bloco que mexe no `version-meta.json` (linhas ~93-104 no `bump.yml` e equivalentes no `bump.sh`):
```javascript
d.version = NEW;
d.mobileVersion = NEW;  // ← ADICIONAR
if (NOTES && NOTES !== '--notes') d.releaseNotes = NOTES;
```

---

### Etapa 2: Unificar CI + Deploy em um workflow só

**Estratégia:** Um único workflow `deploy.yml` que:
- Roda em push/merge no master (não em PR)
- Faz lint + typecheck primeiro (herda do `ci.yml`)
- Se passar, faz deploy automático na VPS

**Workflow proposto:** `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [master]

jobs:
  # Job 1: CI rápido (bloqueia deploy se falhar)
  check:
    runs-on: ubuntu-latest
    steps:
      - checkout + backend typecheck + lint
      # (o mesmo que ci.yml)

  # Job 2: Deploy VPS
  deploy:
    needs: check
    runs-on: ubuntu-latest
    steps:
      - checkout
      - SSH na VPS → git pull → npm install → nest build → pm2 restart
      - Health check
```

**Detalhes do job deploy:**
- Usa `secrets.VPS_SSH_KEY` (já configurado)
- NÃO faz `npm install --production=false` (lento) — faz só `npm install --omit=dev` para prod, já que devDeps (@types/*) não são necessárias em runtime se o build já foi feito. OU melhor: faz build no GitHub Actions runner e envia `dist/` pronto via rsync/scp (mais rápido, evita timeout na VPS)
- PM2: `pm2 restart finanza-api` (não `delete` + `start` que causa downtime)

---

### Etapa 3: Versionamento automático baseado em conventional commits

**Estratégia:** Usar `google-github-actions/release-please` ou similar que:
- Analisa commits desde o último release
- Decide bump type baseado nos prefixes (feat=minor, fix=patch, feat!=breaking=major)
- Cria PR de release automaticamente
- No merge do PR → tag + GitHub Release

**Pacote:** `release-please-action` (Google, mantido, grátis)

**Workflow separado:** `.github/workflows/release-please.yml`
```yaml
on:
  push:
    branches: [master]

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
          package-name: finanza-ai
          bump-minor-pre-major: true
```

**Comportamento:**
- Abre PR "chore(master): release 1.7.27" quando há commits novos
- PR contém: CHANGELOG atualizado, versão bumpada em todos os package.json
- Quando você mergeia o PR → tag `v1.7.27` é criada automaticamente
- NÃO builda APK automaticamente (você decide quando buildar)

**Ponto importante:** `release-please` só mexe em `package.json` (root). Precisamos de um step extra que sincroniza `app.json`, `version-meta.json`, `build.gradle`. Isso pode ser um script pós-bump no workflow.

---

### Etapa 4: APK build local (separado)

**Regra:** APK só é buildado quando `mobileVersion` muda no `version-meta.json` OU quando arquivos em `mobile/` foram alterados.

**Fluxo:**
1. Você decide buildar APK → `cd mobile && npx eas build --platform android --profile preview --local`
2. Build SEMPRE no SSD (`/home/selmo/eas-build-workdir`)
3. Upload pra VPS via `scp`
4. Atualizar symlink na VPS

**Automatizável?** Parcialmente. Dá pra ter um webhook na VPS que detecta novo APK e move pro lugar certo, mas o build em si é local (EAS free tier tem limite, build local é confiável no SSD).

**Skills a manter:** `eas-build-and-deploy`, `apk-deploy-vps` — já documentam o processo. Só atualizar referências.

---

### Etapa 5: Limpeza

**Remover:**
- `bump.yml` (substituído por release-please)
- `ci.yml` (integrado no deploy.yml)
- Referências a `standard-version` (já quebrado)

**Manter:**
- `release-drafter.yml` (útil pra gerar draft release notes)
- `deploy.sh` / `bump.sh` (fallback manual se CI falhar)

---

## Resumo do Novo Fluxo

```
Você faz commit convencional
         │
         ▼
   Push no master
         │
    ┌────┴────┐
    ▼         ▼
  CI check  release-please
  (lint)    (abre PR de release)
    │              │
    ▼              ▼
  Deploy VPS   Você mergeia o PR
  (automático)    │
                  ▼
              Tag criada
              CHANGELOG atualizado
              
  (APK: você decide quando buildar no SSD local)
```

---

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `.github/workflows/deploy.yml` | NOVO — CI + deploy automático |
| `.github/workflows/release-please.yml` | NOVO — versionamento automático |
| `.github/workflows/ci.yml` | DELETAR — integrado no deploy.yml |
| `.github/workflows/bump.yml` | DELETAR — substituído por release-please |
| `scripts/bump.sh` | CORRIGIR — mobileVersion sync + bug --notes |
| `backend/src/version-meta.json` | (atualizado automaticamente pelo release-please) |

---

## Riscos

- **release-please não mexe em app.json/version-meta.json**: Precisa de step extra no workflow. Testar antes.
- **Build na VPS falha por falta de @types**: Resolver com build no Actions runner e rsync do `dist/`
- **PM2 restart vs reload**: `restart` causa 1-2s downtime, `reload` (cluster mode) é zero-downtime mas precisa de múltiplas instâncias. Pra 1 instância, `restart` é aceitável.
- **release-please conflito com conventional commits**: Se commits não seguirem o padrão, ele assume patch. Precisa disciplina nos commits.

---

## Validação

1. Push com `fix: corrige X` → release-please deve sugerir patch
2. Push com `feat: adiciona Y` → release-please deve sugerir minor
3. Merge do PR de release → tag criada, CHANGELOG atualizado
4. Push no master → deploy.yml roda, backend atualizado na VPS, health check 200
