import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/communication_persistence_service.dart';
import '../../services/inbox_service.dart';
import 'communication_models.dart';

final _random = Random();

String _generateId(String prefix) {
  final seed = DateTime.now().microsecondsSinceEpoch + _random.nextInt(9999);
  return '$prefix-$seed';
}

abstract class PersistentCollectionStore<T> extends StateNotifier<List<T>> {
  PersistentCollectionStore({required List<T> seed})
      : _seed = List<T>.from(seed),
        super(List<T>.from(seed)) {
    unawaited(_hydrate());
  }

  final List<T> _seed;
  bool _hydrated = false;

  @protected
  Future<List<T>?> readFromPersistence();

  @protected
  Future<void> writeToPersistence(List<T> value);

  Future<void> refreshFromPersistence() async {
    try {
      final restored = await readFromPersistence();
      if (restored != null) {
        super.state = restored;
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to refresh ${runtimeType.toString()}: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<void> restoreSeedData() async {
    state = List<T>.from(_seed);
  }

  @override
  set state(List<T> value) {
    super.state = value;
    if (_hydrated) {
      unawaited(Future<void>(() async {
        try {
          await writeToPersistence(value);
        } catch (error, stackTrace) {
          debugPrint('Failed to persist ${runtimeType.toString()}: $error');
          debugPrint('$stackTrace');
        }
      }));
    }
  }

  Future<void> _hydrate() async {
    try {
      final restored = await readFromPersistence();
      if (restored != null && restored.isNotEmpty) {
        super.state = restored;
      } else {
        await writeToPersistence(super.state);
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to hydrate ${runtimeType.toString()}: $error');
      debugPrint('$stackTrace');
    } finally {
      _hydrated = true;
    }
  }
}

class InboxStore extends PersistentCollectionStore<ConversationThread> {
  InboxStore({CommunicationPersistence? persistence})
      : _persistence = persistence ?? CommunicationPersistenceService(),
        super(seed: _seedThreads());

  final CommunicationPersistence _persistence;

  static List<ConversationThread> _seedThreads() {
    final now = DateTime.now();
    return [
      ConversationThread(
        id: 'thread-1',
        title: 'Growth Ops Squad',
        channel: 'team',
        topic: 'Module 3 deliverables',
        participants: const [
          ConversationParticipant(id: 'me', displayName: 'You'),
          ConversationParticipant(id: 'evelyn', displayName: 'Evelyn Carter'),
          ConversationParticipant(id: 'marcus', displayName: 'Marcus Lee'),
        ],
        messages: [
          InboxMessage(
            id: 'msg-1',
            author: 'Evelyn Carter',
            body: 'Can someone drop the updated Module 3 deck here? I want to share it with the new facilitators.',
            sentAt: now.subtract(const Duration(hours: 3)),
          ),
          InboxMessage(
            id: 'msg-2',
            author: 'Marcus Lee',
            body: 'Uploading now. I added the new breakout room prompts too.',
            sentAt: now.subtract(const Duration(hours: 3, minutes: 30)),
          ),
          InboxMessage(
            id: 'msg-3',
            author: 'You',
            fromMe: true,
            body: 'Appreciate it! I will turn it into a download in the content library later today.',
            sentAt: now.subtract(const Duration(hours: 2, minutes: 58)),
          ),
        ],
        createdAt: now.subtract(const Duration(days: 2)),
        updatedAt: now.subtract(const Duration(hours: 2, minutes: 58)),
        lastReadAt: now.subtract(const Duration(hours: 1)),
        pinned: true,
        emojiTag: '🚀',
      ),
      ConversationThread(
        id: 'thread-2',
        title: 'Learner Support',
        channel: 'support',
        participants: const [
          ConversationParticipant(id: 'support', displayName: 'Support Team', role: 'specialist'),
          ConversationParticipant(id: 'me', displayName: 'You'),
        ],
        messages: [
          InboxMessage(
            id: 'msg-4',
            author: 'Support Team',
            body: 'Learners loved the live clinic. Can we package up a recap email with the replay + slides?',
            sentAt: now.subtract(const Duration(days: 1, hours: 5)),
          ),
          InboxMessage(
            id: 'msg-5',
            author: 'You',
            fromMe: true,
            body: 'On it! Drafting the email in ConvertKit and will schedule it for the morning.',
            sentAt: now.subtract(const Duration(days: 1, hours: 4, minutes: 50)),
            attachments: const [
              MessageAttachment(label: 'Clinic replay', url: 'https://video.example.com/replay.mp4'),
            ],
          ),
        ],
        createdAt: now.subtract(const Duration(days: 3)),
        updatedAt: now.subtract(const Duration(days: 1, hours: 4, minutes: 50)),
        lastReadAt: now.subtract(const Duration(days: 1)),
      ),
      ConversationThread(
        id: 'thread-3',
        title: 'Faculty Chat',
        channel: 'team',
        participants: const [
          ConversationParticipant(id: 'me', displayName: 'You'),
          ConversationParticipant(id: 'priya', displayName: 'Priya Patel'),
        ],
        messages: [
          InboxMessage(
            id: 'msg-6',
            author: 'You',
            fromMe: true,
            body: 'Thanks again for the session swap yesterday! \nLet me know if you need anything for the sprint pilot.',
            sentAt: now.subtract(const Duration(days: 3, hours: 2)),
          ),
          InboxMessage(
            id: 'msg-7',
            author: 'Priya Patel',
            body: 'No problem. Next week we\'re testing the sprint format, so expect higher check-in volume.',
            sentAt: now.subtract(const Duration(days: 3, hours: 1, minutes: 50)),
          ),
        ],
        createdAt: now.subtract(const Duration(days: 5)),
        updatedAt: now.subtract(const Duration(days: 3, hours: 1, minutes: 50)),
        lastReadAt: now.subtract(const Duration(days: 5)),
      ),
    ];
  }

  @override
  Future<List<ConversationThread>?> readFromPersistence() {
    return _persistence.loadThreads();
  }

  @override
  Future<void> writeToPersistence(List<ConversationThread> value) {
    return _persistence.saveThreads(value);
  }

  void createThread(ConversationThread thread) {
    state = [...state, thread];
  }

  void updateThread(ConversationThread thread) {
    state = [
      for (final item in state)
        if (item.id == thread.id) thread else item,
    ];
  }

  void deleteThread(String threadId) {
    state = state.where((thread) => thread.id != threadId).toList(growable: false);
  }

  void sendMessage(String threadId, InboxMessage message) {
    state = [
      for (final thread in state)
        if (thread.id == threadId)
          thread.copyWith(
            messages: [...thread.messages, message],
            updatedAt: message.sentAt,
          )
        else
          thread,
    ];
  }

  void upsertMessage(String threadId, InboxMessage message) {
    state = [
      for (final thread in state)
        if (thread.id == threadId)
          thread.copyWith(
            messages: _replaceMessage(thread.messages, message),
            updatedAt: message.sentAt,
          )
        else
          thread,
    ];
  }

  List<InboxMessage> _replaceMessage(List<InboxMessage> messages, InboxMessage incoming) {
    final existingIndex = messages.indexWhere((item) => item.id == incoming.id);
    if (existingIndex == -1) {
      return [...messages, incoming];
    }
    final next = List<InboxMessage>.from(messages);
    next[existingIndex] = incoming;
    return next;
  }

  void markRead(String threadId, DateTime timestamp) {
    state = [
      for (final thread in state)
        if (thread.id == threadId)
          thread.copyWith(
            lastReadAt: timestamp,
          )
        else
          thread,
    ];
  }

  void togglePinned(String threadId) {
    state = [
      for (final thread in state)
        if (thread.id == threadId)
          thread.copyWith(
            pinned: !thread.pinned,
          )
        else
          thread,
    ];
  }

  void toggleMuted(String threadId) {
    state = [
      for (final thread in state)
        if (thread.id == threadId)
          thread.copyWith(
            muted: !thread.muted,
          )
        else
          thread,
    ];
  }

  void toggleArchived(String threadId) {
    state = [
      for (final thread in state)
        if (thread.id == threadId)
          thread.copyWith(
            archived: !thread.archived,
          )
        else
          thread,
    ];
  }

  ConversationThread buildThread({
    String? id,
    required String title,
    required String channel,
    String? topic,
    List<ConversationParticipant> participants = const <ConversationParticipant>[],
    List<InboxMessage> messages = const <InboxMessage>[],
    bool pinned = false,
    bool muted = false,
  }) {
    final timestamp = DateTime.now();
    return ConversationThread(
      id: id ?? _generateId('thread'),
      title: title,
      channel: channel,
      topic: topic,
      participants: participants,
      messages: messages,
      createdAt: timestamp,
      updatedAt: messages.isNotEmpty ? messages.last.sentAt : timestamp,
      lastReadAt: messages.isEmpty ? timestamp : null,
      pinned: pinned,
      muted: muted,
    );
  }

  InboxMessage buildMessage({
    String? id,
    required String author,
    required String body,
    bool fromMe = false,
    List<MessageAttachment> attachments = const <MessageAttachment>[],
  }) {
    return InboxMessage(
      id: id ?? _generateId('msg'),
      author: author,
      body: body,
      sentAt: DateTime.now(),
      fromMe: fromMe,
      attachments: attachments,
    );
  }

  Future<InboxSyncReport> synchronizeWithService(InboxService service,
      {bool forceRemote = false}) async {
    final report = await service.synchronize(forceRemote: forceRemote);
    if (report.threads.isNotEmpty) {
      state = report.threads;
    }
    return report;
  }

  Future<InboxMessage> sendMessageWithService({
    required InboxService service,
    required String threadId,
    required String author,
    required String body,
    List<MessageAttachment> attachments = const <MessageAttachment>[],
  }) async {
    final message = await service.sendMessage(
      threadId: threadId,
      author: author,
      body: body,
      attachments: attachments,
    );
    upsertMessage(threadId, message);
    return message;
  }

  Future<void> markReadWithService({
    required InboxService service,
    required String threadId,
    required DateTime timestamp,
  }) async {
    await service.markThreadRead(threadId: threadId, readAt: timestamp);
    markRead(threadId, timestamp);
  }

  Future<OutboxFlushResult> flushOutboxWithService(InboxService service,
      {SupportTicketStore? supportTickets}) async {
    final result = await service.processOutbox();
    for (final delivered in result.deliveredMessages) {
      upsertMessage(delivered.threadId, delivered.message);
    }
    if (supportTickets != null) {
      for (final ticket in result.updatedTickets) {
        if (supportTickets.state.any((existing) => existing.id == ticket.id)) {
          supportTickets.updateTicket(ticket);
        } else {
          supportTickets.createTicket(ticket);
        }
      }
    }
    return result;
  }
}

class SupportTicketStore extends PersistentCollectionStore<SupportTicket> {
  SupportTicketStore({CommunicationPersistence? persistence})
      : _persistence = persistence ?? CommunicationPersistenceService(),
        super(seed: _seedTickets());

  final CommunicationPersistence _persistence;

  static List<SupportTicket> _seedTickets() {
    final now = DateTime.now();
    return [
      SupportTicket(
        id: 'ticket-1',
        subject: 'Unable to access Module 2 workbook',
        description: 'Learners are seeing a 403 error when downloading the Module 2 workbook from the content library.',
        status: SupportStatus.inProgress,
        priority: SupportPriority.high,
        createdAt: now.subtract(const Duration(days: 1, hours: 4)),
        updatedAt: now.subtract(const Duration(hours: 2)),
        contactName: 'Jamie Rivera',
        contactEmail: 'jamie@acmeco.com',
        channel: 'in-app',
        tags: const ['content', 'cohort'],
        updates: [
          SupportUpdate(
            id: 'upd-1',
            author: 'You',
            body: 'Escalated to infrastructure team to refresh CDN cache.',
            sentAt: now.subtract(const Duration(hours: 3)),
            internal: true,
          ),
        ],
        slaDueAt: now.add(const Duration(hours: 8)),
        assignedTo: 'Support Squad',
      ),
      SupportTicket(
        id: 'ticket-2',
        subject: 'Invoice copy for April cohort',
        description: 'Finance team needs a PDF copy of the April 2024 invoice.',
        status: SupportStatus.awaitingCustomer,
        priority: SupportPriority.normal,
        createdAt: now.subtract(const Duration(days: 2, hours: 6)),
        updatedAt: now.subtract(const Duration(days: 1, hours: 2)),
        contactName: 'Lana Kim',
        contactEmail: 'lana.kim@orbitlabs.io',
        channel: 'email',
        tags: const ['billing'],
        updates: [
          SupportUpdate(
            id: 'upd-2',
            author: 'Support Team',
            body: 'Shared invoice via secure link and requested confirmation.',
            sentAt: now.subtract(const Duration(days: 1)),
          ),
        ],
      ),
    ];
  }

  @override
  Future<List<SupportTicket>?> readFromPersistence() {
    return _persistence.loadSupportTickets();
  }

  @override
  Future<void> writeToPersistence(List<SupportTicket> value) {
    return _persistence.saveSupportTickets(value);
  }

  void createTicket(SupportTicket ticket) {
    state = [...state, ticket];
  }

  void updateTicket(SupportTicket ticket) {
    state = [
      for (final existing in state)
        if (existing.id == ticket.id) ticket else existing,
    ];
  }

  void deleteTicket(String ticketId) {
    state = state.where((ticket) => ticket.id != ticketId).toList(growable: false);
  }

  void addUpdate(String ticketId, SupportUpdate update) {
    state = [
      for (final ticket in state)
        if (ticket.id == ticketId)
          ticket.copyWith(
            updates: [...ticket.updates, update],
            updatedAt: update.sentAt,
          )
        else
          ticket,
    ];
  }

  void changeStatus(String ticketId, SupportStatus status) {
    state = [
      for (final ticket in state)
        if (ticket.id == ticketId)
          ticket.copyWith(
            status: status,
            updatedAt: DateTime.now(),
          )
        else
          ticket,
    ];
  }

  SupportTicket buildTicket({
    String? id,
    required String subject,
    required String description,
    required SupportPriority priority,
    required SupportStatus status,
    required String contactName,
    required String contactEmail,
    String channel = 'in-app',
    List<String> tags = const <String>[],
    DateTime? slaDueAt,
    String? assetUrl,
    String? assignedTo,
  }) {
    final timestamp = DateTime.now();
    return SupportTicket(
      id: id ?? _generateId('ticket'),
      subject: subject,
      description: description,
      priority: priority,
      status: status,
      createdAt: timestamp,
      updatedAt: timestamp,
      contactName: contactName,
      contactEmail: contactEmail,
      channel: channel,
      tags: tags,
      slaDueAt: slaDueAt,
      assetUrl: assetUrl,
      assignedTo: assignedTo,
    );
  }

  SupportUpdate buildUpdate({
    String? id,
    required String author,
    required String body,
    bool internal = false,
    List<MessageAttachment> attachments = const <MessageAttachment>[],
  }) {
    return SupportUpdate(
      id: id ?? _generateId('upd'),
      author: author,
      body: body,
      sentAt: DateTime.now(),
      internal: internal,
      attachments: attachments,
    );
  }

  Future<SupportTicket> createTicketWithService({
    required InboxService service,
    required String subject,
    required String description,
    required String contactName,
    required String contactEmail,
    SupportPriority priority = SupportPriority.medium,
    List<String> tags = const <String>[],
  }) async {
    final ticket = await service.createSupportTicket(
      subject: subject,
      description: description,
      contactName: contactName,
      contactEmail: contactEmail,
      priority: priority,
      tags: tags,
    );
    if (state.any((existing) => existing.id == ticket.id)) {
      updateTicket(ticket);
    } else {
      createTicket(ticket);
    }
    return ticket;
  }
}

final communicationPersistenceProvider = Provider<CommunicationPersistence>((ref) {
  return CommunicationPersistenceService();
});

final inboxServiceProvider = Provider<InboxService>((ref) {
  final persistence = ref.watch(communicationPersistenceProvider);
  return InboxService(persistence: persistence);
});

final inboxStoreProvider = StateNotifierProvider<InboxStore, List<ConversationThread>>((ref) {
  final persistence = ref.watch(communicationPersistenceProvider);
  return InboxStore(persistence: persistence);
});

final supportTicketStoreProvider =
    StateNotifierProvider<SupportTicketStore, List<SupportTicket>>((ref) {
  final persistence = ref.watch(communicationPersistenceProvider);
  return SupportTicketStore(persistence: persistence);
});
