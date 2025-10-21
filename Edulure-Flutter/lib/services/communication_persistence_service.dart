import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../provider/communication/communication_models.dart';

abstract class CommunicationPersistence {
  const CommunicationPersistence();

  Future<List<ConversationThread>?> loadThreads();
  Future<void> saveThreads(List<ConversationThread> threads);

  Future<List<SupportTicket>?> loadSupportTickets();
  Future<void> saveSupportTickets(List<SupportTicket> tickets);
}

class CommunicationPersistenceService implements CommunicationPersistence {
  CommunicationPersistenceService({
    String boxName = _defaultBox,
    HiveInterface? hive,
  })  : _boxName = boxName,
        _hive = hive ?? Hive;

  static const _defaultBox = 'communications.cache';
  static const _threadsKey = 'threads';
  static const _ticketsKey = 'tickets';

  final String _boxName;
  final HiveInterface _hive;
  Box<String>? _cachedBox;

  Future<Box<String>> _box() async {
    final cached = _cachedBox;
    if (cached != null && cached.isOpen) {
      return cached;
    }
    final box = await _hive.openBox<String>(_boxName);
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
