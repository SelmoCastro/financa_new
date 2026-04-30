#!/bin/bash
# Rollback rápido — volta o deploy na VPS para um commit/tag específico
# Uso: ./scripts/rollback.sh <tag|commit>
# Ex:   ./scripts/rollback.sh v1.4.7
#       ./scripts/rollback.sh HEAD~1
# Se não passar argumento, mostra últimos 5 commits como referência

set -e

VPS_HOST="${VPS_HOST:-2.24.211.92}"
VPS_USER="${VPS_USER:-root}"
TARGET="$1"

echo "📦 Finanza Rollback"
echo "   VPS: $VPS_USER@$VPS_HOST"
echo ""

if [ -z "$TARGET" ]; then
  echo "Últimos 5 commits no repositório local:"
  git log --oneline -5
  echo ""
  echo "Tags disponíveis (últimas 5):"
  git tag --sort=-version:refname | head -5
  echo ""
  echo "Uso: $0 <tag|commit>"
  echo "Exemplos:"
  echo "  $0 v1.4.7          # rollback pra tag específica"
  echo "  $0 HEAD~1          # volta 1 commit"
  echo "  $0 c0b4340         # rollback pra commit específico"
  exit 0
fi

# Mostra o que vamos deployar
echo "Target: $TARGET"
echo ""
echo "Commits nesse target (últimos 3):"
git log --oneline "$TARGET" -3 2>/dev/null || echo "  (tag/commit remoto — verificando na VPS)"
echo ""

read -p "⚠️  Fazer rollback na VPS para $TARGET? [s/N] " confirm
if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
  echo "Cancelado."
  exit 0
fi

echo ""
echo "🔄 Conectando na VPS e fazendo rollback..."
ssh "${VPS_USER}@${VPS_HOST}" "
  set -e
  cd /opt/finanza
  echo '  → git fetch origin'
  git fetch origin
  echo '  → git reset --hard $TARGET'
  git reset --hard '$TARGET'
  echo '  → deploy.sh all'
  bash deploy.sh all
  echo '  ✅ Rollback concluído!'
"

echo ""
echo "Verificando saúde da API..."
sleep 3
ssh "${VPS_USER}@${VPS_HOST}" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/v1/app/version" 2>/dev/null || echo "⚠️  Health check indisponível"

echo ""
echo "✅ Rollback para $TARGET finalizado."
