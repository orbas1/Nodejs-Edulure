## Front-end Test Execution

- `npm run test --workspace frontend-reactjs -- src/pages/dashboard/__tests__/AdminIntegrations.test.jsx` – passes; targeted Vitest run exercises integration dashboard success, API failure, alert-dismissal, invitation workflows, and BYO API key disable flows while generating coverage for the expanded control centre experience.【96bf0d†L1-L6】
- `npm run test --workspace frontend-reactjs -- src/pages/__tests__/IntegrationCredentialInvite.test.jsx` – passes; validates invite loading, error handling, key length validation, and credential submission success states for the public invite claim page.【5b8f50†L1-L13】
