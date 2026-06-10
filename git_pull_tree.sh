#!/usr/bin/env bash
set -e

B_BRANCH="feat/quickbooks"
F_BRANCH="feat/quickbooks"
E_BRANCH="advanced"

echo "Fetching remotes..."
git fetch elli-core "$B_BRANCH"
git fetch elli-ui "$F_BRANCH"
git fetch elli-engine "$E_BRANCH"

echo "Pulling elli-core subtree..."
git subtree pull --prefix=elli-core elli-core "$B_BRANCH"

echo "Pulling elli-ui subtree..."
git subtree pull --prefix=elli-ui elli-ui "$F_BRANCH"

echo "Pulling elli-engine subtree..."
git subtree pull --prefix=elli-engine elli-engine "$E_BRANCH"

echo "Done."