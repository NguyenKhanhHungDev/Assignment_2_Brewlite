#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-brewlite}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/compose.prod.yaml}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env.prod}"
RELEASE_FILE="${RELEASE_FILE:-$DEPLOY_DIR/.current-release}"
PREVIOUS_RELEASE_FILE="${PREVIOUS_RELEASE_FILE:-$DEPLOY_DIR/.previous-release}"
LOCK_FILE="${LOCK_FILE:-$DEPLOY_DIR/.deploy.lock}"
SCHEMA_COMPATIBLE="${SCHEMA_COMPATIBLE:-false}"

TARGET_TAG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --schema-compatible)
      SCHEMA_COMPATIBLE="true"
      shift
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      if [[ -n "$TARGET_TAG" ]]; then
        echo "Unexpected extra argument: $1" >&2
        exit 1
      fi
      TARGET_TAG="$1"
      shift
      ;;
  esac
done

if [[ "$SCHEMA_COMPATIBLE" != "true" ]]; then
  echo "Refusing app rollback without --schema-compatible confirmation (rollback-app.mjs does not roll back DB)." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required on EC2 host to run scripts/db/rollback-app.mjs." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE." >&2
  exit 1
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deployment or rollback holds $LOCK_FILE." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -n "$TARGET_TAG" ]]; then
  if [[ ! "$TARGET_TAG" =~ ^[a-f0-9]{40}$ ]]; then
    echo "TARGET_TAG must be a 40-character commit SHA." >&2
    exit 1
  fi
  IMAGE_REGISTRY_OWNER="${IMAGE_REGISTRY_OWNER:?IMAGE_REGISTRY_OWNER must be set in $ENV_FILE}"
  IMAGE_REGISTRY_OWNER="${IMAGE_REGISTRY_OWNER,,}"
  export API_IMAGE="ghcr.io/${IMAGE_REGISTRY_OWNER}/brewlite-api:${TARGET_TAG}"
  export API_MIGRATE_IMAGE="ghcr.io/${IMAGE_REGISTRY_OWNER}/brewlite-api-migrate:${TARGET_TAG}"
  export WEB_IMAGE="ghcr.io/${IMAGE_REGISTRY_OWNER}/brewlite-web:${TARGET_TAG}"
elif [[ -f "$PREVIOUS_RELEASE_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$PREVIOUS_RELEASE_FILE"
  set +a
else
  echo "No target SHA passed and $PREVIOUS_RELEASE_FILE not found." >&2
  exit 1
fi

echo "==> Rolling back app via Issue #38 script (API_IMAGE=${API_IMAGE}, WEB_IMAGE=${WEB_IMAGE})..."
node "$DEPLOY_DIR/scripts/db/rollback-app.mjs" \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --compose-file "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  --api-image "$API_IMAGE" \
  --web-image "$WEB_IMAGE" \
  --schema-compatible

docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" \
  up -d --no-deps --wait caddy

if [[ -n "$TARGET_TAG" ]]; then
  cat >"$RELEASE_FILE" <<EOF
IMAGE_TAG=$TARGET_TAG
IMAGE_REGISTRY_OWNER=$IMAGE_REGISTRY_OWNER
API_IMAGE=$API_IMAGE
WEB_IMAGE=$WEB_IMAGE
COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME
ROLLED_BACK_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
elif [[ -f "$PREVIOUS_RELEASE_FILE" ]]; then
  cp "$PREVIOUS_RELEASE_FILE" "$RELEASE_FILE"
fi

docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
