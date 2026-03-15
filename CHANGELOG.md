# Changelog

All notable changes to this project will be documented in this file.

## [1.3.2] - 2026-03-14

### Added
- Added admin web push notification flow with public key endpoint and subscription management API.
- Added schema support for push subscriptions in the database setup scripts.

### Changed
- Improved ascenso workflow reliability and related API behavior.
- Updated app manifest and icon handling for better client-side refresh consistency.

### Fixed
- Fixed intermittent database-related runtime failures across API routes and auth checks.
- Fixed edge cases in notification subscription persistence.

## [1.0.0] - 2026-03-01

### Added
- Expanded the user model to include `grado`, `nombre`, `apellido`, `usuario`, and optional `mail_referencia`.
- Added SQL migrations for the user profile update and item code adjustments.
- Added a feature-based refactor for the main SPA home screen with dedicated `home`, `personal`, and `modals` components.
- Added `useHomeData` and related types to reduce orchestration complexity in `Home`.
- Added automatic Prisma client generation before `npm run dev`.

### Changed
- Updated authentication, user administration, and related APIs to use the new user schema keyed by `usuario`.
- Refactored the main SPA so `Home` acts as an orchestrator while feature views and dialogs live in cohesive modules.
- Updated the user creation script to match the new database schema.
- Bumped the application version from `0.1.0` to `1.0.0`.

### Fixed
- Corrected UI text encoding issues that replaced accents and `enye` with `?`.
- Regenerated the Prisma client to restore compatibility with the local PostgreSQL connection string and the current schema.
- Removed remaining runtime references to the legacy user shape during login and session flows.
