# Codex Project Skill

Use these rules when coding in this enterprise internal portal project.

## Project Shape

- Frontend: React, TypeScript, Vite, Tailwind, shadcn UI, React Query.
- API access goes through `src/services/apiClient.ts`; do not hardcode base URLs outside that client.
- Shared/domain TypeScript types belong in `src/types/*`.
- Services should contain API calls only. Do not export shared types from service files.
- Hooks should contain query/mutation orchestration only. Do not export shared response types from hook files.

## Frontend Rules

- Put reusable backend/API shapes in `src/types`, then import with `import type`.
- Keep page/component-local prop types next to the component if they are not reused.
- Prefer existing shadcn components in `src/components/ui` for buttons, inputs, selects, tables, dialogs, badges, alerts, tabs, and skeletons.
- Use `apiClient.get/post/patch/put/delete<T>()` from service modules.
- Keep service modules grouped by domain: bank, chart of accounts, GL, upload archive, dashboard.
- Use React Query hooks for server state; keep components thin.
- Respect dark mode by using theme tokens such as `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, and shadcn variants.
- For financial/accounting screens, preserve existing accounting semantics: liabilities up is negative, expenses subtract, income adds, credit card balances subtract, bank balances add.
- For file uploads, keep upload/archive behavior non-destructive unless the user explicitly asks for replacement.

## Backend Rules

- Keep API contracts aligned with frontend `src/types`.
- If a backend response shape changes, update the matching file in `src/types` and all consuming services/components.
- Prefer explicit request/response schemas on backend endpoints.
- Preserve current route groups: `/accounting/*`, `/bank_statement/*`, `/dashboard/*`, `/reports/*`, `/upload-files/*`.
- File uploads should accept multipart form data and return stable IDs/metadata. Store locally for now; design storage code so S3 can replace it later.
- Do not silently delete or replace accounting data. Use merge/update flows unless the endpoint and UI clearly say replace.

## Validation

- Run `npm run build` after TypeScript or component changes.
- Run `npm run lint` when changing broad patterns or shared utilities.
- If backend code is changed in a backend workspace, run its test suite or at least the endpoint-level tests for touched routes.
