import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/core/runtime/capability_manifest_models.dart';

void main() {
  group('CapabilityManifest', () {
    final generatedAt = DateTime.utc(2024, 1, 1, 12, 0, 0);

    test('buildImpactNotice returns null when no services or capabilities impacted', () {
      final manifest = CapabilityManifest(
        environment: 'production',
        generatedAt: generatedAt,
        audience: 'public',
        services: [
          CapabilityServiceStatus(
            key: 'feed',
            name: 'Feed Service',
            category: 'core',
            type: 'http',
            ready: true,
            status: 'operational',
            summary: 'All good',
            checkedAt: generatedAt,
            components: const [],
          ),
        ],
        capabilities: [
          ManifestCapability(
            name: 'Feed Publishing',
            capability: 'provider.feed.publish',
            description: 'Publish new feed entries',
            basePath: '/feed',
            flagKey: 'feed.publish',
            defaultState: 'enabled',
            audience: 'provider',
            enabled: true,
            status: 'operational',
            summary: 'Ready',
            dependencies: const [],
            dependencyStatuses: const [],
            accessible: true,
            severityRank: 1,
            generatedAt: generatedAt,
          ),
        ],
        summary: ManifestSummary.empty(),
      );

      expect(manifest.buildImpactNotice(), isNull);
      expect(manifest.isCapabilityAccessible('provider.feed.publish'), isTrue);
    });

    test('buildImpactNotice summarises impacted services and capabilities', () {
      final manifest = CapabilityManifest(
        environment: 'production',
        generatedAt: generatedAt,
        audience: 'provider',
        services: [
          CapabilityServiceStatus(
            key: 'payments',
            name: 'Payments API',
            category: 'commerce',
            type: 'http',
            ready: false,
            status: 'outage',
            summary: 'Stripe gateway unavailable',
            checkedAt: generatedAt,
            components: const [],
          ),
        ],
        capabilities: [
          ManifestCapability(
            name: 'Provider Billing',
            capability: 'provider.billing.manage',
            description: 'Manage billing settings',
            basePath: '/billing',
            flagKey: 'billing.manage',
            defaultState: 'enabled',
            audience: 'provider',
            enabled: true,
            status: 'degraded',
            summary: 'Latency increases observed',
            dependencies: const ['payments'],
            dependencyStatuses: const ['degraded'],
            accessible: true,
            severityRank: 2,
            generatedAt: generatedAt,
          ),
          ManifestCapability(
            name: 'Course Catalog',
            capability: 'provider.courses.list',
            description: 'View available courses',
            basePath: '/courses',
            flagKey: 'courses.list',
            defaultState: 'enabled',
            audience: 'provider',
            enabled: true,
            status: 'operational',
            summary: 'Healthy',
            dependencies: const [],
            dependencyStatuses: const [],
            accessible: true,
            severityRank: 1,
            generatedAt: generatedAt,
          ),
        ],
        summary: ManifestSummary.empty(),
      );

      final notice = manifest.buildImpactNotice();
      expect(notice, isNotNull);
      expect(notice!.severity, CapabilityImpactSeverity.outage);
      expect(notice.headline, contains('temporarily unavailable'));
      expect(notice.services.single.nameWithStatus, contains('payments api'));
      expect(notice.capabilities.single.capability, 'provider.billing.manage');
      expect(
        manifest.isCapabilityAccessible('provider.billing.manage'),
        isTrue,
      );
      expect(
        manifest.isCapabilityAccessible('provider.unknown'),
        isFalse,
      );
    });

    test('statusSummary reflects outage and degradation counts', () {
      final manifest = CapabilityManifest(
        environment: 'production',
        generatedAt: generatedAt,
        audience: 'public',
        services: [
          CapabilityServiceStatus(
            key: 'live',
            name: 'Live Sessions',
            category: 'engagement',
            type: 'websocket',
            ready: true,
            status: 'degraded',
            summary: 'Video latency is higher than usual',
            checkedAt: generatedAt,
            components: const [],
          ),
          CapabilityServiceStatus(
            key: 'inbox',
            name: 'Inbox',
            category: 'communication',
            type: 'http',
            ready: false,
            status: 'outage',
            summary: 'Email provider disruption',
            checkedAt: generatedAt,
            components: const [],
          ),
        ],
        capabilities: [
          ManifestCapability(
            name: 'Community Chat',
            capability: 'community.chat.send',
            description: 'Send chat messages',
            basePath: '/community/chat',
            flagKey: 'community.chat',
            defaultState: 'enabled',
            audience: 'learner',
            enabled: true,
            status: 'outage',
            summary: 'Realtime messaging offline',
            dependencies: const [],
            dependencyStatuses: const [],
            accessible: false,
            severityRank: 5,
            generatedAt: generatedAt,
          ),
        ],
        summary: ManifestSummary.empty(),
      );

      expect(
        manifest.statusSummary,
        'services(out:1, degraded:1) · capabilities(out:1, degraded:0)',
      );
      expect(manifest.hasOutages, isTrue);
      expect(manifest.hasDegradation, isTrue);
      expect(manifest.buildImpactNotice()!.severity, CapabilityImpactSeverity.outage);
    });
  });
}
