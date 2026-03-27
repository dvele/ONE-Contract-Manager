@AGENTS.md

Always use plan mode for schema changes.

## Before Modifying Key Files

- **`server/lib/mapper.ts`** — Read the entire file before making any changes. It is large and internally consistent; partial reads lead to duplicate or conflicting variable definitions.
- **`shared/schema.ts`** — Read the relevant table definitions before adding columns or relations. Check for existing similar fields to avoid duplication.
- **`server/lib/contractGenerator.ts`** — Read the full generation pipeline before touching it. The order of operations (variable substitution → conditional processing → exhibit injection → PDF) is load-bearing.

## After Making Changes

- Run `npm run check` (TypeScript) after every non-trivial change. There is no test suite — this is the primary safety net.
- After any schema change, run `npm run db:push` to sync the DB.
- Run scripts with `npx tsx scripts/script-name.ts`, not `node`.

## Money / Pricing

All monetary values are stored as **integers in cents** (e.g. `designFee: 150000` = $1,500.00). Never store or calculate in dollars. Convert only at the display layer.

## Auth Middleware

Always apply `requireAuth` from `server/middleware/auth.ts` to new routes. Use `requireAdmin` for admin-only endpoints. Do not write custom auth logic in route handlers.

When `SKIP_AUTH=true` and no Bearer token is present, `requireAuth` sets `req.organizationId = 1` and `req.user = { email: "dev@dvele.com", role: "admin" }` automatically — no special dev handling needed in routes.

## Error Response Shape

- Route-level errors: `res.status(4xx).json({ error: "message" })`
- The global error handler in `server/index.ts` sends `{ message }` (not `{ error }`)
- Do not mix these shapes within a single route file

## Module System

The project uses `"type": "module"` (ESM). Use `import`/`export` syntax only. Never use `require()`.

## JSONB Fields

`contractTypes` and `tags` on clauses and exhibits are JSONB arrays. Use Drizzle's `sql` operator or `@>` containment queries when filtering by these fields — do not treat them as plain text columns.

## Contract Types

Valid values: `MASTER_EF`, `ONE`, `MANUFACTURING`, `ONSITE`. These appear as strings in JSONB arrays on clauses/exhibits and as enum-like text fields on contracts. Keep them consistent.

## Adding Auth to a New Route File

```ts
import { requireAuth, requireAdmin } from "../middleware/auth";
router.use(requireAuth); // applies to all routes in the file
```

## Drizzle Commands

Only `db:push` is in `package.json`. For other Drizzle Kit commands:
```bash
npm run db:push           # dev: push schema directly
npx drizzle-kit generate  # generate migration files
npx drizzle-kit migrate   # run migrations
```
