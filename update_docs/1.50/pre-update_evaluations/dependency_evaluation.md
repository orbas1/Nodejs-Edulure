# Dependency Evaluation (v1.50 Pre-Update)

## Functionality
- Backend dependencies cover the minimal Express stack (Express, mysql2, Joi, bcrypt, JWT, helmet, cors), but they stop short of higher-level tooling for queues, caching, or background jobs. As a result, workflows such as email delivery, analytics ingestion, or real-time feeds will require significant new dependency work.
- The React front-end bundles Tailwind, Headless UI, Heroicons, and React Router, giving designers a solid component and styling baseline. However, axios is included without being used anywhere in `src/`, signalling either an unfinished integration or cruft that inflates bundle size.
- The Flutter app only depends on `google_fonts`, meaning there is no HTTP client, state management, or analytics SDK configured yet. Core product functions like authentication or feed retrieval cannot be built until those foundational packages are selected.

## Usability
- Dependency versions are modern (e.g., Vite 5, Tailwind 3.4, React Router 6.22, mysql2 3.9), which is positive for access to latest features. That said, there is no documented Node.js or npm version requirement, and no `.nvmrc`/Volta config, leading to inconsistent developer environments.
- There is no tooling to enforce consistent linting/formatting across repos. ESLint is configured but Prettier is only an ESLint config; no formatter script is defined. The Flutter project relies on `flutter_lints` defaults without customisation to Edulure conventions.
- Monorepo dependency management is manual; each sub-project has its own lockfile with no automation (e.g., npm workspaces, pnpm, or Melos for Flutter). Keeping versions in sync during updates will be error-prone.

## Errors
- No automated dependency health checks are wired (e.g., `npm audit`, `dependabot.yml`, or Snyk). Vulnerability detection will be reactive and manual, which is risky for security-sensitive dependencies like JWT or mysql2.
- The backend lacks guards for missing critical dependencies at runtime. If `pino-pretty` is absent in production (because it is a dev dependency), the logger transport configuration may fail silently depending on NODE_ENV.
- Flutter dependencies are pinned but there are no integration tests or CI to catch API changes when packages are upgraded, increasing the risk of runtime regressions.

## Integration
- There is no shared interface layer across clients; different HTTP clients (axios, fetch, Flutter `http`) are either missing or ad-hoc. Establishing a common SDK or schema generator (e.g., OpenAPI + codegen) would avoid divergent integrations.
- Backend scripts (`scripts/install-db.js`) depend on mysql CLI access but there are no Docker images or container orchestration defined, complicating integration with CI/CD pipelines.
- Environment variable loading is handled solely by `dotenv` on the backend; front-end and Flutter apps lack a consistent configuration system for pointing at staging/production APIs.

## Security
- Package versions currently referenced have known CVEs (e.g., Express 4.18.2 flagged for HTTP request smuggling mitigations, older helmet major). Without automated audits, these may persist into production.
- `dotenv` is used without `dotenv-safe`, so missing env vars fail silently. There is no secrets scanning or dependency verification (e.g., npm/yarn integrity checks).
- Flutter dependencies omit secure storage or encryption libraries, meaning any future token persistence would default to insecure `SharedPreferences` unless a secure dependency is added proactively.

## Alignment
- The dependency stack aligns partially with the product vision (modern web/mobile tooling) but omits real-time, analytics, and AI integrations promised in marketing copy. Future updates should plan to add messaging (e.g., Pusher/Supabase), search clients (Meilisearch SDK), and experimentation tooling.
- Update documents call for a "Version 1.50" release, yet there is no semantic versioning or changelog automation tied to dependency upgrades. Introducing Renovate/Dependabot and a consolidated changelog would keep updates traceable.
- Sustainability goals (maintainability, developer velocity) would benefit from adopting a package manager workspace strategy and centralised lint/test commands to reduce duplication across repos.
