import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';

import '../provider/communication/communication_models.dart';

abstract class CommunicationPersistence {
  const CommunicationPersistence();

  Future<List<ConversationThread>?> loadThreads();
  Future<void> saveThreads(List<ConversationThread> threads);

  Future<List<SupportTicket>?> loadSupportTickets();
  Future<void> saveSupportTickets(List<SupportTicket> tickets);

  Future<void> reset();

  Future<void> close();
}

class CommunicationPersistenceService implements CommunicationPersistence {
  CommunicationPersistenceService({
    String boxName = _defaultBox,
    HiveInterface? hive,
    HiveCipher? cipher,
  })  : _boxName = boxName,
        _hive = hive ?? Hive,
        _cipher = cipher;

  static const _defaultBox = 'communications.cache';
  static const _threadsKey = 'threads';
  static const _ticketsKey = 'tickets';

  final String _boxName;
  final HiveInterface _hive;
  final HiveCipher? _cipher;
  Box<String>? _cachedBox;

  Future<Box<String>> _box() async {
    final cached = _cachedBox;
    if (cached != null && cached.isOpen) {
      return cached;
    }
    final box = await _hive.openBox<String>(
      _boxName,
      encryptionCipher: _cipher,
    );
    _cachedBox = box;
    return box;
  }

  @override
  Future<List<ConversationThread>?> loadThreads() {
    return _readList(
      _threadsKey,
      (json) => ConversationThread.fromJson(json),
    );
  }

  @override
  Future<void> saveThreads(List<ConversationThread> threads) {
    return _writeList(
      _threadsKey,
      threads,
      (thread) => thread.toJson(),
    );
  }

  @override
  Future<List<SupportTicket>?> loadSupportTickets() {
    return _readList(
      _ticketsKey,
      (json) => SupportTicket.fromJson(json),
    );
  }

  @override
  Future<void> saveSupportTickets(List<SupportTicket> tickets) {
    return _writeList(
      _ticketsKey,
      tickets,
      (ticket) => ticket.toJson(),
    );
  }

  @override
  Future<void> reset() async {
    final box = await _box();
    await box.clear();
  }

  @override
  Future<void> close() async {
    final cached = _cachedBox;
    if (cached != null && cached.isOpen) {
      await cached.close();
    }
    _cachedBox = null;
  }

  Future<List<T>?> _readList<T>(
    String key,
    T Function(Map<String, dynamic> json) mapper,
  ) async {
    try {
      final box = await _box();
      final raw = box.get(key);
      if (raw == null) {
        return null;
      }
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((item) => mapper(Map<String, dynamic>.from(item as Map)))
          .toList(growable: false);
    } catch (error, stackTrace) {
      debugPrint('Failed to hydrate $key: $error');
      debugPrint('$stackTrace');
      try {
        final box = await _box();
        await box.delete(key);
      } catch (_) {}
      return null;
    }
  }

  Future<void> _writeList<T>(
    String key,
    List<T> values,
    Map<String, dynamic> Function(T value) encoder,
  ) async {
    try {
      final box = await _box();
      if (values.isEmpty) {
        await box.delete(key);
        return;
      }
      final payload = jsonEncode(values.map(encoder).toList(growable: false));
      await box.put(key, payload);
    } catch (error, stackTrace) {
      debugPrint('Failed to persist $key: $error');
      debugPrint('$stackTrace');
    }
  }
}
