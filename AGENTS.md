# Repository Guidelines

## Project Structure & Module Organization

This repository is the deployment/orchestration wrapper for two Git subtrees:

- `elli-core/`: Bun + Hono backend API, Prisma schema and migrations, docs, and backend tests.
- `elli-ui/`: React + Vite frontend, static assets in `public/`, application code in `src/`.
- `nginx/default.conf`: root Nginx config. It serves the built UI and proxies `/api/*` to the API.
- `Dockerfile.nginx` and `docker-compose.yml`: combined production-style stack.

Do not edit subtree files unless the task explicitly targets that project. Prefer root-level deployment changes for orchestration issues.

## Build, Test, and Development Commands

Use Bun inside each subtree:

```sh
cd elli-core && bun install && bun run dev
cd elli-ui && bun install && bun run dev
```

Root stack validation:

```sh
docker compose --env-file .env.example config
docker compose --env-file .env.example up --build
```

Backend checks:

```sh
cd elli-core && bun run typecheck && bun test && bun run build
```

Frontend checks:

```sh
cd elli-ui && bun run lint && bun run build
```

## Coding Style & Naming Conventions

Both subtrees use TypeScript, ESLint, and Prettier. Keep existing formatting and import conventions. Backend code uses modular route/service organization under `elli-core/src/modules`. Frontend code uses React components and feature modules under `elli-ui/src/modules`; prefer kebab-case filenames for UI files already following that pattern.

## Testing Guidelines

Backend tests run with `bun test`. Place backend tests near the relevant module when adding API behavior. The UI currently relies on lint/build validation; add focused tests only when introducing a test framework or matching an existing local pattern. Always run the relevant subtree build before changing Docker wiring.

## Commit & Pull Request Guidelines

History uses concise imperative commits, for example `Update environment URLs...` and `Refactor Docker setup...`. Keep commits scoped: root deployment changes separate from subtree updates. PRs should include a short summary, affected services, environment changes, validation commands run, and screenshots for visible UI changes.

## Security & Configuration Tips

Copy `.env.example` to deployment environment variables; do not commit real secrets. For production auth, `BETTER_AUTH_BASE_URL` and `CLIENT_URL` must match the public origin, such as `http://localhost` for local deployments. The compose file intentionally avoids public `ports:` bindings; expose services through the deployment platform's internal routing only.
