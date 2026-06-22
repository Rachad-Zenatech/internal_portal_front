# Copilot Project Instructions

Use these instructions for suggestions in this enterprise internal portal.

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
