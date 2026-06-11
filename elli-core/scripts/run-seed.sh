#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "Running seed scripts in order..."

bun run scripts/seed-user.ts
bun run scripts/seed-root-folder.ts
bun run scripts/seed-cost-codes.ts
bun run scripts/seed-professional-roles.ts
bun run scripts/seed-employees.ts
bun run scripts/seed-vendor-types.ts
bun run scripts/seed-vendors.ts
bun run scripts/seed-gc-types.ts
bun run scripts/seed-gcs.ts
bun run scripts/seed-project-divisions.ts
bun run scripts/seed-project-stages.ts
bun run scripts/seed-trade-categories.ts
bun run scripts/seed-units.ts
bun run scripts/seed-pto-types.ts
bun run scripts/seed-sco-change-types.ts
bun run scripts/seed-projects.ts
