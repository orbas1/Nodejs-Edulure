import 'package:edulure_mobile/provider/communication/communication_models.dart';
import 'package:edulure_mobile/provider/communication/communication_store.dart';
import 'package:edulure_mobile/services/communication_persistence_service.dart';
import 'package:flutter_test/flutter_test.dart';

class InMemoryCommunicationPersistence implements CommunicationPersistence {
  List<ConversationThread>? _threads;
  List<SupportTicket>? _tickets;

  List<T>? _clone<T>(List<T>? source) {
    return source == null ? null : List<T>.from(source);
  }

  @override
  Future<List<ConversationThread>?> loadThreads() async => _clone(_threads);

  @override
  Future<void> saveThreads(List<ConversationThread> threads) async {
    _threads = List<ConversationThread>.from(threads);
  }

  @override
  Future<List<SupportTicket>?> loadSupportTickets() async => _clone(_tickets);

  @override
  Future<void> saveSupportTickets(List<SupportTicket> tickets) async {
    _tickets = List<SupportTicket>.from(tickets);
  }

  List<ConversationThread>? snapshotThreads() => _clone(_threads);
  List<SupportTicket>? snapshotTickets() => _clone(_tickets);
}

Future<void> _pumpStoreHydration() async {
  await Future<void>.delayed(Duration.zero);
}

void main() {
  group('InboxStore', () {
    test('creates collaborative threads with multimedia attachments and persists flags', () async {
      final persistence = InMemoryCommunicationPersistence();
      final store = InboxStore(persistence: persistence);
      await _pumpStoreHydration();

      final message = store.buildMessage(
        author: 'You',
        body: 'Drafted the onboarding walkthrough. Feedback welcome!',
        fromMe: true,
        attachments: const [
          MessageAttachment(
            label: 'Walkthrough deck',
            url: 'https://cdn.example.com/decks/onboarding.pdf',
          ),
        ],
      );

      final thread = store.buildThread(
        title: 'Client Onboarding Sprint',
        channel: 'client',
        topic: 'Week 1 enablement',
        participants: const [
          ConversationParticipant(id: 'me', displayName: 'You'),
          ConversationParticipant(id: 'abby', displayName: 'Abby Lawson'),
        ],
        messages: [message],
        pinned: true,
        muted: true,
      ).copyWith(emojiTag: '📘');

      store.createThread(thread);
      await _pumpStoreHydration();

      final created = store.state.firstWhere((item) => item.id == thread.id);
      expect(created.topic, 'Week 1 enablement');
      expect(created.pinned, isTrue);
      expect(created.muted, isTrue);
      expect(created.emojiTag, '📘');
      expect(created.lastMessage?.hasAttachments, isTrue);

      final cached = persistence.snapshotThreads()!.firstWhere((item) => item.id == thread.id);
      expect(cached.messages.last.attachments.single.url, contains('onboarding.pdf'));
    });

    test('sends messages, updates read receipts, and keeps persistence in sync', () async {
      final persistence = InMemoryCommunicationPersistence();
      final store = InboxStore(persistence: persistence);
      await _pumpStoreHydration();

      final thread = store.state.first;
      final initialUnread = thread.unreadCount;

      final outbound = store.buildMessage(
        author: 'You',
        body: 'Following up with the updated breakout prompts.',
        fromMe: true,
      );

      store.sendMessage(thread.id, outbound);
      await _pumpStoreHydration();

      final updatedThread = store.state.firstWhere((item) => item.id == thread.id);
      expect(updatedThread.messages.last.body, contains('breakout prompts'));
      expect(updatedThread.updatedAt.isAfter(thread.updatedAt), isTrue);
      expect(updatedThread.unreadCount, initialUnread);

      final readAt = DateTime(2024, 5, 1, 9, 30);
      store.markRead(thread.id, readAt);
      await _pumpStoreHydration();

      final readThread = store.state.firstWhere((item) => item.id == thread.id);
      expect(readThread.lastReadAt, readAt);

      final cached = persistence.snapshotThreads()!.firstWhere((item) => item.id == thread.id);
      expect(cached.messages.last.body, contains('breakout prompts'));
      expect(cached.lastReadAt, readAt);
    });
  });

  group('SupportTicketStore', () {
    test('escalates tickets with updates, attachments, and status transitions', () async {
      final persistence = InMemoryCommunicationPersistence();
      final store = SupportTicketStore(persistence: persistence);
      await _pumpStoreHydration();

      final ticket = store.buildTicket(
        subject: 'Learner cannot play cohort replay',
        description: 'Replay video returns a DRM error for multiple learners.',
        priority: SupportPriority.high,
        status: SupportStatus.open,
        contactName: 'Jordan Blake',
        contactEmail: 'jordan@orbitlabs.io',
        tags: const ['video', 'cohort'],
        assignedTo: 'Media Engineering',
      );

      store.createTicket(ticket);
      await _pumpStoreHydration();

      final update = store.buildUpdate(
        author: 'Support Team',
        body: 'Escalated to media engineers and attached CDN diagnostic logs.',
        internal: true,
        attachments: const [
          MessageAttachment(
            label: 'CDN logs',
            url: 'https://cdn.example.com/logs/drm-diagnostics.txt',
          ),
        ],
      );

      store.addUpdate(ticket.id, update);
      store.changeStatus(ticket.id, SupportStatus.inProgress);
      await _pumpStoreHydration();

      final escalated = store.state.firstWhere((item) => item.id == ticket.id);
      expect(escalated.status, SupportStatus.inProgress);
      expect(escalated.updates.last.internal, isTrue);
      expect(escalated.updates.last.attachments.single.label, contains('CDN'));
      expect(escalated.assignedTo, 'Media Engineering');
      expect(escalated.combinedTimeline().last, contains('Escalated to media engineers'));

      final cached = persistence.snapshotTickets()!.firstWhere((item) => item.id == ticket.id);
      expect(cached.status, SupportStatus.inProgress);
      expect(cached.updates.last.attachments.single.url, contains('drm-diagnostics'));
    });
  });
}
