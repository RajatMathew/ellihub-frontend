#!/usr/bin/env bash
#
# Prettier over the files THIS branch touched, and nothing else.
#
# `npm run format` is `prettier --write .`, and `dev` is not prettier-clean:
# running it rewrites 119 files that have nothing to do with the change in
# hand. That diff then has to be unpicked by hand before committing, and
# unpicking it is where the damage happens — the filter that is supposed to
# spare your own files is one quoting mistake away from reverting them too.
#
# So: format what changed. `format` still exists for the day someone means to
# reformat the whole repo.
#
# Usage:  npm run format:changed          # vs the merge-base with origin/dev
#         BASE=main npm run format:changed
#
set -euo pipefail

PATHS_FILE="$(mktemp -t format-changed)"
trap 'rm -f "$PATHS_FILE"' EXIT

BASE="${BASE:-origin/dev}"

# Fall back to local dev, then to HEAD, so this works in a fresh clone or with
# no remote.
if ! git rev-parse --verify --quiet "$BASE" >/dev/null; then
    BASE="dev"
    git rev-parse --verify --quiet "$BASE" >/dev/null || BASE="HEAD"
fi

MERGE_BASE="$(git merge-base "$BASE" HEAD 2>/dev/null || echo "$BASE")"

# Committed-on-this-branch, staged, unstaged and untracked, all NUL-delimited.
# NUL is the point: a path with a space in it must not become two paths, which
# is the exact class of bug this script exists to stop.
{
    git diff --name-only --diff-filter=d -z "$MERGE_BASE"
    git diff --name-only --diff-filter=d -z --cached
    git ls-files --others --exclude-standard -z
} | sort -z -u > "$PATHS_FILE"

if [ ! -s "$PATHS_FILE" ]; then
    echo "format:changed — nothing changed against ${BASE}."
    exit 0
fi

# `--ignore-unknown` drops the files prettier has no parser for (images, .env
# and so on) instead of failing the run; `.prettierignore` is still honoured.
COUNT="$(tr -cd '\0' < "$PATHS_FILE" | wc -c | tr -d ' ')"
echo "format:changed — ${COUNT} changed file(s) against ${BASE}; prettier reports the ones it owns"
xargs -0 -- npx prettier --write --ignore-unknown < "$PATHS_FILE"
