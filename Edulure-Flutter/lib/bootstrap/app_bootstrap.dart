import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../core/feature_flags/feature_flag_notifier.dart';
import '../core/runtime/capability_manifest_notifier.dart';
import '../core/state/provider_logger.dart';
import '../core/telemetry/telemetry_service.dart';
import '../services/language_service.dart';
import '../services/push_notification_service.dart';
import '../services/session_manager.dart';
import '../services/notification_preference_service.dart';

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
    await Hive.initFlutter();
    final telemetry = container.read(telemetryServiceProvider);

    await _guardedStep(
      label: 'session.init',
      run: SessionManager.init,
      telemetry: telemetry,
    );

    await _guardedStep(
      label: 'language.init',
      run: LanguageService.init,
      telemetry: telemetry,
    );

    await _guardedStep(
      label: 'telemetry.prepare',
      run: telemetry.prepare,
      telemetry: telemetry,
      fatal: false,
    );

    await _guardedStep(
      label: 'notifications.init',
      run: () => PushNotificationService.instance.initialize(),
      telemetry: telemetry,
      fatal: false,
    );

    await _guardedStep(
      label: 'notifications.synchronizePending',
      run: () => NotificationPreferenceService.instance.synchronizePendingOperations(),
      telemetry: telemetry,
      fatal: false,
    );

    await Future.wait([
      _warmFeatureFlags(telemetry),
      _warmCapabilityManifest(telemetry),
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

  Future<void> _guardedStep({
    required String label,
    required Future<void> Function() run,
    required TelemetryService telemetry,
    bool fatal = true,
  }) async {
    final startedAt = DateTime.now();
    try {
      await run();
      telemetry.recordProviderUpdate(
        providerName: 'bootstrap.$label',
        value: 'completed in ${DateTime.now().difference(startedAt).inMilliseconds}ms',
      );
    } catch (error, stackTrace) {
      await telemetry.captureException(
        error,
        stackTrace: stackTrace,
        context: {
          'bootstrapStep': label,
          'fatal': fatal,
        },
      );
      if (fatal) {
        rethrow;
      }
    }
  }

  Future<void> _warmFeatureFlags(TelemetryService telemetry) async {
    try {
      await container.read(featureFlagControllerProvider.notifier).warmUp();
    } catch (error, stackTrace) {
      await telemetry.captureException(
        error,
        stackTrace: stackTrace,
        context: const {'bootstrapStep': 'featureFlags.warmUp'},
      );
    }
  }

  Future<void> _warmCapabilityManifest(TelemetryService telemetry) async {
    try {
      await container.read(capabilityManifestControllerProvider.notifier).warmUp();
    } catch (error, stackTrace) {
      await telemetry.captureException(
        error,
        stackTrace: stackTrace,
        context: const {'bootstrapStep': 'capabilityManifest.warmUp'},
      );
    }
  }
}
