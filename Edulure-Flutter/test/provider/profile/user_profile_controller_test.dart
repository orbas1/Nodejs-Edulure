import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/provider/profile/user_profile_controller.dart';
import 'package:edulure_mobile/services/user_profile_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('UserProfileController', () {
    late InMemoryUserProfileStore store;
    late UserProfileRepository repository;
    late UserProfileController controller;

    setUp(() {
      store = InMemoryUserProfileStore();
      repository = UserProfileRepository(store: store);
      controller = UserProfileController(repository: repository);
    });

    test('bootstrap seeds initial profiles and selects first profile', () async {
      expect(store.storage, isEmpty);

      await controller.bootstrap();

      expect(store.storage, isNotEmpty);
      expect(controller.state.snapshot.profiles, isNotEmpty);
      expect(controller.state.snapshot.activeProfileId, isNotNull);
      expect(controller.state.activeProfile?.displayName, 'Alex Morgan');
    });

    test('createProfile persists to store and becomes active profile', () async {
      await controller.bootstrap();

      final profile = await controller.createProfile(
        displayName: 'Jamie Lee',
        headline: 'Community Strategist',
        email: 'jamie.lee@example.com',
        phone: '+1 555 0101',
        location: 'Remote',
        avatarUrl: 'https://example.com/avatar.png',
        bannerUrl: 'https://example.com/banner.jpg',
        bio: 'Helping cohorts create transformational results.',
        skills: const ['Community', 'Strategy'],
      );

      expect(controller.state.snapshot.profiles.any((p) => p.id == profile.id), isTrue);
      expect(controller.state.snapshot.activeProfileId, profile.id);

      final raw = store.storage[InMemoryUserProfileStore.profilesKey]!;
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final profiles = decoded['profiles'] as List<dynamic>;
      expect(profiles.any((item) => (item as Map<String, dynamic>)['displayName'] == 'Jamie Lee'), isTrue);
    });

    test('deleteProfile reassigns active profile when needed', () async {
      await controller.bootstrap();
      final initialProfiles = controller.state.snapshot.profiles;
      final removedId = initialProfiles.first.id;

      await controller.deleteProfile(removedId);

      expect(controller.state.snapshot.profiles.length, initialProfiles.length - 1);
      expect(controller.state.snapshot.profiles.any((profile) => profile.id == removedId), isFalse);
      if (initialProfiles.length > 1) {
        expect(controller.state.snapshot.activeProfileId, isNot(removedId));
      } else {
        expect(controller.state.snapshot.activeProfileId, isNull);
      }
    });

    test('upsertSkill adds sorted unique skill entries', () async {
      await controller.bootstrap();
      final activeProfileId = controller.state.snapshot.activeProfileId!;

      await controller.upsertSkill(activeProfileId, ' Facilitation ');
      await controller.upsertSkill(activeProfileId, 'Community');

      final profile = controller.state.snapshot.profiles
          .firstWhere((item) => item.id == activeProfileId);
      expect(profile.skills, containsAll(<String>['Community', 'Facilitation']));
      final sorted = [...profile.skills];
      final sortedCopy = [...profile.skills]..sort();
      expect(sorted, sortedCopy);
    });
  });
}

class InMemoryUserProfileStore implements UserProfileStore {
  InMemoryUserProfileStore();

  static const String profilesKey = 'profiles';

  final Map<String, String> storage = <String, String>{};

  @override
  Future<bool> containsKey(String key) async => storage.containsKey(key);

  @override
  Future<String?> read(String key) async => storage[key];

  @override
  Future<void> write(String key, String value) async {
    storage[key] = value;
  }
}
