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
  late final Listenable _sessionListenable = _binding.sessionListenable();

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
    final trimmed = role.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError.value(role, 'role', 'Active role cannot be empty');
    }
    return _binding.setActiveRole(trimmed);
  }

  Stream<Map<String, dynamic>?> sessionChanges() {
    return _SessionChangesStream(_binding, _sessionListenable);
  }
}

final sessionManagerFacadeProvider = Provider<SessionManagerFacade>((ref) {
  return SessionManagerFacade();
});

class _SessionChangesStream extends Stream<Map<String, dynamic>?> {
  _SessionChangesStream(this._binding, this._listenable);

  final SessionManagerBinding _binding;
  final Listenable _listenable;

  @override
  StreamSubscription<Map<String, dynamic>?> listen(
    void Function(Map<String, dynamic>?)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    late final StreamController<Map<String, dynamic>?> controller;
    var attached = false;

    void emit() {
      if (!controller.hasListener) {
        return;
      }
      try {
        controller.add(_binding.getSession());
      } catch (error, stackTrace) {
        controller.addError(error, stackTrace);
      }
    }

    controller = StreamController<Map<String, dynamic>?>(
      onListen: () {
        emit();
        if (!attached) {
          _listenable.addListener(emit);
          attached = true;
        }
      },
      onPause: () {
        if (attached) {
          _listenable.removeListener(emit);
          attached = false;
        }
      },
      onResume: () {
        if (!attached) {
          _listenable.addListener(emit);
          attached = true;
          emit();
        }
      },
      onCancel: () {
        if (attached) {
          _listenable.removeListener(emit);
          attached = false;
        }
      },
    );

    return controller.stream.listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }
}
