# ساعدني

منصة المساعدة اليومية في عُمان — a marketplace where customers post daily help tasks and registered helpers accept them for payment in Omani Rials.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Demo accounts (password: 123456)
- Customer: 96891000001 (أحمد الريامي)
- Helper: 96891000003 (سالم الحارثي)
- Admin: 96891000000 (مدير النظام)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + shadcn/ui + Tailwind, full Arabic RTL
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB schema (users.ts, requests.ts)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/saidni/src/` — React frontend
  - `pages/` — all page components
  - `contexts/AuthContext.tsx` — auth state + localStorage
  - `lib/categories.ts` — category/area/status constants
  - `components/BottomNav.tsx` — role-aware bottom navigation

## Architecture decisions

- **Session storage**: Simple in-memory session map in app.ts (MVP). Replace with express-session + DB for production.
- **Auth**: phone + password, password hashed with base64(password + salt). Use bcrypt in production.
- **RTL**: `dir="rtl"` set on html/body globally in index.css, Noto Sans Arabic font loaded.
- **User types**: customer / helper / admin — routing after login diverges by type.
- **No payment gateway / chat / maps**: intentionally excluded from v1 per spec.

## Product

- Customers create help requests (category, details, area, time, amount in OMR)
- Helpers browse available requests, filter by category/area, and accept them
- Admin dashboard with stats, request management, and helper verification/blocking

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Password hash function in auth.ts uses base64 — swap for bcrypt before production
- Demo password for all seed users: `123456`
- Sessions are in-memory — restart loses session state; users must re-login after server restart

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
