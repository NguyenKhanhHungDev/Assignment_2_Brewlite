#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/compose.prod.yaml}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env.prod}"
RELEASE_FILE="${RELEASE_FILE:-$DEPLOY_DIR/.current-release}"
PREVIOUS_RELEASE_FILE="${PREVIOUS_RELEASE_FILE:-$DEPLOY_DIR/.previous-release}"

TARGET_TAG="${1:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -n "$TARGET_TAG" ]]; then
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
  echo "No target tag passed and $PREVIOUS_RELEASE_FILE not found." >&2
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "==> Rolling back to API_IMAGE=${API_IMAGE} and WEB_IMAGE=${WEB_IMAGE}..."
if ! docker image inspect "$API_IMAGE" >/dev/null 2>&1 || ! docker image inspect "$WEB_IMAGE" >/dev/null 2>&1; then
  compose pull api web caddy
fi
compose up -d --wait --remove-orphans api web caddy

if [[ -f "$PREVIOUS_RELEASE_FILE" && -z "$TARGET_TAG" ]]; then
  cp "$PREVIOUS_RELEASE_FILE" "$RELEASE_FILE"
fi

compose ps
echo "Rollback finished. If a schema-breaking migration ran earlier, restore DB from $DEPLOY_DIR/backups/."
