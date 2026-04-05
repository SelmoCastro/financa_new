# 📋 Regras de Versionamento

Este projeto segue **Semantic Versioning** (`MAJOR.MINOR.PATCH`) com commits convencionais ([Conventional Commits](https://www.conventionalcommits.org/)).

---

## 🔢 Versionamento Semântico

| Tipo | Quando usar | Exemplo |
|---|---|---|
| **MAJOR** | Mudanças que quebram compatibilidade (API, schema, comportamento) | `1.2.0` → `2.0.0` |
| **MINOR** | Novas features compatíveis com versões anteriores | `1.2.0` → `1.3.0` |
| **PATCH** | Bug fixes, correções sem mudar funcionalidade | `1.2.0` → `1.2.1` |

---

## 📝 Conventional Commits

Todo commit DEVE seguir o formato:

```
tipo(escopo): descrição curta
```

### Tipos Obrigatórios

| Prefixo | Uso | Gera no CHANGELOG |
|---|---|---|
| `feat:` | Nova funcionalidade | ✅ `✨ Features` |
| `fix:` | Correção de bug | ✅ `🐛 Bug Fixes` |
| `perf:` | Melhoria de performance | ✅ `⚡ Performance` |
| `docs:` | Documentação | ✅ `📝 Documentation` |
| `style:` | Formatação, espaço, ponto-e-vírgula | ✅ `💄 Styles` |
| `refactor:` | Refatoração de código | ✅ `♻️ Code Refactoring` |
| `test:` | Adicionar ou corrigir testes | ✅ `✅ Tests` |
| `build:` | Mudanças no build ou dependências | ✅ `📦 Build System` |
| `ci:` | Mudanças em CI/CD | ✅ `🔧 CI` |
| `chore:` | Manutenção, limpeza, config | ❌ (oculto) |
| `revert:` | Reverter commit anterior | ✅ `↩️ Reverts` |

### Exemplos Corretos

```bash
# Feature
git commit -m "feat(ai): add PDF support for receipt scanning"

# Bug fix
git commit -m "fix(reports): exclude transfers from dashboard balance"

# Breaking change
git commit -m "feat(auth)!: migrate to OAuth2, remove JWT refresh tokens"

# Com escopo
git commit -m "fix(mobile): resolve crash on transaction import"

# Sem escopo
git commit -m "feat: add dark mode toggle"
```

### ⚠️ Breaking Changes

Adicione `!` após o tipo ou inclua `BREAKING CHANGE:` no corpo:

```bash
git commit -m "feat(api)!: change transaction amount from int to decimal"

# Ou no corpo:
git commit -m "feat(api): change transaction amount format

BREAKING CHANGE: amount is now a decimal string instead of integer cents"
```

---

## 🏷️ Releases e Tags

### Criar uma Release

```bash
# Patch (1.2.0 → 1.2.1)
npm run release:patch

# Minor (1.2.0 → 1.3.0)
npm run release:minor

# Major (1.2.0 → 2.0.0)
npm run release:major

# Versão específica
npm run release -- --release-as 2.0.0
```

Isso automaticamente:
1. Atualiza `CHANGELOG.md`
2. Bump na versão do `package.json`
3. Cria o commit de release

### Tag e Push

```bash
# Após o release commit:
git tag -a v1.3.0 -m "v1.3.0 — descrição da release"
git push origin master --tags
```

---

## 🌿 Branching

### Estratégia: Trunk-Based Development

```
main (sempre estável, pronto para deploy)
├── feature/nome-da-feature
├── fix/nome-do-bug
├── refactor/nome-da-refatoracao
└── docs/nome-da-docs
```

### Regras

1. **`main` é sagrado** — nunca force push, nunca commit direto sem revisão
2. **Branches são efêmeras** — crie, trabalhe, merge, delete
3. **Merge via squash ou rebase** — mantenha histórico limpo
4. **Nome de branch = tipo/descrição** — `feat/ai-vision-pdf`, `fix/balance-calc`
5. **Teste antes do merge** — rode `npm run test` no backend

### Fluxo de Trabalho

```bash
# 1. Crie a branch
git checkout -b feat/nova-feature

# 2. Trabalhe e commite (conventional commits)
git add .
git commit -m "feat(ai): add PDF support for receipt scanning"

# 3. Push e PR
git push origin feat/nova-feature

# 4. Após merge em main, crie a release
git checkout main
git pull
npm run release:minor
git push origin main --tags
```

---

## 📦 Versionamento por Pacote

Cada pacote tem sua versão independente:

| Pacote | Versão Atual | Quando bump |
|---|---|---|
| **Backend** (`backend/package.json`) | `0.0.1` | Quando API muda |
| **Frontend** (`frontend/package.json`) | `1.1.0` | Quando UI/UX muda |
| **Mobile** (`mobile/package.json`) | `1.0.0` | Quando app muda |
| **Projeto** (`package.json` raiz) | `1.2.0` | Release geral do projeto |

---

## 📄 CHANGELOG.md

Gerado automaticamente pelo `standard-version`. **Não edite manualmente.**

Estrutura:
```markdown
## [1.3.0] - 2026-04-10

### ✨ Features
- Nova funcionalidade X
- Nova funcionalidade Y

### 🐛 Bug Fixes
- Correção do bug Z

### 📝 Documentation
- README atualizado
```

---

## ✅ Checklist de Release

- [ ] Todos os testes passando
- [ ] CHANGELOG.md revisado
- [ ] Versão do `package.json` raiz atualizada
- [ ] Tag git criada e com push
- [ ] Deploy em produção
- [ ] Comunicar mudanças (se relevante)
