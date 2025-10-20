import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../services/user_profile_repository.dart';

final userProfileRepositoryProvider = Provider<UserProfileRepository>((ref) {
  return UserProfileRepository();
});

final userProfileControllerProvider =
    StateNotifierProvider<UserProfileController, UserProfileState>((ref) {
  final repository = ref.watch(userProfileRepositoryProvider);
  return UserProfileController(repository: repository);
});

class UserProfileState {
  const UserProfileState({
    this.snapshot = const UserProfileSnapshot(),
    this.loading = false,
    this.saving = false,
    this.error,
  });

  final UserProfileSnapshot snapshot;
  final bool loading;
  final bool saving;
  final String? error;

  UserProfileState copyWith({
    UserProfileSnapshot? snapshot,
    bool? loading,
    bool? saving,
    String? error,
    bool clearError = false,
  }) {
    return UserProfileState(
      snapshot: snapshot ?? this.snapshot,
      loading: loading ?? this.loading,
      saving: saving ?? this.saving,
      error: clearError ? null : error ?? this.error,
    );
  }

  UserProfile? get activeProfile {
    if (snapshot.activeProfileId == null) {
      return null;
    }
    return snapshot.profiles
        .where((profile) => profile.id == snapshot.activeProfileId)
        .cast<UserProfile?>()
        .firstWhere((profile) => profile != null, orElse: () => null);
  }
}

class UserProfileController extends StateNotifier<UserProfileState> {
  UserProfileController({required UserProfileRepository repository})
      : _repository = repository,
        super(const UserProfileState());

  final UserProfileRepository _repository;
  final Uuid _uuid = const Uuid();
  Completer<void>? _bootstrapCompleter;

  Future<void> bootstrap() async {
    if (_bootstrapCompleter != null) {
      return _bootstrapCompleter!.future;
    }
    _bootstrapCompleter = Completer<void>();
    state = state.copyWith(loading: true, clearError: true);
    try {
      await _repository.seedIfNeeded();
      final snapshot = await _repository.load();
      state = state.copyWith(snapshot: snapshot, loading: false, clearError: true);
      _bootstrapCompleter!.complete();
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
      _bootstrapCompleter!.completeError(error);
      rethrow;
    } finally {
      _bootstrapCompleter = null;
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final snapshot = await _repository.load();
      state = state.copyWith(snapshot: snapshot, loading: false, clearError: true);
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> _persist(UserProfileSnapshot snapshot) async {
    state = state.copyWith(snapshot: snapshot, saving: true, clearError: true);
    try {
      await _repository.save(snapshot);
    } catch (error) {
      state = state.copyWith(error: error.toString());
      rethrow;
    } finally {
      state = state.copyWith(saving: false);
    }
  }

  Future<void> selectProfile(String profileId) async {
    if (state.snapshot.activeProfileId == profileId) {
      return;
    }
    final snapshot = state.snapshot.copyWith(activeProfileId: profileId);
    await _persist(snapshot);
  }

  Future<UserProfile> createProfile({
    required String displayName,
    required String headline,
    required String email,
    required String phone,
    required String location,
    required String avatarUrl,
    required String bannerUrl,
    String? bio,
    String? videoIntroUrl,
    String? calendarUrl,
    String? portfolioUrl,
    List<String>? skills,
  }) async {
    final profile = UserProfile(
      id: _uuid.v4(),
      displayName: displayName,
      headline: headline,
      bio: bio ?? '',
      email: email,
      phone: phone,
      location: location,
      avatarUrl: avatarUrl,
      bannerUrl: bannerUrl,
      videoIntroUrl: videoIntroUrl ?? '',
      calendarUrl: calendarUrl ?? '',
      portfolioUrl: portfolioUrl ?? '',
      skills: skills ?? const <String>[],
    );
    final profiles = [...state.snapshot.profiles, profile];
    final snapshot = state.snapshot.copyWith(
      profiles: profiles,
      activeProfileId: profile.id,
    );
    await _persist(snapshot);
    return profile;
  }

  Future<void> updateProfile(UserProfile profile) async {
    final profiles = state.snapshot.profiles
        .map((item) => item.id == profile.id ? profile : item)
        .toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<void> deleteProfile(String profileId) async {
    final profiles = state.snapshot.profiles
        .where((profile) => profile.id != profileId)
        .toList();
    final activeId = state.snapshot.activeProfileId == profileId
        ? (profiles.isEmpty ? null : profiles.first.id)
        : state.snapshot.activeProfileId;
    final snapshot = state.snapshot.copyWith(
      profiles: profiles,
      activeProfileId: activeId,
    );
    await _persist(snapshot);
  }

  Future<void> upsertSkill(String profileId, String skill) async {
    final trimmed = skill.trim();
    if (trimmed.isEmpty) {
      return;
    }
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final updated = {...profile.skills};
        updated.add(trimmed);
        final sorted = updated.toList()..sort();
        return profile.copyWith(skills: sorted);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<void> removeSkill(String profileId, String skill) async {
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final remaining = profile.skills.where((item) => item != skill).toList();
        return profile.copyWith(skills: remaining);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<UserExperience> addExperience({
    required String profileId,
    required String role,
    required String organisation,
    required DateTime startDate,
    DateTime? endDate,
    bool isCurrent = false,
    String location = '',
    List<String>? highlights,
  }) async {
    final experience = UserExperience(
      id: _uuid.v4(),
      role: role,
      organisation: organisation,
      startDate: startDate,
      endDate: endDate,
      isCurrent: isCurrent,
      location: location,
      highlights: highlights ?? const <String>[],
    );
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        return profile.copyWith(
          experiences: [experience, ...profile.experiences],
        );
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
    return experience;
  }

  Future<void> updateExperience(String profileId, UserExperience experience) async {
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final experiences = profile.experiences
            .map((item) => item.id == experience.id ? experience : item)
            .toList();
        return profile.copyWith(experiences: experiences);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<void> deleteExperience(String profileId, String experienceId) async {
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final experiences =
            profile.experiences.where((item) => item.id != experienceId).toList();
        return profile.copyWith(experiences: experiences);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<UserEducation> addEducation({
    required String profileId,
    required String institution,
    required String fieldOfStudy,
    required DateTime startDate,
    DateTime? endDate,
    List<String>? achievements,
  }) async {
    final education = UserEducation(
      id: _uuid.v4(),
      institution: institution,
      fieldOfStudy: fieldOfStudy,
      startDate: startDate,
      endDate: endDate,
      achievements: achievements ?? const <String>[],
    );
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        return profile.copyWith(education: [education, ...profile.education]);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
    return education;
  }

  Future<void> updateEducation(String profileId, UserEducation education) async {
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final items = profile.education
            .map((item) => item.id == education.id ? education : item)
            .toList();
        return profile.copyWith(education: items);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<void> deleteEducation(String profileId, String educationId) async {
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final items = profile.education.where((item) => item.id != educationId).toList();
        return profile.copyWith(education: items);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<UserCertification> addCertification({
    required String profileId,
    required String name,
    required String organisation,
    required String issuedOn,
    String? credentialUrl,
  }) async {
    final certification = UserCertification(
      id: _uuid.v4(),
      name: name,
      organisation: organisation,
      issuedOn: issuedOn,
      credentialUrl: credentialUrl,
    );
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        return profile.copyWith(
          certifications: [certification, ...profile.certifications],
        );
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
    return certification;
  }

  Future<void> updateCertification(String profileId, UserCertification certification) async {
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final items = profile.certifications
            .map((item) => item.id == certification.id ? certification : item)
            .toList();
        return profile.copyWith(certifications: items);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<void> deleteCertification(String profileId, String certificationId) async {
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final items =
            profile.certifications.where((item) => item.id != certificationId).toList();
        return profile.copyWith(certifications: items);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<void> upsertSocialLink({
    required String profileId,
    required String platform,
    required String url,
  }) async {
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final links = [...profile.socialLinks];
        final index = links.indexWhere((link) => link.platform == platform);
        final link = UserSocialLink(platform: platform, url: url);
        if (index >= 0) {
          links[index] = link;
        } else {
          links.add(link);
        }
        links.sort((a, b) => a.platform.compareTo(b.platform));
        return profile.copyWith(socialLinks: links);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }

  Future<void> deleteSocialLink(String profileId, String platform) async {
    final profiles = state.snapshot.profiles.map((profile) {
      if (profile.id == profileId) {
        final links = profile.socialLinks
            .where((link) => link.platform != platform)
            .toList();
        return profile.copyWith(socialLinks: links);
      }
      return profile;
    }).toList();
    final snapshot = state.snapshot.copyWith(profiles: profiles);
    await _persist(snapshot);
  }
}
