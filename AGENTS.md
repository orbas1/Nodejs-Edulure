### Backend Failures and Breakages (Grouped by 20)

#### Group 1 (Items 1-20)
1. ✅ `backend-nodejs/test/adminSettingsHttpRoutes.test.js` – vi.mock hoisting error caused by `PlatformSettingsService`.
2. ✅ `backend-nodejs/test/adsHttpRoutes.test.js` – `deepMerge` identifier redeclared.
3. ✅ `backend-nodejs/test/analyticsBiHttpRoutes.test.js` – suite flagged failed without an emitted message.
4. ✅ `backend-nodejs/test/auditEventService.test.js` – IP enrichment assertion mismatch.
5. ✅ `backend-nodejs/test/capabilityManifestService.test.js` – `deepMerge` identifier redeclared.
6. ✅ `backend-nodejs/test/chatHttpRoutes.test.js` – `deepMerge` identifier redeclared.
7. ✅ `backend-nodejs/test/communityAffiliateModel.test.js` – affiliate update expects uppercase code.
8. ✅ `backend-nodejs/test/communityProgrammingController.test.js` – webinar creation payload mismatch.
9. ✅ `backend-nodejs/test/complianceHttpRoutes.test.js` – `deepMerge` identifier redeclared.
10. ✅ `backend-nodejs/test/courseLiveService.test.js` – presence heartbeat timestamp did not change.
11. ✅ `backend-nodejs/test/dashboardHttpRoutes.test.js` – `deepMerge` identifier redeclared.
12. ✅ `backend-nodejs/test/dashboardService.test.js` – `adsSection` identifier redeclared.
13. ✅ `backend-nodejs/test/enablementHttpRoutes.test.js` – suite failed without message.
14. ✅ `backend-nodejs/test/environmentParityService.test.js` – healthy report still marked “drifted”.
15. ✅ `backend-nodejs/test/feedHttpRoutes.test.js` – `deepMerge` identifier redeclared.
16. ✅ `backend-nodejs/test/governanceHttpRoutes.test.js` – suite failed without message.
17. ✅ `backend-nodejs/test/graphqlFeedRoutes.test.js` – `deepMerge` identifier redeclared.
18. ✅ `backend-nodejs/test/group14Controllers.test.js` – undefined observability SLO configuration.
19. ✅ `backend-nodejs/test/integrationApiKeyInviteService.test.js` – database URL expected but missing.
20. ✅ `backend-nodejs/test/integrationOrchestratorService.test.js` – HubSpot sync hits MySQL connection refusals.

#### Group 2 (Items 21-40)
21. ✅ `backend-nodejs/test/learnerDashboardHttpRoutes.test.js` – suite failed without message.
22. ✅ `backend-nodejs/test/mediaUploadHttpRoutes.test.js` – traversal validation not triggered.
23. ✅ `backend-nodejs/test/observabilityContracts.test.js` – suite failed without message.
24. ✅ `backend-nodejs/test/observabilityHttpRoutes.test.js` – suite failed without message.
25. ✅ `backend-nodejs/test/openApiContracts.test.js` – suite failed without message.
26. ✅ `backend-nodejs/test/paymentsWebhookHttpRoutes.test.js` – `deepMerge` identifier redeclared.
27. ✅ `backend-nodejs/test/platformSettingsAdminSettings.test.js` – `deepMerge` identifier redeclared.
28. ✅ `backend-nodejs/test/platformSettingsService.test.js` – `deepMerge` identifier redeclared.
29. ✅ `backend-nodejs/test/providerTransitionHttpRoutes.test.js` – `deepMerge` identifier redeclared.
30. ✅ `backend-nodejs/test/providerTransitionService.test.js` – vi.mock hoisting error around `PlatformSettingsService`.
31. ✅ `backend-nodejs/test/releaseHttpRoutes.test.js` – suite failed without message.
32. ✅ `backend-nodejs/test/socialGraphHttpRoutes.test.js` – `deepMerge` identifier redeclared.
33. ✅ `backend-nodejs/test/telemetryHttpRoutes.test.js` – suite failed without message.
34. ✅ `backend-nodejs/test/userHttpRoutes.test.js` – pagination meta assertion mismatch.
35. ✅ `backend-nodejs/test/userService.test.js` – missing `bcrypt` dependency.
36. ✅ `backend-nodejs/test/release/releaseReadiness.test.js` – `deepMerge` identifier redeclared.
37. ✅ `backend-nodejs/test/routes/routeMetadata.test.js` – `deepMerge` identifier redeclared.
38. ✅ `backend-nodejs/scripts/generate-erd.js:4:1` – duplicate `node:fs` import.
39. ✅ `backend-nodejs/scripts/runtime-config.js:342:12` – unused `error` catch variable.
40. ✅ `backend-nodejs/scripts/wait-for-db.js:391:12` – unused `error` catch variable.

#### Group 3 (Items 41-60)
41. ✓ `backend-nodejs/scripts/wait-for-db.js:590:46` – unused `env` argument.
42. ✓ `backend-nodejs/seeds/001_bootstrap.js:3338:11` – undefined `trx`.
43. ✓ `backend-nodejs/seeds/001_bootstrap.js:3340:18` – undefined `adminId`.
44. ✓ `backend-nodejs/seeds/001_bootstrap.js:3346:22` – undefined `trx`.
45. ✓ `backend-nodejs/seeds/001_bootstrap.js:3347:23` – undefined `trx`.
46. ✓ `backend-nodejs/seeds/001_bootstrap.js:3352:18` – undefined `instructorId`.
47. ✓ `backend-nodejs/seeds/001_bootstrap.js:3358:22` – undefined `trx`.
48. ✓ `backend-nodejs/seeds/001_bootstrap.js:3359:23` – undefined `trx`.
49. ✓ `backend-nodejs/seeds/001_bootstrap.js:3364:18` – undefined `learnerId`.
50. ✓ `backend-nodejs/seeds/001_bootstrap.js:3370:22` – undefined `trx`.
51. ✓ `backend-nodejs/seeds/001_bootstrap.js:3371:23` – undefined `trx`.
52. ✓ `backend-nodejs/seeds/001_bootstrap.js:3377:11` – undefined `trx`.
53. ✓ `backend-nodejs/seeds/001_bootstrap.js:3382:24` – undefined `trx`.
54. ✓ `backend-nodejs/seeds/001_bootstrap.js:3390:24` – undefined `trx`.
55. ✓ `backend-nodejs/seeds/001_bootstrap.js:3441:11` – undefined `trx`.
56. ✓ `backend-nodejs/seeds/001_bootstrap.js:3456:36` – undefined `trx`.
57. ✓ `backend-nodejs/seeds/001_bootstrap.js:3457:35` – undefined `trx`.
58. ✓ `backend-nodejs/seeds/001_bootstrap.js:3473:36` – undefined `trx`.
59. ✓ `backend-nodejs/seeds/001_bootstrap.js:3474:35` – undefined `trx`.
60. ✓ `backend-nodejs/seeds/001_bootstrap.js:3490:36` – undefined `trx`.

#### Group 4 (Items 61-80)
61. ✅ `backend-nodejs/seeds/001_bootstrap.js:3491:35` – undefined `trx`.
62. ✅ `backend-nodejs/seeds/001_bootstrap.js:3495:39` – undefined `trx`.
63. ✅ `backend-nodejs/seeds/001_bootstrap.js:3499:31` – undefined `trx`.
64. ✅ `backend-nodejs/seeds/001_bootstrap.js:3504:11` – undefined `trx`.
65. ✅ `backend-nodejs/seeds/001_bootstrap.js:3565:11` – undefined `trx`.
66. ✅ `backend-nodejs/seeds/001_bootstrap.js:3610:11` – undefined `trx`.
67. ✅ `backend-nodejs/seeds/001_bootstrap.js:3717:11` – undefined `trx`.
68. ✅ `backend-nodejs/seeds/001_bootstrap.js:3753:11` – undefined `trx`.
69. ✅ `backend-nodejs/seeds/001_bootstrap.js:3760:21` – undefined `trx`.
70. ✅ `backend-nodejs/seeds/001_bootstrap.js:3761:19` – undefined `trx`.
71. ✅ `backend-nodejs/seeds/001_bootstrap.js:3770:30` – undefined `trx`.
72. ✅ `backend-nodejs/seeds/001_bootstrap.js:3775:40` – undefined `trx`.
73. ✅ `backend-nodejs/seeds/001_bootstrap.js:3781:11` – undefined `trx`.
74. ✅ `backend-nodejs/seeds/001_bootstrap.js:3792:28` – undefined `trx`.
75. ✅ `backend-nodejs/seeds/001_bootstrap.js:3804:28` – undefined `trx`.
76. ✅ `backend-nodejs/seeds/001_bootstrap.js:3816:28` – undefined `trx`.
77. ✅ `backend-nodejs/seeds/001_bootstrap.js:3840:28` – undefined `trx`.
78. ✅ `backend-nodejs/seeds/001_bootstrap.js:3844:11` – undefined `trx`.
79. ✅ `backend-nodejs/seeds/001_bootstrap.js:3848:19` – undefined `trx`.
80. ✅ `backend-nodejs/seeds/001_bootstrap.js:3849:21` – undefined `trx`.

#### Group 5 (Items 81-100)
81. ✅ `backend-nodejs/src/controllers/AdminSettingsController.js:3:37` – `PlatformSettingsService` parse error.
82. ✅ `backend-nodejs/src/controllers/AdminSettingsController.js:3:37` – default import parse error.
83. ✅ `backend-nodejs/src/controllers/DashboardController.js:1:30` – `DashboardService` parse error.
84. ✅ `backend-nodejs/src/controllers/DashboardController.js:1:30` – default import parse error.
85. ✅ `backend-nodejs/src/controllers/LearnerDashboardController.js:228:49` – unnecessary escape sequence.
86. ✅ `backend-nodejs/src/controllers/SecurityOperationsController.js:191:7` – undefined `BOOLEAN_TRUE_VALUES`.
87. ✅ `backend-nodejs/src/controllers/SecurityOperationsController.js:194:7` – undefined `BOOLEAN_FALSE_VALUES`.
88. ✅ `backend-nodejs/src/controllers/SecurityOperationsController.js:247:20` – undefined `RISK_SORT_FIELDS`.
89. ✅ `backend-nodejs/src/controllers/TelemetryController.js:1:8` – unused `Joi`.
90. ✅ `backend-nodejs/src/controllers/TelemetryController.js:146:32` – undefined `freshnessQuerySchema`.
91. ✅ `backend-nodejs/src/docs/builders/openapiBuilder.js:153:9` – unused `normalisedFilters`.
92. ✅ `backend-nodejs/src/docs/serviceSpecRegistry.js:8:7` – unused `INDEX_FILE_PATH`.
93. ✅ `backend-nodejs/src/docs/serviceSpecRegistry.js:82:7` – unused `SPEC_INDEX_SCHEMA`.
94. ✅ `backend-nodejs/src/models/CommunityAffiliateModel.js:13:17` – unnecessary escape.
95. ✅ `backend-nodejs/src/models/CommunityAffiliateModel.js:97:10` – unused `buildUpdatePayload`.
96. ✅ `backend-nodejs/src/models/CommunityDonationModel.js:63:17` – unnecessary escape.
97. ✅ `backend-nodejs/src/models/CommunityMemberModel.js:4:3` – unused `normaliseOptionalString`.
98. ✅ `backend-nodejs/src/models/CommunityMemberModel.js:264:22` – unused `error` catch variable.
99. ✅ `backend-nodejs/src/routes/routeMetadata.js:98:69` – unnecessary escape.
100. ✅ `backend-nodejs/src/routes/routeMetadata.js:98:78` – unnecessary escape.

#### Group 6 (Items 101-120)
101. `backend-nodejs/src/routes/routeMetadata.js:98:84` – unnecessary escape.
102. `backend-nodejs/src/routes/routeMetadata.js:98:94` – unnecessary escape.
103. `backend-nodejs/src/routes/routeMetadata.js:162:30` – unused `name` parameter.
104. `backend-nodejs/src/services/CommunityAffiliateCommissionService.js:5:37` – `PlatformSettingsService` parse error.
105. `backend-nodejs/src/services/CommunityAffiliateCommissionService.js:5:37` – default import parse error.
106. `backend-nodejs/src/services/DashboardService.js:1339:9` – `adsSection` redeclared.
107. `backend-nodejs/src/services/DataEncryptionService.js:93:31` – unnecessary escape.
108. `backend-nodejs/src/services/DataEncryptionService.js:93:33` – unnecessary escape.
109. `backend-nodejs/src/services/DataEncryptionService.js:93:50` – unnecessary escape.
110. `backend-nodejs/src/services/DataEncryptionService.js:93:52` – unnecessary escape.
111. `backend-nodejs/src/services/EbookService.js:8:32` – `DashboardService` parse error.
112. `backend-nodejs/src/services/EnablementContentService.js:15:17` – missing default export from `markedModule`.
113. `backend-nodejs/src/services/OperatorDashboardService.js:18:8` – `PlatformSettingsService` parse error.
114. `backend-nodejs/src/services/OperatorDashboardService.js:18:8` – default import parse error.
115. `backend-nodejs/src/services/PaymentService.js:21:37` – `PlatformSettingsService` parse error.
116. `backend-nodejs/src/services/PaymentService.js:21:37` – default import parse error.
117. `backend-nodejs/src/services/PaymentService.js:1113:13` – unused `financeConnection`.
118. `backend-nodejs/src/services/PlatformSettingsService.js:1324:10` – `deepMerge` redeclared.
119. `backend-nodejs/src/services/UserService.js:1:20` – missing `bcrypt`.
120. `backend-nodejs/src/services/UserService.js:408:13` – unused `before`.

#### Group 7 (Items 121-128)
121. ✅ `backend-nodejs/src/utils/geo.js:551:9` – unused `centerLng`.
122. ✅ `backend-nodejs/test/dashboardService.test.js:11:8` – `DashboardService` parse error.
123. ✅ `backend-nodejs/test/dashboardService.test.js:13:67` – `PlatformSettingsService` parse error.
124. ✅ `backend-nodejs/test/group14Controllers.test.js:321:8` – unused `IdentityVerificationController`.
125. ✅ `backend-nodejs/test/openapiBuilder.test.js:2:1` – duplicate `fs` import.
126. ✅ `backend-nodejs/test/platformSettingsAdminSettings.test.js:9:8` – `PlatformSettingsService` parse error.
127. ✅ `backend-nodejs/test/platformSettingsService.test.js:3:67` – `PlatformSettingsService` parse error.
128. ✅ `npm ls` validation – `ipaddr.js@1.9.1` installed but `package.json` requires `^2.2.0`.
