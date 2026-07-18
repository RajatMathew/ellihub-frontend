# Elle Core Documentation

Welcome to Elle Core, a modular backend API for the Zubble application. This documentation is designed for developers who want to extend, customize, or contribute to the project. The `example` module (`src/modules/example/`) is your primary reference for best practices in modular architecture, route/service separation, middleware, validation, error handling, and utility usage.

---

## Quick Links

- [API Guide](./api-guide.md): Build and extend modular APIs using the example module.
- [Middleware](./middleware.md): Pagination, performance, and custom middleware patterns.
- [Response Handling](./response.md): Standardized success/error responses.
- [Utility Functions](./utils.md): Validation, error classes, helpers.
- [Error Handling](./error-handling.md): Error management and best practices.
- [Developer Guide](./developer-guide.md): Setup, scripts, project structure, and contribution workflow.

---

## Project Overview

Elle Core is built with [Hono](https://hono.dev/) (API framework), [Bun](https://bun.sh/) (runtime), Prisma (ORM), and VitePress (docs). It is designed for scalable, maintainable APIs with clear separation of concerns and developer-friendly patterns.

### Key Features

- **Modular Architecture:** Each feature/domain is a module (see `src/modules/example/`).
- **Middleware:** Built-in pagination, performance, and extensible custom middleware.
- **Error Handling:** Custom error classes and centralized error management.
- **Utility Functions:** Standardized validation, response formatting, and error utilities.
- **Service/Model Separation:** Clean business logic and data schemas.
- **Type Safety:** Strict TypeScript configuration and linting.

---

## Getting Started

1. **Install dependencies:**
   ```sh
   bun install
   ```
2. **Run development server:**
   ```sh
   bun run dev
   ```
   API available at [http://localhost:3000](http://localhost:3000).
3. **Generate Prisma client:**
   ```sh
   bun run db:generate
   ```
4. **Run migrations:**
   ```sh
   bun run db:migrate
   ```
5. **Start documentation server:**
   ```sh
   bun run docs:dev
   ```

---

## Project Structure

```
├── src/
│   ├── api/           # API version routers (V1, V2)
│   ├── handler/       # Error handlers
│   ├── lib/           # Prisma and DB logic
│   ├── middleware/    # Middlewares (pagination, performance)
│   ├── modules/       # Feature modules (see example)
│   ├── utils/         # Utility functions
│   └── index.ts       # Main entry point
├── prisma/
│   ├── schema/        # Prisma schema files
│   └── migrations/    # Migration history
├── docs/
│   ├── index.md       # Documentation home
│   ├── api-guide.md   # API writing guide
│   ├── middleware.md  # Middleware documentation
│   ├── response.md    # Response handling
│   ├── utils.md       # Utility functions
│   ├── error-handling.md # Error handling
│   └── developer-guide.md # Developer workflow
├── package.json       # Project scripts & dependencies
├── tsconfig.json      # TypeScript config
├── eslint.config.mts  # ESLint config
└── README.md          # Quickstart
```

---

## Documentation Sections

- **API Guide:** Build modular, versioned APIs using the example module as your template.
- **Middleware:** Use and extend built-in middleware for pagination, performance, and more.
- **Response Handling:** Standardize API responses for success and error cases.
- **Utility Functions:** Use error classes, validation, and helpers for robust APIs.
- **Error Handling:** Centralize error management and use custom error classes.
- **Developer Guide:** Set up, run, and contribute to the project with best practices.

---

## Contribution & Support

1. Fork and clone the repository.
2. Create a new branch for your feature or fix.
3. Follow code style and linting rules.
4. Add or update documentation as needed.
5. Submit a pull request.

For questions or feedback, contact the Elle Core maintainers.
