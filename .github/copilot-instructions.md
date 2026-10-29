# Copilot Project Instructions

Use these instructions for suggestions in this enterprise internal portal.

<!-- project-structure:start -->
## Project Structure

```text
src/
  assets/                   # Images and icons
  components/               # Reusable UI, one folder per feature
    AppShell/               # Layout chrome: sidebar, top bar, navigation, notifications
    Bank/                   # Bank statement upload, queue, list and detail widgets
    ChartOfAccounts/        # Chart of accounts table and dialogs
    Configurations/         # Bank feed rule and business contact forms/dialogs
    Dashboard/              # Dashboard charts, cards and tables
    GeneralLedger/          # GL upload queue panel and split-compare dialog
    Onboarding/             # Onboarding tour
    common/                 # Shared by several pages: error boundary, route guard
    ui/                     # shadcn/ui primitives (button, dialog, ...); don't put feature code here
  data/                     # Static data / catalogs
  hooks/                    # Custom React hooks
  lib/                      # App-wide helpers: auth context, env, storage, utils
  pages/                    # One folder per feature/route group
    Auth/                   # Login and pending-access screens
    BankStatements/         # Bank statement list, upload and preview/review
    Configurations/         # Business settings (company, banks, bank feed rules, business contacts, chart of accounts), users, roles, permissions and XGBoost model views
    Dashboard/              # Home dashboard
    GeneralLedger/          # General ledger views and GL upload/import
    Log/                    # Audit log
    Reports/                # Financial reports
    SecFilings/             # SEC filing editor, contributors and mobile signing (with its own components/)
    TrialBalance/           # Trial balance and consolidated trial balance views
    UploadFiles/            # File upload archive
  services/                 # API calls: apiClient + one <feature>Service.ts per backend area
  template/                 # Bank reconciliation Excel template (not imported by code)
  types/                    # TypeScript types, one file per feature
  utils/                    # Pure helper functions
  App.tsx                   # Web routes (lazy-loaded pages)
  main.tsx                  # Web entry: providers and router
```

### Where new code goes

* **New page:** `src/pages/<Feature>/`. Pages that belong together share a folder; a `.native.tsx` variant sits next to its web file.
* **Components:** used by one feature go in `src/components/<Feature>/`; used by several go in `src/components/common/`. `src/components/ui/` is only for shadcn primitives.
* **New API calls** go in `src/services/<feature>Service.ts` through `apiClient`, not `fetch` inside components (some older pages still do this; move those calls when you touch them). Types go in `src/types/<feature>.ts`.
* **Don't add loose files** to `src/pages/` or `src/components/`.
* **When you move a file,** update every import to it (and the imports inside it), then run `npm run build` (`tsc -b && vite build`).
<!-- project-structure:end -->

## Architecture

- Frontend uses React, TypeScript, Vite, Tailwind, shadcn UI, React Query.
- API clients live in `src/services`.
- Shared TypeScript types live in `src/types`.
- UI components live in `src/components`; pages live in `src/pages`.

## Type Placement

- Put reusable API/domain types in `src/types`.
- Do not define or export shared types from `src/services` or `src/hooks`.
- Use `import type` for type-only imports.
- Local component props can stay beside the component.

## Frontend Patterns

- Use `apiClient` from `src/services/apiClient.ts` for HTTP calls.
- Keep services focused on endpoint calls.
- Keep hooks focused on React Query.
- Prefer shadcn UI components over raw controls for app screens.
- Use theme classes that work in dark mode: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`.
- Use lucide icons when an icon is needed.
- Run `npm run build` after TypeScript or UI changes.

## Finance Rules

- Expenses subtract.
- Income adds.
- Credit Card subtracts.
- Bank adds.
- Liability increases should display as negative/red.
- Never replace/delete accounting data unless the user explicitly asks for a replacement flow.

## Backend Contract Rules

- Keep frontend `src/types` synced with backend schemas.
- Preserve route groups: `/accounting`, `/bank_statement`, `/dashboard`, `/reports`, `/upload-files`.
- File uploads should use multipart form data and stable metadata.
- Local upload storage is acceptable now, but keep it swappable for S3.

## Change Impact

- Trace every change end to end before finishing: component/page → `src/hooks` → `src/services` → `apiClient` → backend route, and back through the `src/types` contract.
- When changing a shared contract (a type in `src/types`, a service request/response shape, or a hook return), find EVERY consumer and verify each — a changed shape silently breaks callers that still typecheck through `any`.
- Exercise the real runtime path, not just `npm run build`: load the affected screen against the running backend and confirm the request succeeds (watch the network/console for 4xx/5xx), not just that it compiles.
- Keep frontend and backend in lockstep: a backend contract change means updating `src/types` first, then services/hooks/components; confirm the live API response actually matches the type.
- Report which flows and screens were checked and the result; if one could not be exercised (needs auth, data, an upload), say so explicitly.
