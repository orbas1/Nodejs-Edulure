import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/session_manager.dart';

class SessionManagerFacade {
  Map<String, dynamic>? get session => SessionManager.getSession();

  String? get accessToken => SessionManager.getAccessToken();

  String? get activeRole => SessionManager.getActiveRole();

  Future<void> saveSession(Map<String, dynamic> session) {
    return SessionManager.saveSession(session);
  }

  Future<void> clear() {
    return SessionManager.clear();
  }
}

final sessionManagerFacadeProvider = Provider<SessionManagerFacade>((ref) {
  return SessionManagerFacade();
});
