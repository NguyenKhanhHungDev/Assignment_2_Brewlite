#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
RELEASE_FILE="${RELEASE_FILE:-$DEPLOY_DIR/.current-release}"
PREVIOUS_RELEASE_FILE="${PREVIOUS_RELEASE_FILE:-$DEPLOY_DIR/.previous-release}"
PENDING_RELEASE_FILE="${PENDING_RELEASE_FILE:-$DEPLOY_DIR/.pending-release}"
LOCK_FILE="${LOCK_FILE:-$DEPLOY_DIR/.deploy.lock}"

EXPECTED_TAG="${1:-}"
if [[ -z "$EXPECTED_TAG" ]]; then
  echo "Usage: $0 <40-char-commit-sha>" >&2
  exit 1
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deployment or rollback holds $LOCK_FILE." >&2
  exit 1
fi

if [[ ! -f "$PENDING_RELEASE_FILE" ]]; then
  echo "Missing $PENDING_RELEASE_FILE." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$PENDING_RELEASE_FILE"
set +a

if [[ "${IMAGE_TAG:-}" != "$EXPECTED_TAG" ]]; then
  echo "Pending release tag (${IMAGE_TAG:-unset}) does not match expected $EXPECTED_TAG." >&2
  exit 1
fi

if [[ -f "$RELEASE_FILE" ]]; then
  PREV_TAG=""
  PREV_TAG="$(grep -E '^IMAGE_TAG=' "$RELEASE_FILE" | head -n1 | cut -d= -f2 || true)"
  if [[ "$PREV_TAG" != "$EXPECTED_TAG" ]]; then
    cp "$RELEASE_FILE" "$PREVIOUS_RELEASE_FILE"
  fi
fi

mv "$PENDING_RELEASE_FILE" "$RELEASE_FILE"
echo "==> Marked verified release $EXPECTED_TAG as current ($RELEASE_FILE)."
