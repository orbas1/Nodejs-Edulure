# Version 1.50 – Update Index (in-progress additions)

## Mobile Capability Manifest Enablement
- Code: `Edulure-Flutter/lib/bootstrap/app_bootstrap.dart`, `lib/core/runtime/*`, `lib/widgets/capability_status_banner.dart`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `user_phone_app_updates/*`, `Design_*` files updated for parity messaging

## Provider Capability & RBAC Foundations
- Code: `Edulure-Flutter/lib/core/security/*`, `lib/provider/bootstrap/provider_app_bootstrap.dart`, `lib/provider/runtime/provider_capability_bridge.dart`
- Documentation: `provider_phone_app_updates/*`, `change_log.md`, `Design_*` progress trackers, `update_task_list.md`

## Provider Compliance & Retention Blueprint
- Code: `Edulure-Flutter/lib/provider/runtime/provider_compliance_contracts.dart`
- Documentation: `provider_phone_app_updates/governance_retention_contracts.md`, `provider_app_change_log.md`, `Design_*` artefacts updated for retention flows, `update_task_list.md`, `update_progress_tracker.md`

## Compliance Audit & Consent Ledger Hardening
- Code: `backend-nodejs/migrations/20250204100000_compliance_audit_consent_incidents.js`
- Documentation: `update_task_list.md`, `change_log.md`, `update_progress_tracker.md`, `Design_*` artefacts covering compliance dashboards

## Sensitive Data Encryption & Analytics Indexing
- Code: `backend-nodejs/src/services/DataEncryptionService.js`, `src/models/PaymentIntentModel.js`, `src/models/CommunityAffiliatePayoutModel.js`, `migrations/20250211104500_secure_kyc_financial_payloads.js`
- Documentation: `update_task_list.md`, `change_log.md`, `update_progress_tracker.md`, `backend-nodejs/seeds/001_bootstrap.js`

## Partition Governance & Archival Automation
- Code: `backend-nodejs/src/services/DataPartitionService.js`, `src/jobs/dataPartitionJob.js`, `src/servers/workerService.js`, `migrations/20250212121500_partition_archiving.js`, `scripts/manage-data-partitions.js`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `change_log.md`, `backend_updates/env_updates.md`, `backend_updates/services_changes.md`

## Privacy & Trust Experience Enhancements
- Documentation: `ui-ux_updates/user_app_wireframe_changes.md`, `ui-ux_updates/user_application_logic_flow_changes.md`, `ui-ux_updates/web_app_wireframe_changes.md`, `ui-ux_updates/web_application_logic_flow_changes.md`, `Design_update_progress_tracker.md`, `Design_update_task_list.md`, `Design_update_milestone_list.md`, `Design_Change_log.md`

## Versioned OpenAPI Catalogue & Contract Testing
- Code: `backend-nodejs/src/docs/builders/openapiBuilder.js`, `src/docs/serviceSpecRegistry.js`, `src/app.js`, `src/routes/routeMetadata.js`, `test/openApiContracts.test.js`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `change_log.md`, `Design_*` documentation describing API visibility

## Creation Studio Domain Bootstrap
- Code: `backend-nodejs/migrations/20250213143000_creation_studio.js`, `backend-nodejs/migrations/20250219124500_extend_creation_catalog.js`, `src/models/CreationProjectModel.js`, `src/models/CreationProjectCollaboratorModel.js`, `src/models/CreationTemplateModel.js`, `src/models/CreationCollaborationSessionModel.js`, `src/services/CreationStudioService.js`, `src/controllers/CreationStudioController.js`, `src/routes/creation.routes.js`, `src/routes/routeMetadata.js`, `src/routes/routeRegistry.js`, `test/creationStudioService.test.js`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `backend_updates/services_changes.md`, `backend_updates/routes_updates.md`, `backend_updates/controllers_changes.md`, `backend_updates/backend_change_log.md`, `backend_updates/api_changes.md`, `backend_updates/module_changes.md`, `backend_updates/backend_new_files.md`, `change_log.md`, `Design_*` artefacts for creation studio readiness, `Design_Change_log.md`

## Creation Studio Experience Hub
- Code: `frontend-reactjs/src/pages/dashboard/InstructorCreationStudio.jsx`, `src/api/creationStudioApi.js`, `src/pages/dashboard/instructor/creationStudio/*`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `change_log.md`, `frontend_updates/pages_updates.md`, `frontend_updates/change_log.md`, `Design_*` artefacts for creation studio flows, `ui-ux_updates/web_app_*`, `Design_update_progress_tracker.md`

## Mobile Creation Companion
- Code: `Edulure-Flutter/lib/services/mobile_creation_studio_service.dart`, `lib/screens/mobile_creation_companion_screen.dart`, `lib/screens/service_suite_screen.dart`, `lib/screens/home_screen.dart`
- Documentation: `user_phone_app_updates/app_screen_updates.md`, `user_phone_app_updates/app_widget_updates.md`, `user_phone_app_updates/user_app_change_log.md`, `Design_Change_log.md`, `Design_update_progress_tracker.md`, `Design_update_task_list.md`, `ui-ux_updates/user_app_wireframe_changes.md`, `ui-ux_updates/user_application_logic_flow_changes.md`

## Creation Analytics Intelligence
- Code: `backend-nodejs/src/services/CreationAnalyticsService.js`, `src/controllers/CreationStudioController.js`, `src/routes/creation.routes.js`, `frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationAnalyticsDashboard.jsx`, `frontend-reactjs/src/api/creationStudioApi.js`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `backend_updates/services_changes.md`, `backend_updates/controllers_changes.md`, `backend_updates/routes_updates.md`, `backend_updates/backend_change_log.md`, `backend_updates/backend_new_files.md`, `backend_updates/api_changes.md`, `frontend_updates/pages_updates.md`, `frontend_updates/change_log.md`, `Design_Change_log.md`, `Design_Plan.md`, `Design_update_*` trackers, `ui-ux_updates/web_app_wireframe_changes.md`

## Community Moderation & Safety Pipeline
- Code: `backend-nodejs/migrations/20250215120000_community_moderation_pipeline.js`, `src/models/CommunityPostModerationCaseModel.js`, `src/models/CommunityPostModerationActionModel.js`, `src/models/ScamReportModel.js`, `src/models/ModerationAnalyticsEventModel.js`, `src/services/CommunityModerationService.js`, `src/controllers/CommunityModerationController.js`, `src/routes/communityModeration.routes.js`, `src/routes/routeMetadata.js`, `src/routes/routeRegistry.js`, `test/communityModerationService.test.js`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `backend_updates/services_changes.md`, `backend_updates/routes_updates.md`, `backend_updates/controllers_changes.md`, `backend_updates/api_changes.md`, `backend_updates/api_integration_changes.md`, `backend_updates/backend_change_log.md`, `backend_updates/backend_new_files.md`, `backend_updates/events_changes.md`, `backend_updates/module_changes.md`, `change_log.md`, `Design_*` artefacts referencing moderation dashboards


## Mobile Ads Governance Console
- Code: `Edulure-Flutter/lib/services/mobile_ads_governance_service.dart`, `lib/screens/mobile_ads_governance_screen.dart`, `lib/screens/service_suite_screen.dart`, `lib/screens/home_screen.dart`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `user_phone_app_updates/app_screen_updates.md`, `user_phone_app_updates/app_backend_changes.md`, `user_phone_app_updates/app_widget_updates.md`, `user_phone_app_updates/user_app_change_log.md`, `ui-ux_updates/user_app_wireframe_changes.md`, `ui-ux_updates/user_application_logic_flow_changes.md`, `Design_Change_log.md`, `Design_update_progress_tracker.md`

## Provider Ads & Creation Oversight Roadmap
- Documentation: `provider_phone_app_updates/ads_creation_oversight_roadmap.md`, `provider_phone_app_updates/provider_app_change_log.md`, `update_task_list.md`, `update_progress_tracker.md`, `Design_Plan.md`, `Design_update_*` trackers
