#!/usr/bin/env bash
# One command to publish the current work: bash scripts/ship.sh "message"   (no message => push existing commits only)
# - refuses to push commits that carry AI attribution; the author is whoever has git configured on this machine
# - curates new LLM recordings, guards against secrets, runs the checks, commits, pushes main + tags
set -euo pipefail
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
[ -n "$(git config user.name)" ] && [ -n "$(git config user.email)" ] || { echo "set git user.name and user.email first"; exit 1; }
if [ -d .darby/replay ]; then npm run -s replay:curate || true; fi
bash scripts/guard-secrets.sh
npm run -s check
if [ -n "$(git status --porcelain)" ]; then
  [ -n "${1:-}" ] || { echo "uncommitted changes: pass a commit message"; exit 1; }
  git add -A
  bash scripts/guard-secrets.sh
  git commit -q -m "$1"
fi
git log -5 --format='%h %an <%ae> %s'
if git log origin/main..HEAD --format='%B%an' | grep -qiE 'co-authored-by|claude|noreply@anthropic'; then echo "a pending commit carries AI attribution; fix before pushing"; exit 1; fi
git push origin HEAD:main --tags
echo "pushed."
