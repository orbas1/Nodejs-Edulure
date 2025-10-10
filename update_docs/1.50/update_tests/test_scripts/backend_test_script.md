# Backend Automated Test Script

1. `cd backend-nodejs`
2. `npm install`
3. `npm run lint`
4. `npm run test`

The Vitest suite relies on `test/setupEnv.js` to satisfy Zod environment validation before loading the service modules.
