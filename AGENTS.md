# Codex Project Skill

Lean rules for this enterprise internal portal.

## Stack

- React, TypeScript, Vite, Tailwind, shadcn UI, React Query.
- API calls go through `src/services/apiClient.ts`; no hardcoded base URLs elsewhere.
- Shared API/domain types live in `src/types/*`; services and hooks do not export them.

## Frontend

- Put reusable backend shapes in `src/types`; use `import type`.
- Keep one-off prop types beside their component.
- Prefer shadcn components from `src/components/ui`.
- Services are API wrappers only, grouped by domain: bank, chart of accounts, GL, upload archive, dashboard.
- Hooks handle React Query orchestration; keep components thin.
- Use theme tokens and shadcn variants for dark mode.
- Preserve accounting math: bank/income add; expenses/credit cards subtract; liability increases are negative.
- Keep upload/archive flows non-destructive unless replacement is explicit.

## Backend

- Keep explicit request/response schemas aligned with frontend `src/types`.
- Preserve route groups: `/accounting/*`, `/bank_statement/*`, `/dashboard/*`, `/reports/*`, `/upload-files/*`.
- Uploads accept multipart form data and return stable IDs/metadata; local storage should remain S3-swappable.
- Do not silently delete or replace accounting data; use merge/update unless the endpoint and UI say replace.

## Change impact (verify the whole flow)

- Trace every change end to end before finishing: component/page → `src/hooks` → `src/services` → `apiClient` → backend route, and back through the `src/types` contract.
- When changing a shared contract (a type in `src/types`, a service request/response shape, or a hook return), find EVERY consumer and verify each — a changed shape silently breaks callers that still typecheck through `any`.
- Exercise the real runtime path, not just `npm run build`: load the affected screen against the running backend and confirm the request succeeds (watch the network/console for 4xx/5xx), not just that it compiles.
- Keep frontend and backend in lockstep: a backend contract change means updating `src/types` first, then services/hooks/components; confirm the live API response actually matches the type.
- Report which flows and screens you checked and the result; if one could not be exercised (needs auth, data, an upload), say so explicitly.

## Checks

- Run `npm run build` after TypeScript or component changes.
- Run `npm run lint` after broad/shared changes.
- Backend changes: run the backend suite or touched endpoint tests.
