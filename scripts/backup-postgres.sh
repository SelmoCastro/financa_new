#!/usr/bin/env bash
set -euo pipefail

# Backup seguro do PostgreSQL do Finanza.
# Uso local/VPS:
#   BACKUP_DIR=/opt/finanza-backups ./scripts/backup-postgres.sh
# Cron sugerido (VPS):
#   0 2 * * * cd /caminho/Financa_new && BACKUP_DIR=/opt/finanza-backups ./scripts/backup-postgres.sh >> /var/log/finanza-backup.log 2>&1

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
CONTAINER="${POSTGRES_CONTAINER:-finanza-db}"
DB_NAME="${POSTGRES_DB:-finanza}"
DB_USER="${POSTGRES_USER:-finanza}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DIR}/finanza-${TIMESTAMP}.sql.gz"
LATEST_FILE="${BACKUP_DIR}/latest.sql.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "ERRO: container PostgreSQL '$CONTAINER' não está em execução" >&2
  exit 1
fi

TMP_FILE="${OUT_FILE}.tmp"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
  | gzip -9 > "$TMP_FILE"

# Verifica se o gzip foi gerado íntegro antes de promover para backup final.
gzip -t "$TMP_FILE"
mv "$TMP_FILE" "$OUT_FILE"
ln -sfn "$(basename "$OUT_FILE")" "$LATEST_FILE"

# Rotação simples: mantém N dias.
find "$BACKUP_DIR" -type f -name 'finanza-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "OK backup criado: $OUT_FILE"
