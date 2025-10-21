# Update Task List

## Legend
- **Status:** ☐ Not Started · ⏳ In Progress · ✅ Complete · ⚠️ Blocked
- **Priority:** H – High, M – Medium, L – Low

## Backend
| Status | Task | Priority | Owner | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| ⏳ | Implement RBAC scopes for `community_curator` role | H | Backend Lead | Security review sign-off | Integration tests added for read/write separation. |
| ☐ | Normalize telemetry payloads for lesson completion events | M | Data Engineer | Awaiting schema migration approval | Use versioned event contract v3. |
| ⏳ | Harden CORS policy with partner domain inventory sync | H | Platform Engineer | Inventory export from CRM | Auto-refresh job scheduled hourly with rollback toggle. |
| ✅ | Implement scoped API keys for third-party analytics export | H | Backend Lead | None | Keys rotated and documented in secrets manager. |

## Frontend (Web)
| Status | Task | Priority | Owner | Dependencies | Notes |
| ⏳ | Build adaptive theme toggles and persist preference | H | Frontend Lead | Design tokens finalization | Use CSS variables to avoid repaint on toggle. |
| ☐ | Add RBAC-aware navigation guards to instructor dashboard | H | Frontend Lead | Backend RBAC release | Guarded routes rely on `/auth/session` claims. |
| ⏳ | Update analytics widgets to support streaming updates | M | Frontend Engineer | Websocket endpoint readiness | Implement fallback polling every 30s. |
| ✅ | Refresh global header IA and responsive breakpoints | M | UX Engineer | Content audit | QA validated in Chrome, Safari, Firefox. |

## Mobile (Flutter)
| Status | Task | Priority | Owner | Dependencies | Notes |
| ⏳ | Redesign onboarding step 3 copy and CTAs | H | Mobile PM | Content design final approval | A/B copy test running with 10% of beta group. |
| ☐ | Implement offline caching for playlists | M | Mobile Engineer | Backend caching API | Use hydrated BLoC with TTL of 24h. |
| ⏳ | Add push notification deep links to unified inbox | H | Mobile Engineer | Notification payload schema | Validate analytics tags on open events. |
| ✅ | Align typography scale with web tokens | M | Design Systems | Theming tokens delivered | Verified across iOS and Android form factors. |

## Security & Compliance
| Status | Task | Priority | Owner | Dependencies | Notes |
| ✅ | Update DPIA and consent notices | H | Compliance Lead | Legal review | Published to compliance drive. |
| ⏳ | Conduct RBAC audit of privileged actions | H | Security Lead | Backend RBAC feature completion | Tracking results in `backend_updates/security_audit.md`. |
| ☐ | Validate automated JWT rotation job in staging | M | DevOps | Infrastructure window | Rehearsal scheduled for 2025-05-01. |

## QA & Tooling
| Status | Task | Priority | Owner | Dependencies | Notes |
| ⏳ | Expand Vitest coverage for RBAC boundaries | H | QA Engineer | Backend RBAC PR | Scripts documented in `update_tests/test_scripts/backend_test_script.md`. |
| ☐ | Author Playwright smoke suite for cross-origin flows | M | QA Engineer | Frontend navigation guards | Validate CORS responses, SSO handshake. |
| ⏳ | Automate Flutter golden tests for onboarding | M | Mobile QA | Onboarding redesign complete | Integrate with `user_app_test_script.sh`. |
| ✅ | Document regression execution plan | M | QA Lead | None | Reference `update_tests/test_scripts/update_tests_report.md`. |

## Customer Success & Enablement
| Status | Task | Priority | Owner | Dependencies | Notes |
| ⏳ | Draft release notes and FAQs | M | CS Lead | Feature freeze | Outline ready, awaiting screenshot updates. |
| ☐ | Prepare instructor webinar deck | L | CS Specialist | Release notes final | Include RBAC changes and analytics improvements. |
| ✅ | Update knowledge base articles | M | Documentation | Product sign-off | Articles scheduled for publish at launch. |
