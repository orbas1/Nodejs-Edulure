# Edulure Node.js API

Opinionated Express.js API powering the Edulure platform. Provides authentication, community management, and user administration.

## Getting started

```bash
cp .env.example .env
npm install
npm run db:install
npm run dev
```

Set `DB_ROOT_USER`/`DB_ROOT_PASSWORD` in `.env` if your database requires elevated credentials to create schemas.

## Project structure

```
src/
  config/        # database pool, logger
  controllers/   # request handlers
  middleware/    # shared Express middleware
  models/        # MySQL queries
  routes/        # API route definitions
  services/      # domain logic
```

Database assets live in `database/`:

- `install.sql` bootstraps schema and privileged user.
- `migrations/` contains ordered SQL migrations.
- `seeders/` provides starter data for local development.

## API surface

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me`
- `GET /api/users` (admin only)
- `GET /api/communities`
- `POST /api/communities` (instructor only)

All protected routes expect a `Bearer` token issued from the login/register endpoints.
