# Development instructions for coding agents

This is a Next.js 16 / React 19 / TypeScript / Prisma 7 application. Treat personnel, inventory, loans, and print reports as sensitive business logic.

## Before editing
- Read the affected route, its callers, Prisma schema, and related tests.
- Preserve existing authorization, audit trails, historical records, and soft-delete behavior.
- Never modify production database data or run migrations without explicit authorization.
- In reports of active personnel, exclude records with `baja: true`. Historical transactions must remain accessible.

## Verification
- Install exactly from lockfile: `npm ci`.
- Generate client: `npm run prisma:generate`.
- Run `npm run check:encoding`, `npm run lint`, `npx tsc --noEmit`, and `npx vitest run`.
- Run `npm run build` before deployment where environment variables permit.
- For bug fixes, add a regression test reproducing the defect first.
- Never claim checks passed without actually running them.

## Dependency upgrades
- Keep `package.json` and `package-lock.json` synchronized.
- Use `npm install -D <package>@<version>` for development dependencies, not manual lockfile edits.
- Upgrade Vitest and its related packages together; check migration notes and Node engine requirements.
- Keep Prisma CLI and client on the same supported major.
- Prefer incremental PRs and inspect generated diffs; avoid simultaneous major upgrades.
- Do not commit credentials, database URLs, or generated Prisma output.
