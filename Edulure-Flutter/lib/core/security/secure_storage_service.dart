import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  SecureStorageService._(this._storage, {String keyPrefix = ''})
      : _keyPrefix = keyPrefix;

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
    if (_keyPrefix.isEmpty) {
      return key;
    }
    return '$_keyPrefix$key';
  }

  Future<void> write({required String key, required String value}) {
    return _runGuarded('write($key)', () => _storage.write(
          key: _namespaced(key),
          value: value,
        ));
  }

  Future<String?> read({required String key}) {
    return _runGuarded('read($key)', () => _storage.read(key: _namespaced(key)));
  }

  Future<bool> containsKey({required String key}) {
    return _runGuarded('containsKey($key)', () => _storage.containsKey(key: _namespaced(key)));
  }

  Future<void> delete({required String key}) {
    return _runGuarded('delete($key)', () => _storage.delete(key: _namespaced(key)));
  }

  Future<void> deleteAll({Iterable<String>? keys}) {
    if (keys == null) {
      return _runGuarded('deleteAll', () => _storage.deleteAll());
    }

    final uniqueKeys = keys.toSet();
    return _runGuarded('deleteAll(keys)', () async {
      for (final key in uniqueKeys) {
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
