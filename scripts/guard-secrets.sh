#!/usr/bin/env bash
# Refuses to continue if anything staged looks like a secret. Run before every commit/push (see AGENTS.md hard limits).
# Checks: forbidden paths, well-known key patterns, and the literal values of secrets in your local .env (never printed).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

bad=0
# 1. forbidden paths
if git diff --cached --name-only | grep -E '(^|/)\.env$|^secrets/|\.pem$|(^|/)\.darby/|^workspace/' >/dev/null; then
  echo "BLOCKED: a secret/local path is staged:"; git diff --cached --name-only | grep -E '(^|/)\.env$|^secrets/|\.pem$|(^|/)\.darby/|^workspace/'; bad=1
fi
# 2. key-shaped strings in the staged diff
if git diff --cached -U0 | grep -E '^\+' | grep -E 'AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' >/dev/null; then
  echo "BLOCKED: a key-shaped string is in the staged diff"; bad=1
fi
# 3. literal secret values from the local .env
if [ -f .env ]; then
  while IFS='=' read -r name value; do
    case "$name" in *_KEY|*_TOKEN|*_SECRET) ;; *) continue ;; esac
    value="${value%%#*}"; value="$(echo "$value" | sed -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')"
    [ ${#value} -ge 12 ] || continue
    if git diff --cached -U0 | grep -F -- "$value" >/dev/null; then echo "BLOCKED: the value of $name from .env is in the staged diff"; bad=1; fi
  done < <(grep -E '^[A-Z_]+=' .env)
fi
if [ $bad -ne 0 ]; then exit 1; fi
echo "guard-secrets: OK (nothing secret staged)"
