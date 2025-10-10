# Edulure Platform Monorepo

Base implementation for the Edulure learning community platform. The repository bundles a React front-end, Node.js/Express API, MySQL schema assets, and a companion Flutter mobile shell.

## Packages

- `frontend-reactjs/` – Vite + React application with Tailwind CSS and Inter font
- `backend-nodejs/` – Express API with modular services, controllers, and SQL migrations
- `Edulure-Flutter/` – Flutter starter app aligned with the platform branding

## Quick start

Each package maintains its own README with installation steps. At a high level:

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
