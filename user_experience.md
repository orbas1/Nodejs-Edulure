1. **Appraise.** `LearnerSupport.jsx` now delivers a comprehensive workspace: SLA-aware case list, sticky detail pane, escalation breadcrumbs, inline composer, knowledge playbooks, and contact channels. Snapshot: 1 041 LOC with hero icon imports, `DashboardStateMessage`, `TicketForm`, `useAuth`, and dashboard formatting helpers.
2. **Function.** Data flows through `useLearnerDashboardSection('support')`, `useLearnerSupportCases`, and API wrappers (`createSupportTicket`, `replyToSupportTicket`, `updateSupportTicket`, `closeSupportTicket`). Helpers `getSlaBadgeDescriptor`, `formatSlaDeadline`, and `createAttachmentMeta` shape SLA metadata, messaging payloads, and upload stubs.
3. **Usefulness.** Knowledge suggestions come from persisted ticket metadata, while the surrounding knowledge base carousel hydrates from `DashboardService.getDashboardForUser`, which now queries `SupportKnowledgeBaseService.searchArticles` against the seeded `support_articles` table so the annex playbooks surface live, high-signal guides.
4. **Redundant.** SLA formatting and badge classnames remain duplicated in multiple spots; extracting shared dashboard badge utilities would prevent divergence with upcoming instructor/admin hubs.
5. **Placeholders.** Contact cards still degrade to `'#'` URLs when tenancy settings omit phone/chat links, and the “Schedule a call” channel is visually present but not yet wired to booking workflows.
6. **Duplicates.** Reply composer CTA markup mirrors `TicketForm` buttons; consider centralising pill button variants to shrink repeated class strings.
7. **Improve.** Next iteration should stream SLA countdowns via websockets, expose agent avatar/role chips, and add acknowledgement toggles for knowledge cards so support ops can log deflection analytics.
8. **Styling.** Workspace leans on `rounded-3xl` shells, dashboard pill tokens, semantic badge palettes, and gradient learner replies, producing parity with Annex A18 panels while keeping contrast accessible.
9. **Efficiency.** `usePersistentCollection` caches tickets per learner, dedupes messages/attachments, and defers remote fetches to `fetchSupportTickets`, minimising renders when transcripts stream in.
10. **Strengths.** Dual-column layout keeps case list, stats, and composer visible together; `AttachmentList`, timeline ordering, and SLA chips reinforce single-pane troubleshooting with contextual breadcrumbs.
11. **Weaknesses.** Offline flows stage replies locally but never surface retry state or sync history; add badge nudges and telemetry for unsent notes.
12. **Palette.** Priorities map to `bg-rose-100/bg-amber-100/bg-primary/10/bg-slate-100` while SLA states reuse semantic greens/yellows/reds so urgency is colour-consistent across dashboard modules.
13. **Layout.** Case cards fill the left column, detail view consumes the right, and knowledge/contact panels fall into a tertiary column on wide screens—responsiveness relies on Tailwind gaps rather than bespoke CSS.
14. **Text.** Microcopy (“Mark resolved”, “Reply sent to the learner success team”) emphasises action clarity; tooltip strings summarise SLA state for screen readers.
15. **Spacing.** Consistent `space-y-5` and `gap-6` groupings keep dense metadata readable, with dashed borders framing empty conversations or missing statistics.
16. **Shape.** Pills and cards standardise on `rounded-full`/`rounded-3xl`, matching the learner dashboard design language.
17. **Effects.** Buttons ship with `focus-visible` outlines, timeline entries avoid motion, and badges highlight on hover for assistive cues without violating reduced-motion preferences.
18. **Thumbs.** Icons from `@heroicons/react/24/outline` denote contacts, attachments, and actions, offering quick recognisability without bespoke art.
19. **Media.** Attachment previews show filenames and sizes; knowledge cards quote estimated minutes, reinforcing expectation-setting before learners click away.
20. **Buttons.** Primary actions reuse the `dashboard-pill` style; composer uses context-sensitive disabled states while case controls respect pending mutation flags.
21. **Interact.** `data-sla-status` and `aria-live="polite"` messages support analytics filters and accessibility announcements; composer handles attachment upload/remove events.
22. **Missing.** Still lacking agent assignment filters, merge/split utilities, and escalation exports; telephony CTA remains stubbed pending integrations.
23. **Design.** `TicketForm` dialog mirrors workspace styling, ensuring modal creation retains the same pill/badge grammar; analytics summary chips align with engagement metrics.
24. **Clone.** Attachment rendering and badge structures appear in both list and detail panes; abstracting them into shared primitives would avoid drift across contexts.
25. **Framework.** Backend synergy: `LearnerSupportRepository` persists breadcrumbs, SLA targets, and AI summaries, while `SupportKnowledgeBaseService` ensures content parity with database seeders/migrations.
26. **Checklist.** Validate `SupportKnowledgeBaseService.searchArticles` outputs (seeders install featured guides), confirm `useLearnerSupportCases` dedupe logic, exercise composer flows, and run `npm --prefix backend-nodejs test -- test/dashboardService.test.js` plus `npm --prefix frontend-reactjs run lint`.
27. **Nav.** Left rail case cards double as navigation tabs; `setSelectedCaseId` ensures last-viewed case stays focused after mutations, reducing context switching friction.
28. **Release.** Ship behind learner-support flag, monitor SLA badge engagement, confirm schema seeds (`006_create_learner_support_tables.sql`, `20250321120000_learner_support_enhancements.js`, bootstrap seed) align, and refresh documentation for Annex C1.
| LOC | 1 041 |
| Imports | Heroicons, DashboardStateMessage, TicketForm, dashboardFormatting helpers, useAuth |
| Hooks | useAuth, useCallback, useEffect, useLearnerDashboardSection, useLearnerSupportCases, useMemo, useState |

1. **Appraise.** `LearnerUpcomingSection.jsx` renders urgency-tagged commitment cards with contextual copy, CTA variants, and safe link handling. Snapshot: 185 LOC importing `PropTypes` and `clsx` only.
2. **Function.** Helpers `resolveActionVariant`, `resolveLinkTarget`, and `isSameOriginLink` map backend `actionType` hints to colour-coded CTAs and enforce `target/rel` safety for external links while `upcomingItemPropType` constrains expected fields.
3. **Usefulness.** Cards surface schedule labels, relative timing, host, and urgency descriptors powered by `normaliseUpcoming` in `LearnerOverview.jsx`, which ingests `DashboardService` payloads, so the rail mirrors Annex C1 priorities.
4. **Redundant.** Urgency tone/badge maps live locally; consider lifting them into shared dashboard formatting utilities to reuse across reminders and alerts.
5. **Placeholders.** When no actionable `href` exists the component renders a disabled button; future iterations might suppress the CTA entirely or offer alternate next steps.
6. **Duplicates.** CTA button markup echoes other dashboard pills; abstracting CTA primitives would reduce repeated class composition.
7. **Improve.** Extend items with location/timezone hints, ICS export links, and instrumentation hooks to log CTA clicks per event type.
8. **Styling.** `rounded-2xl` cards, uppercase kickers, and urgency badges align with the learner shell’s badge language while staying accessible in high-contrast mode.
9. **Efficiency.** Component stays pure—no state or effects—relying on parents to memoise `upcoming` arrays; event data attributes enable granular analytics without extra renders.
10. **Strengths.** Deterministic rendering makes unit testing straightforward and ensures consistent layout regardless of item count.
11. **Weaknesses.** Lacks loading skeletons or error fallbacks; relies on parent sections to gate rendering.
12. **Palette.** Urgency colours reuse rose/amber/emerald tokens shared with support SLA chips for cross-dashboard familiarity.
13. **Layout.** Vertical list with `space-y-4` keeps commitments scannable; header/kicker sets context before the loop begins.
14. **Text.** CTA `aria-label`s include event titles, improving screen reader clarity; urgency descriptor copy summarises next steps.
15. **Spacing.** `mt-3` spacing around titles and CTAs prevents cramped copy even when metadata is dense.
16. **Shape.** `rounded-full` badges and buttons echo other dashboard CTAs, ensuring brand cohesion.
17. **Effects.** Subtle hover translate and shadow intensify interactivity, while focus-visible outlines maintain keyboard support.
18. **Thumbs.** No imagery yet; adding avatars or icons could reinforce modality (course vs. live session vs. community).
19. **Media.** Component intentionally omits media previews to maintain compact height; rely on upstream sections for richer previews if needed.
20. **Buttons.** Action variant map ensures `join`, `review`, and `schedule` CTAs broadcast urgency through colour while defaulting gracefully when backend omits hints.
21. **Interact.** `data-urgency` attribute surfaces state for analytics dashboards or automated styling tweaks.
22. **Missing.** No instrumentation for completion/dismissal; consider linking to analytics context or allowing learners to snooze items.
23. **Design.** Visual treatment matches other learner cards (kicker, bold title, supporting copy), so the rail slots neatly alongside progress and quick actions.
24. **Clone.** Structure mirrors quick-action cards; abstracting a shared base could eliminate repeated header/footer markup across sections.
25. **Framework.** Works hand-in-hand with `normaliseUpcoming` and backend normalisers (`DashboardService`) that enrich events with `urgency`, `relative`, and CTA metadata.
26. **Checklist.** Keep backend/front-end vocabularies aligned (`actionType`, `urgency`), add tests covering link target resolution, and run `npm --prefix frontend-reactjs run test -- LearnerUpcomingSection` when expanded.
27. **Nav.** Section sits within learner overview column; header copy (“Upcoming commitments”) differentiates it from quick actions and progress.
28. **Release.** Monitor engagement after deployment, especially CTA click-through; ensure migrations/seeders emitting upcoming events populate `actionType` hints to unlock variant styling.
| LOC | 185 |
