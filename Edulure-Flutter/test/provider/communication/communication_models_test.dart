import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/provider/communication/communication_models.dart';

void main() {
  group('InboxMessage', () {
    test('serialises and deserialises with attachments and reactions', () {
      final message = InboxMessage(
        id: 'msg-1',
        author: 'Jamie',
        body: 'Hello world',
        sentAt: DateTime.now(),
        attachments: const <MessageAttachment>[
          MessageAttachment(label: 'Doc', url: 'https://cdn/doc.pdf', type: 'file'),
        ],
        reactions: const <String, int>{'👍': 3},
      );

      final json = message.toJson();
      final restored = InboxMessage.fromJson(json);

      expect(restored.id, message.id);
      expect(restored.attachments.single.label, 'Doc');
      expect(restored.reactions['👍'], 3);
    });
  });

  group('ConversationThread', () {
    test('computes unread count based on lastReadAt', () {
      final now = DateTime.now();
      final thread = ConversationThread(
        id: 'thread-1',
        title: 'Ops',
        channel: 'team',
        participants: const <ConversationParticipant>[],
        messages: <InboxMessage>[
          InboxMessage(id: '1', author: 'Alex', body: 'One', sentAt: now.subtract(const Duration(minutes: 10))),
          InboxMessage(id: '2', author: 'Jamie', body: 'Two', sentAt: now.subtract(const Duration(minutes: 5))),
          InboxMessage(id: '3', author: 'You', body: 'Three', sentAt: now.subtract(const Duration(minutes: 2)), fromMe: true),
        ],
        createdAt: now.subtract(const Duration(days: 1)),
        updatedAt: now,
        lastReadAt: now.subtract(const Duration(minutes: 7)),
      );

      expect(thread.unreadCount, 1);
      expect(thread.hasUnread, isTrue);
    });

    test('copyWith updates selective properties while preserving others', () {
      final now = DateTime.now();
      final thread = ConversationThread(
        id: 'thread',
        title: 'Original',
        channel: 'team',
        participants: const <ConversationParticipant>[],
        messages: const <InboxMessage>[],
        createdAt: now,
        updatedAt: now,
      );

      final copy = thread.copyWith(title: 'Updated', pinned: true);

      expect(copy.title, 'Updated');
      expect(copy.pinned, isTrue);
      expect(copy.id, thread.id);
    });
  });
}
