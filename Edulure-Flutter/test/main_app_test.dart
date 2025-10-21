import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:edulure_mobile/core/feature_flags/feature_flag_notifier.dart';
import 'package:edulure_mobile/core/runtime/capability_manifest_notifier.dart';
import 'package:edulure_mobile/main.dart';

class _FakeFeatureFlagNotifier extends FeatureFlagNotifier {
  _FakeFeatureFlagNotifier(this._flags);

  final Map<String, bool> _flags;

  @override
  Future<Map<String, bool>> build() async => _flags;
}

class _StaticManifestNotifier extends CapabilityManifestNotifier {
  _StaticManifestNotifier(this._snapshot);

  final CapabilityManifestSnapshot? _snapshot;

  @override
  Future<CapabilityManifestSnapshot?> build() async => _snapshot;
}

void main() {
  testWidgets('omits optional routes when feature flags disabled', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          featureFlagControllerProvider.overrideWith(() => _FakeFeatureFlagNotifier({
                'mobile.serviceSuite': false,
                'mobile.adsGovernance': false,
              })),
          capabilityManifestControllerProvider.overrideWith(() => _StaticManifestNotifier(null)),
        ],
        child: const EdulureApp(),
      ),
    );

    await tester.pumpAndSettle();

    final materialApp = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(materialApp.routes.containsKey('/services'), isFalse);
    expect(materialApp.routes.containsKey('/ads/governance'), isFalse);
  });

  testWidgets('exposes service routes when feature flags enabled', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          featureFlagControllerProvider.overrideWith(() => _FakeFeatureFlagNotifier({
                'mobile.serviceSuite': true,
                'mobile.adsGovernance': true,
              })),
          capabilityManifestControllerProvider.overrideWith(() => _StaticManifestNotifier(null)),
        ],
        child: const EdulureApp(),
      ),
    );

    await tester.pumpAndSettle();

    final materialApp = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(materialApp.routes.containsKey('/services'), isTrue);
    expect(materialApp.routes.containsKey('/ads/governance'), isTrue);
  });
}
