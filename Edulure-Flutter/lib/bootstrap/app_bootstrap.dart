import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/feature_flags/feature_flag_notifier.dart';
import '../core/state/provider_logger.dart';
import '../core/telemetry/telemetry_service.dart';
import '../core/runtime/capability_manifest_notifier.dart';
import '../services/language_service.dart';
import '../services/push_notification_service.dart';
import '../services/session_manager.dart';

class AppBootstrap {
  AppBootstrap._(this.container);

  final ProviderContainer container;

  static Future<AppBootstrap> create() async {
    late ProviderContainer container;
    container = ProviderContainer(
      observers: [
        TelemetryProviderObserver(() => container.read(telemetryServiceProvider)),
      ],
    );
    final bootstrap = AppBootstrap._(container);
    await bootstrap._initialize();
    return bootstrap;
  }

  Future<void> _initialize() async {
    await SessionManager.init();
    await LanguageService.init();
    await container.read(telemetryServiceProvider).prepare();
    await PushNotificationService.instance.initialize();
    await Future.wait([
      container.read(featureFlagControllerProvider.notifier).warmUp(),
      container.read(capabilityManifestControllerProvider.notifier).warmUp(),
    ]);
  }

  Future<void> run(Widget app) async {
    final telemetry = container.read(telemetryServiceProvider);
    await telemetry.runApp(() {
      runApp(
        UncontrolledProviderScope(
          container: container,
          child: app,
        ),
      );
    });
  }
}
