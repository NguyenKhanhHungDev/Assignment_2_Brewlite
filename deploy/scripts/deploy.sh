#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-brewlite}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/compose.prod.yaml}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env.prod}"
PENDING_RELEASE_FILE="${PENDING_RELEASE_FILE:-$DEPLOY_DIR/.pending-release}"
BACKUP_DIR="${BACKUP_DIR:-/srv/brewlite/backups}"
LOCK_FILE="${LOCK_FILE:-$DEPLOY_DIR/.deploy.lock}"
SCHEMA_REVIEWED="${SCHEMA_REVIEWED:-false}"

IMAGE_TAG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --schema-reviewed)
      SCHEMA_REVIEWED="true"
      shift
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      if [[ -n "$IMAGE_TAG" ]]; then
        echo "Unexpected extra argument: $1" >&2
        exit 1
      fi
      IMAGE_TAG="$1"
      shift
      ;;
  esac
done

if [[ -z "$IMAGE_TAG" ]]; then
  echo "Usage: $0 --schema-reviewed <40-char-commit-sha>" >&2
  exit 1
fi

if [[ ! "$IMAGE_TAG" =~ ^[a-f0-9]{40}$ ]]; then
  echo "IMAGE_TAG must be a 40-character lowercase Git commit SHA (got: $IMAGE_TAG)." >&2
  exit 1
fi

if [[ "$SCHEMA_REVIEWED" != "true" ]]; then
  echo "Refusing to run migration without explicit --schema-reviewed confirmation." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required on the EC2 host to execute scripts/db/*.mjs." >&2
  exit 1
fi

if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"; then
  echo "Node.js >= 22 (recommended Node 24) is required on the EC2 host; found $(node -v)." >&2
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

if [[ ! -f "$DEPLOY_DIR/scripts/db/migrate.mjs" || ! -d "$DEPLOY_DIR/apps/api/prisma/migrations" ]]; then
  echo "Missing Issue #38 database scripts or reviewed Prisma migrations under $DEPLOY_DIR." >&2
  exit 1
fi

mkdir -p "$DEPLOY_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deployment or rollback holds $LOCK_FILE. Refusing concurrent run." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Production deploy workflow never seeds demo data via CD (aligned with Issue #38).
export RUN_SEED="false"

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

for var_name in \
  DB_USER DB_PASSWORD DB_NAME \
  JWT_SECRET BFF_PROXY_SECRET CADDY_PROXY_SECRET \
  APP_DOMAIN ZALOPAY_APP_ID ZALOPAY_KEY1 ZALOPAY_KEY2
do
  require_non_placeholder "$var_name"
done

compose() {
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# Enforce internal-only isolation for db, api, and web in rendered Compose config.
if ! compose config --format json | node -e '
const fs = require("node:fs");
const cfg = JSON.parse(fs.readFileSync(0, "utf8"));
for (const svc of ["db", "api", "web"]) {
  const ports = cfg.services?.[svc]?.ports;
  if (Array.isArray(ports) && ports.length > 0) {
    console.error(`Service ${svc} unexpectedly exposes host ports`);
    process.exit(1);
  }
}
'; then
  exit 1
fi

if [[ "${SKIP_PULL:-false}" != "true" ]]; then
  echo "==> Pulling release images for SHA ${IMAGE_TAG}..."
  compose pull migrate api web caddy
else
  echo "==> SKIP_PULL=true: verifying locally present images for ${IMAGE_TAG}..."
  for img in "$API_MIGRATE_IMAGE" "$API_IMAGE" "$WEB_IMAGE" "caddy:2-alpine"; do
    docker image inspect "$img" >/dev/null
  done
fi

echo "==> Ensuring PostgreSQL container is running and healthy..."
compose up -d --wait db

DB_CID="$(compose ps -q db)"
if [[ -z "$DB_CID" ]] || ! docker inspect "$DB_CID" --format '{{json .NetworkSettings.Ports}}' | node -e '
const fs = require("node:fs");
const ports = JSON.parse(fs.readFileSync(0, "utf8")) || {};
for (const [portKey, bindings] of Object.entries(ports)) {
  if (Array.isArray(bindings) && bindings.length > 0) {
    console.error(`Refusing to deploy: db container publishes ${portKey} on host.`);
    process.exit(1);
  }
}
'; then
  echo "Refusing to deploy: could not confirm db port isolation." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "==> Running Issue #38 backup + Prisma migration verification (no seed)..."
node "$DEPLOY_DIR/scripts/db/migrate.mjs" \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --compose-file "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  --database "$DB_NAME" \
  --confirm-database "$DB_NAME" \
  --migrations-dir "$DEPLOY_DIR/apps/api/prisma/migrations" \
  --output-dir "$BACKUP_DIR" \
  --schema-reviewed

echo "==> Starting updated api, web, and caddy containers (--no-deps)..."
compose up -d --no-deps --wait --remove-orphans api web caddy

cat >"$PENDING_RELEASE_FILE" <<EOF
IMAGE_TAG=$IMAGE_TAG
IMAGE_REGISTRY_OWNER=$IMAGE_REGISTRY_OWNER
API_IMAGE=$API_IMAGE
API_MIGRATE_IMAGE=$API_MIGRATE_IMAGE
WEB_IMAGE=$WEB_IMAGE
COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME
DEPLOYED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "==> Container status:"
compose ps
echo "==> Pending release metadata written to $PENDING_RELEASE_FILE (run mark-release.sh after HTTPS & port smoke checks pass)."
