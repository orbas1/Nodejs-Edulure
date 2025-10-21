import '../../lib/provider/communication/communication_models.dart';
import '../../lib/services/communication_persistence_service.dart';

class FakeCommunicationPersistence implements CommunicationPersistence {
  FakeCommunicationPersistence({List<ConversationThread>? threads, List<SupportTicket>? tickets})
      : _threads = threads,
        _tickets = tickets;

  List<ConversationThread>? _threads;
  List<SupportTicket>? _tickets;

  @override
  Future<List<ConversationThread>?> loadThreads() async =>
      _threads?.map((thread) => thread.copyWith(messages: List.of(thread.messages))).toList();

  @override
  Future<void> saveThreads(List<ConversationThread> threads) async {
    _threads = threads.map((thread) => thread.copyWith(messages: List.of(thread.messages))).toList();
  }

  @override
  Future<List<SupportTicket>?> loadSupportTickets() async =>
      _tickets?.map(_cloneTicket).toList(growable: false);

  @override
  Future<void> saveSupportTickets(List<SupportTicket> tickets) async {
    _tickets = tickets.map(_cloneTicket).toList(growable: false);
  }

  void seedTickets(List<SupportTicket> tickets) {
    _tickets = tickets.map(_cloneTicket).toList(growable: false);
  }

  List<SupportTicket> snapshotTickets() => _tickets ?? const <SupportTicket>[];

  List<ConversationThread> snapshotThreads() => _threads ?? const <ConversationThread>[];

  SupportTicket _cloneTicket(SupportTicket ticket) {
    return SupportTicket(
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      contactName: ticket.contactName,
      contactEmail: ticket.contactEmail,
      channel: ticket.channel,
      tags: List<String>.from(ticket.tags),
      updates: ticket.updates
          .map(
            (update) => SupportUpdate(
              id: update.id,
              author: update.author,
              body: update.body,
              sentAt: update.sentAt,
              internal: update.internal,
              attachments: update.attachments
                  .map(
                    (attachment) => MessageAttachment(label: attachment.label, url: attachment.url),
                  )
                  .toList(),
            ),
          )
          .toList(),
      slaDueAt: ticket.slaDueAt,
      assetUrl: ticket.assetUrl,
      assignedTo: ticket.assignedTo,
    );
  }
}
