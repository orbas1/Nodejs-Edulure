import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/session_manager.dart';

abstract class SessionManagerBinding {
  const SessionManagerBinding();

  Map<String, dynamic>? getSession();
  String? getAccessToken();
  String? getRefreshToken();
  String? getActiveRole();
  Future<void> saveSession(Map<String, dynamic> session);
  Future<void> clear();
  Future<void> setActiveRole(String role);
  Listenable sessionListenable();
}

class DefaultSessionManagerBinding extends SessionManagerBinding {
  const DefaultSessionManagerBinding();

  @override
  Map<String, dynamic>? getSession() => SessionManager.getSession();

  @override
  String? getAccessToken() => SessionManager.getAccessToken();

  @override
  String? getRefreshToken() => SessionManager.getRefreshToken();

  @override
  String? getActiveRole() => SessionManager.getActiveRole();

  @override
  Future<void> saveSession(Map<String, dynamic> session) {
    return SessionManager.saveSession(session);
  }

  @override
  Future<void> clear() {
    return SessionManager.clear();
  }

  @override
  Future<void> setActiveRole(String role) {
    return SessionManager.setActiveRole(role);
  }

  @override
  Listenable sessionListenable() {
    return SessionManager.sessionListenable();
  }
}

class SessionManagerFacade {
  SessionManagerFacade({SessionManagerBinding? binding})
      : _binding = binding ?? const DefaultSessionManagerBinding();

  final SessionManagerBinding _binding;

  Map<String, dynamic>? get session => _binding.getSession();

  String? get accessToken => _binding.getAccessToken();

  String? get refreshToken => _binding.getRefreshToken();

  String? get activeRole => _binding.getActiveRole();

  Future<void> saveSession(Map<String, dynamic> session) {
    return _binding.saveSession(session);
  }

  Future<void> clear() {
    return _binding.clear();
  }

  Future<void> setActiveRole(String role) {
    return _binding.setActiveRole(role);
  }

  Stream<Map<String, dynamic>?> sessionChanges() {
    final listenable = _binding.sessionListenable();
    final controller = StreamController<Map<String, dynamic>?>.broadcast();
    VoidCallback? listener;

    controller.onListen = () {
      controller.add(_binding.getSession());
      listener = () {
        controller.add(_binding.getSession());
      };
      listenable.addListener(listener!);
    };

    controller.onCancel = () {
      if (!controller.hasListener && listener != null) {
        listenable.removeListener(listener!);
        listener = null;
      }
    };

    return controller.stream;
  }
}

final sessionManagerFacadeProvider = Provider<SessionManagerFacade>((ref) {
  return SessionManagerFacade();
});
