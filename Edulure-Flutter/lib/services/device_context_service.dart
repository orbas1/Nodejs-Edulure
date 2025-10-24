import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:uuid/uuid.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/security/secure_storage_service.dart';
import 'session_manager.dart';

class DeviceContextService {
  DeviceContextService({
    SecureStorageService? secureStorage,
    PackageInfo? packageInfo,
    Duration fingerprintTtl = const Duration(days: 120),
  })  : _secureStorage = secureStorage ?? SecureStorageService.instance,
        _packageInfo = packageInfo,
        _fingerprintTtl = fingerprintTtl;

  static const _fingerprintKey = 'device.fingerprint';
  static const _fingerprintIssuedAtKey = 'device.fingerprint.issuedAt';

  final SecureStorageService _secureStorage;
  final PackageInfo? _packageInfo;
  final Duration _fingerprintTtl;

  PackageInfo? _cachedPackageInfo;
  String? _cachedFingerprint;
  DateTime? _cachedFingerprintIssuedAt;

  Future<Map<String, dynamic>> buildContext({
    required String activity,
    bool includeRiskSignals = true,
  }) async {
    final now = DateTime.now().toUtc();
    final package = await _resolvePackageInfo();
    final locale = WidgetsBinding.instance.platformDispatcher.locale;
    final deviceId = await _resolveFingerprint(now);
    final timezoneOffset = now.toLocal().timeZoneOffset;

    final base = <String, dynamic>{
      'activity': activity,
      'timestamp': now.toIso8601String(),
      'appVersion': package?.version,
      'buildNumber': package?.buildNumber,
      'platform': _resolvePlatform(),
      'locale': locale.toLanguageTag(),
      'timezoneOffsetMinutes': timezoneOffset.inMinutes,
      'deviceId': deviceId,
    }..removeWhere((_, value) => value == null);

    if (!includeRiskSignals) {
      return base;
    }

    base['riskSignals'] = await _buildRiskSignals(now);
    return base;
  }

  Future<Map<String, dynamic>> _buildRiskSignals(DateTime now) async {
    final session = SessionManager.getSession();
    final role = SessionManager.getActiveRole();
    final lastSyncedAt = SessionManager.dashboardCache.get('syncedAt');

    return <String, dynamic>{
      'sessionPresent': session != null,
      'activeRole': role,
      'dashboardSnapshotAgeSeconds': lastSyncedAt is DateTime
          ? max(0, now.difference(lastSyncedAt.toUtc()).inSeconds)
          : null,
      'feedSnapshotCaching': SessionManager.feedSnapshotCacheOrNull != null,
      'secureTokensPersisted': await _secureStorage.containsKey(key: 'session.accessToken'),
    }..removeWhere((_, value) => value == null);
  }

  String _resolvePlatform() {
    if (kIsWeb) {
      return 'web';
    }
    try {
      return defaultTargetPlatform.name;
    } catch (_) {
      return 'unknown';
    }
  }

  Future<PackageInfo?> _resolvePackageInfo() async {
    if (_packageInfo != null) {
      return _packageInfo;
    }
    if (_cachedPackageInfo != null) {
      return _cachedPackageInfo;
    }
    try {
      _cachedPackageInfo = await PackageInfo.fromPlatform();
      return _cachedPackageInfo;
    } catch (error, stackTrace) {
      debugPrint('PackageInfo lookup failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      return null;
    }
  }

  Future<String> _resolveFingerprint(DateTime now) async {
    if (_cachedFingerprint != null && !_fingerprintExpired(now)) {
      return _cachedFingerprint!;
    }
    try {
      final cached = await _secureStorage.read(key: _fingerprintKey);
      final issuedAtRaw = await _secureStorage.read(key: _fingerprintIssuedAtKey);
      final issuedAt = DateTime.tryParse(issuedAtRaw ?? '');
      if (cached != null && cached.isNotEmpty && issuedAt != null) {
        _cachedFingerprint = cached;
        _cachedFingerprintIssuedAt = issuedAt;
        if (!_fingerprintExpired(now)) {
          return cached;
        }
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to read stored fingerprint: $error');
      debugPrintStack(stackTrace: stackTrace);
    }

    final fresh = const Uuid().v4();
    await _secureStorage.write(key: _fingerprintKey, value: fresh);
    await _secureStorage.write(
      key: _fingerprintIssuedAtKey,
      value: now.toIso8601String(),
    );
    _cachedFingerprint = fresh;
    _cachedFingerprintIssuedAt = now;
    return fresh;
  }

  bool _fingerprintExpired(DateTime now) {
    final issuedAt = _cachedFingerprintIssuedAt;
    if (issuedAt == null) {
      return true;
    }
    return now.isAfter(issuedAt.add(_fingerprintTtl));
  }
}

final deviceContextServiceProvider = Provider<DeviceContextService>((ref) {
  return DeviceContextService();
});
