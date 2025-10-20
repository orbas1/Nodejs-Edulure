import 'package:edulure_mobile/provider/profile/user_profile_controller.dart';
import 'package:edulure_mobile/services/user_profile_repository.dart';
import 'package:flutter_test/flutter_test.dart';

class _InMemoryProfileStore implements UserProfileStore {
  final Map<String, String> _storage = {};

  @override
  Future<bool> containsKey(String key) async => _storage.containsKey(key);

  @override
  Future<String?> read(String key) async => _storage[key];

  @override
  Future<void> write(String key, String value) async {
    _storage[key] = value;
  }
}

void main() {
  late UserProfileRepository repository;
  late UserProfileController controller;

  setUp(() async {
    repository = UserProfileRepository(store: _InMemoryProfileStore());
    controller = UserProfileController(repository: repository);
    await controller.bootstrap();
  });

  tearDown(() async {
    await controller.refresh();
  });

  test('bootstrap seeds profiles and selects the first profile', () {
    final snapshot = controller.state.snapshot;
    expect(snapshot.profiles, isNotEmpty);
    expect(snapshot.activeProfileId, isNotNull);
    expect(controller.state.activeProfile, isNotNull);
  });

  test('create and update profile persists changes', () async {
    final created = await controller.createProfile(
      displayName: 'Taylor Rivers',
      headline: 'Coach',
      email: 'taylor@example.com',
      phone: '+1 555 000 0000',
      location: 'Remote',
      avatarUrl: 'https://example.com/avatar.png',
      bannerUrl: 'https://example.com/banner.png',
      bio: 'Helping builders ship transformations.',
      videoIntroUrl: 'https://video.example.com/taylor',
      calendarUrl: 'https://cal.example.com/taylor',
      portfolioUrl: 'https://taylorrivers.com',
      skills: const ['Coaching'],
    );

    final snapshot = controller.state.snapshot;
    expect(snapshot.profiles, anyElement(predicate((UserProfile profile) => profile.id == created.id)));
    expect(snapshot.activeProfileId, created.id);

    final updated = created.copyWith(headline: 'Principal Coach', bio: 'Partnering with teams.');
    await controller.updateProfile(updated);

    final refreshed = controller.state.snapshot.profiles.firstWhere((profile) => profile.id == created.id);
    expect(refreshed.headline, 'Principal Coach');
    expect(refreshed.bio, 'Partnering with teams.');
  });

  test('experience lifecycle can add, update, and delete entries', () async {
    final profile = controller.state.activeProfile!;

    final created = await controller.addExperience(
      profileId: profile.id,
      role: 'Product Mentor',
      organisation: 'Builders Guild',
      startDate: DateTime(2022, 1, 1),
      endDate: DateTime(2023, 1, 1),
      isCurrent: false,
      location: 'Remote',
      highlights: const ['Guided 15 product squads.'],
    );

    var refreshed = controller.state.snapshot.profiles.firstWhere((item) => item.id == profile.id);
    expect(refreshed.experiences.map((item) => item.role), contains('Product Mentor'));

    final updated = created.copyWith(role: 'Lead Product Mentor', highlights: const ['Guided 20 product squads.']);
    await controller.updateExperience(profile.id, updated);

    refreshed = controller.state.snapshot.profiles.firstWhere((item) => item.id == profile.id);
    expect(refreshed.experiences.firstWhere((item) => item.id == updated.id).role, 'Lead Product Mentor');
    expect(refreshed.experiences.firstWhere((item) => item.id == updated.id).highlights.first,
        'Guided 20 product squads.');

    await controller.deleteExperience(profile.id, updated.id);
    refreshed = controller.state.snapshot.profiles.firstWhere((item) => item.id == profile.id);
    expect(refreshed.experiences.where((item) => item.id == updated.id), isEmpty);
  });

  test('education and certifications round-trip correctly', () async {
    final profile = controller.state.activeProfile!;

    final education = await controller.addEducation(
      profileId: profile.id,
      institution: 'Learning Lab',
      fieldOfStudy: 'Leadership',
      startDate: DateTime(2020, 1, 1),
      endDate: DateTime(2020, 12, 31),
      achievements: const ['Capstone award'],
    );

    final certification = await controller.addCertification(
      profileId: profile.id,
      name: 'Certified Leadership Coach',
      organisation: 'Leaders Guild',
      issuedOn: '2021',
      credentialUrl: 'https://guild.example.com/cert',
    );

    var refreshed = controller.state.snapshot.profiles.firstWhere((item) => item.id == profile.id);
    expect(refreshed.education.map((item) => item.id), contains(education.id));
    expect(refreshed.certifications.map((item) => item.id), contains(certification.id));

    final updatedEducation = education.copyWith(fieldOfStudy: 'Leadership Strategy');
    await controller.updateEducation(profile.id, updatedEducation);
    final updatedCertification = certification.copyWith(name: 'Executive Leadership Coach');
    await controller.updateCertification(profile.id, updatedCertification);

    refreshed = controller.state.snapshot.profiles.firstWhere((item) => item.id == profile.id);
    expect(refreshed.education.firstWhere((item) => item.id == updatedEducation.id).fieldOfStudy,
        'Leadership Strategy');
    expect(refreshed.certifications.firstWhere((item) => item.id == updatedCertification.id).name,
        'Executive Leadership Coach');

    await controller.deleteEducation(profile.id, updatedEducation.id);
    await controller.deleteCertification(profile.id, updatedCertification.id);

    refreshed = controller.state.snapshot.profiles.firstWhere((item) => item.id == profile.id);
    expect(refreshed.education.where((item) => item.id == updatedEducation.id), isEmpty);
    expect(refreshed.certifications.where((item) => item.id == updatedCertification.id), isEmpty);
  });

  test('skills and social links enforce uniqueness', () async {
    final profile = controller.state.activeProfile!;

    await controller.upsertSkill(profile.id, 'Systems Thinking');
    await controller.upsertSkill(profile.id, 'Systems Thinking');

    await controller.upsertSocialLink(
      profileId: profile.id,
      platform: 'LinkedIn',
      url: 'https://linkedin.com/in/test-profile',
    );

    await controller.upsertSocialLink(
      profileId: profile.id,
      platform: 'LinkedIn',
      url: 'https://linkedin.com/in/test-profile',
    );

    var refreshed = controller.state.snapshot.profiles.firstWhere((item) => item.id == profile.id);
    expect(refreshed.skills.where((skill) => skill == 'Systems Thinking'), hasLength(1));
    expect(refreshed.socialLinks.where((link) => link.platform == 'LinkedIn'), hasLength(1));

    await controller.removeSkill(profile.id, 'Systems Thinking');
    await controller.deleteSocialLink(profile.id, 'LinkedIn');

    refreshed = controller.state.snapshot.profiles.firstWhere((item) => item.id == profile.id);
    expect(refreshed.skills, isNot(contains('Systems Thinking')));
    expect(refreshed.socialLinks.where((link) => link.platform == 'LinkedIn'), isEmpty);
  });

  test('delete profile removes it and falls back to remaining entry', () async {
    final profileIds = controller.state.snapshot.profiles.map((profile) => profile.id).toList();
    expect(profileIds.length, greaterThan(1));

    final deletedId = profileIds.first;
    await controller.deleteProfile(deletedId);

    final snapshot = controller.state.snapshot;
    expect(snapshot.profiles.map((profile) => profile.id), isNot(contains(deletedId)));
    if (snapshot.profiles.isNotEmpty) {
      expect(snapshot.activeProfileId, snapshot.profiles.first.id);
    } else {
      expect(snapshot.activeProfileId, isNull);
    }
  });
}
