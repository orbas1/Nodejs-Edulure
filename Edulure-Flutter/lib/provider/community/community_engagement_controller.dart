import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../services/community_chat_service.dart';
import '../../services/community_service.dart';

final communityEngagementControllerProvider =
    StateNotifierProvider<CommunityEngagementController, CommunityEngagementState>(
  (ref) => CommunityEngagementController(),
);

class CommunityEngagementState {
  const CommunityEngagementState({
    this.snapshots = const <String, CommunityEngagementSnapshot>{},
    this.loadingCommunities = const <String>{},
    this.errors = const <String, String>{},
  });

  final Map<String, CommunityEngagementSnapshot> snapshots;
  final Set<String> loadingCommunities;
  final Map<String, String> errors;

  bool isLoading(String communityId) => loadingCommunities.contains(communityId);

  String? errorFor(String communityId) => errors[communityId];

  CommunityEngagementState copyWith({
    Map<String, CommunityEngagementSnapshot>? snapshots,
    Set<String>? loadingCommunities,
    Map<String, String>? errors,
  }) {
    return CommunityEngagementState(
      snapshots: snapshots ?? this.snapshots,
      loadingCommunities: loadingCommunities ?? this.loadingCommunities,
      errors: errors ?? this.errors,
    );
  }
}

class CommunityEngagementController extends StateNotifier<CommunityEngagementState> {
  CommunityEngagementController() : super(const CommunityEngagementState());

  final Random _random = Random();
  final CommunityChatService _chatService = CommunityChatService();

  Future<void> bootstrap(CommunityDetail detail) async {
    if (state.snapshots.containsKey(detail.id)) {
      return;
    }

    final loading = {...state.loadingCommunities, detail.id};
    state = state.copyWith(loadingCommunities: loading);

    try {
      final snapshot = await _buildSnapshot(detail);
      final snapshots = Map<String, CommunityEngagementSnapshot>.from(state.snapshots)
        ..[detail.id] = snapshot;
      state = state.copyWith(
        snapshots: snapshots,
        loadingCommunities: {...loading}..remove(detail.id),
        errors: {...state.errors}..remove(detail.id),
      );
    } catch (error, stackTrace) {
      debugPrint('Failed to bootstrap engagement suite: $error\n$stackTrace');
      final loadingCommunities = {...state.loadingCommunities}..remove(detail.id);
      final errors = {...state.errors}..[detail.id] = error.toString();
      state = state.copyWith(loadingCommunities: loadingCommunities, errors: errors);
    }
  }

  CommunityEngagementSnapshot? snapshotFor(String communityId) {
    return state.snapshots[communityId];
  }

  Future<void> createChannel(String communityId, CommunityChatChannelInput input) async {
    final snapshot = _requireSnapshot(communityId);
    final channel = CommunityChatChannel(
      id: _generateId('chn'),
      name: input.name,
      description: input.description,
      type: input.type,
      isPrivate: input.isPrivate,
      allowsThreads: input.allowsThreads,
      allowsVoiceSessions: input.allowsVoiceSessions,
      allowsBroadcasts: input.allowsBroadcasts,
      slowModeCooldown: input.slowModeCooldown,
      moderators: input.moderators,
      tags: input.tags,
      createdAt: DateTime.now(),
      archived: false,
    );
    final channels = [...snapshot.channels, channel]..sort((a, b) => a.name.compareTo(b.name));
    final messages = Map<String, List<CommunityChatMessage>>.from(snapshot.messages)
      ..[channel.id] = <CommunityChatMessage>[];
    _updateSnapshot(communityId, snapshot.copyWith(channels: channels, messages: messages));
  }

  Future<void> updateChannel(
    String communityId,
    CommunityChatChannel channel,
    CommunityChatChannelInput input,
  ) async {
    final snapshot = _requireSnapshot(communityId);
    final updatedChannel = channel.copyWith(
      name: input.name,
      description: input.description,
      type: input.type,
      isPrivate: input.isPrivate,
      allowsThreads: input.allowsThreads,
      allowsVoiceSessions: input.allowsVoiceSessions,
      allowsBroadcasts: input.allowsBroadcasts,
      slowModeCooldown: input.slowModeCooldown,
      moderators: input.moderators,
      tags: input.tags,
    );
    final channels = snapshot.channels
        .map((existing) => existing.id == channel.id ? updatedChannel : existing)
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    _updateSnapshot(communityId, snapshot.copyWith(channels: channels));
  }

  Future<void> archiveChannel(String communityId, CommunityChatChannel channel) async {
    final snapshot = _requireSnapshot(communityId);
    final channels = snapshot.channels
        .map((existing) => existing.id == channel.id
            ? existing.copyWith(archived: !existing.archived)
            : existing)
        .toList();
    _updateSnapshot(communityId, snapshot.copyWith(channels: channels));
  }

  Future<void> deleteChannel(String communityId, CommunityChatChannel channel) async {
    final snapshot = _requireSnapshot(communityId);
    final channels = snapshot.channels.where((existing) => existing.id != channel.id).toList();
    final messages = Map<String, List<CommunityChatMessage>>.from(snapshot.messages)
      ..remove(channel.id);
    _updateSnapshot(communityId, snapshot.copyWith(channels: channels, messages: messages));
  }

  Future<void> postMessage(
    String communityId, {
    required CommunityChatChannel channel,
    required CommunityChatMessageInput input,
  }) async {
    final snapshot = _requireSnapshot(communityId);
    final draft = input.toDraft();
    final dto = await _chatService.postMessage(communityId, channel.id, draft);
    final message = _mapMessageDto(dto);
    final messages = Map<String, List<CommunityChatMessage>>.from(snapshot.messages);
    final channelMessages = [...(messages[channel.id] ?? <CommunityChatMessage>[]), message]
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    messages[channel.id] = channelMessages;
    _updateSnapshot(communityId, snapshot.copyWith(messages: messages));
  }

  Future<void> updateMessage(
    String communityId, {
    required CommunityChatChannel channel,
    required CommunityChatMessage message,
    required CommunityChatMessageInput input,
  }) async {
    final snapshot = _requireSnapshot(communityId);
    // Soft-delete the original message before reposting the updated content.
    await _chatService.moderateMessage(
      communityId,
      channel.id,
      message.id,
      CommunityChatModeration(
        action: 'delete',
        reason: 'Edited via mobile app',
        metadata: const {'source': 'mobile-app'},
      ),
    );

    final draft = input.toDraft(threadRootId: message.threadRootId, replyToMessageId: message.replyToMessageId);
    final dto = await _chatService.postMessage(communityId, channel.id, draft);
    final updatedMessage = _mapMessageDto(dto);

    final messages = Map<String, List<CommunityChatMessage>>.from(snapshot.messages);
    final updated = (messages[channel.id] ?? <CommunityChatMessage>[])
        .where((existing) => existing.id != message.id)
        .toList()
      ..add(updatedMessage)
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    messages[channel.id] = updated;
    _updateSnapshot(communityId, snapshot.copyWith(messages: messages));
  }

  Future<void> deleteMessage(String communityId, CommunityChatChannel channel, CommunityChatMessage message) async {
    final snapshot = _requireSnapshot(communityId);
    await _chatService.moderateMessage(
      communityId,
      channel.id,
      message.id,
      CommunityChatModeration(
        action: 'delete',
        reason: 'Removed via mobile app',
        metadata: const {'source': 'mobile-app'},
      ),
    );
    final messages = Map<String, List<CommunityChatMessage>>.from(snapshot.messages);
    final updated = (messages[channel.id] ?? <CommunityChatMessage>[])
        .where((existing) => existing.id != message.id)
        .toList();
    messages[channel.id] = updated;
    _updateSnapshot(communityId, snapshot.copyWith(messages: messages));
  }

  Future<void> upsertMember(String communityId, CommunityMemberProfile member) async {
    final snapshot = _requireSnapshot(communityId);
    final members = [...snapshot.members];
    final index = members.indexWhere((existing) => existing.id == member.id);
    if (index >= 0) {
      members[index] = member;
    } else {
      members.add(member);
    }
    members.sort((a, b) => a.name.compareTo(b.name));
    _updateSnapshot(communityId, snapshot.copyWith(members: members));
  }

  Future<void> removeMember(String communityId, String memberId) async {
    final snapshot = _requireSnapshot(communityId);
    final members = snapshot.members.where((member) => member.id != memberId).toList();
    _updateSnapshot(communityId, snapshot.copyWith(members: members));
  }

  Future<void> toggleModerator(String communityId, String memberId) async {
    final snapshot = _requireSnapshot(communityId);
    final members = snapshot.members
        .map(
          (member) => member.id == memberId
              ? member.copyWith(isModerator: !member.isModerator)
              : member,
        )
        .toList();
    _updateSnapshot(communityId, snapshot.copyWith(members: members));
  }

  Future<void> updateAbout(String communityId, CommunityAbout about) async {
    final snapshot = _requireSnapshot(communityId);
    _updateSnapshot(communityId, snapshot.copyWith(about: about));
  }

  CommunityEngagementSnapshot _requireSnapshot(String communityId) {
    final snapshot = state.snapshots[communityId];
    if (snapshot == null) {
      throw StateError('Community engagement snapshot missing for $communityId');
    }
    return snapshot;
  }

  void _updateSnapshot(String communityId, CommunityEngagementSnapshot snapshot) {
    final snapshots = Map<String, CommunityEngagementSnapshot>.from(state.snapshots)
      ..[communityId] = snapshot.copyWith(lastUpdatedAt: DateTime.now());
    state = state.copyWith(snapshots: snapshots);
  }

  Future<CommunityEngagementSnapshot> _buildSnapshot(
    CommunityDetail detail, {
    CommunityEngagementSnapshot? existing,
  }) async {
    final now = DateTime.now();
    try {
      final summaries = await _chatService.listChannels(detail.id);
      if (summaries.isNotEmpty) {
        final channels = <CommunityChatChannel>[];
        final messages = <String, List<CommunityChatMessage>>{};
        for (final summary in summaries) {
          final channel = _mapChannelSummary(summary);
          channels.add(channel);
          final fetchedMessages = await _chatService.listMessages(detail.id, summary.channel.id, limit: 50);
          messages[channel.id] = fetchedMessages.map(_mapMessageDto).toList();
        }
        final members = existing?.members ?? _seedMembers(detail.id);
        final about = existing?.about ?? _seedAbout(detail);
        return CommunityEngagementSnapshot(
          channels: channels,
          messages: messages,
          members: members,
          about: about,
          lastSyncedAt: now,
          lastUpdatedAt: now,
        );
      }
    } catch (error, stackTrace) {
      debugPrint('Falling back to seeded snapshot: $error\n$stackTrace');
    }

    final seededChannels = existing?.channels ?? _seedChannels(detail, now);
    final seededMembers = existing?.members ?? _seedMembers(detail.id);
    final seededMessages = existing?.messages ?? <String, List<CommunityChatMessage>>{};
    if (seededMessages.isEmpty) {
      for (final channel in seededChannels) {
        seededMessages[channel.id] = _seedMessages(channel, seededMembers);
      }
    }
    final about = CommunityAbout(
      mission: detail.description?.isNotEmpty == true
          ? detail.description!
          : 'Empower every learner to collaborate, experiment, and launch meaningful projects.',
      vision:
          'Create a regenerative learning guild where ${detail.name} members build in public and accelerate real-world outcomes.',
      values: const [
        'Transparency and consent-driven collaboration',
        'Learner-led experimentation',
        'Community care and psychological safety',
        'Operational excellence with measurable impact',
      ],
      onboardingSteps: const [
        'Introduce yourself in #Campus general and share a learning goal.',
        'Complete the community code of conduct acknowledgement.',
        'Book an onboarding session with a lead mentor.',
        'Explore the resource vault and star your favourite playbooks.',
      ],
      codeOfConductUrl: detail.metadata['codeOfConductUrl']?.toString() ?? '',
      partnerDeckUrl: detail.metadata['partnerDeckUrl']?.toString() ?? '',
      contactEmail: detail.metadata['contactEmail']?.toString() ?? 'community@edulure.io',
      website: detail.metadata['website']?.toString() ?? 'https://www.edulure.io',
      pressKitUrl: detail.metadata['pressKitUrl']?.toString() ?? '',
      timeZone: detail.metadata['primaryTimeZone']?.toString() ?? 'UTC',
      livestreamPreset: const CommunityLivestreamPreset(
        platform: 'YouTube Live',
        latencyMode: 'Ultra-low latency',
        enableDvr: true,
        autoArchive: true,
      ),
      lastUpdatedBy: 'Community ops automation',
      lastUpdatedAt: now.subtract(const Duration(days: 6)),
    );

    return CommunityEngagementSnapshot(
      channels: seededChannels,
      messages: seededMessages,
      members: seededMembers,
      about: about,
      lastSyncedAt: now,
      lastUpdatedAt: now,
    );
  }

  List<CommunityChatChannel> _seedChannels(CommunityDetail detail, DateTime now) {
    return <CommunityChatChannel>[
      CommunityChatChannel(
        id: 'general-${detail.id}',
        name: 'Campus general',
        description: 'Announcements, wins, and momentum for ${detail.name}.',
        type: CommunityChatChannelType.text,
        createdAt: now.subtract(const Duration(days: 180)),
        isPrivate: false,
        allowsThreads: true,
        allowsVoiceSessions: true,
        allowsBroadcasts: true,
        moderators: const {'community-ops', 'lead-mentors'},
        tags: const ['announcements', 'updates'],
        slowModeCooldown: const Duration(minutes: 2),
        archived: false,
      ),
      CommunityChatChannel(
        id: 'mentors-${detail.id}',
        name: 'Mentor lounge',
        description: 'Peer learning, shadowing rotations, and session planning.',
        type: CommunityChatChannelType.voice,
        createdAt: now.subtract(const Duration(days: 120)),
        isPrivate: true,
        allowsThreads: true,
        allowsVoiceSessions: true,
        allowsBroadcasts: false,
        moderators: const {'lead-mentors'},
        tags: const ['planning', 'rotations'],
        slowModeCooldown: const Duration(minutes: 5),
        archived: false,
      ),
      CommunityChatChannel(
        id: 'events-${detail.id}',
        name: 'Events studio',
        description: 'Coordinate live intensives, AMAs, and demo days.',
        type: CommunityChatChannelType.broadcast,
        createdAt: now.subtract(const Duration(days: 90)),
        isPrivate: false,
        allowsThreads: false,
        allowsVoiceSessions: true,
        allowsBroadcasts: true,
        moderators: const {'community-ops', 'events-team'},
        tags: const ['events', 'livestream'],
        slowModeCooldown: const Duration(minutes: 1),
        archived: false,
      ),
    ];
  }

  CommunityChatChannel _mapChannelSummary(CommunityChatChannelSummary summary) {
    final metadata = summary.channel.metadata;
    final moderators = <String>{
      if (metadata['moderators'] is List)
        ...List<String>.from((metadata['moderators'] as List).whereType<String>()),
      if (summary.membership.role.isNotEmpty) summary.membership.role,
    };
    final slowModeSeconds = metadata['slowModeSeconds'] is num ? (metadata['slowModeSeconds'] as num).toInt() : 0;
    final tags = metadata['tags'] is List
        ? List<String>.from((metadata['tags'] as List).whereType<String>())
        : <String>[];
    return CommunityChatChannel(
      id: summary.channel.id,
      name: summary.channel.name,
      description: summary.channel.description ?? 'Chat channel',
      type: CommunityChatChannelTypeX.fromApi(summary.channel.channelType),
      createdAt: summary.channel.createdAt,
      isPrivate: metadata['privacy'] == 'private' || metadata['isPrivate'] == true,
      allowsThreads: metadata['allowsThreads'] != false,
      allowsVoiceSessions: metadata['allowsVoiceSessions'] == true || summary.channel.channelType == 'voice',
      allowsBroadcasts: metadata['allowsBroadcasts'] == true || summary.channel.channelType == 'broadcast',
      slowModeCooldown: Duration(seconds: slowModeSeconds),
      moderators: moderators,
      tags: tags,
      archived: metadata['archived'] == true,
      unreadCount: summary.unreadCount,
      membership: CommunityChannelMembership(
        id: summary.membership.id,
        role: summary.membership.role,
        lastReadAt: summary.membership.lastReadAt,
        notificationsEnabled: summary.membership.notificationsEnabled,
      ),
      metadata: metadata,
      slug: summary.channel.slug,
      isDefault: summary.channel.isDefault,
    );
  }

  CommunityChatMessage _mapMessageDto(CommunityChatMessageDto dto) {
    final authorName = dto.author.displayName.isNotEmpty ? dto.author.displayName : dto.author.email;
    final metadata = dto.metadata;
    final avatarUrl = metadata['authorAvatarUrl']?.toString() ?? metadata['avatarUrl']?.toString() ?? '';
    final attachments = dto.attachments.map(_mapAttachment).whereType<CommunityMediaAttachment>().toList();
    final reactions = <String, int>{};
    for (final reaction in dto.reactions) {
      reactions[reaction.emoji] = reaction.count;
    }
    final isPriority = metadata['priority'] == true || metadata['isPriority'] == true;
    final isThreaded = dto.threadRootId != null || metadata['isThreaded'] == true;
    return CommunityChatMessage(
      id: dto.id,
      channelId: dto.channelId,
      authorName: authorName.isNotEmpty ? authorName : 'Community member',
      authorRole: dto.author.role.isNotEmpty ? dto.author.role : (metadata['authorRole']?.toString() ?? 'Member'),
      authorAvatarUrl: avatarUrl,
      content: dto.body,
      attachments: attachments,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      reactions: reactions,
      viewerReactions: dto.viewerReactions,
      isThreaded: isThreaded,
      isPriority: isPriority,
      messageType: dto.messageType,
      metadata: metadata,
      threadRootId: dto.threadRootId,
      replyToMessageId: dto.replyToMessageId,
      status: dto.status,
      pinned: dto.pinned,
    );
  }

  CommunityMediaAttachment? _mapAttachment(Map<String, dynamic> json) {
    final url = json['url']?.toString();
    if (url == null || url.isEmpty) {
      return null;
    }
    final type = json['type']?.toString() ?? json['mediaType']?.toString() ?? 'link';
    final description = json['description']?.toString() ?? json['title']?.toString();
    switch (type) {
      case 'image':
        return CommunityMediaAttachment(type: CommunityMediaType.image, url: url, description: description);
      case 'video':
        return CommunityMediaAttachment(type: CommunityMediaType.video, url: url, description: description);
      case 'file':
        return CommunityMediaAttachment(type: CommunityMediaType.file, url: url, description: description);
      default:
        return CommunityMediaAttachment(type: CommunityMediaType.link, url: url, description: description);
    }
  }

  List<CommunityMemberProfile> _seedMembers(String communityId) {
    final sample = <CommunityMemberProfile>[
      CommunityMemberProfile(
        id: 'm-${communityId}-ops',
        name: 'Ayomide Bakare',
        email: 'ayomide@edulure.io',
        role: 'Community Operations',
        status: CommunityMemberStatus.active,
        isModerator: true,
        avatarUrl: 'https://i.pravatar.cc/150?img=12',
        biography: 'Drives rituals, onboarding, and partnership activations.',
        location: const CommunityMemberLocation(
          latitude: 6.5244,
          longitude: 3.3792,
          city: 'Lagos',
          country: 'Nigeria',
        ),
        joinedAt: DateTime.now().subtract(const Duration(days: 420)),
        expertise: const ['Ops', 'Product experimentation', 'Systems thinking'],
        availability: 'Mon-Fri · 9am-5pm WAT',
      ),
      CommunityMemberProfile(
        id: 'm-${communityId}-mentor',
        name: 'Iris Campbell',
        email: 'iris.campbell@edulure.io',
        role: 'Lead Mentor',
        status: CommunityMemberStatus.active,
        isModerator: true,
        avatarUrl: 'https://i.pravatar.cc/150?img=31',
        biography: 'Coach for product squads and async collaboration.',
        location: const CommunityMemberLocation(
          latitude: 37.7749,
          longitude: -122.4194,
          city: 'San Francisco',
          country: 'United States',
        ),
        joinedAt: DateTime.now().subtract(const Duration(days: 512)),
        expertise: const ['Product discovery', 'Workshops', 'Mentorship'],
        availability: 'Tues-Sat · 10am-4pm PST',
      ),
      CommunityMemberProfile(
        id: 'm-${communityId}-creator',
        name: 'Mateo Rodríguez',
        email: 'mateo.rodriguez@edulure.io',
        role: 'Learner Creator',
        status: CommunityMemberStatus.active,
        isModerator: false,
        avatarUrl: 'https://i.pravatar.cc/150?img=54',
        biography: 'Building a climate storytelling lab with cohort peers.',
        location: const CommunityMemberLocation(
          latitude: -34.6037,
          longitude: -58.3816,
          city: 'Buenos Aires',
          country: 'Argentina',
        ),
        joinedAt: DateTime.now().subtract(const Duration(days: 210)),
        expertise: const ['Storytelling', 'Sustainability', 'Design'],
        availability: 'Flexible · async-first collaborator',
      ),
      CommunityMemberProfile(
        id: 'm-${communityId}-partner',
        name: 'Saanvi Iyer',
        email: 'saanvi.iyer@edulure.io',
        role: 'Industry Partner',
        status: CommunityMemberStatus.pending,
        isModerator: false,
        avatarUrl: 'https://i.pravatar.cc/150?img=21',
        biography: 'Runs product partnerships and demo day juries.',
        location: const CommunityMemberLocation(
          latitude: 12.9716,
          longitude: 77.5946,
          city: 'Bengaluru',
          country: 'India',
        ),
        joinedAt: DateTime.now().subtract(const Duration(days: 32)),
        expertise: const ['Partnerships', 'Ecosystem design'],
        availability: 'Wed-Fri · 1pm-7pm IST',
      ),
      CommunityMemberProfile(
        id: 'm-${communityId}-alumni',
        name: 'Leah Martins',
        email: 'leah.martins@alumni.edulure.io',
        role: 'Alumni Catalyst',
        status: CommunityMemberStatus.active,
        isModerator: false,
        avatarUrl: 'https://i.pravatar.cc/150?img=65',
        biography: 'Hosts AMAs and supports alumni micro-accelerators.',
        location: const CommunityMemberLocation(
          latitude: 51.5072,
          longitude: -0.1276,
          city: 'London',
          country: 'United Kingdom',
        ),
        joinedAt: DateTime.now().subtract(const Duration(days: 720)),
        expertise: const ['Growth', 'AMAs', 'Community building'],
        availability: 'Mon-Thu · 2pm-6pm GMT',
      ),
    ];

    for (var i = 0; i < 12; i++) {
      sample.add(_generateMember(communityId, i));
    }
    sample.sort((a, b) => a.name.compareTo(b.name));
    return sample;
  }

  CommunityMemberProfile _generateMember(String communityId, int index) {
    final roles = [
      'Learner',
      'Contributor',
      'Facilitator',
      'Community Guide',
    ];
    final cities = [
      const _CityLocation(52.52, 13.405, 'Berlin', 'Germany'),
      const _CityLocation(-33.8688, 151.2093, 'Sydney', 'Australia'),
      const _CityLocation(35.6762, 139.6503, 'Tokyo', 'Japan'),
      const _CityLocation(45.4215, -75.6972, 'Ottawa', 'Canada'),
      const _CityLocation(55.7558, 37.6173, 'Moscow', 'Russia'),
      const _CityLocation(1.3521, 103.8198, 'Singapore', 'Singapore'),
      const _CityLocation(19.4326, -99.1332, 'Mexico City', 'Mexico'),
      const _CityLocation(40.4168, -3.7038, 'Madrid', 'Spain'),
    ];
    final location = cities[index % cities.length];
    final role = roles[index % roles.length];
    final status = CommunityMemberStatus.values[index % CommunityMemberStatus.values.length];
    return CommunityMemberProfile(
      id: 'm-$communityId-${_generateId('mb')}',
      name: 'Community Member ${index + 1}',
      email: 'member${index + 1}@${communityId.toLowerCase()}.edulure.io',
      role: role,
      status: status,
      isModerator: index.isEven && role != 'Learner',
      avatarUrl: 'https://i.pravatar.cc/150?u=$communityId-$index',
      biography: 'Helps coordinate micro-sprints and contributes to shared knowledge bases.',
      location: CommunityMemberLocation(
        latitude: location.latitude + _random.nextDouble() * 0.2,
        longitude: location.longitude + _random.nextDouble() * 0.2,
        city: location.city,
        country: location.country,
      ),
      joinedAt: DateTime.now().subtract(Duration(days: 60 + index * 12)),
      expertise: const ['Workshops', 'Project delivery', 'Peer reviews'],
      availability: 'Flexible availability · async updates every 48h',
    );
  }

  List<CommunityChatMessage> _seedMessages(
    CommunityChatChannel channel,
    List<CommunityMemberProfile> members,
  ) {
    final authors = members.take(6).toList();
    final now = DateTime.now();
    return List<CommunityChatMessage>.generate(6, (index) {
      final author = authors[index % authors.length];
      final attachments = index.isOdd
          ? <CommunityMediaAttachment>[
              CommunityMediaAttachment(
                type: CommunityMediaType.link,
                url: 'https://www.edulure.io/resources/${channel.id}-$index',
                description: 'Shared resource ${index + 1}',
              ),
            ]
          : const <CommunityMediaAttachment>[];
      return CommunityChatMessage(
        id: '${channel.id}-seed-$index',
        channelId: channel.id,
        authorName: author.name,
        authorRole: author.role,
        authorAvatarUrl: author.avatarUrl,
        content: '${channel.name} spotlight ${index + 1}: Let\'s align on priorities and wins.',
        attachments: attachments,
        createdAt: now.subtract(Duration(hours: (index + 1) * 6)),
        updatedAt: now.subtract(Duration(hours: (index + 1) * 6)),
        reactions: {
          '🔥': 3 + index,
          '✅': 2,
        },
        isThreaded: index.isEven,
        isPriority: index == 0,
      );
    });
  }

  String _generateId(String prefix) {
    return '$prefix-${DateTime.now().microsecondsSinceEpoch}-${_random.nextInt(9999)}';
  }
}

class CommunityEngagementSnapshot {
  const CommunityEngagementSnapshot({
    required this.channels,
    required this.messages,
    required this.members,
    required this.about,
    required this.lastSyncedAt,
    required this.lastUpdatedAt,
  });

  final List<CommunityChatChannel> channels;
  final Map<String, List<CommunityChatMessage>> messages;
  final List<CommunityMemberProfile> members;
  final CommunityAbout about;
  final DateTime lastSyncedAt;
  final DateTime lastUpdatedAt;

  CommunityEngagementSnapshot copyWith({
    List<CommunityChatChannel>? channels,
    Map<String, List<CommunityChatMessage>>? messages,
    List<CommunityMemberProfile>? members,
    CommunityAbout? about,
    DateTime? lastSyncedAt,
    DateTime? lastUpdatedAt,
  }) {
    return CommunityEngagementSnapshot(
      channels: channels ?? this.channels,
      messages: messages ?? this.messages,
      members: members ?? this.members,
      about: about ?? this.about,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
    );
  }
}

enum CommunityChatChannelType { text, broadcast, voice, stage, event }

extension CommunityChatChannelTypeX on CommunityChatChannelType {
  static CommunityChatChannelType fromApi(String value) {
    switch (value.toLowerCase()) {
      case 'broadcast':
        return CommunityChatChannelType.broadcast;
      case 'voice':
        return CommunityChatChannelType.voice;
      case 'stage':
        return CommunityChatChannelType.stage;
      case 'event':
        return CommunityChatChannelType.event;
      case 'text':
      case 'general':
      default:
        return CommunityChatChannelType.text;
    }
  }

  String get displayName {
    switch (this) {
      case CommunityChatChannelType.text:
        return 'Text lounge';
      case CommunityChatChannelType.broadcast:
        return 'Broadcast channel';
      case CommunityChatChannelType.voice:
        return 'Voice den';
      case CommunityChatChannelType.stage:
        return 'Stage / townhall';
      case CommunityChatChannelType.event:
        return 'Event planning';
    }
  }

  IconData get icon {
    switch (this) {
      case CommunityChatChannelType.text:
        return Icons.chat_bubble_outline;
      case CommunityChatChannelType.broadcast:
        return Icons.campaign_outlined;
      case CommunityChatChannelType.voice:
        return Icons.headset_mic_outlined;
      case CommunityChatChannelType.stage:
        return Icons.theater_comedy_outlined;
      case CommunityChatChannelType.event:
        return Icons.event_available_outlined;
    }
  }

  Color get badgeColor {
    switch (this) {
      case CommunityChatChannelType.text:
        return Colors.indigo;
      case CommunityChatChannelType.broadcast:
        return Colors.orange;
      case CommunityChatChannelType.voice:
        return Colors.teal;
      case CommunityChatChannelType.stage:
        return Colors.purple;
      case CommunityChatChannelType.event:
        return Colors.pink;
    }
  }

  String get apiValue {
    switch (this) {
      case CommunityChatChannelType.text:
        return 'text';
      case CommunityChatChannelType.broadcast:
        return 'broadcast';
      case CommunityChatChannelType.voice:
        return 'voice';
      case CommunityChatChannelType.stage:
        return 'stage';
      case CommunityChatChannelType.event:
        return 'event';
    }
  }
}

class CommunityChatChannel {
  const CommunityChatChannel({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.createdAt,
    required this.isPrivate,
    required this.allowsThreads,
    required this.allowsVoiceSessions,
    required this.allowsBroadcasts,
    required this.slowModeCooldown,
    required this.moderators,
    required this.tags,
    required this.archived,
    this.unreadCount = 0,
    this.membership,
    this.metadata = const <String, dynamic>{},
    this.slug = '',
    this.isDefault = false,
  });

  final String id;
  final String name;
  final String description;
  final CommunityChatChannelType type;
  final DateTime createdAt;
  final bool isPrivate;
  final bool allowsThreads;
  final bool allowsVoiceSessions;
  final bool allowsBroadcasts;
  final Duration slowModeCooldown;
  final Set<String> moderators;
  final List<String> tags;
  final bool archived;
  final int unreadCount;
  final CommunityChannelMembership? membership;
  final Map<String, dynamic> metadata;
  final String slug;
  final bool isDefault;

  CommunityChatChannel copyWith({
    String? name,
    String? description,
    CommunityChatChannelType? type,
    bool? isPrivate,
    bool? allowsThreads,
    bool? allowsVoiceSessions,
    bool? allowsBroadcasts,
    Duration? slowModeCooldown,
    Set<String>? moderators,
    List<String>? tags,
    bool? archived,
    int? unreadCount,
    CommunityChannelMembership? membership,
    Map<String, dynamic>? metadata,
    String? slug,
    bool? isDefault,
  }) {
    return CommunityChatChannel(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      type: type ?? this.type,
      createdAt: createdAt,
      isPrivate: isPrivate ?? this.isPrivate,
      allowsThreads: allowsThreads ?? this.allowsThreads,
      allowsVoiceSessions: allowsVoiceSessions ?? this.allowsVoiceSessions,
      allowsBroadcasts: allowsBroadcasts ?? this.allowsBroadcasts,
      slowModeCooldown: slowModeCooldown ?? this.slowModeCooldown,
      moderators: moderators ?? this.moderators,
      tags: tags ?? this.tags,
      archived: archived ?? this.archived,
      unreadCount: unreadCount ?? this.unreadCount,
      membership: membership ?? this.membership,
      metadata: metadata ?? this.metadata,
      slug: slug ?? this.slug,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}

class CommunityChannelMembership {
  const CommunityChannelMembership({
    required this.id,
    required this.role,
    required this.notificationsEnabled,
    this.lastReadAt,
  });

  final String id;
  final String role;
  final bool notificationsEnabled;
  final DateTime? lastReadAt;
}

class CommunityChatChannelInput {
  const CommunityChatChannelInput({
    required this.name,
    required this.description,
    required this.type,
    required this.isPrivate,
    required this.allowsThreads,
    required this.allowsVoiceSessions,
    required this.allowsBroadcasts,
    required this.slowModeCooldown,
    required this.moderators,
    required this.tags,
  });

  final String name;
  final String description;
  final CommunityChatChannelType type;
  final bool isPrivate;
  final bool allowsThreads;
  final bool allowsVoiceSessions;
  final bool allowsBroadcasts;
  final Duration slowModeCooldown;
  final Set<String> moderators;
  final List<String> tags;
}

enum CommunityMediaType { image, video, file, link }

class CommunityMediaAttachment {
  const CommunityMediaAttachment({
    required this.type,
    required this.url,
    this.description,
  });

  final CommunityMediaType type;
  final String url;
  final String? description;

  IconData get icon {
    switch (type) {
      case CommunityMediaType.image:
        return Icons.image_outlined;
      case CommunityMediaType.video:
        return Icons.videocam_outlined;
      case CommunityMediaType.file:
        return Icons.attach_file_outlined;
      case CommunityMediaType.link:
        return Icons.link_outlined;
    }
  }

  Color get color {
    switch (type) {
      case CommunityMediaType.image:
        return Colors.blueGrey;
      case CommunityMediaType.video:
        return Colors.redAccent;
      case CommunityMediaType.file:
        return Colors.blue;
      case CommunityMediaType.link:
        return Colors.green;
    }
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type.name,
      'url': url,
      if (description != null && description!.isNotEmpty) 'description': description,
    };
  }
}

class CommunityChatMessage {
  const CommunityChatMessage({
    required this.id,
    required this.channelId,
    required this.authorName,
    required this.authorRole,
    required this.authorAvatarUrl,
    required this.content,
    required this.attachments,
    required this.createdAt,
    required this.updatedAt,
    required this.reactions,
    required this.isThreaded,
    required this.isPriority,
    this.viewerReactions = const <String>[],
    this.messageType = 'text',
    this.metadata = const <String, dynamic>{},
    this.threadRootId,
    this.replyToMessageId,
    this.status = 'visible',
    this.pinned = false,
  });

  final String id;
  final String channelId;
  final String authorName;
  final String authorRole;
  final String authorAvatarUrl;
  final String content;
  final List<CommunityMediaAttachment> attachments;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Map<String, int> reactions;
  final bool isThreaded;
  final bool isPriority;
  final List<String> viewerReactions;
  final String messageType;
  final Map<String, dynamic> metadata;
  final int? threadRootId;
  final int? replyToMessageId;
  final String status;
  final bool pinned;

  CommunityChatMessage copyWith({
    String? content,
    List<CommunityMediaAttachment>? attachments,
    Map<String, int>? reactions,
    bool? isThreaded,
    bool? isPriority,
    DateTime? updatedAt,
    List<String>? viewerReactions,
    Map<String, dynamic>? metadata,
    bool? pinned,
    String? status,
  }) {
    return CommunityChatMessage(
      id: id,
      channelId: channelId,
      authorName: authorName,
      authorRole: authorRole,
      authorAvatarUrl: authorAvatarUrl,
      content: content ?? this.content,
      attachments: attachments ?? this.attachments,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      reactions: reactions ?? this.reactions,
      isThreaded: isThreaded ?? this.isThreaded,
      isPriority: isPriority ?? this.isPriority,
      viewerReactions: viewerReactions ?? this.viewerReactions,
      messageType: messageType,
      metadata: metadata ?? this.metadata,
      threadRootId: threadRootId,
      replyToMessageId: replyToMessageId,
      status: status ?? this.status,
      pinned: pinned ?? this.pinned,
    );
  }
}

class CommunityChatMessageInput {
  const CommunityChatMessageInput({
    required this.authorName,
    required this.authorRole,
    required this.authorAvatarUrl,
    required this.content,
    this.attachments = const <CommunityMediaAttachment>[],
    this.reactions = const <String, int>{},
    this.isThreaded = false,
    this.isPriority = false,
    this.messageType = 'text',
    this.metadata = const <String, dynamic>{},
    this.replyToMessageId,
    this.threadRootId,
  });

  final String authorName;
  final String authorRole;
  final String authorAvatarUrl;
  final String content;
  final List<CommunityMediaAttachment> attachments;
  final Map<String, int> reactions;
  final bool isThreaded;
  final bool isPriority;
  final String messageType;
  final Map<String, dynamic> metadata;
  final int? replyToMessageId;
  final int? threadRootId;

  CommunityChatMessageDraft toDraft({int? replyToMessageId, int? threadRootId}) {
    final mergedMetadata = <String, dynamic>{
      ...metadata,
      'authorName': authorName,
      'authorRole': authorRole,
      'authorAvatarUrl': authorAvatarUrl,
      if (isPriority) 'priority': true,
      if (isThreaded) 'isThreaded': true,
      if (reactions.isNotEmpty) 'seedReactions': reactions,
    };
    return CommunityChatMessageDraft(
      body: content,
      messageType: messageType,
      attachments: attachments.map((attachment) => attachment.toJson()).toList(),
      metadata: mergedMetadata,
      replyToMessageId: replyToMessageId ?? this.replyToMessageId,
      threadRootId: threadRootId ?? this.threadRootId,
    );
  }
}

enum CommunityMemberStatus { active, pending, suspended }

extension CommunityMemberStatusX on CommunityMemberStatus {
  String get displayName {
    switch (this) {
      case CommunityMemberStatus.active:
        return 'Active';
      case CommunityMemberStatus.pending:
        return 'Pending';
      case CommunityMemberStatus.suspended:
        return 'Suspended';
    }
  }

  Color get badgeColor {
    switch (this) {
      case CommunityMemberStatus.active:
        return Colors.green;
      case CommunityMemberStatus.pending:
        return Colors.orange;
      case CommunityMemberStatus.suspended:
        return Colors.redAccent;
    }
  }
}

class CommunityMemberLocation {
  const CommunityMemberLocation({
    required this.latitude,
    required this.longitude,
    required this.city,
    required this.country,
  });

  final double latitude;
  final double longitude;
  final String city;
  final String country;

  LatLng toLatLng() => LatLng(latitude, longitude);
}

class CommunityMemberProfile {
  const CommunityMemberProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.status,
    required this.isModerator,
    required this.avatarUrl,
    required this.biography,
    required this.location,
    required this.joinedAt,
    required this.expertise,
    required this.availability,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final CommunityMemberStatus status;
  final bool isModerator;
  final String avatarUrl;
  final String biography;
  final CommunityMemberLocation location;
  final DateTime joinedAt;
  final List<String> expertise;
  final String availability;

  CommunityMemberProfile copyWith({
    String? name,
    String? email,
    String? role,
    CommunityMemberStatus? status,
    bool? isModerator,
    String? avatarUrl,
    String? biography,
    CommunityMemberLocation? location,
    DateTime? joinedAt,
    List<String>? expertise,
    String? availability,
  }) {
    return CommunityMemberProfile(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      status: status ?? this.status,
      isModerator: isModerator ?? this.isModerator,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      biography: biography ?? this.biography,
      location: location ?? this.location,
      joinedAt: joinedAt ?? this.joinedAt,
      expertise: expertise ?? this.expertise,
      availability: availability ?? this.availability,
    );
  }
}

class CommunityAbout {
  const CommunityAbout({
    required this.mission,
    required this.vision,
    required this.values,
    required this.onboardingSteps,
    required this.codeOfConductUrl,
    required this.partnerDeckUrl,
    required this.contactEmail,
    required this.website,
    required this.pressKitUrl,
    required this.timeZone,
    required this.livestreamPreset,
    required this.lastUpdatedBy,
    required this.lastUpdatedAt,
  });

  final String mission;
  final String vision;
  final List<String> values;
  final List<String> onboardingSteps;
  final String codeOfConductUrl;
  final String partnerDeckUrl;
  final String contactEmail;
  final String website;
  final String pressKitUrl;
  final String timeZone;
  final CommunityLivestreamPreset livestreamPreset;
  final String lastUpdatedBy;
  final DateTime lastUpdatedAt;

  CommunityAbout copyWith({
    String? mission,
    String? vision,
    List<String>? values,
    List<String>? onboardingSteps,
    String? codeOfConductUrl,
    String? partnerDeckUrl,
    String? contactEmail,
    String? website,
    String? pressKitUrl,
    String? timeZone,
    CommunityLivestreamPreset? livestreamPreset,
    String? lastUpdatedBy,
    DateTime? lastUpdatedAt,
  }) {
    return CommunityAbout(
      mission: mission ?? this.mission,
      vision: vision ?? this.vision,
      values: values ?? this.values,
      onboardingSteps: onboardingSteps ?? this.onboardingSteps,
      codeOfConductUrl: codeOfConductUrl ?? this.codeOfConductUrl,
      partnerDeckUrl: partnerDeckUrl ?? this.partnerDeckUrl,
      contactEmail: contactEmail ?? this.contactEmail,
      website: website ?? this.website,
      pressKitUrl: pressKitUrl ?? this.pressKitUrl,
      timeZone: timeZone ?? this.timeZone,
      livestreamPreset: livestreamPreset ?? this.livestreamPreset,
      lastUpdatedBy: lastUpdatedBy ?? this.lastUpdatedBy,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
    );
  }
}

class CommunityLivestreamPreset {
  const CommunityLivestreamPreset({
    required this.platform,
    required this.latencyMode,
    required this.enableDvr,
    required this.autoArchive,
  });

  final String platform;
  final String latencyMode;
  final bool enableDvr;
  final bool autoArchive;

  CommunityLivestreamPreset copyWith({
    String? platform,
    String? latencyMode,
    bool? enableDvr,
    bool? autoArchive,
  }) {
    return CommunityLivestreamPreset(
      platform: platform ?? this.platform,
      latencyMode: latencyMode ?? this.latencyMode,
      enableDvr: enableDvr ?? this.enableDvr,
      autoArchive: autoArchive ?? this.autoArchive,
    );
  }
}

class CommunityMemberDraft {
  CommunityMemberDraft({
    this.id,
    this.name = '',
    this.email = '',
    this.role = 'Member',
    this.status = CommunityMemberStatus.active,
    this.isModerator = false,
    this.avatarUrl = '',
    this.biography = '',
    this.latitude,
    this.longitude,
    this.city = '',
    this.country = '',
    this.joinedAt,
    this.expertise = const <String>[],
    this.availability = '',
  });

  final String? id;
  String name;
  String email;
  String role;
  CommunityMemberStatus status;
  bool isModerator;
  String avatarUrl;
  String biography;
  double? latitude;
  double? longitude;
  String city;
  String country;
  DateTime? joinedAt;
  List<String> expertise;
  String availability;

  CommunityMemberProfile toProfile() {
    final lat = latitude ?? 0;
    final lng = longitude ?? 0;
    return CommunityMemberProfile(
      id: id ?? 'member-${DateTime.now().microsecondsSinceEpoch}',
      name: name,
      email: email,
      role: role,
      status: status,
      isModerator: isModerator,
      avatarUrl: avatarUrl.isNotEmpty
          ? avatarUrl
          : 'https://i.pravatar.cc/150?u=${name.toLowerCase().replaceAll(' ', '-')}',
      biography: biography,
      location: CommunityMemberLocation(
        latitude: lat,
        longitude: lng,
        city: city,
        country: country,
      ),
      joinedAt: joinedAt ?? DateTime.now(),
      expertise: expertise.isEmpty ? const ['Generalist'] : expertise,
      availability: availability.isNotEmpty ? availability : 'Flexible',
    );
  }
}

class _CityLocation {
  const _CityLocation(this.latitude, this.longitude, this.city, this.country);

  final double latitude;
  final double longitude;
  final String city;
  final String country;
}
