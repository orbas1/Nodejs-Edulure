import 'dart:async';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../provider/communication/communication_models.dart';
import 'api_config.dart';
import 'communication_persistence_service.dart';
import 'session_manager.dart';

class InboxException implements Exception {
  InboxException(this.message);

  final String message;

  @override
  String toString() => 'InboxException: $message';
}

enum PendingCommunicationActionType { sendMessage, markRead, createTicket }

@immutable
class PendingCommunicationAction {
  const PendingCommunicationAction({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.metadata = const <String, dynamic>{},
    this.attempts = 0,
    this.lastAttemptAt,
    this.lastError,
  });

  final String id;
  final PendingCommunicationActionType type;
  final Map<String, dynamic> payload;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final int attempts;
  final DateTime? lastAttemptAt;
  final String? lastError;

  PendingCommunicationAction copyWith({
    int? attempts,
    DateTime? lastAttemptAt,
    String? lastError,
  }) {
    return PendingCommunicationAction(
      id: id,
      type: type,
      payload: payload,
      metadata: metadata,
      createdAt: createdAt,
      attempts: attempts ?? this.attempts,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      lastError: lastError ?? this.lastError,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'payload': payload,
      'metadata': metadata,
      'createdAt': createdAt.toIso8601String(),
      'attempts': attempts,
      'lastAttemptAt': lastAttemptAt?.toIso8601String(),
      'lastError': lastError,
    };
  }

  factory PendingCommunicationAction.fromJson(Map<String, dynamic> json, {required String id}) {
    final typeName = json['type']?.toString() ?? PendingCommunicationActionType.sendMessage.name;
    return PendingCommunicationAction(
      id: id,
      type: PendingCommunicationActionType.values.firstWhere(
        (value) => value.name == typeName,
        orElse: () => PendingCommunicationActionType.sendMessage,
      ),
      payload: json['payload'] is Map
          ? Map<String, dynamic>.from(json['payload'] as Map)
          : const <String, dynamic>{},
      metadata: json['metadata'] is Map
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : const <String, dynamic>{},
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      attempts: json['attempts'] as int? ?? 0,
      lastAttemptAt: json['lastAttemptAt'] != null
          ? DateTime.tryParse(json['lastAttemptAt'].toString())
          : null,
      lastError: json['lastError'] as String?,
    );
  }
}

@immutable
class InboxSyncReport {
  const InboxSyncReport({
    required this.threads,
    required this.supportTickets,
    required this.syncedAt,
    required this.queuedActions,
    this.fromCache = false,
  });

  final List<ConversationThread> threads;
  final List<SupportTicket> supportTickets;
  final DateTime syncedAt;
  final int queuedActions;
  final bool fromCache;
}

@immutable
class DeliveredMessageResult {
  const DeliveredMessageResult({
    required this.threadId,
    required this.message,
  });

  final String threadId;
  final InboxMessage message;
}

@immutable
class OutboxFlushResult {
  const OutboxFlushResult({
    required this.deliveredMessages,
    required this.updatedTickets,
    required this.remaining,
  });

  final List<DeliveredMessageResult> deliveredMessages;
  final List<SupportTicket> updatedTickets;
  final int remaining;
}

class InboxService {
  InboxService({
    Dio? httpClient,
    CommunicationPersistence? persistence,
    Duration staleThreshold = const Duration(minutes: 10),
  })  : _httpClient = httpClient ?? ApiConfig.createHttpClient(),
        _persistence = persistence ?? CommunicationPersistenceService(),
        _staleThreshold = staleThreshold;

  final Dio _httpClient;
  final CommunicationPersistence _persistence;
  final Duration _staleThreshold;

  static const _metadataKey = 'inbox';

  Future<InboxSyncReport> synchronize({bool forceRemote = false}) async {
    final metadata = _readMetadata();
    final lastSyncedAt = metadata['lastSyncedAt'] is String
        ? DateTime.tryParse(metadata['lastSyncedAt'] as String)
        : null;
    final queuedCount = SessionManager.communicationOutbox.length;

    final shouldFetch = forceRemote ||
        lastSyncedAt == null ||
        DateTime.now().difference(lastSyncedAt) > _staleThreshold;

    List<ConversationThread>? threads;
    List<SupportTicket>? tickets;
    bool fromCache = true;

    if (shouldFetch) {
      final snapshot = await _fetchSnapshotFromApi();
      if (snapshot != null) {
        threads = snapshot.threads;
        tickets = snapshot.supportTickets;
        fromCache = false;
        await _persistence.saveThreads(threads);
        await _persistence.saveSupportTickets(tickets);
        _writeMetadata({'lastSyncedAt': snapshot.syncedAt.toIso8601String()});
      }
    }

    threads ??= await _persistence.loadThreads() ?? const <ConversationThread>[];
    tickets ??= await _persistence.loadSupportTickets() ?? const <SupportTicket>[];

    return InboxSyncReport(
      threads: threads,
      supportTickets: tickets,
      syncedAt: DateTime.now(),
      queuedActions: queuedCount,
      fromCache: fromCache,
    );
  }

  Future<InboxMessage> sendMessage({
    required String threadId,
    required String author,
    required String body,
    List<MessageAttachment> attachments = const <MessageAttachment>[],
  }) async {
    final messageId = _generateClientMessageId();
    final now = DateTime.now();
    final payload = {
      'body': body,
      'clientMessageId': messageId,
      'attachments': attachments.map((item) => item.toJson()).toList(growable: false),
    };
    final queued = InboxMessage(
      id: messageId,
      author: author,
      body: body,
      sentAt: now,
      fromMe: true,
      attachments: attachments,
      deliveryStatus: 'queued',
    );

    try {
      final options = await _authOptions(optional: true);
      final response = await _httpClient.post(
        '/mobile/communications/threads/$threadId/messages',
        data: payload,
        options: options,
      );
      final data = response.data;
      if (data is Map && data['message'] is Map) {
        return InboxMessage.fromJson(
          Map<String, dynamic>.from(data['message'] as Map),
        );
      }
      return queued.copyWith(deliveryStatus: 'sent');
    } on DioException catch (error) {
      if (!_shouldQueue(error)) {
        throw InboxException('Unable to send message: ${error.message}');
      }
      final action = PendingCommunicationAction(
        id: _generateQueueId(),
        type: PendingCommunicationActionType.sendMessage,
        payload: payload,
        metadata: {
          'threadId': threadId,
          'author': author,
        },
        createdAt: now,
      );
      await _enqueueAction(action);
      return queued;
    }
  }

  Future<void> markThreadRead({
    required String threadId,
    required DateTime readAt,
  }) async {
    final payload = {
      'readAt': readAt.toIso8601String(),
    };
    try {
      final options = await _authOptions(optional: true);
      await _httpClient.post(
        '/mobile/communications/threads/$threadId/read',
        data: payload,
        options: options,
      );
    } on DioException catch (error) {
      if (!_shouldQueue(error)) {
        throw InboxException('Failed to mark thread read: ${error.message}');
      }
      final action = PendingCommunicationAction(
        id: _generateQueueId(),
        type: PendingCommunicationActionType.markRead,
        payload: payload,
        metadata: {
          'threadId': threadId,
        },
        createdAt: DateTime.now(),
      );
      await _enqueueAction(action);
    }
  }

  Future<SupportTicket> createSupportTicket({
    required String subject,
    required String description,
    required String contactName,
    required String contactEmail,
    SupportPriority priority = SupportPriority.medium,
    List<String> tags = const <String>[],
  }) async {
    final payload = {
      'subject': subject,
      'description': description,
      'priority': priority.name,
      'contactName': contactName,
      'contactEmail': contactEmail,
      'tags': tags,
    };
    try {
      final options = await _authOptions(optional: true);
      final response = await _httpClient.post(
        '/mobile/support/tickets',
        data: payload,
        options: options,
      );
      final data = response.data;
      if (data is Map && data['ticket'] is Map) {
        return SupportTicket.fromJson(
          Map<String, dynamic>.from(data['ticket'] as Map),
        );
      }
    } on DioException catch (error) {
      if (!_shouldQueue(error)) {
        throw InboxException('Unable to create support ticket: ${error.message}');
      }
      final action = PendingCommunicationAction(
        id: _generateQueueId(),
        type: PendingCommunicationActionType.createTicket,
        payload: payload,
        metadata: {
          'subject': subject,
        },
        createdAt: DateTime.now(),
      );
      await _enqueueAction(action);
    }
    final now = DateTime.now();
    return SupportTicket(
      id: 'ticket-${now.microsecondsSinceEpoch}',
      subject: subject,
      description: description,
      status: SupportStatus.open,
      priority: priority,
      createdAt: now,
      updatedAt: now,
      contactName: contactName,
      contactEmail: contactEmail,
      tags: tags,
      updates: const <SupportUpdate>[],
    );
  }

  Future<OutboxFlushResult> processOutbox() async {
    final queue = SessionManager.communicationOutbox;
    final keys = queue.keys.toList(growable: false);
    final deliveredMessages = <DeliveredMessageResult>[];
    final updatedTickets = <SupportTicket>[];

    for (final key in keys) {
      final raw = queue.get(key);
      if (raw is! Map) {
        await queue.delete(key);
        continue;
      }
      final action = PendingCommunicationAction.fromJson(
        Map<String, dynamic>.from(raw as Map),
        id: key.toString(),
      );
      try {
        switch (action.type) {
          case PendingCommunicationActionType.sendMessage:
            final message = await _dispatchQueuedMessage(action);
            deliveredMessages.add(
              DeliveredMessageResult(
                threadId: action.metadata['threadId']?.toString() ?? 'unknown-thread',
                message: message,
              ),
            );
            await queue.delete(key);
            break;
          case PendingCommunicationActionType.markRead:
            await _dispatchQueuedRead(action);
            await queue.delete(key);
            break;
          case PendingCommunicationActionType.createTicket:
            final ticket = await _dispatchQueuedTicket(action);
            if (ticket != null) {
              updatedTickets.add(ticket);
            }
            await queue.delete(key);
            break;
        }
      } on DioException catch (error) {
        if (_shouldQueue(error)) {
          final updated = action.copyWith(
            attempts: action.attempts + 1,
            lastAttemptAt: DateTime.now(),
            lastError: error.message,
          );
          await queue.put(key, updated.toJson());
          return OutboxFlushResult(
            deliveredMessages: deliveredMessages,
            updatedTickets: updatedTickets,
            remaining: queue.length,
          );
        }
        await queue.delete(key);
      } catch (error) {
        debugPrint('Communication outbox action failed: $error');
        await queue.delete(key);
      }
    }

    if (deliveredMessages.isNotEmpty || updatedTickets.isNotEmpty) {
      await synchronize(forceRemote: true);
    }

    return OutboxFlushResult(
      deliveredMessages: deliveredMessages,
      updatedTickets: updatedTickets,
      remaining: queue.length,
    );
  }

  Future<InboxMessage> _dispatchQueuedMessage(PendingCommunicationAction action) async {
    final threadId = action.metadata['threadId']?.toString();
    if (threadId == null) {
      throw InboxException('Queued message missing thread context');
    }
    final options = await _authOptions();
    final response = await _httpClient.post(
      '/mobile/communications/threads/$threadId/messages',
      data: action.payload,
      options: options,
    );
    final data = response.data;
    if (data is Map && data['message'] is Map) {
      return InboxMessage.fromJson(
        Map<String, dynamic>.from(data['message'] as Map),
      );
    }
    return InboxMessage(
      id: action.payload['clientMessageId']?.toString() ?? 'offline-message',
      author: action.metadata['author']?.toString() ?? 'You',
      body: action.payload['body']?.toString() ?? '',
      sentAt: DateTime.now(),
      fromMe: true,
      deliveryStatus: 'sent',
      attachments: const <MessageAttachment>[],
    );
  }

  Future<void> _dispatchQueuedRead(PendingCommunicationAction action) async {
    final threadId = action.metadata['threadId']?.toString();
    if (threadId == null) {
      throw InboxException('Queued read receipt missing thread');
    }
    final options = await _authOptions();
    await _httpClient.post(
      '/mobile/communications/threads/$threadId/read',
      data: action.payload,
      options: options,
    );
  }

  Future<SupportTicket?> _dispatchQueuedTicket(PendingCommunicationAction action) async {
    final options = await _authOptions();
    final response = await _httpClient.post(
      '/mobile/support/tickets',
      data: action.payload,
      options: options,
    );
    final data = response.data;
    if (data is Map && data['ticket'] is Map) {
      return SupportTicket.fromJson(
        Map<String, dynamic>.from(data['ticket'] as Map),
      );
    }
    return null;
  }

  Future<InboxSnapshot?> _fetchSnapshotFromApi() async {
    final options = await _authOptions(optional: true);
    try {
      final response = await _httpClient.get(
        '/mobile/communications/inbox',
        options: options,
      );
      final data = response.data;
      if (data is Map) {
        final threads = (data['threads'] as List<dynamic>? ?? const [])
            .map((item) => ConversationThread.fromJson(
                  Map<String, dynamic>.from(item as Map),
                ))
            .toList(growable: false);
        final tickets = (data['tickets'] as List<dynamic>? ?? const [])
            .map((item) => SupportTicket.fromJson(
                  Map<String, dynamic>.from(item as Map),
                ))
            .toList(growable: false);
        return InboxSnapshot(
          threads: threads,
          supportTickets: tickets,
          syncedAt: DateTime.now(),
        );
      }
    } on DioException catch (error) {
      if (!_shouldQueue(error)) {
        debugPrint('Inbox sync failed: ${error.message}');
      }
    }
    return null;
  }

  Future<void> _enqueueAction(PendingCommunicationAction action) async {
    await SessionManager.communicationOutbox.put(action.id, action.toJson());
  }

  Map<String, dynamic> _readMetadata() {
    final raw = SessionManager.communicationMetadata.get(_metadataKey);
    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }
    return const <String, dynamic>{};
  }

  Future<void> _writeMetadata(Map<String, dynamic> metadata) {
    return SessionManager.communicationMetadata.put(_metadataKey, metadata);
  }

  Future<Options> _authOptions({bool optional = false}) async {
    final token = SessionManager.getAccessToken();
    if (token == null && !optional) {
      throw InboxException('Session expired. Please log in again.');
    }
    return Options(
      headers: {
        if (token != null) 'Authorization': 'Bearer $token',
      },
    );
  }

  bool _shouldQueue(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return true;
    }
    final status = error.response?.statusCode ?? 0;
    return status == 408 || status == 429 || status >= 500;
  }

  String _generateClientMessageId() {
    final random = Random();
    return 'msg-${DateTime.now().microsecondsSinceEpoch}-${random.nextInt(9999).toString().padLeft(4, '0')}';
  }

  String _generateQueueId() {
    final random = Random();
    return '${DateTime.now().microsecondsSinceEpoch}-${random.nextInt(999999).toString().padLeft(6, '0')}';
  }
}

@immutable
class InboxSnapshot {
  const InboxSnapshot({
    required this.threads,
    required this.supportTickets,
    required this.syncedAt,
  });

  final List<ConversationThread> threads;
  final List<SupportTicket> supportTickets;
  final DateTime syncedAt;
}
