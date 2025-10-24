import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../provider/communication/communication_models.dart';
import 'api_config.dart';
import 'communication_persistence_service.dart';
import 'session_manager.dart';

class InboxServiceException implements Exception {
  const InboxServiceException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => 'InboxServiceException: $message';
}

class InboxService {
  InboxService({
    Dio? client,
    CommunicationPersistence? persistence,
    String? Function()? tokenProvider,
    Duration retryBackoff = const Duration(minutes: 2),
  })  : _dio = client ?? ApiConfig.createHttpClient(requiresAuth: true),
        _persistence = persistence ?? CommunicationPersistenceService(),
        _tokenProvider = tokenProvider ?? SessionManager.getAccessToken,
        _retryBackoff = retryBackoff;

  final Dio _dio;
  final CommunicationPersistence _persistence;
  final String? Function() _tokenProvider;
  final Duration _retryBackoff;

  Future<List<QueuedInboxMessage>>? _syncInFlight;

  Options _authOptions() {
    final token = _tokenProvider();
    if (token == null || token.isEmpty) {
      throw const InboxServiceException('Authentication required to access inbox.');
    }
    return Options(
      headers: {
        ..._dio.options.headers,
        'Authorization': 'Bearer $token',
      },
      extra: {
        ...?_dio.options.extra,
        'requiresAuth': true,
      },
    );
  }

  Map<String, dynamic> _ensureMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return const <String, dynamic>{};
  }

  List<dynamic> _ensureList(dynamic value) {
    if (value is List<dynamic>) {
      return value;
    }
    if (value is List) {
      return List<dynamic>.from(value);
    }
    return const <dynamic>[];
  }

  Future<List<ConversationThread>> fetchThreads({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      final cached = await _persistence.loadThreads();
      if (cached != null && cached.isNotEmpty) {
        return cached;
      }
    }

    try {
      final response = await _dio.get('/inbox/threads', options: _authOptions());
      final body = _ensureMap(response.data);
      final payload = _ensureList(body['data'] ?? response.data);
      final threads = payload
          .whereType<Map>()
          .map(
            (entry) => ConversationThread.fromJson(
              Map<String, dynamic>.from(entry as Map),
            ),
          )
          .toList(growable: false);
      await _persistence.saveThreads(threads);
      return threads;
    } on InboxServiceException {
      rethrow;
    } on DioException catch (error) {
      debugPrint('Failed to fetch inbox threads: ${error.message}');
      final cached = await _persistence.loadThreads();
      if (cached != null) {
        return cached;
      }
      throw InboxServiceException('Unable to load inbox threads.', cause: error);
    }
  }

  Future<List<ConversationThread>> getCachedThreads() async {
    return await _persistence.loadThreads() ?? const <ConversationThread>[];
  }

  Future<QueuedInboxMessage> queueMessage({
    required String threadId,
    required InboxMessage message,
  }) async {
    final pending = await _persistence.loadPendingMessages();
    final queueId = 'queue-${DateTime.now().microsecondsSinceEpoch}';
    final queued = QueuedInboxMessage(
      queueId: queueId,
      threadId: threadId,
      message: message.copyWith(
        deliveryStatus: 'pending',
        sentAt: message.sentAt,
      ),
      enqueuedAt: DateTime.now(),
    );
    pending.add(queued);
    await _persistence.savePendingMessages(pending);
    await _appendMessageToThread(threadId, queued.message);
    return queued;
  }

  Future<List<QueuedInboxMessage>> getPendingMessages() {
    return _persistence.loadPendingMessages();
  }

  Future<List<QueuedInboxMessage>> flushPendingMessages({bool force = false}) {
    if (_syncInFlight != null && !force) {
      return _syncInFlight!;
    }

    final completer = Completer<List<QueuedInboxMessage>>();
    _syncInFlight = completer.future;

    () async {
      final pending = await _persistence.loadPendingMessages();
      if (pending.isEmpty) {
        completer.complete(const <QueuedInboxMessage>[]);
        _syncInFlight = null;
        return;
      }

      final successful = <QueuedInboxMessage>[];
      final remaining = <QueuedInboxMessage>[];
      for (final queued in pending) {
        final now = DateTime.now();
        final throttle = !force &&
            queued.lastAttemptAt != null &&
            now.difference(queued.lastAttemptAt!) < _retryBackoff;
        if (throttle) {
          remaining.add(queued);
          continue;
        }

        try {
          final delivered = await _sendMessage(queued);
          successful.add(queued.copyWith(message: delivered));
          await _appendMessageToThread(queued.threadId, delivered);
        } on InboxServiceException catch (error) {
          debugPrint('Inbox send failed for ${queued.queueId}: ${error.message}');
          final updated = queued.copyWith(
            retryCount: queued.retryCount + 1,
            lastAttemptAt: now,
            lastError: error.message,
          );
          remaining.add(updated);
        } catch (error) {
          debugPrint('Unexpected inbox error: $error');
          final updated = queued.copyWith(
            retryCount: queued.retryCount + 1,
            lastAttemptAt: now,
            lastError: error.toString(),
          );
          remaining.add(updated);
        }
      }

      await _persistence.savePendingMessages(remaining);
      completer.complete(successful);
      _syncInFlight = null;
    }().catchError((Object error, StackTrace stackTrace) async {
      completer.completeError(error, stackTrace);
      _syncInFlight = null;
    });

    return _syncInFlight!;
  }

  Future<InboxMessage> _sendMessage(QueuedInboxMessage queued) async {
    try {
      final response = await _dio.post(
        '/inbox/threads/${queued.threadId}/messages',
        data: queued.message.toJson(),
        options: _authOptions(),
      );
      final body = _ensureMap(response.data);
      final payload = body['data'] is Map ? _ensureMap(body['data']) : body;
      if (payload.isEmpty) {
        return queued.message.copyWith(
          deliveryStatus: 'sent',
          sentAt: DateTime.now(),
        );
      }
      return InboxMessage.fromJson(payload).copyWith(deliveryStatus: 'sent');
    } on InboxServiceException {
      rethrow;
    } on DioException catch (error) {
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.unknown) {
        throw InboxServiceException('Network unavailable for inbox message.', cause: error);
      }
      final data = _ensureMap(error.response?.data);
      final message = data['message']?.toString() ?? error.message ?? 'Inbox request failed.';
      throw InboxServiceException(message, cause: error);
    }
  }

  Future<void> _appendMessageToThread(String threadId, InboxMessage message) async {
    final cached = await _persistence.loadThreads();
    if (cached == null) {
      return;
    }
    final updatedThreads = <ConversationThread>[];
    var threadFound = false;
    for (final thread in cached) {
      if (thread.id == threadId) {
        final messages = List<InboxMessage>.from(thread.messages)
          ..add(message);
        updatedThreads.add(
          thread.copyWith(
            messages: messages,
            updatedAt: DateTime.now(),
          ),
        );
        threadFound = true;
      } else {
        updatedThreads.add(thread);
      }
    }
    if (threadFound) {
      await _persistence.saveThreads(updatedThreads);
    }
  }
}
