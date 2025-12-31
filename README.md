# EduFlow Server

Minimal backend for EduFlow — an education platform API built with Express, TypeScript and Prisma.

**Quick overview**

- Language: TypeScript
- Framework: Express (v5)
- ORM: Prisma
- Entry: `src/server.ts`

**Files of interest**

- `src/app.ts` — Express app setup (middleware, routes, error handler)
- `src/server.ts` — server bootstrap and process-level handlers
- `src/routes` — route definitions (e.g. `auth.route.ts`)
- `prisma/schema.prisma` — Prisma schema

**Prerequisites**

- Node.js 18+ (or compatible with packages)
- pnpm (recommended; project uses `pnpm` as package manager)
- A Postgres database (or other supported DB configured in `DATABASE_URL`)

Setup

1. Install dependencies

```bash
pnpm install
```

2. Create a `.env` at project root with at least:

```dotenv
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret
```

3. Generate Prisma client and apply migrations (if you use migrations):

```bash
pnpm prisma generate
# If using migrations
pnpm prisma migrate dev --name init
```

Development

Run the dev server (watch mode):

```bash
pnpm dev
```

Build + Start (production)

```bash
pnpm build
pnpm start
```

Health check

- GET /health — returns basic status (200 OK)

Error handling

- Top-level Express error middleware is in `src/app.ts` and returns a JSON body with `message` (and `stack` in non-production).
- `src/server.ts` includes handlers for `uncaughtException`, `unhandledRejection`, and graceful shutdown (`SIGINT`/`SIGTERM`).

Scripts (from `package.json`)

- `pnpm dev` — run in watch mode (`tsx watch src/server.ts`)
- `pnpm build` — compile TypeScript
- `pnpm start` — run compiled server

Testing & Linting

- No tests configured by default. Add tests and a test runner (Jest / Vitest) as needed.
- ESLint and Prettier are present in `devDependencies` — configure them if desired.

Deployment notes

- Build the project and run `pnpm start` in a production environment.
- Ensure `NODE_ENV=production` and `DATABASE_URL` are configured.
- Consider using process managers (PM2, systemd) or containers.

Contributing

- Fork, create a branch, and open a PR. Keep changes small and focused.

License

- Check `package.json` `license` field (currently `ISC`).

If you'd like, I can:

- Add a `Makefile` or convenience npm scripts for common tasks
- Add basic logging with `pino` or `winston`
- Add a sample `.env.example` and migration setup
