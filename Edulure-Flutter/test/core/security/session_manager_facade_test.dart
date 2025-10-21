import 'dart:async';

import 'package:edulure_mobile/core/security/session_manager_facade.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockSessionManagerBinding extends Mock implements SessionManagerBinding {}

class _TestSessionListenable extends ChangeNotifier {
  void trigger() {
    notifyListeners();
  }
}

void main() {
  setUpAll(() {
    registerFallbackValue(<String, dynamic>{});
  });

  group('SessionManagerFacade', () {
    late _MockSessionManagerBinding binding;
    late SessionManagerFacade facade;

    setUp(() {
      binding = _MockSessionManagerBinding();
      facade = SessionManagerFacade(binding: binding);
    });

    test('exposes session and token details from the binding', () {
      when(() => binding.getSession()).thenReturn({'id': '123'});
      when(() => binding.getAccessToken()).thenReturn('access');
      when(() => binding.getRefreshToken()).thenReturn('refresh');
      when(() => binding.getActiveRole()).thenReturn('admin');

      expect(facade.session, {'id': '123'});
      expect(facade.accessToken, 'access');
      expect(facade.refreshToken, 'refresh');
      expect(facade.activeRole, 'admin');
    });

    test('delegates saveSession, clear, and setActiveRole operations', () async {
      when(() => binding.saveSession(any())).thenAnswer((_) async {});
      when(() => binding.clear()).thenAnswer((_) async {});
      when(() => binding.setActiveRole(any())).thenAnswer((_) async {});

      await facade.saveSession({'token': 'abc'});
      await facade.clear();
      await facade.setActiveRole(' instructor ');

      verify(() => binding.saveSession({'token': 'abc'})).called(1);
      verify(() => binding.clear()).called(1);
      verify(() => binding.setActiveRole('instructor')).called(1);
    });

    test('setActiveRole throws when provided role is blank', () {
      expect(() => facade.setActiveRole('  '), throwsArgumentError);
      verifyNever(() => binding.setActiveRole(any()));
    });

    test('sessionChanges emits the latest session snapshot and updates', () async {
      final notifier = _TestSessionListenable();
      when(() => binding.sessionListenable()).thenReturn(notifier);

      final sessions = <Map<String, dynamic>?>[
        {'id': 'initial'},
        {'id': 'updated'},
        null,
      ];
      var index = 0;
      when(() => binding.getSession()).thenAnswer((_) => sessions[index]);

      final events = <Map<String, dynamic>?>[];
      final subscription = facade.sessionChanges().listen(events.add);

      await Future<void>.delayed(Duration.zero);
      expect(events, [sessions[0]]);

      index = 1;
      notifier.trigger();
      await Future<void>.delayed(Duration.zero);
      expect(events, [sessions[0], sessions[1]]);

      await subscription.cancel();

      index = 2;
      notifier.trigger();
      await Future<void>.delayed(Duration.zero);

      expect(events, [sessions[0], sessions[1]]);
      verify(() => binding.sessionListenable()).called(1);
      verify(() => binding.getSession()).called(2);
    });

    test('sessionChanges supports multiple listeners simultaneously', () async {
      final notifier = _TestSessionListenable();
      when(() => binding.sessionListenable()).thenReturn(notifier);

      var session = {'id': 'initial'};
      when(() => binding.getSession()).thenAnswer((_) => session);

      final first = <Map<String, dynamic>?>[];
      final second = <Map<String, dynamic>?>[];

      final stream = facade.sessionChanges();
      final subOne = stream.listen(first.add);
      final subTwo = stream.listen(second.add);

      await Future<void>.delayed(Duration.zero);
      expect(first, [session]);
      expect(second, [session]);

      session = {'id': 'updated'};
      notifier.trigger();
      await Future<void>.delayed(Duration.zero);

      expect(first.last, session);
      expect(second.last, session);

      await subOne.cancel();
      await subTwo.cancel();
      verify(() => binding.sessionListenable()).called(1);
      verify(() => binding.getSession()).called(4);
    });
  });
}
