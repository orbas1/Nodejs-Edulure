Automated Error Audit

Group 1
1. [Backend lint] 3402:11 error Parsing error: Identifier 'nowIso' has already been declared
2. [Backend lint] 3:44 error Parse errors in imported module '../services/IntegrationApiKeyInviteService.js': Identifier 'sanitizedKey' has already been declared (811:11) import/namespace
3. [Backend lint] 3:44 error Parse errors in imported module '../services/IntegrationApiKeyInviteService.js': Identifier 'sanitizedKey' has already been declared (811:11) import/default
4. [Backend lint] 3:40 error Parse errors in imported module '../services/CommunityModerationService.js': Identifier 'summary' has already been declared (224:13) import/namespace
5. [Backend lint] 3:40 error Parse errors in imported module '../services/CommunityModerationService.js': Identifier 'summary' has already been declared (224:13) import/default
6. [Backend lint] 1:30 error Parse errors in imported module '../services/DashboardService.js': Identifier 'primaryCourse' has already been declared (2690:9) import/namespace
7. [Backend lint] 1:30 error Parse errors in imported module '../services/DashboardService.js': Identifier 'primaryCourse' has already been declared (2690:9) import/default
8. [Backend lint] 6:8 error Parse errors in imported module '../services/IntegrationApiKeyInviteService.js': Identifier 'sanitizedKey' has already been declared (811:11) import/namespace
9. [Backend lint] 6:8 error Parse errors in imported module '../services/IntegrationApiKeyInviteService.js': Identifier 'sanitizedKey' has already been declared (811:11) import/default
10. [Backend lint] 96:10 error 'normaliseReactionSummary' is defined but never used. Allowed unused vars must match /^_/u no-unused-vars
11. [Backend lint] 18:35 error 'fieldName' is assigned a value but never used. Allowed unused args must match /^_/u no-unused-vars
12. [Backend lint] 4:10 error normalizeCurrencyCode not found in '../utils/currency.js' import/named
13. [Backend lint] 2:10 error normalizeCurrencyCode not found in '../utils/currency.js' import/named
14. [Backend lint] 256:43 error 'campaign' is defined but never used. Allowed unused args must match /^_/u no-unused-vars
15. [Backend lint] 224:13 error Parsing error: Identifier 'summary' has already been declared
16. [Backend lint] 2690:9 error Parsing error: Identifier 'primaryCourse' has already been declared
17. [Backend lint] 507:14 error 'compareBlueprintRegistry' is defined but never used. Allowed unused vars must match /^_/u no-unused-vars
18. [Backend lint] 811:11 error Parsing error: Identifier 'sanitizedKey' has already been declared
19. [Backend lint] 698:25 error 'optionalIsoDateField' is not defined no-undef
20. [Backend lint] 1219:31 error Unsafe usage of optional chaining. If it short-circuits with 'undefined' the evaluation will throw TypeError no-unsafe-optional-chaining
21. [Backend lint] 1223:41 error Unsafe usage of optional chaining. If it short-circuits with 'undefined' the evaluation will throw TypeError no-unsafe-optional-chaining
22. [Backend lint] 1227:40 error Unsafe usage of optional chaining. If it short-circuits with 'undefined' the evaluation will throw TypeError no-unsafe-optional-chaining
23. [Backend lint] 1231:42 error Unsafe usage of optional chaining. If it short-circuits with 'undefined' the evaluation will throw TypeError no-unsafe-optional-chaining
24. [Backend lint] 119:3 error 'getMediaTypePolicy' is not defined no-undef
25. [Backend lint] 121:3 error 'normaliseMediaKind' is not defined no-undef
26. [Backend lint] 4:10 error centsToCurrencyString not found in '../utils/currency.js' import/named
27. [Backend lint] 4:33 error normalizeCurrencyCode not found in '../utils/currency.js' import/named
28. [Backend lint] 21:10 error normalizeCurrencyCode not found in '../utils/currency.js' import/named
29. [Backend lint] 28:10 error centsToCurrencyString not found in '../utils/currency.js' import/named
30. [Backend lint] 28:33 error currencyStringToCents not found in '../utils/currency.js' import/named
Group 2
31. [Backend lint] 28:56 error normalizeCurrencyCode not found in '../utils/currency.js' import/named
32. [Backend lint] 105:10 error 'parseTokenList' is defined but never used. Allowed unused vars must match /^_/u no-unused-vars
33. [Backend lint] 141:35 error 'since' is defined but never used. Allowed unused args must match /^_/u no-unused-vars
34. [Backend lint] 263:11 error 'closedCases' is assigned a value but never used. Allowed unused vars must match /^_/u no-unused-vars
35. [Backend lint] 1:10 error ZodIssue not found in 'zod' import/named
36. [Backend lint] 108:40 error Parse errors in imported module '../src/services/CommunityModerationService.js': Identifier 'summary' has already been declared (224:13) import/namespace
37. [Backend lint] 108:40 error Parse errors in imported module '../src/services/CommunityModerationService.js': Identifier 'summary' has already been declared (224:13) import/default
38. [Backend lint] 11:8 error Parse errors in imported module '../src/services/DashboardService.js': Identifier 'primaryCourse' has already been declared (2690:9) import/namespace
39. [Backend lint] 2:1 error 'node:fs' import is duplicated no-duplicate-imports
40. [Backend lint] 32:44 error Parse errors in imported module '../src/services/IntegrationApiKeyInviteService.js': Identifier 'sanitizedKey' has already been declared (811:11) import/namespace
41. [Backend lint] 32:44 error Parse errors in imported module '../src/services/IntegrationApiKeyInviteService.js': Identifier 'sanitizedKey' has already been declared (811:11) import/default
42. [Backend lint] 1:48 error 'afterEach' is defined but never used. Allowed unused vars must match /^_/u no-unused-vars
43. [Backend lint] npm error Lifecycle script `lint` failed with error:
44. [Backend lint] npm error code 1
45. [Backend lint] npm error path /workspace/Nodejs-Edulure/backend-nodejs
46. [Backend lint] npm error workspace edulure-backend@0.1.0
47. [Backend lint] npm error location /workspace/Nodejs-Edulure/backend-nodejs
48. [Backend lint] npm error command failed
49. [Backend lint] npm error command sh -c eslint .
50. [Backend unit tests] ❯ test/group23Models.test.js (5 tests | 2 failed) 167ms
51. [Backend unit tests] ❯ test/communityService.test.js (11 tests | 2 failed) 74ms
52. [Backend unit tests] ❯ test/paymentService.test.js (14 tests | 7 failed) 87ms
53. [Backend unit tests] ❯ test/adminOperationalControllers.test.js (19 tests | 2 failed) 76ms
54. [Backend unit tests] ❯ test/environmentParityService.test.js (3 tests | 3 failed) 172ms
55. [Backend unit tests] ↓ Community chat HTTP routes > returns a validation error when message body is missing
56. [Backend unit tests] ❯ test/explorerAnalyticsService.test.js (4 tests | 3 failed) 37ms
57. [Backend unit tests] {"level":"error","time":"2025-10-25T14:45:02.594Z","service":"edulure-api","environment":"test","err":{"type":"","message":"\"limit\" must be greater than or equal to 1","stack":"ValidationError: \"limit\" must be greater than or equal to 1","_original":{"limit":"0"},"details":[{"message":"\"limit\" must be greater than or equal to 1","path":["limit"],"type":"number.min","context":{"limit":1,"value":0,"label":"limit","key":"limit"}}],"status":422,"isJoi":true,"name":"ValidationError"},"status":422,"message":"Unhandled error"}
58. [Backend unit tests] {"level":"error","time":"2025-10-25T14:45:02.635Z","service":"edulure-api","environment":"test","err":{"type":"","message":"\"limit\" must be less than or equal to 50","stack":"ValidationError: \"limit\" must be less than or equal to 50","_original":{"limit":"200"},"details":[{"message":"\"limit\" must be less than or equal to 50","path":["limit"],"type":"number.max","context":{"limit":50,"value":200,"label":"limit","key":"limit"}}],"status":422,"isJoi":true,"name":"ValidationError"},"status":422,"message":"Unhandled error"}
59. [Backend unit tests] ❯ test/integrationApiKeyService.test.js (5 tests | 2 failed) 91ms
60. [Backend unit tests] ❯ test/adsService.test.js (5 tests | 1 failed) 56ms
Group 3
61. [Backend unit tests] ❯ test/billingPortalSessionModel.test.js (5 tests | 1 failed) 22ms
62. [Backend unit tests] ❯ test/directMessageService.test.js (6 tests | 2 failed) 53ms
63. [Backend unit tests] ❯ test/businessIntelligenceService.test.js (2 tests | 1 failed) 29ms
64. [Backend unit tests] ❯ test/marketingContentService.test.js (6 tests | 3 failed) 53ms
65. [Backend unit tests] ❯ test/governanceStakeholderService.test.js (5 tests | 2 failed) 37ms
66. [Backend unit tests] ❯ test/telemetryWarehouseService.test.js (3 tests | 1 failed) 37ms
67. [Backend unit tests] ✓ TelemetryWarehouseService > marks batches and events failed when the upload throws 5ms
68. [Backend unit tests] ❯ test/navigationAnnexRepository.test.js (3 tests | 1 failed) 35ms
69. [Backend unit tests] ❯ test/explorerSearchService.test.js (1 test | 1 failed) 16ms
70. [Backend unit tests] ❯ test/releaseOrchestrationService.test.js (2 tests | 2 failed) 29ms
71. [Backend unit tests] ❯ test/webServer.test.js (3 tests | 3 failed) 74ms
72. [Backend unit tests] → expected a thrown error to be Error: bind failure
73. [Backend unit tests] ❯ test/userHttpRoutes.test.js (8 tests | 1 failed) 333ms
74. [Backend unit tests] ❯ test/adminOperationsOverviewService.test.js (1 test | 1 failed) 42ms
75. [Backend unit tests] ❯ test/workerService.test.js (3 tests | 1 failed) 64ms
76. [Backend unit tests] ❯ test/repositories/LearnerSupportRepository.test.js (7 tests | 1 failed) 28ms
77. [Backend unit tests] ❯ test/savedSearchService.test.js (6 tests | 3 failed) 35ms
78. [Backend unit tests] ↓ OpenAPI contract publications > throws a descriptive error when the service index cannot be parsed
79. [Backend unit tests] ❯ test/realtimeService.test.js (4 tests | 4 failed) 289ms
80. [Backend unit tests] {"level":"error","time":"2025-10-25T14:45:56.795Z","service":"edulure-api","environment":"test","component":"api-router","route":"errors","capability":"error-boundary","version":"v1","scope":"api:v1:errors","err":{"type":"Error","message":"explosion","stack":"Error: explosion\n at /workspace/Nodejs-Edulure/backend-nodejs/test/routerLoader.test.js:88:21\n at Layer.handle [as handle_request] (/workspace/Nodejs-Edulure/backend-nodejs/node_modules/express/lib/router/layer.js:95:5)\n at next (/workspace/Nodejs-Edulure/backend-nodejs/node_modules/express/lib/router/route.js:149:13)\n at Route.dispatch (/workspace/Nodejs-Edulure/backend-nodejs/node_modules/express/lib/router/route.js:119:3)\n at Layer.handle [as handle_request] (/workspace/Nodejs-Edulure/backend-nodejs/node_modules/express/lib/router/layer.js:95:5)\n at /workspace/Nodejs-Edulure/backend-nodejs/node_modules/express/lib/router/index.js:284:15\n at Function.process_params (/workspace/Nodejs-Edulure/backend-nodejs/node_modules/express/lib/router/index.js:346:12)\n at next (/workspace/Nodejs-Edulure/backend-nodejs/node_modules/express/lib/router/index.js:280:10)\n at Function.handle (/workspace/Nodejs-Edulure/backend-nodejs/node_modules/express/lib/router/index.js:175:3)\n at router (/workspace/Nodejs-Edulure/backend-nodejs/node_modules/express/lib/router/index.js:47:12)","status":418},"status":418,"path":"/api/v1/errors/explode","correlationId":"f8235c2a-eebb-4f76-bb8e-57f874b44ad4","featureFlags":{"test.errors":{"key":"test.errors","enabled":true,"reason":"enabled"}},"method":"GET","message":"Route error captured by boundary"}
81. [Backend unit tests] ❯ test/domainEventDispatcherService.test.js (3 tests | 1 failed) 34ms
82. [Backend unit tests] ❯ test/storageService.test.js (6 tests | 1 failed) 26ms
83. [Backend unit tests] ❯ test/bootstrap/bootstrap.test.js (3 tests | 1 failed) 1865ms
84. [Backend unit tests] ❯ test/complianceDomainSchema.test.js (2 tests | 2 failed) 133ms
85. [Backend unit tests] - SQLITE_ERROR: near "PARTITION": syntax error
86. [Backend unit tests] ❯ test/contentController.marketing.test.js (2 tests | 2 failed) 865ms
87. [Backend unit tests] ❯ test/config/storageConfig.test.js (3 tests | 2 failed) 10ms
88. [Backend unit tests] ❯ test/graphql/persistedQueryStore.test.js (2 tests | 1 failed) 19ms
89. [Backend unit tests] Test Files 70 failed | 148 passed (218)
90. [Backend unit tests] Tests 60 failed | 781 passed | 126 skipped (967)
Group 4
91. [Backend unit tests] Database not ready (attempt 1) for localhost:3306/app: connect ECONNREFUSED Reason: The database service rejected the TCP connection. Confirm the database container or host is running and accepting connections.
92. [Backend unit tests] err: Error: CloudConvert request failed with status 500
93. [Backend unit tests] at CloudConvertClient.request (/workspace/Nodejs-Edulure/backend-nodejs/src/integrations/CloudConvertClient.js:159:21)
94. [Backend unit tests] at processTicksAndRejections (node:internal/process/task_queues:95:5)
95. [Backend unit tests] at /workspace/Nodejs-Edulure/backend-nodejs/src/integrations/CloudConvertClient.js:170:24
96. [Backend unit tests] at CloudConvertClient.execute (/workspace/Nodejs-Edulure/backend-nodejs/src/integrations/CloudConvertClient.js:70:24)
97. [Backend unit tests] at /workspace/Nodejs-Edulure/backend-nodejs/test/integrations/cloudConvertClient.test.js:54:21
98. [Backend unit tests] at file:///workspace/Nodejs-Edulure/node_modules/@vitest/runner/dist/chunk-hooks.js:752:20 {
99. [Backend unit tests] body: { message: 'error' }
100. [Backend unit tests] } CloudConvert operation failed
101. [Backend unit tests] ⎯⎯⎯⎯⎯⎯ Failed Suites 39 ⎯⎯⎯⎯⎯⎯
102. [Backend unit tests] FAIL test/adminSettingsHttpRoutes.test.js [ test/adminSettingsHttpRoutes.test.js ]
103. [Backend unit tests] FAIL test/adsHttpRoutes.test.js [ test/adsHttpRoutes.test.js ]
104. [Backend unit tests] FAIL test/analyticsBiHttpRoutes.test.js > Analytics BI HTTP routes
105. [Backend unit tests] FAIL test/capabilityManifestService.test.js [ test/capabilityManifestService.test.js ]
106. [Backend unit tests] FAIL test/chatHttpRoutes.test.js [ test/chatHttpRoutes.test.js ]
107. [Backend unit tests] FAIL test/complianceHttpRoutes.test.js [ test/complianceHttpRoutes.test.js ]
108. [Backend unit tests] FAIL test/dashboardHttpRoutes.test.js [ test/dashboardHttpRoutes.test.js ]
109. [Backend unit tests] FAIL test/enablementHttpRoutes.test.js > Enablement HTTP routes
110. [Backend unit tests] FAIL test/feedHttpRoutes.test.js [ test/feedHttpRoutes.test.js ]
111. [Backend unit tests] FAIL test/governanceHttpRoutes.test.js > Governance HTTP routes
112. [Backend unit tests] FAIL test/graphqlFeedRoutes.test.js [ test/graphqlFeedRoutes.test.js ]
113. [Backend unit tests] FAIL test/observabilityContracts.test.js > Observability OpenAPI contracts
114. [Backend unit tests] FAIL test/observabilityHttpRoutes.test.js > Observability HTTP routes
115. [Backend unit tests] FAIL test/openApiContracts.test.js > OpenAPI contract publications
116. [Backend unit tests] FAIL test/operatorDashboardService.test.js [ test/operatorDashboardService.test.js ]
117. [Backend unit tests] FAIL test/operatorSupportHttpRoutes.test.js [ test/operatorSupportHttpRoutes.test.js ]
118. [Backend unit tests] FAIL test/providerTransitionHttpRoutes.test.js [ test/providerTransitionHttpRoutes.test.js ]
119. [Backend unit tests] FAIL test/releaseHttpRoutes.test.js > Release HTTP routes
120. [Backend unit tests] FAIL test/socialGraphHttpRoutes.test.js [ test/socialGraphHttpRoutes.test.js ]
Group 5
121. [Backend unit tests] FAIL test/telemetryHttpRoutes.test.js > Telemetry HTTP routes
122. [Backend unit tests] FAIL test/release/releaseReadiness.test.js [ test/release/releaseReadiness.test.js ]
123. [Backend unit tests] FAIL test/routes/routeMetadata.test.js [ test/routes/routeMetadata.test.js ]
124. [Backend unit tests] Error: Missing default value
125. [Backend unit tests] ❯ new module.exports node_modules/@hapi/hoek/lib/error.js:23:19
126. [Backend unit tests] FAIL test/app.test.js [ test/app.test.js ]
127. [Backend unit tests] TypeError: Cannot read properties of undefined (reading 'driver')
128. [Backend unit tests] FAIL test/authService.test.js [ test/authService.test.js ]
129. [Backend unit tests] Error: [vitest] There was an error when mocking a module. If you are using "vi.mock" factory, make sure there are no top level variables inside, since this call is hoisted to top of the file. Read more: https://vitest.dev/api/vi.html#vi-mock
130. [Backend unit tests] FAIL test/communityModerationService.test.js [ test/communityModerationService.test.js ]
131. [Backend unit tests] SyntaxError: Identifier 'summary' has already been declared
132. [Backend unit tests] FAIL test/communityReminderJob.test.js [ test/communityReminderJob.test.js ]
133. [Backend unit tests] FAIL test/dashboardService.test.js [ test/dashboardService.test.js ]
134. [Backend unit tests] SyntaxError: Identifier 'primaryCourse' has already been declared
135. [Backend unit tests] FAIL test/dataPartitionJob.test.js [ test/dataPartitionJob.test.js ]
136. [Backend unit tests] FAIL test/enablementContentService.test.js > EnablementContentService
137. [Backend unit tests] stack: 'Error: connect ECONNREFUSED ::1:3306\n' +
138. [Backend unit tests] constructor: 'Function<Error>',
139. [Backend unit tests] name: 'Error',
140. [Backend unit tests] stack: 'Error: connect ECONNREFUSED 127.0.0.1:3306\n' +
141. [Backend unit tests] fatal: true,
142. [Backend unit tests] FAIL test/group14Controllers.test.js [ test/group14Controllers.test.js ]
143. [Backend unit tests] TypeError: Cannot read properties of undefined (reading 'serviceName')
144. [Backend unit tests] FAIL test/integrationApiKeyInviteService.test.js [ test/integrationApiKeyInviteService.test.js ]
145. [Backend unit tests] SyntaxError: Identifier 'sanitizedKey' has already been declared
146. [Backend unit tests] FAIL test/integrationKeyInviteController.test.js [ test/integrationKeyInviteController.test.js ]
147. [Backend unit tests] FAIL test/learnerDashboardHttpRoutes.test.js > Learner dashboard HTTP routes
148. [Backend unit tests] FAIL test/mediaUploadHttpRoutes.test.js > Media upload HTTP routes
149. [Backend unit tests] ReferenceError: getMediaTypePolicy is not defined
150. [Backend unit tests] FAIL test/monetizationFinanceService.test.js [ test/monetizationFinanceService.test.js ]
Group 6
151. [Backend unit tests] FAIL test/monetizationReconciliationJob.test.js [ test/monetizationReconciliationJob.test.js ]
152. [Backend unit tests] TypeError: Cannot read properties of undefined (reading 'smtpHost')
153. [Backend unit tests] FAIL test/paymentsWebhookHttpRoutes.test.js [ test/paymentsWebhookHttpRoutes.test.js ]
154. [Backend unit tests] TypeError: (0 , normalizeCurrencyCode) is not a function
155. [Backend unit tests] FAIL test/providerTransitionService.test.js [ test/providerTransitionService.test.js ]
156. [Backend unit tests] FAIL test/supportKnowledgeBaseService.test.js [ test/supportKnowledgeBaseService.test.js ]
157. [Backend unit tests] ⎯⎯⎯⎯⎯⎯ Failed Tests 60 ⎯⎯⎯⎯⎯⎯⎯
158. [Backend unit tests] FAIL test/adminOperationalControllers.test.js > AdminRevenueManagementController > deletes an adjustment by id
159. [Backend unit tests] FAIL test/adminOperationalControllers.test.js > AdminAdsController > summarises campaign performance across the portfolio
160. [Backend unit tests] FAIL test/adminOperationsOverviewService.test.js > AdminOperationsOverviewService > builds an overview snapshot with prioritised compliance alerts
161. [Backend unit tests] FAIL test/adsService.test.js > AdsService > creates campaigns with placements, brand safety, and preview metadata
162. [Backend unit tests] FAIL test/billingPortalSessionModel.test.js > BillingPortalSessionModel > lists active sessions ordered by creation time
163. [Backend unit tests] TypeError: rows.map is not a function
164. [Backend unit tests] FAIL test/businessIntelligenceService.test.js > BusinessIntelligenceService > returns saved revenue views aggregated by currency and range
165. [Backend unit tests] FAIL test/communityService.test.js > CommunityService > serialises community summaries with stats and metadata
166. [Backend unit tests] FAIL test/communityService.test.js > CommunityService > creates a post and records domain events for moderators
167. [Backend unit tests] FAIL test/complianceDomainSchema.test.js > applyComplianceDomainSchema > creates the compliance governance tables with indexes and seed data
168. [Backend unit tests] FAIL test/complianceDomainSchema.test.js > applyComplianceDomainSchema > is idempotent and rolls back cleanly
169. [Backend unit tests] Error:
170. [Backend unit tests] FAIL test/contentController.marketing.test.js > ContentController marketing endpoints > submits marketing lead payloads
171. [Backend unit tests] FAIL test/contentController.marketing.test.js > ContentController marketing endpoints > rejects invalid marketing lead payloads
172. [Backend unit tests] FAIL test/directMessageService.test.js > DirectMessageService > sends a message and updates last read state
173. [Backend unit tests] TypeError: default.broadcastMessage is not a function
174. [Backend unit tests] FAIL test/directMessageService.test.js > DirectMessageService > restores a thread and clears archive state
175. [Backend unit tests] FAIL test/domainEventDispatcherService.test.js > DomainEventDispatcherService > delivers domain events via webhook bus
176. [Backend unit tests] FAIL test/environmentParityService.test.js > EnvironmentParityService > produces a healthy report when manifest matches runtime state
177. [Backend unit tests] TypeError: connection is not a function
178. [Backend unit tests] FAIL test/environmentParityService.test.js > EnvironmentParityService > flags drifted artefacts when manifest hashes diverge
179. [Backend unit tests] FAIL test/environmentParityService.test.js > EnvironmentParityService > detects descriptor registry mismatches
180. [Backend unit tests] FAIL test/explorerAnalyticsService.test.js > ExplorerAnalyticsService > records search executions and updates metrics
Group 7
181. [Backend unit tests] FAIL test/explorerAnalyticsService.test.js > ExplorerAnalyticsService > stores preview digests when supplied
182. [Backend unit tests] FAIL test/explorerAnalyticsService.test.js > ExplorerAnalyticsService > records explorer interactions and increments click metrics
183. [Backend unit tests] FAIL test/explorerSearchService.test.js > ExplorerSearchService > queries the document model and formats results per entity
184. [Backend unit tests] FAIL test/governanceStakeholderService.test.js > GovernanceStakeholderService > updates contract obligations and refreshes metrics
185. [Backend unit tests] FAIL test/governanceStakeholderService.test.js > GovernanceStakeholderService > records vendor assessment decision and updates metrics
186. [Backend unit tests] TypeError: this.vendorAssessmentModel.findByPublicId is not a function
187. [Backend unit tests] FAIL test/group23Models.test.js > Group 23 model flows > manages monetization catalog, usage, schedules, and reconciliation runs end-to-end
188. [Backend unit tests] FAIL test/group23Models.test.js > Group 23 model flows > applies coupons, encrypts payment intents, and handles refunds securely
189. [Backend unit tests] Error: insert into `payment_ledger_entries` (`amount_cents`, `currency`, `details`, `entry_type`, `payment_intent_id`, `recorded_at`) values (3600, 'GBP', '{"source":"checkout","reference":"order-123","currency":"GBP","entryType":"captured-revenue"}', 'captured-revenue', '1f7288fa-c6c2-46e4-a3cf-ce1f9dfb59f5', CURRENT_TIMESTAMP) - SQLITE_ERROR: table payment_ledger_entries has no column named amount_cents
190. [Backend unit tests] FAIL test/integrationApiKeyService.test.js > IntegrationApiKeyService > creates a new API key with encryption, validation, and rotation metadata
191. [Backend unit tests] FAIL test/integrationApiKeyService.test.js > IntegrationApiKeyService > rotates an existing API key and records rotation history
192. [Backend unit tests] FAIL test/marketingContentService.test.js > MarketingContentService > hydrates invite community metadata when communities are present
193. [Backend unit tests] FAIL test/marketingContentService.test.js > MarketingContentService > aggregates landing content across blocks, plans, and invites
194. [Backend unit tests] TypeError: connection(...).select(...).orderBy is not a function
195. [Backend unit tests] FAIL test/marketingContentService.test.js > MarketingContentService > creates marketing leads and enriches metadata with invites
196. [Backend unit tests] FAIL test/navigationAnnexRepository.test.js > NavigationAnnexRepository > aggregates annex data and filters scope by role
197. [Backend unit tests] FAIL test/paymentService.test.js > PaymentService > previewCoupon > normalises coupon data and redemption counters
198. [Backend unit tests] 382| const error = new Error(`Unsupported currency: ${normalized}`);
199. [Backend unit tests] FAIL test/paymentService.test.js > PaymentService > previewCoupon > throws when coupon not found
200. [Backend unit tests] FAIL test/paymentService.test.js > PaymentService > previewCoupon > enforces per-user redemption limits
201. [Backend unit tests] FAIL test/paymentService.test.js > PaymentService > previewCoupon > falls back to default currency when none is provided
202. [Backend unit tests] FAIL test/paymentService.test.js > PaymentService > creates Stripe payment intents with coupon validation
203. [Backend unit tests] FAIL test/paymentService.test.js > PaymentService > creates Escrow payment intents with buyer and seller context
204. [Backend unit tests] FAIL test/paymentService.test.js > PaymentService > captures PayPal orders and records ledger entries
205. [Backend unit tests] TypeError: (0 , currencyStringToCents) is not a function
206. [Backend unit tests] FAIL test/realtimeService.test.js > RealtimeService > summarises active connections across sockets
207. [Backend unit tests] TypeError: Cannot read properties of undefined (reading 'url')
208. [Backend unit tests] FAIL test/realtimeService.test.js > RealtimeService > broadcasts thread upserts to each participant channel
209. [Backend unit tests] FAIL test/realtimeService.test.js > RealtimeService > broadcasts messages to thread and participant inboxes
210. [Backend unit tests] FAIL test/realtimeService.test.js > RealtimeService > broadcasts course presence using live service snapshot
Group 8
211. [Backend unit tests] FAIL test/releaseOrchestrationService.test.js > ReleaseOrchestrationService > schedules release runs with checklist snapshot and emits metrics
212. [Backend unit tests] FAIL test/releaseOrchestrationService.test.js > ReleaseOrchestrationService > evaluates runs, updates auto-evaluated gates, and records readiness
213. [Backend unit tests] FAIL test/savedSearchService.test.js > SavedSearchService > creates a saved search when no duplicate exists
214. [Backend unit tests] FAIL test/savedSearchService.test.js > SavedSearchService > updates a saved search when found
215. [Backend unit tests] FAIL test/savedSearchService.test.js > SavedSearchService > returns usage summary with most recent searches
216. [Backend unit tests] FAIL test/storageService.test.js > StorageService > builds public urls using cdn when configured and falls back to r2 hostname
217. [Backend unit tests] FAIL test/telemetryWarehouseService.test.js > TelemetryWarehouseService > uploads pending events to storage and marks them exported
218. [Backend unit tests] FAIL test/userHttpRoutes.test.js > User HTTP routes > lists users with pagination meta
219. [Backend unit tests] FAIL test/webServer.test.js > startWebServer > starts web server with embedded jobs and realtime when enabled
220. [Backend unit tests] TypeError: server.on is not a function
221. [Backend unit tests] FAIL test/webServer.test.js > startWebServer > marks jobs and realtime as disabled when toggles are off
222. [Backend unit tests] FAIL test/webServer.test.js > startWebServer > cleans up runtime when HTTP server fails to start
223. [Backend unit tests] AssertionError: expected a thrown error to be Error: bind failure
224. [Backend unit tests] - Error {
225. [Backend unit tests] FAIL test/workerService.test.js > startWorkerService > starts worker service and background jobs when enabled
226. [Backend unit tests] FAIL test/bootstrap/bootstrap.test.js > bootstrap helpers > boots infrastructure services and tears them down
227. [Backend unit tests] TypeError: loggerInstance.info is not a function
228. [Backend unit tests] FAIL test/config/storageConfig.test.js > storage configuration > builds an S3 configuration payload with override support
229. [Backend unit tests] Error: S3 client configuration is only available when using the R2 storage driver.
230. [Backend unit tests] 42| throw new Error('S3 client configuration is only available when us…
231. [Backend unit tests] FAIL test/config/storageConfig.test.js > storage configuration > creates a configured S3 client honouring overrides
232. [Backend unit tests] TypeError: Cannot read properties of null (reading 'config')
233. [Backend unit tests] FAIL test/graphql/persistedQueryStore.test.js > InMemoryPersistedQueryStore > stores and retrieves queries until the ttl elapses
234. [Backend unit tests] FAIL test/repositories/LearnerSupportRepository.test.js > LearnerSupportRepository helpers > normalises case and message rows from the database
235. [Backend release tests] ❯ test/releaseOrchestrationService.test.js (2 tests | 2 failed) 27ms
236. [Backend release tests] Test Files 3 failed (3)
237. [Backend release tests] Tests 2 failed | 5 skipped (7)
238. [Backend release tests] ⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯
239. [Backend release tests] FAIL test/releaseHttpRoutes.test.js > Release HTTP routes
240. [Backend release tests] FAIL test/release/releaseReadiness.test.js [ test/release/releaseReadiness.test.js ]
Group 9
241. [Backend release tests] Error: Missing default value
242. [Backend release tests] ❯ new module.exports node_modules/@hapi/hoek/lib/error.js:23:19
243. [Backend release tests] ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
244. [Backend release tests] FAIL test/releaseOrchestrationService.test.js > ReleaseOrchestrationService > schedules release runs with checklist snapshot and emits metrics
245. [Backend release tests] FAIL test/releaseOrchestrationService.test.js > ReleaseOrchestrationService > evaluates runs, updates auto-evaluated gates, and records readiness
246. [Backend release tests] stack: 'Error: connect ECONNREFUSED ::1:3306\n' +
247. [Backend release tests] constructor: 'Function<Error>',
248. [Backend release tests] name: 'Error',
249. [Backend release tests] stack: 'Error: connect ECONNREFUSED 127.0.0.1:3306\n' +
250. [Backend release tests] fatal: true,
251. [Backend release tests] npm error Lifecycle script `test:release` failed with error:
252. [Backend release tests] npm error code 1
253. [Backend release tests] npm error path /workspace/Nodejs-Edulure/backend-nodejs
254. [Backend release tests] npm error workspace edulure-backend@0.1.0
255. [Backend release tests] npm error location /workspace/Nodejs-Edulure/backend-nodejs
256. [Backend release tests] npm error command failed
257. [Backend release tests] npm error command sh -c NODE_ENV=test vitest run test/release --reporter=basic
258. [Database migrations] npm error Lifecycle script `migrate:latest` failed with error:
259. [Database migrations] npm error code 1
260. [Database migrations] npm error path /workspace/Nodejs-Edulure/backend-nodejs
261. [Database migrations] npm error workspace edulure-backend@0.1.0
262. [Database migrations] npm error location /workspace/Nodejs-Edulure/backend-nodejs
263. [Database migrations] npm error command failed
264. [Database migrations] npm error command sh -c knex --knexfile knexfile.cjs migrate:latest
265. [Database seeders] SyntaxError: Identifier 'nowIso' has already been declared
266. [Database seeders] at compileSourceTextModule (node:internal/modules/esm/utils:346:16)
267. [Database seeders] at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:146:18)
268. [Database seeders] at #translate (node:internal/modules/esm/loader:431:12)
269. [Database seeders] at ModuleLoader.loadAndTranslate (node:internal/modules/esm/loader:478:27)
270. [Database seeders] at async ModuleJob._link (node:internal/modules/esm/module_job:110:19)
Group 10
271. [Database seeders] npm error Lifecycle script `seed` failed with error:
272. [Database seeders] npm error code 1
273. [Database seeders] npm error path /workspace/Nodejs-Edulure/backend-nodejs
274. [Database seeders] npm error workspace edulure-backend@0.1.0
275. [Database seeders] npm error location /workspace/Nodejs-Edulure/backend-nodejs
276. [Database seeders] npm error command failed
277. [Database seeders] npm error command sh -c knex --knexfile knexfile.cjs seed:run
278. [Backend runtime configuration (.env)] throw new Error('Environment validation failed. Check .env configuration.');
279. [Backend runtime configuration (.env)] Error: Environment validation failed. Check .env configuration.
280. [Backend runtime configuration (.env)] at file:///workspace/Nodejs-Edulure/backend-nodejs/src/config/env.js:1264:9
281. [Backend runtime configuration (.env)] at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
282. [Backend runtime configuration (.env)] at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
283. [Backend runtime configuration (.env)] at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)
284. [Backend runtime configuration (.env)] npm error Lifecycle script `runtime:config` failed with error:
285. [Backend runtime configuration (.env)] npm error code 1
286. [Backend runtime configuration (.env)] npm error path /workspace/Nodejs-Edulure/backend-nodejs
287. [Backend runtime configuration (.env)] npm error workspace edulure-backend@0.1.0
288. [Backend runtime configuration (.env)] npm error location /workspace/Nodejs-Edulure/backend-nodejs
289. [Backend runtime configuration (.env)] npm error command failed
290. [Backend runtime configuration (.env)] npm error command sh -c node scripts/runtime-config.js --strict --json
291. [Frontend lint] 165:19 error 'current' is defined but never used no-unused-vars
292. [Frontend lint] 244:23 error React Hook "useCallback" is called conditionally. React Hooks must be called in the exact same order in every component render react-hooks/rules-of-hooks
293. [Frontend lint] 315:3 error React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render react-hooks/rules-of-hooks
294. [Frontend lint] 320:27 error React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render react-hooks/rules-of-hooks
295. [Frontend lint] 321:25 error React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render react-hooks/rules-of-hooks
296. [Frontend lint] 323:27 error React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render react-hooks/rules-of-hooks
297. [Frontend lint] 350:27 error React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render react-hooks/rules-of-hooks
298. [Frontend lint] 382:27 error React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render react-hooks/rules-of-hooks
299. [Frontend lint] 25:24 error React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return? react-hooks/rules-of-hooks
300. [Frontend lint] 29:21 error React Hook "useRef" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return? react-hooks/rules-of-hooks
Group 11
301. [Frontend lint] 31:3 error React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return? react-hooks/rules-of-hooks
302. [Frontend lint] 38:3 error React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return? react-hooks/rules-of-hooks
303. [Frontend lint] 90:11 error 'startTime' is assigned a value but never used no-unused-vars
304. [Frontend lint] 500:85 error `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;` react/no-unescaped-entities
305. [Frontend lint] 502:29 error `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;` react/no-unescaped-entities
306. [Frontend lint] 109:41 error 'index' is defined but never used no-unused-vars
307. [Frontend lint] 179:48 error 'index' is defined but never used no-unused-vars
308. [Frontend lint] 189:15 error 'recommendationPreview' is assigned a value but never used no-unused-vars
309. [Frontend lint] npm error Lifecycle script `lint` failed with error:
310. [Frontend lint] npm error code 1
311. [Frontend lint] npm error path /workspace/Nodejs-Edulure/frontend-reactjs
312. [Frontend lint] npm error workspace edulure-frontend@0.1.0
313. [Frontend lint] npm error location /workspace/Nodejs-Edulure/frontend-reactjs
314. [Frontend lint] npm error command failed
315. [Frontend lint] npm error command sh -c eslint "src"
316. [Frontend unit tests] ❯ test/api/group38Apis.test.js (49 tests | 6 failed) 125ms
317. [Frontend unit tests] → expected [Function] to throw an error
318. [Frontend unit tests] ❯ src/pages/admin/sections/__tests__/AdminSections.test.jsx (22 tests | 3 failed) 1405ms
319. [Frontend unit tests] [0mmax Error Rate[0m
320. [Frontend unit tests] ❯ src/components/__tests__/communityComponents.test.jsx (16 tests | 4 failed) 1542ms
321. [Frontend unit tests] ❯ src/pages/dashboard/__tests__/AdminIntegrations.test.jsx (8 tests | 8 failed) 8109ms
322. [Frontend unit tests] ❯ src/pages/dashboard/__tests__/LearnerSettings.test.jsx (6 tests | 5 failed) 4538ms
323. [Frontend unit tests] ❯ test/pages/dashboard/learner/LearnerOverview.test.jsx (3 tests | 1 failed) 122ms
324. [Frontend unit tests] ❯ src/hooks/__tests__/useSupportDashboard.test.jsx (4 tests | 4 failed) 828ms
325. [Frontend unit tests] ❯ src/components/home/__tests__/HomeShowcase.test.jsx (4 tests | 2 failed) 536ms
326. [Frontend unit tests] ❯ src/pages/dashboard/__tests__/LearnerFinancial.test.jsx (6 tests | 1 failed) 1520ms
327. [Frontend unit tests] ❯ test/pages/admin/sections/AdminComplianceSection.test.jsx (6 tests | 3 failed) 777ms
328. [Frontend unit tests] ❯ test/components/group40/Group40CoreComponents.test.jsx (4 tests | 2 failed) 2821ms
329. [Frontend unit tests] ❯ test/pages/catalogue/TutorProfile.test.jsx (4 tests | 2 failed) 1412ms
330. [Frontend unit tests] ❯ src/pages/dashboard/__tests__/DashboardSettings.admin.test.jsx (3 tests | 3 failed) 399ms
Group 12
331. [Frontend unit tests] ❯ src/pages/__tests__/ProfileVerification.test.jsx (2 tests | 2 failed) 78ms
332. [Frontend unit tests] ❯ src/components/__tests__/sharedComponents.test.jsx (13 tests | 2 failed) 366ms
333. [Frontend unit tests] ✓ FormField > surfaces error text and links accessibility attributes 5ms
334. [Frontend unit tests] Warning: Failed prop type: The prop `pendingCount` is marked as required in `AdminApprovalsSection`, but its value is `null`.
335. [Frontend unit tests] at AdminApprovalsSection (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/admin/sections/AdminApprovalsSection.jsx:53:3)
336. [Frontend unit tests] Warning: Failed prop type: The prop `revenueCards[0].value` is marked as required in `AdminRevenueSection`, but its value is `null`.
337. [Frontend unit tests] at AdminRevenueSection (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/admin/sections/AdminRevenueSection.jsx:30:32)
338. [Frontend unit tests] Warning: Failed prop type: The prop `paymentHealthBreakdown[0].label` is marked as required in `AdminRevenueSection`, but its value is `null`.
339. [Frontend unit tests] Warning: Failed prop type: The prop `entries[0].value` is marked as required in `StatList`, but its value is `null`.
340. [Frontend unit tests] at StatList (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/admin/sections/AdminOperationsSection.jsx:18:21)
341. [Frontend unit tests] at AdminOperationsSection (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/admin/sections/AdminOperationsSection.jsx:294:35)
342. [Frontend unit tests] Warning: Failed prop type: Invalid prop `sales.metrics` of type `array` supplied to `SalesInsights`, expected `object`.
343. [Frontend unit tests] at SalesInsights (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/admin/sections/AdminToolsSection.jsx:417:26)
344. [Frontend unit tests] at AdminToolsSection (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/admin/sections/AdminToolsSection.jsx:1367:30)
345. [Frontend unit tests] Error: AggregateError
346. [Frontend unit tests] at Object.dispatchError (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/xhr/xhr-utils.js:63:19)
347. [Frontend unit tests] at EventEmitter.<anonymous> (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/xhr/XMLHttpRequest-impl.js:655:18)
348. [Frontend unit tests] at EventEmitter.emit (node:events:536:35)
349. [Frontend unit tests] at Request.<anonymous> (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/xhr/xhr-utils.js:404:14)
350. [Frontend unit tests] at Request.emit (node:events:524:28)
351. [Frontend unit tests] at ClientRequest.<anonymous> (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/helpers/http-request.js:127:14)
352. [Frontend unit tests] at ClientRequest.emit (node:events:524:28)
353. [Frontend unit tests] at emitErrorEvent (node:_http_client:101:11)
354. [Frontend unit tests] at Socket.socketErrorListener (node:_http_client:504:5)
355. [Frontend unit tests] at Socket.emit (node:events:524:28) undefined
356. [Frontend unit tests] Error: Uncaught [Error: useServiceHealth must be used within a ServiceHealthProvider]
357. [Frontend unit tests] at reportException (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/helpers/runtime-script-errors.js:66:24)
358. [Frontend unit tests] at innerInvokeEventListeners (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:353:9)
359. [Frontend unit tests] at invokeEventListeners (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:286:3)
360. [Frontend unit tests] at HTMLUnknownElementImpl._dispatch (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:233:9)
Group 13
361. [Frontend unit tests] at HTMLUnknownElementImpl.dispatchEvent (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:104:17)
362. [Frontend unit tests] at HTMLUnknownElement.dispatchEvent (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js:241:34)
363. [Frontend unit tests] at Object.invokeGuardedCallbackDev (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:4213:16)
364. [Frontend unit tests] at invokeGuardedCallback (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:4277:31)
365. [Frontend unit tests] at beginWork$1 (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:27490:7)
366. [Frontend unit tests] at performUnitOfWork (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:26599:12) Error: useServiceHealth must be used within a ServiceHealthProvider
367. [Frontend unit tests] at useServiceHealth (/workspace/Nodejs-Edulure/frontend-reactjs/src/context/ServiceHealthContext.jsx:283:11)
368. [Frontend unit tests] at useSupportDashboard (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/useSupportDashboard.js:39:68)
369. [Frontend unit tests] at __vi_import_1__.renderHook.wrapper.wrapper (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/__tests__/useSupportDashboard.test.jsx:100:41)
370. [Frontend unit tests] at TestComponent (/workspace/Nodejs-Edulure/node_modules/@testing-library/react/dist/pure.js:299:27)
371. [Frontend unit tests] at renderWithHooks (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:15486:18)
372. [Frontend unit tests] at mountIndeterminateComponent (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:20103:13)
373. [Frontend unit tests] at beginWork (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:21626:16)
374. [Frontend unit tests] at HTMLUnknownElement.callCallback (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:4164:14)
375. [Frontend unit tests] at HTMLUnknownElement.callTheUserObjectsOperation (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/generated/EventListener.js:26:30)
376. [Frontend unit tests] at innerInvokeEventListeners (/workspace/Nodejs-Edulure/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:350:25)
377. [Frontend unit tests] The above error occurred in the <TestComponent> component:
378. [Frontend unit tests] at TestComponent (/workspace/Nodejs-Edulure/node_modules/@testing-library/react/dist/pure.js:297:5)
379. [Frontend unit tests] at AuthProvider (/workspace/Nodejs-Edulure/frontend-reactjs/src/context/AuthContext.jsx:122:25)
380. [Frontend unit tests] at wrapper (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/__tests__/useSupportDashboard.test.jsx:93:24)
381. [Frontend unit tests] Consider adding an error boundary to your tree to customize error handling behavior.
382. [Frontend unit tests] Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
383. [Frontend unit tests] at __vi_import_1__.renderHook.wrapper.wrapper (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/__tests__/useSupportDashboard.test.jsx:128:41)
384. [Frontend unit tests] at wrapper (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/__tests__/useSupportDashboard.test.jsx:120:24)
385. [Frontend unit tests] at __vi_import_1__.renderHook.wrapper.wrapper (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/__tests__/useSupportDashboard.test.jsx:168:41)
386. [Frontend unit tests] at wrapper (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/__tests__/useSupportDashboard.test.jsx:156:24)
387. [Frontend unit tests] at __vi_import_1__.renderHook.wrapper.wrapper (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/__tests__/useSupportDashboard.test.jsx:206:41)
388. [Frontend unit tests] at wrapper (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/__tests__/useSupportDashboard.test.jsx:192:24)
389. [Frontend unit tests] Error: Uncaught [Error: Rendered more hooks than during the previous render.]
390. [Frontend unit tests] at performUnitOfWork (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:26599:12) Error: Rendered more hooks than during the previous render.
Group 14
391. [Frontend unit tests] at updateWorkInProgressHook (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:15688:13)
392. [Frontend unit tests] at updateMemo (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:16412:14)
393. [Frontend unit tests] at Object.useMemo (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:17067:16)
394. [Frontend unit tests] at useMemo (/workspace/Nodejs-Edulure/node_modules/react/cjs/react.development.js:1650:21)
395. [Frontend unit tests] at LearnerFinancial (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/dashboard/LearnerFinancial.jsx:108:28)
396. [Frontend unit tests] at updateFunctionComponent (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:19617:20)
397. [Frontend unit tests] at beginWork (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:21640:16)
398. [Frontend unit tests] The above error occurred in the <LearnerFinancial> component:
399. [Frontend unit tests] at LearnerFinancial (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/dashboard/LearnerFinancial.jsx:18:79)
400. [Frontend unit tests] Error: Uncaught [TypeError: Cannot destructure property 'session' of '(0 , __vite_ssr_import_2__.useAuth)(...)' as it is undefined.]
401. [Frontend unit tests] at performUnitOfWork (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:26599:12) TypeError: Cannot destructure property 'session' of '(0 , __vite_ssr_import_2__.useAuth)(...)' as it is undefined.
402. [Frontend unit tests] at useGlobalSearchSuggestions (/workspace/Nodejs-Edulure/frontend-reactjs/src/hooks/useGlobalSearchSuggestions.js:7:11)
403. [Frontend unit tests] at GlobalSearchBar (/workspace/Nodejs-Edulure/frontend-reactjs/src/components/search/GlobalSearchBar.jsx:119:7)
404. [Frontend unit tests] The above error occurred in the <GlobalSearchBar> component:
405. [Frontend unit tests] at GlobalSearchBar (/workspace/Nodejs-Edulure/frontend-reactjs/src/components/search/GlobalSearchBar.jsx:130:3)
406. [Frontend unit tests] at div
407. [Frontend unit tests] at TopBar (/workspace/Nodejs-Edulure/frontend-reactjs/src/components/TopBar.jsx:88:3)
408. [Frontend unit tests] at LanguageProvider (/workspace/Nodejs-Edulure/frontend-reactjs/src/context/LanguageContext.jsx:2647:29)
409. [Frontend unit tests] Error: Uncaught [Error: useTheme must be used within a ThemeProvider]
410. [Frontend unit tests] at performUnitOfWork (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:26599:12) Error: useTheme must be used within a ThemeProvider
411. [Frontend unit tests] at useTheme (/workspace/Nodejs-Edulure/frontend-reactjs/src/providers/ThemeProvider.jsx:202:11)
412. [Frontend unit tests] at AppearanceSection (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/dashboard/DashboardSettings.jsx:472:93)
413. [Frontend unit tests] The above error occurred in the <AppearanceSection> component:
414. [Frontend unit tests] at AppearanceSection (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/dashboard/DashboardSettings.jsx:511:30)
415. [Frontend unit tests] at SettingsLayout (/workspace/Nodejs-Edulure/frontend-reactjs/src/components/settings/SettingsLayout.jsx:18:3)
416. [Frontend unit tests] at DashboardSettings (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/dashboard/DashboardSettings.jsx:2764:22)
417. [Frontend unit tests] Error: Uncaught [ReferenceError: Cannot access 'billingOverview' before initialization]
418. [Frontend unit tests] at performUnitOfWork (/workspace/Nodejs-Edulure/node_modules/react-dom/cjs/react-dom.development.js:26599:12) ReferenceError: Cannot access 'billingOverview' before initialization
419. [Frontend unit tests] at Profile (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/Profile.jsx:699:6)
420. [Frontend unit tests] The above error occurred in the <Profile> component:
Group 15
421. [Frontend unit tests] at Profile (/workspace/Nodejs-Edulure/frontend-reactjs/src/pages/Profile.jsx:576:67)
422. [Frontend unit tests] Warning: Failed prop type: Invalid prop `activeState` of value `unknown` supplied to `SkewedMenu`, expected one of ["all","community"].
423. [Frontend unit tests] at SkewedMenu (/workspace/Nodejs-Edulure/frontend-reactjs/src/components/SkewedMenu.jsx:12:23)