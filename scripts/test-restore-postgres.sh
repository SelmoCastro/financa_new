#!/usr/bin/env bash
set -euo pipefail

# Teste de restore isolado para validar um backup sem tocar no banco real.
# Uso:
#   ./scripts/test-restore-postgres.sh /opt/finanza-backups/latest.sql.gz
# Opcional:
#   RESTORE_TEST_CONTAINER=finanza-restore-test ./scripts/test-restore-postgres.sh backups/postgres/latest.sql.gz

BACKUP_FILE="${1:-${BACKUP_FILE:-./backups/postgres/latest.sql.gz}}"
CONTAINER="${RESTORE_TEST_CONTAINER:-finanza-restore-test}"
DB_NAME="${POSTGRES_DB:-finanza_restore_test}"
DB_USER="${POSTGRES_USER:-finanza}"
DB_PASSWORD="${POSTGRES_PASSWORD:-restore-test-only}"
PORT="${RESTORE_TEST_PORT:-55432}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERRO: backup não encontrado: $BACKUP_FILE" >&2
  exit 1
fi

gzip -t "$BACKUP_FILE"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER" \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -p "127.0.0.1:${PORT}:5432" \
  postgres:16-alpine >/dev/null

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

gzip -dc "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" >/dev/null

TABLE_COUNT="$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select count(*) from information_schema.tables where table_schema='public';")"
USER_TABLE_EXISTS="$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select to_regclass('\"User\"') is not null;")"

if [[ "$TABLE_COUNT" -lt 1 || "$USER_TABLE_EXISTS" != "t" ]]; then
  echo "ERRO: restore executou, mas schema esperado não apareceu (tables=$TABLE_COUNT, User=$USER_TABLE_EXISTS)" >&2
  exit 1
fi

echo "OK restore testado com sucesso: tables=$TABLE_COUNT backup=$BACKUP_FILE"
