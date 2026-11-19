#!/usr/bin/env bash
# Publish this working copy to the STAGING site: https://t-heritage.github.io/
#
#   ./scripts/deploy-staging.sh
#
# Copies every file git knows about or would pick up (committed or not, minus
# anything .gitignore'd) into a throwaway folder, makes it safe for staging, and
# force-pushes it to the t-heritage/t-heritage.github.io repo, which GitHub
# Pages builds with Jekyll exactly like the live site. The live site
# (darwin1942.com, built from this repo's main branch) is never touched.
#
# What changes on the way to staging:
#   - CNAME is dropped, so staging can never claim darwin1942.com.
#   - robots.txt blocks everything, every page gets "noindex, nofollow", and the
#     sitemap is dropped, so search engines leave staging alone.
#   - /admin/ is dropped: its editor saves straight to the LIVE repo.
#   - Every page gets a small "STAGING" badge in the corner.
#
# Forms on staging still post to the live darwin1942-intake function, so a test
# entry there sends a real team alert and lands in Customer.io.
set -euo pipefail

STAGING_REMOTE="https://github.com/t-heritage/t-heritage.github.io.git"
STAGING_URL="https://t-heritage.github.io/"

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$ROOT"
SHA="$(git rev-parse --short HEAD)"
DIRTY=""
[ -n "$(git status --porcelain)" ] && DIRTY=" + uncommitted changes"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
SITE="$TMP/site"
mkdir -p "$SITE"

# Tracked + new (not ignored) files; skips anything deleted locally.
git ls-files -z --cached --others --exclude-standard | while IFS= read -r -d '' f; do
  [ -f "$f" ] || continue
  mkdir -p "$SITE/$(dirname "$f")"
  cp -p "$f" "$SITE/$f"
done

cd "$SITE"
rm -f CNAME sitemap.xml
rm -rf admin scripts .claude
printf 'User-agent: *\nDisallow: /\n' > robots.txt

BADGE='<div style="position:fixed;left:12px;bottom:12px;z-index:2147483647;pointer-events:none;background:#c8102e;color:#fff;font:600 12px/1 Arial,sans-serif;letter-spacing:2px;padding:8px 12px;border-radius:3px;box-shadow:0 2px 8px rgba(0,0,0,.35)">STAGING</div>'
find . -name '*.html' -not -path './_oauth-worker/*' -print0 | while IFS= read -r -d '' f; do
  BADGE="$BADGE" perl -0pi -e '
    s/<meta name="robots" content="[^"]*"\s*\/?>/<meta name="robots" content="noindex, nofollow">/g;
    s/<head>/<head>\n<meta name="robots" content="noindex, nofollow">/ unless /name="robots"/;
    s/<\/body>/$ENV{BADGE}\n<\/body>/;
  ' "$f"
done

git init -q -b main
git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
  commit -q -m "Staging build of darwin1942 @ ${SHA}${DIRTY}"
git -c http.postBuffer=524288000 push -q --force "$STAGING_REMOTE" main

echo "Pushed to staging. GitHub Pages rebuilds in about a minute: $STAGING_URL"
