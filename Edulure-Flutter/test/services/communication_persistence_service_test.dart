import 'dart:io';

import 'package:edulure_mobile/provider/communication/communication_models.dart';
import 'package:edulure_mobile/services/communication_persistence_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late HiveInterface hive;
  late CommunicationPersistenceService persistence;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('communication-persistence');
    hive = HiveImpl()..init(tempDir.path);
    persistence = CommunicationPersistenceService(
      hive: hive,
      boxName: 'communication.test',
    );
  });

  tearDown(() async {
    await persistence.reset();
    await persistence.close();
    if (hive.isBoxOpen('communication.test')) {
      final box = hive.box<String>('communication.test');
      await box.close();
    }
    await hive.deleteBoxFromDisk('communication.test');
    await tempDir.delete(recursive: true);
  });

  test('persists threads and tickets snapshots', () async {
    final now = DateTime.now();
    final participant = ConversationParticipant(id: '1', displayName: 'Alex');
    final thread = ConversationThread(
      id: 'thread-1',
      title: 'Welcome crew',
      channel: 'general',
      participants: [participant],
      messages: [
        InboxMessage(
          id: 'msg-1',
          author: 'Alex',
          body: 'Hello team',
          sentAt: now,
        ),
      ],
      createdAt: now.subtract(const Duration(days: 1)),
      updatedAt: now,
    );

    final ticket = SupportTicket(
      id: 'ticket-1',
      subject: 'Account access',
      description: 'Reset MFA device',
      status: SupportStatus.open,
      priority: SupportPriority.medium,
      createdAt: now.subtract(const Duration(hours: 2)),
      updatedAt: now,
      contactName: 'Jordan',
      contactEmail: 'jordan@example.com',
    );

    await persistence.saveThreads([thread]);
    await persistence.saveSupportTickets([ticket]);

    final restoredThreads = await persistence.loadThreads();
    final restoredTickets = await persistence.loadSupportTickets();

    expect(restoredThreads, isNotNull);
    expect(restoredThreads, hasLength(1));
    expect(restoredTickets, isNotNull);
    expect(restoredTickets, hasLength(1));
    expect(restoredThreads!.first.messages.first.body, 'Hello team');
    expect(restoredTickets!.first.subject, 'Account access');
  });

  test('returns null when stored payload is corrupted', () async {
    final box = await hive.openBox<String>('communication.test');
    await box.put('threads', '{invalid-json');
    await box.close();

    final threads = await persistence.loadThreads();
    expect(threads, isNull);

    final reopened = await hive.openBox<String>('communication.test');
    expect(reopened.get('threads'), isNull);
    await reopened.close();
  });
}
