# Enterprise Financial & Accounting Portal - Frontend (`internal_portal_front`)

Enterprise accounting, general ledger, and machine-learning intelligence frontend for ZenaTech. Built with **React 19**, **TypeScript**, **Vite 8**, **Tailwind CSS v4**, and **shadcn/ui**.

Delivers comprehensive interfaces for **General Ledger Imports & Reviews**, **Consolidated Trial Balance Matrices**, **Bank Statement Parsers**, **Bank Feed Categorization Rules**, **XGBoost Decision Tree Explorers**, and **SEC Regulatory Filings with Mobile QR Signatures**.

---

## System Architecture Diagram

```mermaid
flowchart TD
    subgraph BrowserApp [Desktop Web Portal :5173]
        AppRoot[React 19 Root]
        AppRouter[React Router v7 Navigation Engine]
        Shell[AppShell Responsive Sidebar & TopBar]
    end

    subgraph StateAndCache [Client State Layer]
        AuthContext[Auth Context & Session Tokens]
        TanStackQuery[TanStack React Query v5 Cache]
        SSEListener[useNotifications EventSource Hook]
        ThemeEngine[Next Themes: Dark / Light Mode]
    end

    subgraph CoreViews [Accounting & Intelligence Modules]
        GLView[General Ledger Upload & Staged Dry-Run Review]
        TrialBalanceView[Consolidated Trial Balance Matrix]
        BankView[Bank Statements & Statement Previewer]
        RuleView[Bank Feed Automation Rules Builder]
        MLView[XGBoost Model Architecture & Decision Tree Viewer]
        SECView[SEC Regulatory Filings & Outline Builder]
        RBACView[Users, Roles, and PBAC Configurations]
        AuditView[Audit Log Inspector & Telemetry]
    end

    subgraph ComponentSystem [UI Component Library]
        ShadcnPrimitives[shadcn/ui Radix Primitives]
        VirtualGrid[TanStack React Table v8 + Virtualizer]
        Visualizers[Recharts & Custom SVG Tree Visualizer]
        Toasts[Sonner Action Alerts]
    end

    subgraph BackendAPI [FastAPI Enterprise Core Engine :8001]
        RESTEndpoints[/api/gl, /api/bank, /api/classification]
        SSEStream[/api/notifications/stream]
    end

    AppRoot --> AppRouter
    AppRouter --> Shell
    Shell --> CoreViews
    CoreViews --> ComponentSystem

    CoreViews <--> StateAndCache
    AuthContext -->|Route Guards & PBAC| AppRouter
    TanStackQuery -->|REST Requests with Cookies| RESTEndpoints
    SSEListener -->|Real-Time Bank & GL Events| SSEStream
```

---

## Technologies & System Specifications

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Framework & Build** | [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/) | Ultrafast development server with optimized rollup production builds |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict typings across accounting records, split mappings, and ML tree structures |
| **Styling & Theme** | [Tailwind CSS v4](https://tailwindcss.com/), `@shadcn/react`, `next-themes` | Modern utility CSS engine with dark mode tokens and responsive design |
| **Data Fetching & Cache**| [TanStack React Query v5](https://tanstack.com/query) | Automated caching, optimistic UI updates, and background synchronization |
| **Data Grids & Virtualization** | [TanStack React Table v8](https://tanstack.com/table), [TanStack Virtual](https://tanstack.com/virtual) | Virtualized grid rendering tens of thousands of GL line items with zero latency |
| **ML Tree Visualizer** | Custom SVG / React Tree Rendering | Interactive visualization of XGBoost boosted trees, feature split weights, and leaf values |
| **Spreadsheet & Documents**| `exceljs`, `xlsx`, `docx`, `date-fns`, `clsx` | Client-side Excel parsing, SEC filing DOCX export, and financial formatting |
| **Mobile Signature QR** | `qrcode`, HTML5 Touch Canvas | QR code generation for mobile handoff to capture digital signoffs on SEC filings |
| **Animations & UI Primitives** | [Framer Motion](https://www.framer.com/motion/), `vaul`, `sonner`, Radix UI | Bottom sheet drawers, smooth accordion panels, and dynamic toast alerts |

---

## Key Modules & Features

1. **General Ledger (GL) Import & Review (`/general-ledger`)**:
   - Upload Deltek Ajera and QuickBooks files with dry-run validation preview.
   - Interactive split-mapping review before committing batches to PostgreSQL.
2. **Consolidated Trial Balance Matrix (`/trial-balance`)**:
   - Multi-company matrix view comparing debits, credits, and net balances across subsidiaries.
3. **Bank Statements & Reconciliation (`/bank-statements`)**:
   - Parse statement transactions and match against recorded general ledger items.
4. **Bank Feed Automation Rules (`/bank-feed-rules`)**:
   - Visual if-then condition builder mapping payees, memos, and amounts to automatic GL codes.
5. **XGBoost ML Transaction Explorer (`/xgboost-model`)**:
   - Inspect transaction classification model performance, confidence distributions, and decision trees.
6. **SEC Regulatory Filings (`/sec-filings`)**:
   - Modular block-based document composition for 10-K / 10-Q disclosures with live variable injection.
7. **RBAC & Administration (`/configurations/*`)**:
   - Manage users, role hierarchies, group action permissions, and audit logs.

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

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_API_BASE_URL=http://localhost:8001
```

### 3. Run Development Server
```bash
npm run dev
```
Open application at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```

### 5. Lint
```bash
npm run lint
```
