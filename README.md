# Edulure Platform Monorepo

Base implementation for the Edulure learning community platform. The repository bundles a React front-end, Node.js/Express API, MySQL schema assets, and a companion Flutter mobile shell.

The repo is now managed as an npm workspace. Node.js **20.12.2** and npm **10.5.0** (or newer) are enforced via `.nvmrc`, `.npmrc`, and a runtime verifier that blocks installs on unsupported engines or alternative package managers.

## Packages

- `frontend-reactjs/` – Vite + React application with Tailwind CSS and Inter font
- `backend-nodejs/` – Express API with modular services, controllers, and SQL migrations
- `Edulure-Flutter/` – Flutter starter app aligned with the platform branding

## Quick start

Each package maintains its own README with installation steps. At a high level you can bootstrap everything from the repo root:

```bash
nvm use
npm install

# lint + test every workspace (backend + frontend)
npm run lint
npm run test

# optional security scan
npm run audit
```

You can still work inside individual workspaces when needed:

```bash
# Frontend
cd frontend-reactjs
npm install
npm run dev

# Backend
cd backend-nodejs
cp .env.example .env
npm install
npm run db:install
npm run dev
```

MySQL 8+ is recommended. The `db:install` script provisions the schema, migrations, and seed data.
