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


## CRM Integration Orchestrator
- Code: `backend-nodejs/src/services/IntegrationOrchestratorService.js`, `src/integrations/HubSpotClient.js`, `src/integrations/SalesforceClient.js`, `src/models/IntegrationSyncRunModel.js`, `migrations/20250220103000_crm_integration_infrastructure.js`.【F:backend-nodejs/src/services/IntegrationOrchestratorService.js†L1-L476】【F:backend-nodejs/src/integrations/HubSpotClient.js†L1-L198】【F:backend-nodejs/src/integrations/SalesforceClient.js†L1-L214】【F:backend-nodejs/src/models/IntegrationSyncRunModel.js†L1-L173】【F:backend-nodejs/migrations/20250220103000_crm_integration_infrastructure.js†L1-L78】
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `backend_updates/services_changes.md`, `backend_updates/env_updates.md`, `backend_updates/module_changes.md`, `backend_updates/backend_change_log.md`, `backend_updates/backend_new_files.md`, `backend_updates/api_integration_changes.md`, `change_log.md`, `Design_Change_log.md`, `Design_Plan.md`, `Design_update_progress_tracker.md`.

## Webhook Event Bus
- Code: `backend-nodejs/migrations/20250225120000_webhook_event_bus.js`, `src/models/IntegrationWebhookSubscriptionModel.js`, `src/models/IntegrationWebhookEventModel.js`, `src/models/IntegrationWebhookDeliveryModel.js`, `src/services/WebhookEventBusService.js`, `src/services/PaymentService.js`, `src/servers/workerService.js`.【F:backend-nodejs/migrations/20250225120000_webhook_event_bus.js†L1-L98】【F:backend-nodejs/src/models/IntegrationWebhookSubscriptionModel.js†L1-L124】【F:backend-nodejs/src/models/IntegrationWebhookEventModel.js†L1-L92】【F:backend-nodejs/src/models/IntegrationWebhookDeliveryModel.js†L1-L206】【F:backend-nodejs/src/services/WebhookEventBusService.js†L1-L372】【F:backend-nodejs/src/services/PaymentService.js†L80-L1197】【F:backend-nodejs/src/servers/workerService.js†L49-L146】
- Documentation: `backend_updates/events_changes.md`, `backend_updates/webhooks_changes.md`, `backend_updates/config_changes.md`, `backend_updates/env_updates.md`, `backend_updates/services_changes.md`, `backend_updates/backend_change_log.md`, `change_log.md`, `update_progress_tracker.md`, `update_task_list.md`.

## Integration Control Centre
- Code: `backend-nodejs/src/services/IntegrationDashboardService.js`, `src/controllers/AdminIntegrationsController.js`, `src/routes/admin.routes.js`, `frontend-reactjs/src/api/integrationAdminApi.js`, `frontend-reactjs/src/pages/dashboard/AdminIntegrations.jsx`, `frontend-reactjs/src/pages/dashboard/__tests__/AdminIntegrations.test.jsx`.【F:backend-nodejs/src/services/IntegrationDashboardService.js†L1-L214】【F:backend-nodejs/src/controllers/AdminIntegrationsController.js†L1-L45】【F:backend-nodejs/src/routes/admin.routes.js†L1-L23】【F:frontend-reactjs/src/api/integrationAdminApi.js†L1-L36】【F:frontend-reactjs/src/pages/dashboard/AdminIntegrations.jsx†L1-L356】【F:frontend-reactjs/src/pages/dashboard/__tests__/AdminIntegrations.test.jsx†L1-L157】
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `backend_updates/api_changes.md`, `backend_updates/controllers_changes.md`, `backend_updates/routes_updates.md`, `backend_updates/services_changes.md`, `backend_updates/backend_change_log.md`, `frontend_updates/admin_dashboard_changes.md`, `frontend_updates/change_log.md`, `Design_Change_log.md`, `Design_Plan.md`, `Design_update_progress_tracker.md`, `Design_update_task_list.md`.

## BYO Integration API Keys
- Code: `backend-nodejs/migrations/20250225133000_integration_api_keys.js`, `backend-nodejs/src/models/IntegrationApiKeyModel.js`, `backend-nodejs/src/services/IntegrationApiKeyService.js`, `backend-nodejs/src/controllers/AdminIntegrationsController.js`, `backend-nodejs/src/routes/admin.routes.js`, `backend-nodejs/test/integrationApiKeyService.test.js`, `frontend-reactjs/src/api/integrationAdminApi.js`, `frontend-reactjs/src/pages/dashboard/AdminIntegrations.jsx`, `frontend-reactjs/src/pages/dashboard/__tests__/AdminIntegrations.test.jsx`.【F:backend-nodejs/migrations/20250225133000_integration_api_keys.js†L1-L35】【F:backend-nodejs/src/models/IntegrationApiKeyModel.js†L1-L140】【F:backend-nodejs/src/services/IntegrationApiKeyService.js†L1-L316】【F:backend-nodejs/src/controllers/AdminIntegrationsController.js†L47-L129】【F:backend-nodejs/src/routes/admin.routes.js†L23-L47】【F:backend-nodejs/test/integrationApiKeyService.test.js†L1-L209】【F:frontend-reactjs/src/api/integrationAdminApi.js†L1-L143】【F:frontend-reactjs/src/pages/dashboard/AdminIntegrations.jsx†L358-L620】【F:frontend-reactjs/src/pages/dashboard/__tests__/AdminIntegrations.test.jsx†L158-L320】
- Documentation: `backend_updates/backend_change_log.md`, `backend_updates/services_changes.md`, `backend_updates/controllers_changes.md`, `backend_updates/routes_updates.md`, `backend_updates/api_changes.md`, `backend_updates/backend_new_files.md`, `frontend_updates/admin_dashboard_changes.md`, `frontend_updates/pages_updates.md`, `frontend_updates/change_log.md`, `Design_Change_log.md`, `Design_Plan.md`, `Design_update_task_list.md`, `Design_update_milestone_list.md`, `Design_update_progress_tracker.md`, `update_task_list.md`, `update_progress_tracker.md`, `update_tests/backend_test_results.md`, `update_tests/front_end_test_results.md`.

## Delegated Credential Invite Workflow
- Code: `backend-nodejs/migrations/20250226100000_integration_api_key_invites.js`, `backend-nodejs/src/models/IntegrationApiKeyInviteModel.js`, `backend-nodejs/src/services/IntegrationApiKeyInviteService.js`, `backend-nodejs/src/controllers/AdminIntegrationsController.js`, `backend-nodejs/src/controllers/IntegrationKeyInviteController.js`, `backend-nodejs/src/routes/admin.routes.js`, `backend-nodejs/src/routes/integrationInvite.routes.js`, `backend-nodejs/test/integrationApiKeyInviteService.test.js`, `frontend-reactjs/src/api/integrationAdminApi.js`, `frontend-reactjs/src/api/integrationInviteApi.js`, `frontend-reactjs/src/pages/dashboard/AdminIntegrations.jsx`, `frontend-reactjs/src/pages/dashboard/__tests__/AdminIntegrations.test.jsx`, `frontend-reactjs/src/pages/IntegrationCredentialInvite.jsx`, `frontend-reactjs/src/pages/__tests__/IntegrationCredentialInvite.test.jsx`, `frontend-reactjs/src/App.jsx`.【F:backend-nodejs/migrations/20250226100000_integration_api_key_invites.js†L1-L122】【F:backend-nodejs/src/models/IntegrationApiKeyInviteModel.js†L1-L151】【F:backend-nodejs/src/services/IntegrationApiKeyInviteService.js†L1-L356】【F:backend-nodejs/src/controllers/AdminIntegrationsController.js†L114-L219】【F:backend-nodejs/src/controllers/IntegrationKeyInviteController.js†L1-L63】【F:backend-nodejs/src/routes/admin.routes.js†L47-L72】【F:backend-nodejs/src/routes/integrationInvite.routes.js†L1-L9】【F:backend-nodejs/test/integrationApiKeyInviteService.test.js†L1-L252】【F:frontend-reactjs/src/api/integrationAdminApi.js†L96-L198】【F:frontend-reactjs/src/api/integrationInviteApi.js†L1-L48】【F:frontend-reactjs/src/pages/dashboard/AdminIntegrations.jsx†L894-L1510】【F:frontend-reactjs/src/pages/dashboard/__tests__/AdminIntegrations.test.jsx†L1-L226】【F:frontend-reactjs/src/pages/IntegrationCredentialInvite.jsx†L1-L210】【F:frontend-reactjs/src/pages/__tests__/IntegrationCredentialInvite.test.jsx†L1-L128】【F:frontend-reactjs/src/App.jsx†L1-L120】
- Documentation: `backend_updates/backend_change_log.md`, `backend_updates/services_changes.md`, `backend_updates/controllers_changes.md`, `backend_updates/routes_updates.md`, `backend_updates/api_changes.md`, `backend_updates/backend_new_files.md`, `backend_updates/env_updates.md`, `config_changes.md`, `frontend_updates/admin_dashboard_changes.md`, `frontend_updates/pages_updates.md`, `frontend_updates/change_log.md`, `update_task_list.md`, `update_progress_tracker.md`, `Design_Change_log.md`, `Design_Plan.md`, `Design_update_task_list.md`, `Design_update_milestone_list.md`, `Design_update_progress_tracker.md`, `update_tests/backend_test_results.md`, `update_tests/front_end_test_results.md`.

## Creation Studio Experience Hub
- Code: `frontend-reactjs/src/pages/dashboard/InstructorCreationStudio.jsx`, `src/api/creationStudioApi.js`, `src/pages/dashboard/instructor/creationStudio/*`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `change_log.md`, `frontend_updates/pages_updates.md`, `frontend_updates/change_log.md`, `Design_*` artefacts for creation studio flows, `ui-ux_updates/web_app_*`, `Design_update_progress_tracker.md`

## Mobile Creation Companion
- Code: `Edulure-Flutter/lib/services/mobile_creation_studio_service.dart`, `lib/screens/mobile_creation_companion_screen.dart`, `lib/screens/service_suite_screen.dart`, `lib/screens/home_screen.dart`
- Documentation: `user_phone_app_updates/app_screen_updates.md`, `user_phone_app_updates/app_widget_updates.md`, `user_phone_app_updates/user_app_change_log.md`, `Design_Change_log.md`, `Design_update_progress_tracker.md`, `Design_update_task_list.md`, `ui-ux_updates/user_app_wireframe_changes.md`, `ui-ux_updates/user_application_logic_flow_changes.md`

## Creation Analytics Intelligence
- Code: `backend-nodejs/src/services/CreationAnalyticsService.js`, `src/controllers/CreationStudioController.js`, `src/routes/creation.routes.js`, `frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationAnalyticsDashboard.jsx`, `frontend-reactjs/src/api/creationStudioApi.js`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `backend_updates/services_changes.md`, `backend_updates/controllers_changes.md`, `backend_updates/routes_updates.md`, `backend_updates/backend_change_log.md`, `backend_updates/backend_new_files.md`, `backend_updates/api_changes.md`, `frontend_updates/pages_updates.md`, `frontend_updates/change_log.md`, `Design_Change_log.md`, `Design_Plan.md`, `Design_update_*` trackers, `ui-ux_updates/web_app_wireframe_changes.md`

## Creation Recommendation Intelligence
- Code: `backend-nodejs/src/services/CreationRecommendationService.js`, `src/controllers/CreationStudioController.js`, `src/routes/creation.routes.js`, `frontend-reactjs/src/api/creationStudioApi.js`, `frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationStudioSummary.jsx`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `backend_updates/services_changes.md`, `backend_updates/controllers_changes.md`, `backend_updates/routes_updates.md`, `backend_updates/backend_change_log.md`, `frontend_updates/change_log.md`, `Design_Plan.md`, `Design_Change_log.md`, `Design_update_*` trackers, `ui-ux_updates/web_app_wireframe_changes.md`

## Community Moderation & Safety Pipeline
- Code: `backend-nodejs/migrations/20250215120000_community_moderation_pipeline.js`, `src/models/CommunityPostModerationCaseModel.js`, `src/models/CommunityPostModerationActionModel.js`, `src/models/ScamReportModel.js`, `src/models/ModerationAnalyticsEventModel.js`, `src/services/CommunityModerationService.js`, `src/controllers/CommunityModerationController.js`, `src/routes/communityModeration.routes.js`, `src/routes/routeMetadata.js`, `src/routes/routeRegistry.js`, `test/communityModerationService.test.js`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `backend_updates/services_changes.md`, `backend_updates/routes_updates.md`, `backend_updates/controllers_changes.md`, `backend_updates/api_changes.md`, `backend_updates/api_integration_changes.md`, `backend_updates/backend_change_log.md`, `backend_updates/backend_new_files.md`, `backend_updates/events_changes.md`, `backend_updates/module_changes.md`, `change_log.md`, `Design_*` artefacts referencing moderation dashboards


## Mobile Ads Governance Console
- Code: `Edulure-Flutter/lib/services/mobile_ads_governance_service.dart`, `lib/screens/mobile_ads_governance_screen.dart`, `lib/screens/service_suite_screen.dart`, `lib/screens/home_screen.dart`
- Documentation: `update_task_list.md`, `update_progress_tracker.md`, `user_phone_app_updates/app_screen_updates.md`, `user_phone_app_updates/app_backend_changes.md`, `user_phone_app_updates/app_widget_updates.md`, `user_phone_app_updates/user_app_change_log.md`, `ui-ux_updates/user_app_wireframe_changes.md`, `ui-ux_updates/user_application_logic_flow_changes.md`, `Design_Change_log.md`, `Design_update_progress_tracker.md`

## Provider Ads & Creation Oversight Roadmap
- Documentation: `provider_phone_app_updates/ads_creation_oversight_roadmap.md`, `provider_phone_app_updates/provider_app_change_log.md`, `update_task_list.md`, `update_progress_tracker.md`, `Design_Plan.md`, `Design_update_*` trackers

## Provider Notification Parity Enablement
- Documentation: `provider_phone_app_updates/integration_parity_checklist.md`, `provider_phone_app_updates/push_notification_design_guidelines.md`, `provider_phone_app_updates/provider_app_change_log.md`, `Design_Change_log.md`, `Design_Plan.md`, `Design_update_*` trackers, `update_task_list.md`, `update_progress_tracker.md`
