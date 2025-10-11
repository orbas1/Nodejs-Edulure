# Screen Logic Flow Map – Version 1.00

```mermaid
flowchart LR
  A[Visitor Landing SCR-00]
  B[Onboarding SCR-01]
  C[Dashboard SCR-02]
  D[Learn Library SCR-03]
  E[Course Detail SCR-04]
  F[Lesson Player SCR-05]
  G[Communities Hub SCR-06]
  H[Community Detail SCR-07]
  I[Profile SCR-08]
  J[Settings SCR-09]
  K[Support SCR-10]
  L[Admin Analytics SCR-11]
  M[Admin Content SCR-12]

  A -- Hero CTA (new) --> B
  A -- Hero CTA (returning) --> C
  A -- View Courses --> D
  B -- Complete onboarding --> C
  C -- KPI cards --> D
  C -- Tasks rail --> F
  C -- Community CTA --> G
  C -- Alerts --> J
  D -- Select course --> E
  E -- Resume/Start --> F
  F -- Complete lesson --> E
  F -- View community discussion --> H
  G -- Join conversation --> H
  H -- View member --> I
  I -- Manage settings --> J
  J -- Need help --> K
  C -- Admin role detected --> L
  L -- Manage catalogue --> M
  M -- Audit content --> L
```

- Swimlane ownership documented in FigJam board `Web v1.00 / Flow Swimlanes`.
- Decision conditions (auth state, role, completion) encoded as guard clauses in routing layer (`apps/web/src/routes`).
- Reduced-motion preference bypasses transitions between nodes, using crossfade only.
