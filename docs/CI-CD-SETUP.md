# CI/CD Setup Guide — Finanza

Após os workflows estarem no repo, configure os secrets no GitHub:

## Passo 1: GitHub Personal Access Token (PAT)

1. Vá em https://github.com/settings/tokens?type=beta
2. Clique **Generate new token**
3. Nome: `finanza-ci`
4. Expiration: 90 days (ou custom)
5. Repository access: **Only select** `SelmoCastro/financa_new`
6. Permissões (Repository permissions):
   - Contents: **Read and Write**
   - Pull requests: **Read and Write**
   - Actions: **Read and Write**
7. Copie o token

## Passo 2: Configurar GitHub Secrets

Vá em https://github.com/SelmoCastro/financa_new/settings/secrets/actions

Adicione os seguintes secrets:

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | `2.24.211.92` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Conteúdo do `/tmp/finanza-ci-key` (chave privada) |

Para ler a chave privada:
```bash
cat /tmp/finanza-ci-key
```

Copie TODO o conteúdo (incluindo as linhas `-----BEGIN...` e `-----END...`).

## Passo 3: Install Release Drafter App

1. Vá em https://github.com/apps/release-drafter
2. Clique **Install** ou **Configure**
3. Selecione o repositório `SelmoCastro/financa_new`

## Passo 4: Testar o CI

Faça um push qualquer e veja se o CI workflow roda:
```bash
git push origin master
```

Vá em https://github.com/SelmoCastro/financa_new/actions e verifique se o job "CI" passou.

## Passo 5: Fazer um release via workflow

Vá em https://github.com/SelmoCastro/financa_new/actions/workflows/bump.yml

Clique **Run workflow** → selecione `patch` → **Run workflow**

Isso vai:
1. Bump version em todos os arquivos
2. Gerar CHANGELOG
3. Commit + tag
4. Push tag → trigger automático do release workflow
5. Release workflow: deploy backend → build APK → upload VPS → GitHub Release

## Fluxo de trabalho (daqui em diante)

### Para liberar uma nova versão:
1. Vá em Actions → Version Bump → Run workflow
2. Escolha patch/minor/major
3. Opcionalmente adicione release notes
4. Clique Run
5. O resto é automático: bump → tag → build → deploy → release

### Para deploy rápido (sem bump de versão):
```bash
./scripts/deploy.sh --backend-only
```

### Para build de APK sem deploy:
```bash
./scripts/deploy.sh --skip-build
# ou
./scripts/deploy.sh --apk-only
```

## Workflows criados

| Workflow | Trigger | O que faz |
|----------|---------|-----------|
| `ci.yml` | Push/PR em master | Lint + type-check (rápido, ~2min) |
| `bump.yml` | Manual (workflow_dispatch) | Bump versão + CHANGELOG + tag |
| `release.yml` | Push de tag `v*` | Deploy backend + build APK + upload + GitHub Release |
| `release-drafter.yml` | Push/PR em master | Gera draft de release notes |

## Limpar APKs antigos da VPS (opcional)

Os APKs acumulam. Para limpar versões antigas mantendo as 3 últimas:
```bash
ssh root@2.24.211.92 "cd /var/www/finanzaai.tech/downloads && ls -t Financa_new_v*.apk | tail -n +4 | xargs rm -f"
```