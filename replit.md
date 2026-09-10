# MTC SmartBus

MTC SmartBus helps Chennai riders compare live demo bus locations, current occupancy, and approximate crowding at a selected physical stop.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mtc-smartbus/src/` — passenger and operator web experience.
- `artifacts/api-server/src/routes/smartbus.ts` — in-memory demo provider and simulator.
- `lib/api-spec/openapi.yaml` — source of truth for typed SmartBus API hooks.
- `artifacts/mtc-smartbus/src/index.css` — SmartBus design tokens and global theme.

## Architecture decisions

- Demo data is intentionally served through the API server so the UI consumes realistic typed responses and can later swap in an authorized MTC provider.
- Passenger forecasts are computed for a physical stop, not an abstract route stage, and are refreshed from simulated camera flow and bus movement.
- Operator security screens expose event-level alerts only; they do not expose passenger identity or use facial recognition.
- The browser polls read endpoints during demo mode instead of claiming a live MTC feed.

## Product

- Passenger home with route and bus search, nearby buses, physical stop selection, live-demo map treatment, current occupancy, ETA, and target-stop forecast.
- Route and stop directories with ordered physical stop timelines.
- Operator fleet overview, bus-level camera/ETM reconciliation analytics, and event-level security review.
- Explicit demo-mode labeling and loading, error, empty, and partial-data states.

## User preferences

_No preferences recorded._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after editing the OpenAPI contract.
- The SmartBus API uses stable query-based detail endpoints (`/api/bus?busId=...`, `/api/route?routeId=...`) so generated Zod exports do not collide with generated parameter types.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
