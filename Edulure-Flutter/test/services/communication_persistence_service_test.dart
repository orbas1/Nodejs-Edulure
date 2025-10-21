import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:edulure_mobile/provider/communication/communication_models.dart';
import 'package:edulure_mobile/services/communication_persistence_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('communication_persistence_test');
    Hive.init(tempDir.path);
  });

  tearDown(() async {
    for (final name in Hive.boxNames.toList(growable: false)) {
      if (Hive.isBoxOpen(name)) {
        final box = Hive.box(name);
        await box.close();
      }
      await Hive.deleteBoxFromDisk(name);
    }
  });

  test('persists threads and tickets', () async {
    final service = CommunicationPersistenceService(
      boxName: 'comms.persistence',
      hive: Hive,
    );

    final threads = [
      ConversationThread.fromJson({
        'id': 'thread-1',
        'title': 'Mentor sync',
        'channel': 'inbox',
        'participants': const [
          {'id': 'member-1', 'displayName': 'Taylor'},
        ],
        'messages': [
          {
            'id': 'msg-1',
            'author': 'Taylor',
            'body': 'Great job on the launch!',
            'sentAt': DateTime.utc(2024, 1, 1).toIso8601String(),
            'fromMe': false,
          },
        ],
        'createdAt': DateTime.utc(2024, 1, 1).toIso8601String(),
        'updatedAt': DateTime.utc(2024, 1, 1).toIso8601String(),
      }),
    ];
    final tickets = [
      SupportTicket.fromJson({
        'id': 'ticket-1',
        'subject': 'Billing question',
        'description': 'How do I update my invoice?',
        'status': 'open',
        'priority': 'normal',
        'createdAt': DateTime.utc(2024, 1, 2).toIso8601String(),
        'updatedAt': DateTime.utc(2024, 1, 2).toIso8601String(),
        'contactName': 'Jordan Rivers',
        'contactEmail': 'jordan@example.com',
        'channel': 'in-app',
        'tags': const ['billing'],
        'updates': const [],
      }),
    ];

    await service.saveThreads(threads);
    await service.saveSupportTickets(tickets);

    final restoredThreads = await service.loadThreads();
    final restoredTickets = await service.loadSupportTickets();

    expect(restoredThreads, isNotNull);
    expect(restoredThreads!.single.title, 'Mentor sync');
    expect(restoredTickets, isNotNull);
    expect(restoredTickets!.single.status, 'open');
  });

  test('returns null when no cache exists', () async {
    final service = CommunicationPersistenceService(
      boxName: 'comms.empty',
      hive: Hive,
    );

    expect(await service.loadThreads(), isNull);
    expect(await service.loadSupportTickets(), isNull);
  });
}
