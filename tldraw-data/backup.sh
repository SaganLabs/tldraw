#!/bin/sh
set -e
TS=$(date +%Y%m%d-%H%M)
# Keycloak DB
PGPASSWORD="$PGPASSWORD_AUTH" pg_dump -h "$PGHOST_AUTH" -U "$PGUSER_AUTH" -d "$PGDB_AUTH" > "/backups/keycloak_$TS.sql"
# Boards DB
PGPASSWORD="$PGPASSWORD_BOARDS" pg_dump -h "$PGHOST_BOARDS" -U "$PGUSER_BOARDS" -d "$PGDB_BOARDS" > "/backups/tldraw_$TS.sql"
# Keep last 4 files of each
ls -1t /backups/keycloak_*.sql 2>/dev/null | tail -n +5 | xargs -r rm -f
ls -1t /backups/tldraw_*.sql 2>/dev/null | tail -n +5 | xargs -r rm -f
