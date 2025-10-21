import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:edulure_mobile/provider/communication/communication_models.dart';
import 'package:edulure_mobile/provider/communication/communication_store.dart';
import 'package:edulure_mobile/services/communication_persistence_service.dart';

class _MockCommunicationPersistence extends Mock implements CommunicationPersistence {}

Future<void> _pumpQueue() => Future<void>.delayed(Duration.zero);

ConversationThread _thread(String id) {
  final now = DateTime.now();
  return ConversationThread(
    id: id,
    title: 'Thread $id',
    channel: 'team',
    participants: const <ConversationParticipant>[],
    messages: <InboxMessage>[
      InboxMessage(id: 'msg-$id', author: 'Jamie', body: 'Hello', sentAt: now),
    ],
    createdAt: now,
    updatedAt: now,
  );
}

void main() {
  late _MockCommunicationPersistence persistence;

  setUp(() {
    persistence = _MockCommunicationPersistence();
    registerFallbackValue(<ConversationThread>[]);
    when(persistence.saveThreads).thenAnswer((_) async {});
    when(persistence.loadSupportTickets).thenAnswer((_) async => null);
    when(persistence.saveSupportTickets).thenAnswer((_) async {});
  });

  test('hydrates from persistence when available', () async {
    final threads = <ConversationThread>[_thread('1')];
    when(persistence.loadThreads).thenAnswer((_) async => threads);

    final store = InboxStore(persistence: persistence);
    await _pumpQueue();

    expect(store.state, threads);
  });

  test('persists when state changes after hydration', () async {
    when(persistence.loadThreads).thenAnswer((_) async => <ConversationThread>[_thread('1')]);

    final store = InboxStore(persistence: persistence);
    await _pumpQueue();

    store.createThread(_thread('2'));
    await _pumpQueue();

    verify(() => persistence.saveThreads(any())).called(greaterThan(0));
  });
}
