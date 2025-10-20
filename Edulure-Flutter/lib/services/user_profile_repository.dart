import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

class UserProfileRepository {
  UserProfileRepository({UserProfileStore? store}) : _store = store ?? HiveUserProfileStore();

  static const _activeProfileKey = 'activeProfileId';
  static const _profilesKey = 'profiles';

  final UserProfileStore _store;

  Future<void> seedIfNeeded() async {
    final hasProfiles = await _store.containsKey(_profilesKey);
    if (hasProfiles) {
      return;
    }

    final now = DateTime.now();
    final seedProfiles = [
      UserProfile(
        id: 'seed-profile-alex',
        displayName: 'Alex Morgan',
        headline: 'Founder · Growth Operator',
        bio:
            'Operator and coach helping revenue teams build resilient pipelines. Leading the Edulure creator collective.',
        email: 'alex.morgan@edulure.com',
        phone: '+1 415 555 0114',
        location: 'San Francisco, USA',
        avatarUrl: 'https://i.pravatar.cc/150?img=28',
        bannerUrl: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?auto=format&fit=crop&w=1400&q=80',
        videoIntroUrl: 'https://video.example.com/watch/alex-intro',
        calendarUrl: 'https://cal.example.com/alex',
        portfolioUrl: 'https://alexmorgan.co',
        skills: const ['Revenue Ops', 'Lifecycle Strategy', 'Enablement', 'Community'],
        experiences: [
          UserExperience(
            id: 'exp-edulure',
            role: 'Founder & Head of Community',
            organisation: 'Edulure',
            startDate: DateTime(now.year - 2, 5),
            endDate: null,
            isCurrent: true,
            location: 'Remote',
            highlights: const [
              'Scaled community-led growth flywheel powering 240% ARR growth.',
              'Launched hybrid accelerator with 92% completion rate.',
            ],
          ),
          UserExperience(
            id: 'exp-growth',
            role: 'Principal Consultant',
            organisation: 'Growth Operator',
            startDate: DateTime(now.year - 5, 3),
            endDate: DateTime(now.year - 2, 2),
            isCurrent: false,
            location: 'Austin, USA',
            highlights: const [
              'Advised 18 SaaS teams on GTM playbooks and revenue analytics.',
            ],
          ),
        ],
        education: [
          UserEducation(
            id: 'edu-berkeley',
            institution: 'UC Berkeley',
            fieldOfStudy: 'MBA, Strategy & Analytics',
            startDate: DateTime(now.year - 10),
            endDate: DateTime(now.year - 8),
            achievements: const ['Dean\'s list', 'Innovation Lab fellow'],
          ),
        ],
        certifications: const [
          UserCertification(
            id: 'cert-revenue',
            name: 'Revenue Architecture Leader',
            organisation: 'RevOps Guild',
            issuedOn: '2021',
            credentialUrl: 'https://revops.example.com/credentials/rev-arch',
          ),
        ],
        socialLinks: const [
          UserSocialLink(platform: 'LinkedIn', url: 'https://www.linkedin.com/in/alexmorgan'),
          UserSocialLink(platform: 'YouTube', url: 'https://youtube.com/@alexgrowth'),
          UserSocialLink(platform: 'Substack', url: 'https://alexgrowth.substack.com'),
        ],
      ),
      UserProfile(
        id: 'seed-profile-priya',
        displayName: 'Priya Patel',
        headline: 'Learning Designer · Instructor',
        bio:
            'Designing modern cohort-based learning experiences with a focus on inclusivity and measurable outcomes.',
        email: 'priya.patel@edulure.com',
        phone: '+44 20 7946 0998',
        location: 'London, United Kingdom',
        avatarUrl: 'https://i.pravatar.cc/150?img=48',
        bannerUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80',
        videoIntroUrl: 'https://video.example.com/watch/priya-intro',
        calendarUrl: 'https://cal.example.com/priya',
        portfolioUrl: 'https://priyapatel.design',
        skills: const ['Curriculum Design', 'Accessibility', 'Workshop Facilitation'],
        experiences: [
          UserExperience(
            id: 'exp-instructor',
            role: 'Lead Instructor',
            organisation: 'Edulure Studio',
            startDate: DateTime(now.year - 1, 1),
            endDate: null,
            isCurrent: true,
            location: 'Remote',
            highlights: const [
              'Authored Playbook for Learning Pods adopted by 12 partner orgs.',
              'Launched async-first microlearning tracks with 78 NPS.',
            ],
          ),
        ],
        education: [
          UserEducation(
            id: 'edu-oxford',
            institution: 'University of Oxford',
            fieldOfStudy: 'MSc, Digital Education',
            startDate: DateTime(now.year - 7),
            endDate: DateTime(now.year - 5),
            achievements: const ['Merit scholarship'],
          ),
        ],
        certifications: const [
          UserCertification(
            id: 'cert-learn',
            name: 'Learning Experience Designer',
            organisation: 'LX Labs',
            issuedOn: '2020',
            credentialUrl: 'https://lxlabs.example.com/credentials/lxd',
          ),
        ],
        socialLinks: const [
          UserSocialLink(platform: 'LinkedIn', url: 'https://www.linkedin.com/in/priyapatel'),
          UserSocialLink(platform: 'Behance', url: 'https://behance.net/priyapatel'),
        ],
      ),
    ];

    final payload = {
      'profiles': seedProfiles.map((profile) => profile.toJson()).toList(),
      'activeProfileId': seedProfiles.first.id,
    };

    await _store.write(_profilesKey, jsonEncode(payload));
  }

  Future<UserProfileSnapshot> load() async {
    final raw = await _store.read(_profilesKey);
    if (raw == null) {
      return const UserProfileSnapshot();
    }
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final profilesRaw = decoded['profiles'];
      final activeId = decoded[_activeProfileKey]?.toString();
      final profiles = <UserProfile>[];
      if (profilesRaw is List) {
        for (final item in profilesRaw) {
          if (item is Map) {
            profiles.add(UserProfile.fromJson(Map<String, dynamic>.from(item as Map)));
          }
        }
      }
      return UserProfileSnapshot(profiles: profiles, activeProfileId: activeId);
    } catch (error, stackTrace) {
      debugPrint('Failed to decode profile cache: $error');
      debugPrint('$stackTrace');
      return const UserProfileSnapshot();
    }
  }

  Future<void> save(UserProfileSnapshot snapshot) async {
    final payload = <String, dynamic>{
      'profiles': snapshot.profiles.map((profile) => profile.toJson()).toList(),
      _activeProfileKey: snapshot.activeProfileId,
    };
    await _store.write(_profilesKey, jsonEncode(payload));
  }
}

class UserProfileSnapshot {
  const UserProfileSnapshot({
    this.profiles = const <UserProfile>[],
    this.activeProfileId,
  });

  final List<UserProfile> profiles;
  final String? activeProfileId;

  UserProfileSnapshot copyWith({
    List<UserProfile>? profiles,
    String? activeProfileId,
  }) {
    return UserProfileSnapshot(
      profiles: profiles ?? this.profiles,
      activeProfileId: activeProfileId ?? this.activeProfileId,
    );
  }
}

abstract class UserProfileStore {
  const UserProfileStore();

  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<bool> containsKey(String key);
}

class HiveUserProfileStore implements UserProfileStore {
  HiveUserProfileStore({String boxName = 'user.profile.cache'}) : _boxName = boxName;

  final String _boxName;
  Box<String>? _box;

  Future<Box<String>> _ensure() async {
    final cached = _box;
    if (cached != null && cached.isOpen) {
      return cached;
    }
    final opened = await Hive.openBox<String>(_boxName);
    _box = opened;
    return opened;
  }

  @override
  Future<bool> containsKey(String key) async {
    final box = await _ensure();
    return box.containsKey(key);
  }

  @override
  Future<String?> read(String key) async {
    final box = await _ensure();
    return box.get(key);
  }

  @override
  Future<void> write(String key, String value) async {
    final box = await _ensure();
    await box.put(key, value);
  }
}

class UserProfile {
  UserProfile({
    required this.id,
    required this.displayName,
    required this.headline,
    required this.bio,
    required this.email,
    required this.phone,
    required this.location,
    required this.avatarUrl,
    required this.bannerUrl,
    required this.videoIntroUrl,
    required this.calendarUrl,
    required this.portfolioUrl,
    this.skills = const <String>[],
    this.experiences = const <UserExperience>[],
    this.education = const <UserEducation>[],
    this.certifications = const <UserCertification>[],
    this.socialLinks = const <UserSocialLink>[],
  });

  final String id;
  final String displayName;
  final String headline;
  final String bio;
  final String email;
  final String phone;
  final String location;
  final String avatarUrl;
  final String bannerUrl;
  final String videoIntroUrl;
  final String calendarUrl;
  final String portfolioUrl;
  final List<String> skills;
  final List<UserExperience> experiences;
  final List<UserEducation> education;
  final List<UserCertification> certifications;
  final List<UserSocialLink> socialLinks;

  UserProfile copyWith({
    String? displayName,
    String? headline,
    String? bio,
    String? email,
    String? phone,
    String? location,
    String? avatarUrl,
    String? bannerUrl,
    String? videoIntroUrl,
    String? calendarUrl,
    String? portfolioUrl,
    List<String>? skills,
    List<UserExperience>? experiences,
    List<UserEducation>? education,
    List<UserCertification>? certifications,
    List<UserSocialLink>? socialLinks,
  }) {
    return UserProfile(
      id: id,
      displayName: displayName ?? this.displayName,
      headline: headline ?? this.headline,
      bio: bio ?? this.bio,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      location: location ?? this.location,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bannerUrl: bannerUrl ?? this.bannerUrl,
      videoIntroUrl: videoIntroUrl ?? this.videoIntroUrl,
      calendarUrl: calendarUrl ?? this.calendarUrl,
      portfolioUrl: portfolioUrl ?? this.portfolioUrl,
      skills: skills ?? this.skills,
      experiences: experiences ?? this.experiences,
      education: education ?? this.education,
      certifications: certifications ?? this.certifications,
      socialLinks: socialLinks ?? this.socialLinks,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'displayName': displayName,
      'headline': headline,
      'bio': bio,
      'email': email,
      'phone': phone,
      'location': location,
      'avatarUrl': avatarUrl,
      'bannerUrl': bannerUrl,
      'videoIntroUrl': videoIntroUrl,
      'calendarUrl': calendarUrl,
      'portfolioUrl': portfolioUrl,
      'skills': skills,
      'experiences': experiences.map((experience) => experience.toJson()).toList(),
      'education': education.map((edu) => edu.toJson()).toList(),
      'certifications': certifications.map((cert) => cert.toJson()).toList(),
      'socialLinks': socialLinks.map((link) => link.toJson()).toList(),
    };
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? 'Profile',
      headline: json['headline']?.toString() ?? '',
      bio: json['bio']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      location: json['location']?.toString() ?? '',
      avatarUrl: json['avatarUrl']?.toString() ?? '',
      bannerUrl: json['bannerUrl']?.toString() ?? '',
      videoIntroUrl: json['videoIntroUrl']?.toString() ?? '',
      calendarUrl: json['calendarUrl']?.toString() ?? '',
      portfolioUrl: json['portfolioUrl']?.toString() ?? '',
      skills: _castStringList(json['skills']),
      experiences: _castList(json['experiences'], UserExperience.fromJson),
      education: _castList(json['education'], UserEducation.fromJson),
      certifications: _castList(json['certifications'], UserCertification.fromJson),
      socialLinks: _castList(json['socialLinks'], UserSocialLink.fromJson),
    );
  }
}

class UserExperience {
  const UserExperience({
    required this.id,
    required this.role,
    required this.organisation,
    required this.startDate,
    required this.endDate,
    required this.isCurrent,
    required this.location,
    this.highlights = const <String>[],
  });

  final String id;
  final String role;
  final String organisation;
  final DateTime startDate;
  final DateTime? endDate;
  final bool isCurrent;
  final String location;
  final List<String> highlights;

  UserExperience copyWith({
    String? role,
    String? organisation,
    DateTime? startDate,
    DateTime? endDate,
    bool? isCurrent,
    String? location,
    List<String>? highlights,
  }) {
    return UserExperience(
      id: id,
      role: role ?? this.role,
      organisation: organisation ?? this.organisation,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isCurrent: isCurrent ?? this.isCurrent,
      location: location ?? this.location,
      highlights: highlights ?? this.highlights,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'role': role,
      'organisation': organisation,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'isCurrent': isCurrent,
      'location': location,
      'highlights': highlights,
    };
  }

  factory UserExperience.fromJson(Map<String, dynamic> json) {
    return UserExperience(
      id: json['id']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      organisation: json['organisation']?.toString() ?? '',
      startDate: DateTime.tryParse(json['startDate']?.toString() ?? '') ?? DateTime.now(),
      endDate: json['endDate'] == null
          ? null
          : DateTime.tryParse(json['endDate']?.toString() ?? ''),
      isCurrent: json['isCurrent'] == true || json['isCurrent']?.toString() == 'true',
      location: json['location']?.toString() ?? '',
      highlights: _castStringList(json['highlights']),
    );
  }
}

class UserEducation {
  const UserEducation({
    required this.id,
    required this.institution,
    required this.fieldOfStudy,
    required this.startDate,
    required this.endDate,
    this.achievements = const <String>[],
  });

  final String id;
  final String institution;
  final String fieldOfStudy;
  final DateTime startDate;
  final DateTime? endDate;
  final List<String> achievements;

  UserEducation copyWith({
    String? institution,
    String? fieldOfStudy,
    DateTime? startDate,
    DateTime? endDate,
    List<String>? achievements,
  }) {
    return UserEducation(
      id: id,
      institution: institution ?? this.institution,
      fieldOfStudy: fieldOfStudy ?? this.fieldOfStudy,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      achievements: achievements ?? this.achievements,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'institution': institution,
      'fieldOfStudy': fieldOfStudy,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'achievements': achievements,
    };
  }

  factory UserEducation.fromJson(Map<String, dynamic> json) {
    return UserEducation(
      id: json['id']?.toString() ?? '',
      institution: json['institution']?.toString() ?? '',
      fieldOfStudy: json['fieldOfStudy']?.toString() ?? '',
      startDate: DateTime.tryParse(json['startDate']?.toString() ?? '') ?? DateTime.now(),
      endDate: json['endDate'] == null
          ? null
          : DateTime.tryParse(json['endDate']?.toString() ?? ''),
      achievements: _castStringList(json['achievements']),
    );
  }
}

class UserCertification {
  const UserCertification({
    required this.id,
    required this.name,
    required this.organisation,
    required this.issuedOn,
    this.credentialUrl,
  });

  final String id;
  final String name;
  final String organisation;
  final String issuedOn;
  final String? credentialUrl;

  UserCertification copyWith({
    String? name,
    String? organisation,
    String? issuedOn,
    String? credentialUrl,
  }) {
    return UserCertification(
      id: id,
      name: name ?? this.name,
      organisation: organisation ?? this.organisation,
      issuedOn: issuedOn ?? this.issuedOn,
      credentialUrl: credentialUrl ?? this.credentialUrl,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'organisation': organisation,
      'issuedOn': issuedOn,
      'credentialUrl': credentialUrl,
    }..removeWhere((key, value) => value == null);
  }

  factory UserCertification.fromJson(Map<String, dynamic> json) {
    return UserCertification(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      organisation: json['organisation']?.toString() ?? '',
      issuedOn: json['issuedOn']?.toString() ?? '',
      credentialUrl: json['credentialUrl']?.toString(),
    );
  }
}

class UserSocialLink {
  const UserSocialLink({required this.platform, required this.url});

  final String platform;
  final String url;

  UserSocialLink copyWith({String? platform, String? url}) {
    return UserSocialLink(
      platform: platform ?? this.platform,
      url: url ?? this.url,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'platform': platform,
      'url': url,
    };
  }

  factory UserSocialLink.fromJson(Map<String, dynamic> json) {
    return UserSocialLink(
      platform: json['platform']?.toString() ?? '',
      url: json['url']?.toString() ?? '',
    );
  }
}

List<String> _castStringList(dynamic value) {
  if (value is List) {
    return value.map((item) => item?.toString() ?? '').where((item) => item.isNotEmpty).toList();
  }
  return const <String>[];
}

List<T> _castList<T>(dynamic value, T Function(Map<String, dynamic>) mapper) {
  if (value is List) {
    return value
        .whereType<Map>()
        .map((item) => mapper(Map<String, dynamic>.from(item as Map)))
        .toList(growable: false);
  }
  return const <T>[];
}
