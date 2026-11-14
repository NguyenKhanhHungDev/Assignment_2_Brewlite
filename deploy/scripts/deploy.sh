#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/compose.prod.yaml}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env.prod}"
RELEASE_FILE="${RELEASE_FILE:-$DEPLOY_DIR/.current-release}"
PREVIOUS_RELEASE_FILE="${PREVIOUS_RELEASE_FILE:-$DEPLOY_DIR/.previous-release}"
BACKUP_DIR="${BACKUP_DIR:-$DEPLOY_DIR/backups}"

IMAGE_TAG="${1:-${IMAGE_TAG:-}}"
if [[ -z "$IMAGE_TAG" ]]; then
  echo "Usage: $0 <image-tag>" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.prod.example and fill production values first." >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing $COMPOSE_FILE." >&2
  exit 1
fi

# Preserve caller-provided RUN_SEED override if passed explicitly by CI/workflow_dispatch.
OVERRIDE_RUN_SEED="${RUN_SEED:-}"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -n "$OVERRIDE_RUN_SEED" ]]; then
  export RUN_SEED="$OVERRIDE_RUN_SEED"
else
  export RUN_SEED="${RUN_SEED:-false}"
fi

IMAGE_REGISTRY_OWNER="${IMAGE_REGISTRY_OWNER:-${GITHUB_REPOSITORY_OWNER:-}}"
if [[ -z "$IMAGE_REGISTRY_OWNER" ]]; then
  echo "IMAGE_REGISTRY_OWNER must be set in $ENV_FILE or environment." >&2
  exit 1
fi
IMAGE_REGISTRY_OWNER="${IMAGE_REGISTRY_OWNER,,}"

export API_IMAGE="ghcr.io/${IMAGE_REGISTRY_OWNER}/brewlite-api:${IMAGE_TAG}"
export API_MIGRATE_IMAGE="ghcr.io/${IMAGE_REGISTRY_OWNER}/brewlite-api-migrate:${IMAGE_TAG}"
export WEB_IMAGE="ghcr.io/${IMAGE_REGISTRY_OWNER}/brewlite-web:${IMAGE_TAG}"

require_non_placeholder() {
  local name="$1"
  local value="${!name:-}"
  local lower="${value,,}"
  if [[ -z "$value" || "$lower" == replace_with_* || "$lower" == replace-with-* || "$lower" == *"changeme"* || "$lower" == "your-subdomain.duckdns.org" ]]; then
    echo "Environment variable $name must be configured with a real value in $ENV_FILE." >&2
    exit 1
  fi
}

for var_name in DB_USER DB_PASSWORD DB_NAME JWT_SECRET BFF_PROXY_SECRET CADDY_PROXY_SECRET APP_DOMAIN; do
  require_non_placeholder "$var_name"
done

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# Enforce PostgreSQL internal-only constraint in rendered Compose config (supports both short and long port syntax).
if python3 -c '
import json, sys
cfg = json.load(sys.stdin)
db = cfg.get("services", {}).get("db", {})
if db.get("ports"):
    sys.exit(1)
' <<<"$(compose config --format json)"; then
  :
else
  echo "Refusing to deploy: compose config exposes ports on db service." >&2
  exit 1
fi

echo "==> Pulling release images for tag ${IMAGE_TAG}..."
compose pull migrate api web caddy

echo "==> Ensuring PostgreSQL container is running and healthy..."
compose up -d --wait db

if [[ -n "$(compose port db 5432 2>/dev/null || true)" ]]; then
  echo "Refusing to deploy: db container publishes port 5432 on host." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/brewlite-${DB_NAME}-$(date -u +%Y%m%dT%H%M%SZ)-${IMAGE_TAG:0:12}.sql.gz"
echo "==> Creating pre-migration PostgreSQL backup at ${BACKUP_FILE}..."
compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges | gzip >"$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "Backup file is empty: $BACKUP_FILE" >&2
  exit 1
fi

# Keep the 14 most recent pre-migration backups to control disk usage on 30 GiB EC2 root volume.
ls -1t "$BACKUP_DIR"/brewlite-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "==> Running database migrations (RUN_SEED=${RUN_SEED})..."
if ! compose run --rm migrate; then
  echo "Migration failed. Running containers were left unchanged; backup saved at ${BACKUP_FILE}." >&2
  exit 1
fi

if [[ -f "$RELEASE_FILE" ]]; then
  cp "$RELEASE_FILE" "$PREVIOUS_RELEASE_FILE"
fi

{
  echo "IMAGE_TAG=$IMAGE_TAG"
  echo "IMAGE_REGISTRY_OWNER=$IMAGE_REGISTRY_OWNER"
  echo "API_IMAGE=$API_IMAGE"
  echo "API_MIGRATE_IMAGE=$API_MIGRATE_IMAGE"
  echo "WEB_IMAGE=$WEB_IMAGE"
  echo "DEPLOYED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >"$RELEASE_FILE"

echo "==> Starting updated api, web, and caddy containers..."
compose up -d --wait --remove-orphans api web caddy

echo "==> Verifying container states..."
compose ps

echo "==> Pruning dangling images..."
docker image prune -f >/dev/null 2>&1 || true

echo "==> Deployment of ${IMAGE_TAG} completed successfully."
