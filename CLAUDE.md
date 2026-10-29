# Claude Project Skill

Lean rules for this enterprise internal portal.

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

## Stack

- React, TypeScript, Vite, Tailwind, shadcn UI, React Query.
- API calls go through `src/services/apiClient.ts`; shared API/domain types live in `src/types/*`.
- Services and hooks must not export shared types; use `import type`.

## Frontend

- Put reusable backend shapes in `src/types`; keep one-off props local.
- Prefer shadcn components from `src/components/ui`.
- Services are API wrappers only; hooks only coordinate React Query/server state.
- Use theme tokens and shadcn variants for dark mode.
- Preserve finance math: bank/income add; expenses/credit cards subtract; liability increases are negative.

## Backend

- Keep explicit request/response schemas aligned with frontend `src/types`.
- Preserve route groups: `/accounting`, `/bank_statement`, `/dashboard`, `/reports`, `/upload-files`.
- Uploads use multipart form data, stable IDs/metadata, and S3-swappable local storage.
- Avoid destructive accounting operations unless route and UI explicitly say replace.

## Change impact (verify the whole flow)

- Trace every change end to end before finishing: component/page → `src/hooks` → `src/services` → `apiClient` → backend route, and back through the `src/types` contract.
- When changing a shared contract (a type in `src/types`, a service request/response shape, or a hook return), find EVERY consumer and verify each — a changed shape silently breaks callers that still typecheck through `any`.
- Exercise the real runtime path, not just `npm run build`: load the affected screen against the running backend and confirm the request succeeds (watch the network/console for 4xx/5xx), not just that it compiles.
- Keep frontend and backend in lockstep: a backend contract change means updating `src/types` first, then services/hooks/components; confirm the live API response actually matches the type.
- Report which flows and screens you checked and the result; if one could not be exercised (needs auth, data, an upload), say so explicitly.

## Checks

- Frontend: run `npm run build` after code changes.
- Run `npm run lint` after broad/shared changes.
- Backend: run the backend suite or touched endpoint tests.

### Server-Sent Events (SSE) & Real-Time Event Streaming
* **"Wait for Event" Model Only (Mandatory):**
  * **NEVER** use polling loops (`check -> sleep -> check`) or database polling heartbeats inside SSE streaming endpoints.
  * **NEVER** query the database repeatedly inside SSE stream generators.
  * **Always** use `await event_queue.get()` (or `asyncio.wait_for(q.get(), timeout=30.0)` for lightweight ping) to suspend the coroutine at the event loop level with zero CPU/DB overhead until a published event arrives.

* **Architecture Recommendation:**
  > **SSE + event-driven backend + 30–60 second lightweight heartbeat + automatic reconnect.**
  >
  > Don't use the heartbeat to poll the database.
  >
  > That gives you:
  > ```text
  > No notification
  >       ↓
  > Server mostly waits
  >       ↓
  > Tiny heartbeat occasionally
  >       ↓
  > Notification occurs
  >       ↓
  > Immediate SSE event
  > ```
  > That is a much better balance between server load and connection reliability.
  > And your CloudFront test strongly suggests that completely silent SSE connections are not viable in your current setup.

  * Standard SSE generator implementation (with lightweight zero-DB heartbeat):
    ```python
    async def event_generator():
        q = asyncio.Queue()
        broadcaster.add_listener(q)
        try:
            yield ": connected

"
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=30.0)
                    if msg.user_id == "*" or str(msg.user_id).lower() == str(user_id).lower():
                        yield f"data: {msg.model_dump_json()}

"
                except asyncio.TimeoutError:
                    # Lightweight keep-alive comment/ping to prevent CloudFront/proxy timeouts without querying the database
                    yield ": ping

"
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            broadcaster.remove_listener(q)
    ```
