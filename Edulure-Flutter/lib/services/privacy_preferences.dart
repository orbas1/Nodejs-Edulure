import 'dart:async';

import 'session_manager.dart';

const String kCurrentPolicyVersion = '2025-02';

class PrivacyPreferenceService {
  static const _consentVersionKey = 'consent.version';
  static const _consentGrantedAtKey = 'consent.grantedAt';

  static Future<bool> requiresConsent() async {
    final box = SessionManager.privacyPreferences;
    final storedVersion = box.get(_consentVersionKey) as String?;
    return storedVersion != kCurrentPolicyVersion;
  }

  static Future<void> recordConsentAccepted({DateTime? grantedAt}) async {
    final box = SessionManager.privacyPreferences;
    await box.put(_consentVersionKey, kCurrentPolicyVersion);
    await box.put(_consentGrantedAtKey, (grantedAt ?? DateTime.now()).toIso8601String());
  }

  static Map<String, dynamic>? currentConsent() {
    final box = SessionManager.privacyPreferences;
    final version = box.get(_consentVersionKey) as String?;
    if (version == null) {
      return null;
    }
    return {
      'version': version,
      'grantedAt': box.get(_consentGrantedAtKey)
    };
  }

  static Future<void> reset() async {
    final box = SessionManager.privacyPreferences;
    await box.delete(_consentVersionKey);
    await box.delete(_consentGrantedAtKey);
  }
}
