import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../core/config/app_config.dart';

typedef _PackageInfoLoader = Future<PackageInfo> Function();
typedef AuthMetadataErrorHandler = void Function(Object error, StackTrace stackTrace);

class AuthClientMetadataResolver {
  AuthClientMetadataResolver({
    required AppConfig config,
    _PackageInfoLoader? packageInfoLoader,
    AuthMetadataErrorHandler? onError,
  })  : _config = config,
        _packageInfoLoader = packageInfoLoader ?? PackageInfo.fromPlatform,
        _onError = onError;

  final AppConfig _config;
  final _PackageInfoLoader _packageInfoLoader;
  final AuthMetadataErrorHandler? _onError;

  Map<String, dynamic>? _cached;
  Future<Map<String, dynamic>>? _pending;

  Future<Map<String, dynamic>> resolve() {
    if (_cached != null) {
      return SynchronousFuture<Map<String, dynamic>>(Map<String, dynamic>.from(_cached!));
    }
    if (_pending != null) {
      return _pending!;
    }
    _pending = _load();
    return _pending!;
  }

  Future<Map<String, dynamic>> _load() async {
    PackageInfo? info;
    try {
      info = await _packageInfoLoader();
    } catch (error, stackTrace) {
      _onError?.call(error, stackTrace);
    }

    final locale = _resolveLocale();
    final timezone = DateTime.now().timeZoneName;
    final platform = kIsWeb
        ? 'web'
        : switch (defaultTargetPlatform) {
            TargetPlatform.android => 'android',
            TargetPlatform.iOS => 'ios',
            TargetPlatform.macOS => 'macos',
            TargetPlatform.windows => 'windows',
            TargetPlatform.linux => 'linux',
            TargetPlatform.fuchsia => 'fuchsia',
          };

    final metadata = <String, dynamic>{
      'platform': platform,
      'environment': _config.environment.name,
      'timezone': timezone,
      if (locale != null) 'locale': locale,
      if (info != null) ...{
        'appVersion': info.version,
        'buildNumber': info.buildNumber,
        'packageName': info.packageName,
      },
      'releaseChannel': _config.isProduction ? 'production' : 'pre-release',
    };

    metadata.removeWhere((key, value) => value == null || (value is String && value.trim().isEmpty));

    _cached = metadata;
    _pending = null;
    return Map<String, dynamic>.from(metadata);
  }

  String? _resolveLocale() {
    final dispatcher = WidgetsBinding.instance.platformDispatcher;
    final locale = dispatcher.locale ?? (dispatcher.locales.isNotEmpty ? dispatcher.locales.first : null);
    return locale?.toLanguageTag();
  }
}
