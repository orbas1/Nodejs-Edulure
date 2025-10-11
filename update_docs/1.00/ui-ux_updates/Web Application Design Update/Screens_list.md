# Screen Inventory – Web Application v1.00

| Screen ID | Route | Primary Audience | Purpose | Key Modules |
| --- | --- | --- | --- | --- |
| SCR-00 | `/` (role-targeted home) | Prospective & returning learners/providers | Promote Edulure value, capture CTA engagement | Hero orbit, proof strips, personalised CTA band |
| SCR-01 | `/onboarding` | New learners | Collect goals, skills, schedule | Stepper wizard, goal checklist, schedule calendar |
| SCR-02 | `/dashboard` | Authenticated learners | Present KPIs, tasks, announcements | KPI grid, task rail, announcements ticker, insights chart |
| SCR-03 | `/learn` | Learners | Discover catalogue, manage library | Filter ribbon, search, course cards, playlist sidebar |
| SCR-04 | `/learn/:courseId` | Learners | Evaluate course, enrol or resume | Hero stats, syllabus accordion, instructor profile, reviews |
| SCR-05 | `/lesson/:lessonId` | Learners | Stream lessons, track progress | Video player, transcript pane, resources drawer, notes |
| SCR-06 | `/communities` | Learners & providers | Engage with peer groups | Topic tabs, feed, events calendar, chat dock |
| SCR-07 | `/communities/:communityId` | Community members | Deep community management | Hero card, stats, feed, pinned resources, members list |
| SCR-08 | `/profile` | Learners | Showcase achievements | Profile hero, timeline, badges grid, skills heatmap |
| SCR-09 | `/settings` | All roles | Manage account, billing, preferences | Tabbed panels, form columns, security summary |
| SCR-10 | `/support` | All roles | Access help, submit tickets | FAQ accordion, contact cards, ticket form, status list |
| SCR-11 | `/admin/analytics` | Provider & enterprise admins | Monitor revenue and engagement | KPI board, cohort comparison chart, filter sidebar |
| SCR-12 | `/admin/content` | Provider admins | Manage course catalogue | Table view, bulk actions toolbar, status filters, detail drawer |

Each screen inherits the global shell documented in `Web Application Design Update.md` and consumes the shared design tokens for consistent behaviour across breakpoints.
