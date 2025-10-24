import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';

@immutable
class ConversationParticipant {
  const ConversationParticipant({
    required this.id,
    required this.displayName,
    this.avatarUrl,
    this.role,
  });

  final String id;
  final String displayName;
  final String? avatarUrl;
  final String? role;

  Map<String, dynamic> toJson() => {
        'id': id,
        'displayName': displayName,
        'avatarUrl': avatarUrl,
        'role': role,
      };

  factory ConversationParticipant.fromJson(Map<String, dynamic> json) {
    return ConversationParticipant(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      role: json['role'] as String?,
    );
  }
}

@immutable
class MessageAttachment {
  const MessageAttachment({
    required this.label,
    required this.url,
    this.type = 'link',
  });

  final String label;
  final String url;
  final String type;

  Map<String, dynamic> toJson() => {
        'label': label,
        'url': url,
        'type': type,
      };

  factory MessageAttachment.fromJson(Map<String, dynamic> json) {
    return MessageAttachment(
      label: json['label'] as String,
      url: json['url'] as String,
      type: json['type'] as String? ?? 'link',
    );
  }
}

@immutable
class InboxMessage {
  const InboxMessage({
    required this.id,
    required this.author,
    required this.body,
    required this.sentAt,
    this.fromMe = false,
    this.attachments = const <MessageAttachment>[],
    this.authorAvatarUrl,
    this.deliveryStatus = 'sent',
    this.reactions = const <String, int>{},
  });

  final String id;
  final String author;
  final String body;
  final DateTime sentAt;
  final bool fromMe;
  final List<MessageAttachment> attachments;
  final String? authorAvatarUrl;
  final String deliveryStatus;
  final Map<String, int> reactions;

  bool get hasAttachments => attachments.isNotEmpty;

  InboxMessage copyWith({
    String? id,
    String? author,
    String? body,
    DateTime? sentAt,
    bool? fromMe,
    List<MessageAttachment>? attachments,
    String? authorAvatarUrl,
    String? deliveryStatus,
    Map<String, int>? reactions,
  }) {
    return InboxMessage(
      id: id ?? this.id,
      author: author ?? this.author,
      body: body ?? this.body,
      sentAt: sentAt ?? this.sentAt,
      fromMe: fromMe ?? this.fromMe,
      attachments: attachments ?? this.attachments,
      authorAvatarUrl: authorAvatarUrl ?? this.authorAvatarUrl,
      deliveryStatus: deliveryStatus ?? this.deliveryStatus,
      reactions: reactions ?? this.reactions,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'author': author,
        'body': body,
        'sentAt': sentAt.toIso8601String(),
        'fromMe': fromMe,
        'attachments': attachments.map((item) => item.toJson()).toList(),
        'authorAvatarUrl': authorAvatarUrl,
        'deliveryStatus': deliveryStatus,
        'reactions': reactions,
      };

  factory InboxMessage.fromJson(Map<String, dynamic> json) {
    return InboxMessage(
      id: json['id'] as String,
      author: json['author'] as String,
      body: json['body'] as String,
      sentAt: DateTime.tryParse(json['sentAt'] as String? ?? '') ?? DateTime.now(),
      fromMe: json['fromMe'] as bool? ?? false,
      attachments: (json['attachments'] as List<dynamic>? ?? const [])
          .map((item) => MessageAttachment.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
      authorAvatarUrl: json['authorAvatarUrl'] as String?,
      deliveryStatus: json['deliveryStatus'] as String? ?? 'sent',
      reactions: (json['reactions'] as Map?)?.map<String, int>(
            (key, value) => MapEntry(key.toString(), (value as num).toInt()),
          ) ??
          const <String, int>{},
    );
  }
}

@immutable
class ConversationThread {
  const ConversationThread({
    required this.id,
    required this.title,
    required this.channel,
    required this.participants,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
    this.lastReadAt,
    this.topic,
    this.pinned = false,
    this.muted = false,
    this.archived = false,
    this.emojiTag,
  });

  final String id;
  final String title;
  final String channel;
  final List<ConversationParticipant> participants;
  final List<InboxMessage> messages;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastReadAt;
  final String? topic;
  final bool pinned;
  final bool muted;
  final bool archived;
  final String? emojiTag;

  InboxMessage? get lastMessage => messages.isEmpty ? null : messages.last;

  int get unreadCount {
    final cutoff = lastReadAt ?? DateTime.fromMillisecondsSinceEpoch(0);
    return messages
        .where((message) => !message.fromMe && message.sentAt.isAfter(cutoff))
        .length;
  }

  bool get hasUnread => unreadCount > 0;

  ConversationThread copyWith({
    String? id,
    String? title,
    String? channel,
    List<ConversationParticipant>? participants,
    List<InboxMessage>? messages,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? lastReadAt,
    String? topic,
    bool? pinned,
    bool? muted,
    bool? archived,
    String? emojiTag,
  }) {
    return ConversationThread(
      id: id ?? this.id,
      title: title ?? this.title,
      channel: channel ?? this.channel,
      participants: participants ?? this.participants,
      messages: messages ?? this.messages,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastReadAt: lastReadAt ?? this.lastReadAt,
      topic: topic ?? this.topic,
      pinned: pinned ?? this.pinned,
      muted: muted ?? this.muted,
      archived: archived ?? this.archived,
      emojiTag: emojiTag ?? this.emojiTag,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'channel': channel,
        'participants': participants.map((p) => p.toJson()).toList(),
        'messages': messages.map((m) => m.toJson()).toList(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'lastReadAt': lastReadAt?.toIso8601String(),
        'topic': topic,
        'pinned': pinned,
        'muted': muted,
        'archived': archived,
        'emojiTag': emojiTag,
      };

  factory ConversationThread.fromJson(Map<String, dynamic> json) {
    return ConversationThread(
      id: json['id'] as String,
      title: json['title'] as String,
      channel: json['channel'] as String? ?? 'inbox',
      participants: (json['participants'] as List<dynamic>? ?? const [])
          .map((item) => ConversationParticipant.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
      messages: (json['messages'] as List<dynamic>? ?? const [])
          .map((item) => InboxMessage.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.now(),
      lastReadAt: json['lastReadAt'] is String ? DateTime.tryParse(json['lastReadAt'] as String) : null,
      topic: json['topic'] as String?,
      pinned: json['pinned'] as bool? ?? false,
      muted: json['muted'] as bool? ?? false,
      archived: json['archived'] as bool? ?? false,
      emojiTag: json['emojiTag'] as String?,
    );
  }
}

@immutable
class QueuedInboxMessage {
  const QueuedInboxMessage({
    required this.queueId,
    required this.threadId,
    required this.message,
    required this.enqueuedAt,
    this.retryCount = 0,
    this.lastAttemptAt,
    this.lastError,
  });

  final String queueId;
  final String threadId;
  final InboxMessage message;
  final DateTime enqueuedAt;
  final int retryCount;
  final DateTime? lastAttemptAt;
  final String? lastError;

  QueuedInboxMessage copyWith({
    InboxMessage? message,
    int? retryCount,
    DateTime? lastAttemptAt,
    String? lastError,
  }) {
    return QueuedInboxMessage(
      queueId: queueId,
      threadId: threadId,
      message: message ?? this.message,
      enqueuedAt: enqueuedAt,
      retryCount: retryCount ?? this.retryCount,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      lastError: lastError ?? this.lastError,
    );
  }

  Map<String, dynamic> toJson() => {
        'queueId': queueId,
        'threadId': threadId,
        'message': message.toJson(),
        'enqueuedAt': enqueuedAt.toIso8601String(),
        'retryCount': retryCount,
        'lastAttemptAt': lastAttemptAt?.toIso8601String(),
        'lastError': lastError,
      };

  factory QueuedInboxMessage.fromJson(Map<String, dynamic> json) {
    return QueuedInboxMessage(
      queueId: json['queueId']?.toString() ?? 'queue-${DateTime.now().microsecondsSinceEpoch}',
      threadId: json['threadId']?.toString() ?? 'thread',
      message: InboxMessage.fromJson(
        Map<String, dynamic>.from(json['message'] as Map),
      ),
      enqueuedAt: DateTime.tryParse(json['enqueuedAt']?.toString() ?? '') ?? DateTime.now(),
      retryCount: json['retryCount'] is int
          ? json['retryCount'] as int
          : int.tryParse('${json['retryCount']}') ?? 0,
      lastAttemptAt: json['lastAttemptAt'] is String
          ? DateTime.tryParse(json['lastAttemptAt'] as String)
          : null,
      lastError: json['lastError']?.toString(),
    );
  }
}

enum SupportPriority { low, normal, high, urgent }

enum SupportStatus { open, inProgress, awaitingCustomer, resolved, closed }

extension SupportStatusLabel on SupportStatus {
  String get label {
    switch (this) {
      case SupportStatus.open:
        return 'Open';
      case SupportStatus.inProgress:
        return 'In progress';
      case SupportStatus.awaitingCustomer:
        return 'Awaiting customer';
      case SupportStatus.resolved:
        return 'Resolved';
      case SupportStatus.closed:
        return 'Closed';
    }
  }
}

@immutable
class SupportUpdate {
  const SupportUpdate({
    required this.id,
    required this.author,
    required this.body,
    required this.sentAt,
    this.internal = false,
    this.attachments = const <MessageAttachment>[],
  });

  final String id;
  final String author;
  final String body;
  final DateTime sentAt;
  final bool internal;
  final List<MessageAttachment> attachments;

  Map<String, dynamic> toJson() => {
        'id': id,
        'author': author,
        'body': body,
        'sentAt': sentAt.toIso8601String(),
        'internal': internal,
        'attachments': attachments.map((item) => item.toJson()).toList(),
      };

  factory SupportUpdate.fromJson(Map<String, dynamic> json) {
    return SupportUpdate(
      id: json['id'] as String,
      author: json['author'] as String,
      body: json['body'] as String,
      sentAt: DateTime.tryParse(json['sentAt'] as String? ?? '') ?? DateTime.now(),
      internal: json['internal'] as bool? ?? false,
      attachments: (json['attachments'] as List<dynamic>? ?? const [])
          .map((item) => MessageAttachment.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
    );
  }
}

@immutable
class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.subject,
    required this.description,
    required this.status,
    required this.priority,
    required this.createdAt,
    required this.updatedAt,
    required this.contactName,
    required this.contactEmail,
    this.channel = 'in-app',
    this.tags = const <String>[],
    this.updates = const <SupportUpdate>[],
    this.slaDueAt,
    this.assetUrl,
    this.assignedTo,
  });

  final String id;
  final String subject;
  final String description;
  final SupportStatus status;
  final SupportPriority priority;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String contactName;
  final String contactEmail;
  final String channel;
  final List<String> tags;
  final List<SupportUpdate> updates;
  final DateTime? slaDueAt;
  final String? assetUrl;
  final String? assignedTo;

  SupportUpdate? get latestUpdate => updates.isEmpty ? null : updates.last;

  SupportTicket copyWith({
    String? id,
    String? subject,
    String? description,
    SupportStatus? status,
    SupportPriority? priority,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? contactName,
    String? contactEmail,
    String? channel,
    List<String>? tags,
    List<SupportUpdate>? updates,
    DateTime? slaDueAt,
    String? assetUrl,
    String? assignedTo,
  }) {
    return SupportTicket(
      id: id ?? this.id,
      subject: subject ?? this.subject,
      description: description ?? this.description,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      contactName: contactName ?? this.contactName,
      contactEmail: contactEmail ?? this.contactEmail,
      channel: channel ?? this.channel,
      tags: tags ?? this.tags,
      updates: updates ?? this.updates,
      slaDueAt: slaDueAt ?? this.slaDueAt,
      assetUrl: assetUrl ?? this.assetUrl,
      assignedTo: assignedTo ?? this.assignedTo,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'subject': subject,
        'description': description,
        'status': status.name,
        'priority': priority.name,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'contactName': contactName,
        'contactEmail': contactEmail,
        'channel': channel,
        'tags': tags,
        'updates': updates.map((update) => update.toJson()).toList(),
        'slaDueAt': slaDueAt?.toIso8601String(),
        'assetUrl': assetUrl,
        'assignedTo': assignedTo,
      };

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    return SupportTicket(
      id: json['id'] as String,
      subject: json['subject'] as String,
      description: json['description'] as String,
      status: SupportStatus.values.firstWhere(
        (value) => value.name == json['status'],
        orElse: () => SupportStatus.open,
      ),
      priority: SupportPriority.values.firstWhere(
        (value) => value.name == json['priority'],
        orElse: () => SupportPriority.normal,
      ),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.now(),
      contactName: json['contactName'] as String? ?? '',
      contactEmail: json['contactEmail'] as String? ?? '',
      channel: json['channel'] as String? ?? 'in-app',
      tags: (json['tags'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
      updates: (json['updates'] as List<dynamic>? ?? const [])
          .map((item) => SupportUpdate.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
      slaDueAt: json['slaDueAt'] is String ? DateTime.tryParse(json['slaDueAt'] as String) : null,
      assetUrl: json['assetUrl'] as String?,
      assignedTo: json['assignedTo'] as String?,
    );
  }

  String priorityLabel() {
    switch (priority) {
      case SupportPriority.low:
        return 'Low';
      case SupportPriority.normal:
        return 'Normal';
      case SupportPriority.high:
        return 'High';
      case SupportPriority.urgent:
        return 'Urgent';
    }
  }

  List<String> combinedTimeline() {
    final timeline = <MapEntry<DateTime, String>>[
      MapEntry(createdAt, 'Ticket created'),
      ...updates.map((update) => MapEntry(update.sentAt, '${update.author}: ${update.body}')),
    ]..sort((a, b) => a.key.compareTo(b.key));
    return timeline.map((entry) => entry.value).toList();
  }
}

extension SupportTicketCollection on Iterable<SupportTicket> {
  SupportTicket? byId(String id) => firstWhereOrNull((ticket) => ticket.id == id);
}
