# Learner Profile Changes – Version 1.50

- Introduced a live privacy & consent ledger that queries the compliance API, displays grant metadata, and allows inline revocations with optimistic loading states and actor audit notes so support can action GDPR requests without leaving the profile.【F:frontend-reactjs/src/pages/Profile.jsx†L830-L870】【F:frontend-reactjs/src/hooks/useConsentRecords.js†L1-L52】
- Elevated governance posture into the profile hero by surfacing active consent counts and revocation progress beside revenue, community, and affiliate KPIs, reinforcing trust signals across the learner journey.【F:frontend-reactjs/src/pages/Profile.jsx†L772-L828】
- Hardened consent interactions with Vitest + Testing Library coverage that exercises the revoke workflow and hooks, preventing regressions in the compliance UI logic.【F:frontend-reactjs/src/pages/__tests__/ProfileConsentCard.test.jsx†L1-L54】【F:frontend-reactjs/src/hooks/__tests__/useConsentRecords.test.jsx†L1-L74】
