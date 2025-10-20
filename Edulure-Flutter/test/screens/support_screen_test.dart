import 'package:edulure_mobile/provider/communication/communication_models.dart';
import 'package:edulure_mobile/provider/communication/communication_store.dart';
import 'package:edulure_mobile/screens/support_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_util/fake_communication_persistence.dart';

void main() {
  group('SupportScreen', () {
    late FakeCommunicationPersistence fakePersistence;

    setUp(() {
      final now = DateTime(2024, 1, 1, 12);
      fakePersistence = FakeCommunicationPersistence(tickets: [
        SupportTicket(
          id: 'ticket-1',
          subject: 'Billing question',
          description: 'Need copy of latest invoice',
          status: SupportStatus.open,
          priority: SupportPriority.normal,
          createdAt: now.subtract(const Duration(days: 1)),
          updatedAt: now.subtract(const Duration(hours: 2)),
          contactName: 'Jamie Chen',
          contactEmail: 'jamie@example.com',
          channel: 'email',
          tags: const ['billing'],
        ),
        SupportTicket(
          id: 'ticket-2',
          subject: 'Platform outage follow-up',
          description: 'Learners need update on outage timeline',
          status: SupportStatus.awaitingCustomer,
          priority: SupportPriority.high,
          createdAt: now.subtract(const Duration(days: 2)),
          updatedAt: now.subtract(const Duration(hours: 1)),
          contactName: 'Leila Haddad',
          contactEmail: 'leila@example.com',
          channel: 'chat',
          tags: const ['incident'],
        ),
      ]);
    });

    Future<void> _pumpSupportScreen(WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            communicationPersistenceProvider.overrideWithValue(fakePersistence),
          ],
          child: const MaterialApp(home: SupportScreen()),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('enables add update button when note entered', (tester) async {
      await _pumpSupportScreen(tester);

      final addButtonFinder = find.widgetWithText(FilledButton, 'Add update');
      expect(tester.widget<FilledButton>(addButtonFinder).onPressed, isNull);

      await tester.enterText(find.bySemanticsLabel('Add update'), 'Escalated to infrastructure.');
      await tester.pump();

      expect(tester.widget<FilledButton>(addButtonFinder).onPressed, isNotNull);
    });

    testWidgets('filters tickets by search query and updates detail view', (tester) async {
      await _pumpSupportScreen(tester);

      await tester.enterText(
        find.bySemanticsLabel('Search by subject, requester, or tag'),
        'outage',
      );
      await tester.pumpAndSettle();

      expect(find.text('Platform outage follow-up'), findsOneWidget);
      expect(find.text('Billing question'), findsNothing);
      expect(find.textContaining('Learners need update on outage timeline'), findsOneWidget);
    });
  });
}
