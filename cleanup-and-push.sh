#!/bin/bash
# Finanza AI - Limpar repositório e enviar para GitHub
# Uso: ./cleanup-and-push.sh [--force] [--dry-run]
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FORCE=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --force) FORCE=true ;;
    --dry-run) DRY_RUN=true ;;
    *) echo "Uso: $0 [--force] [--dry-run]"; exit 1 ;;
  esac
done

run() {
  if $DRY_RUN; then
    echo -e "${YELLOW}[DRY-RUN]$NC $@"
  else
    echo -e "${GREEN}>$NC $@"
    eval "$@"
  fi
}

echo "=== Finanza AI — Limpar e Enviar para GitHub ==="
echo ""

# 1. Verificar se estamos no diretorio certo
if [ ! -d ".git" ]; then
  echo -e "${RED}Erro: nao estou em um repositorio git${NC}"
  exit 1
fi

# 2. Stash alteracoes nao commitadas
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}Alteracoes pendentes encontradas. Fazendo stash...${NC}"
  run "git stash push -m 'cleanup-stash'"
fi

# 3. Remover arquivos grandes do historico (se existirem)
echo ""
echo "=== Verificando blobs grandes no historico ==="
LARGE_BLOBS=$(git rev-list --objects --all 2>/dev/null | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' 2>/dev/null | \
  grep '^blob' | awk '$3 > 10485760 {print $4}' | grep -v '^$' | sort -u)

if [ -n "$LARGE_BLOBS" ]; then
  echo -e "${YELLOW}Blobs >10MB encontrados:${NC}"
  echo "$LARGE_BLOBS"
  echo ""
  if command -v git-filter-repo &>/dev/null; then
    echo -e "${YELLOW}Removendo com git-filter-repo...${NC}"
    # Montar lista de paths para remover
    FILTER_PATHS=""
    for blob_path in $LARGE_BLOBS; do
      FILTER_PATHS="$FILTER_PATHS --path $blob_path"
    done
    run "~/.local/bin/git-filter-repo --invert-paths $FILTER_PATHS --force"
    # Re-adicionar remote (filter-repo remove)
    run "git remote add origin git@github.com:SelmoCastro/financa_new.git"
  else
    echo -e "${RED}git-filter-repo nao instalado. Instale com: pip3 install --user git-filter-repo${NC}"
  fi
else
  echo -e "${GREEN}Nenhum blob >10MB encontrado.${NC}"
fi

# 4. Deletar branches locais obsoletas (exceto master)
echo ""
echo "=== Limpando branches locais ==="
# Limpar worktrees prunable primeiro
run "git worktree prune 2>/dev/null || true"
STALE_BRANCHES=$(git branch --list | sed 's/^[+*] //' | grep -v 'master' | grep -v '^$' || true)
if [ -n "$STALE_BRANCHES" ]; then
  echo -e "${YELLOW}Branches locais obsoletas:${NC}"
  echo "$STALE_BRANCHES"
  for branch in $STALE_BRANCHES; do
    run "git branch -D $branch"
  done
else
  echo -e "${GREEN}Nenhuma branch obsoleta local.${NC}"
fi

# 5. Deletar branches remotas obsoletas
echo ""
echo "=== Limpando branches remotas ==="
REMOTE_BRANCHES=$(git branch -r | grep -v 'origin/master' | grep -v 'origin/HEAD' | sed 's/^ *//' | sed 's|origin/||' || true)
if [ -n "$REMOTE_BRANCHES" ]; then
  echo -e "${YELLOW}Branches remotas obsoletas:${NC}"
  echo "$REMOTE_BRANCHES"
  for branch in $REMOTE_BRANCHES; do
    run "git push origin --delete $branch"
  done
else
  echo -e "${GREEN}Nenhuma branch obsoleta no remote.${NC}"
fi

# 6. Garbage collection
echo ""
echo "=== Garbage collection ==="
run "git reflog expire --expire=now --all"
run "git gc --prune=now --aggressive"

# 7. Restaurar stash
if git stash list | grep -q 'cleanup-stash'; then
  echo ""
  echo -e "${YELLOW}Restaurando stash...${NC}"
  run "git stash pop"
fi

# 8. Resumo
echo ""
echo "=== Resumo ==="
echo "Commits: $(git rev-list --count HEAD)"
echo "Branches: $(git branch -a | wc -l)"
echo "Repo size: $(du -sh .git/ | cut -f1)"
echo "Status: $(git status --short | wc -l) arquivos pendentes"

# 9. Push
echo ""
echo "=== Enviando para GitHub ==="
if $FORCE; then
  echo -e "${YELLOW}Force push!${NC}"
  run "git push origin master --force"
else
  run "git push origin master"
fi

if $DRY_RUN; then
  echo ""
  echo -e "${YELLOW}=== DRY-RUN — nenhum comando foi executado ==="
  echo -e "Rode sem --dry-run para executar, ou com --force para reescrever historico${NC}"
else
  echo ""
  echo -e "${GREEN}=== Pronto! Repositorio limpo e atualizado no GitHub ===${NC}"
fi