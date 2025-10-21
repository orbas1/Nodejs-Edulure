import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  SecureStorageService._(this._storage, {String keyPrefix = ''})
      : _keyPrefix = keyPrefix.trim();

  factory SecureStorageService.custom({
    FlutterSecureStorage? storage,
    String keyPrefix = '',
  }) {
    return SecureStorageService._(
      storage ?? _createDefaultStorage(),
      keyPrefix: keyPrefix,
    );
  }

  static SecureStorageService instance = SecureStorageService._(
    _createDefaultStorage(),
  );

  final FlutterSecureStorage _storage;
  final String _keyPrefix;

  static FlutterSecureStorage _createDefaultStorage() {
    return const FlutterSecureStorage(
      aOptions: AndroidOptions(
        encryptedSharedPreferences: true,
      ),
      iOptions: IOSOptions(
        accessibility: KeychainAccessibility.first_unlock,
      ),
      webOptions: WebOptions(
        databaseName: 'edulure_secure',
      ),
      macOsOptions: MacOsOptions(
        accessibility: KeychainAccessibility.first_unlock,
      ),
      linuxOptions: LinuxOptions(
        collectionName: 'edulure_secure',
      ),
    );
  }

  @visibleForTesting
  static void replaceInstance(SecureStorageService replacement) {
    instance = replacement;
  }

  @visibleForTesting
  static void resetInstance() {
    instance = SecureStorageService._(_createDefaultStorage());
  }

  String _namespaced(String key) {
    final validated = _validateKey(key);
    if (_keyPrefix.isEmpty) {
      return validated;
    }
    return '$_keyPrefix$validated';
  }

  String _validateKey(String key) {
    final trimmed = key.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError.value(key, 'key', 'Secure storage key cannot be empty');
    }
    return trimmed;
  }

  Future<void> write({required String key, required String value}) {
    final resolvedKey = _namespaced(key);
    return _runGuarded('write($resolvedKey)', () => _storage.write(
          key: resolvedKey,
          value: value,
        ));
  }

  Future<String?> read({required String key}) {
    final resolvedKey = _namespaced(key);
    return _runGuarded('read($resolvedKey)', () => _storage.read(key: resolvedKey));
  }

  Future<bool> containsKey({required String key}) {
    final resolvedKey = _namespaced(key);
    return _runGuarded('containsKey($resolvedKey)', () => _storage.containsKey(key: resolvedKey));
  }

  Future<void> delete({required String key}) {
    final resolvedKey = _namespaced(key);
    return _runGuarded('delete($resolvedKey)', () => _storage.delete(key: resolvedKey));
  }

  Future<void> deleteAll({Iterable<String>? keys}) {
    if (keys == null) {
      return _runGuarded('deleteAll', () async {
        if (_keyPrefix.isEmpty) {
          await _storage.deleteAll();
          return;
        }

        final entries = await _storage.readAll();
        final candidates = entries.keys
            .whereType<String>()
            .where((key) => key.startsWith(_keyPrefix))
            .toList();

        for (final key in candidates) {
          await _storage.delete(key: key);
        }
      });
    }

    final filteredKeys = <String>{};
    for (final key in keys) {
      if (key is String && key.trim().isNotEmpty) {
        filteredKeys.add(_validateKey(key));
      }
    }

    if (filteredKeys.isEmpty) {
      return Future<void>.value();
    }

    return _runGuarded('deleteAll(keys)', () async {
      for (final key in filteredKeys) {
        await _storage.delete(key: _namespaced(key));
      }
    });
  }

  Future<T> _runGuarded<T>(String action, Future<T> Function() callback) async {
    try {
      return await callback();
    } on Exception catch (error, stackTrace) {
      debugPrint('SecureStorageService error during $action: $error');
      Error.throwWithStackTrace(SecureStorageException(action, error), stackTrace);
    }
  }
}

class SecureStorageException implements Exception {
  SecureStorageException(this.action, this.cause);

  final String action;
  final Object cause;

  @override
  String toString() {
    return 'SecureStorageException(action: $action, cause: $cause)';
  }
}
