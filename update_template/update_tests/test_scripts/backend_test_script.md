# Backend Test Script

## Prerequisites
- Node.js 20.12.2+
- npm 10+
- Local MySQL instance or Docker access for ephemeral database.
- Environment variables populated via `.env.test` (see `backend-nodejs/.env.example`).

## Steps
1. **Install Dependencies**
   ```bash
   cd backend-nodejs
   npm ci
   ```
2. **Provision Test Database**
   ```bash
   npm run db:install
   npm run migrate:latest
   npm run seed
   ```
3. **Static Analysis & Type Checks**
   ```bash
   npm run lint
   npm run docs:build
   ```
4. **Execute Unit & Integration Tests**
   ```bash
   npm test
   npm run test:release
   ```
5. **Security & Compliance Checks**
   ```bash
   npm run audit:dependencies
   npm run security:rotate-jwt -- --dry-run
   ```
6. **Data Integrity Validation**
   ```bash
   npm run db:schema:check
   npm run data:retention
   ```

## Expected Outcomes
- All commands exit with status code `0`.
- Vitest reports ≥87% coverage with zero failed tests.
- No high/critical vulnerabilities reported by `npm audit`.
- Schema verification prints `No drift detected` message.

## Troubleshooting
- Ensure Docker daemon is running if using containerized database.
- Reset database by running `npm run migrate:rollback` followed by `npm run migrate:latest` when encountering schema drift.
- Capture logs via `PINO_PRETTY=1 npm test -- --reporter=verbose` for flaky test investigation.
