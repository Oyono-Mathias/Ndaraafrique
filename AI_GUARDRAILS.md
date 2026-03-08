# AI Guardrails – Ndara Afrique

The following files are protected and must NEVER be modified without explicit approval.

## Protected UI
src/app/[locale]/page.tsx
src/app/[locale]/student/dashboard/page.tsx
src/app/[locale]/instructor/dashboard/page.tsx
src/components/dashboards/admin-dashboard.tsx

## Core Layout
src/components/layout/app-shell.tsx
src/app/[locale]/layout.tsx

## Roles & Permissions
src/context/RoleContext.tsx
src/hooks/use-permissions.ts

## Payments
src/actions/monerooActions.ts
src/app/api/webhooks/moneroo/route.ts
src/actions/payoutActions.ts

## Courses Ownership
src/actions/courseActions.ts

## Authentication
src/app/[locale]/login/login-client.tsx
src/firebase/provider.tsx
src/firebase/client-provider.tsx

## Firebase Core
src/firebase/admin.ts
src/firebase/index.ts

## Security
firestore.rules

## Global Settings
src/actions/settingsActions.ts
src/app/[locale]/admin/settings/page.tsx

## RULE
Before modifying any file, the AI must:
1. List files to modify
2. Explain why
3. Wait for approval
