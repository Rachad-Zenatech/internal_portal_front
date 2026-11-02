---
trigger: model_decision
description: Project directory layout and code organization.
---

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
