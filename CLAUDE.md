# Claude Project Skill

Follow these project coding rules for the enterprise internal portal.

## Core Rules

- Frontend stack: React, TypeScript, Vite, Tailwind, shadcn UI, React Query.
- API calls must go through `src/services/apiClient.ts`.
- Shared/domain types must live in `src/types/*`.
- Do not export shared types from services or hooks.
- Use `import type` for type-only imports.

## Frontend

- Add new API/domain types to `src/types`, for example GL types in `src/types/gl.ts`, dashboard types in `src/types/dashboard.ts`, upload archive types in `src/types/uploadArchive.ts`.
- Keep one-off component prop types local to the component.
- Services should be API-call wrappers only.
- Hooks should wrap React Query and coordinate server state only.
- Prefer shadcn components from `src/components/ui` instead of raw HTML controls for app UI.
- Use theme tokens and shadcn variants for dark mode: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`.
- Keep finance behavior consistent: expenses subtract, income adds, credit cards subtract, bank balances add, liability increases are negative signals.

## Backend

- Keep backend response/request schemas aligned with frontend files in `src/types`.
- Preserve route groups: `/accounting`, `/bank_statement`, `/dashboard`, `/reports`, `/upload-files`.
- For uploads, support multipart form data and return metadata useful to the frontend.
- Current storage can be local server files, but keep the design easy to swap to S3 later.
- Avoid destructive accounting operations unless the route and UI explicitly describe replacement.

## Checks

- Frontend: run `npm run build` after code changes.
- Run `npm run lint` after broad refactors.
- Backend: run the backend test suite or endpoint tests for touched routes.
