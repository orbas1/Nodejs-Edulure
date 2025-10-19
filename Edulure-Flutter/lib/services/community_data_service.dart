import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../core/models/community_models.dart';

class CommunityDataService {
  CommunityDataService._();

  static final CommunityDataService instance = CommunityDataService._();

  static const _directoryBoxName = 'community.directory';
  static const _feedBoxName = 'community.feed';
  static const _explorerBoxName = 'community.explorer';
  static const _preferencesBoxName = 'community.preferences';

  static const _communitiesKey = 'communities';
  static const _postsKey = 'posts';
  static const _resourcesKey = 'resources';
  static const _activeCommunityKey = 'activeCommunity';

  final Uuid _uuid = const Uuid();
  final Random _random = Random();

  Box<dynamic>? _directoryBox;
  Box<dynamic>? _feedBox;
  Box<dynamic>? _explorerBox;
  Box<dynamic>? _preferencesBox;

  bool _initialised = false;

  List<CommunityModel> _communities = const <CommunityModel>[];
  List<FeedPost> _posts = const <FeedPost>[];
  List<ExplorerResource> _resources = const <ExplorerResource>[];
  String? _activeCommunityId;

  Future<void> init() async {
    if (_initialised) return;

    _directoryBox = await Hive.openBox<dynamic>(_directoryBoxName);
    _feedBox = await Hive.openBox<dynamic>(_feedBoxName);
    _explorerBox = await Hive.openBox<dynamic>(_explorerBoxName);
    _preferencesBox = await Hive.openBox<dynamic>(_preferencesBoxName);

    _communities = _readCommunities();
    if (_communities.isEmpty) {
      _communities = _seedCommunities();
      await _persistCommunities();
    }

    _posts = _readPosts();
    if (_posts.isEmpty) {
      _posts = _seedPosts(_communities);
      await _persistPosts();
    }

    _resources = _readResources();
    if (_resources.isEmpty) {
      _resources = _seedResources();
      await _persistResources();
    }

    _activeCommunityId = _preferencesBox?.get(_activeCommunityKey) as String?;
    if (_activeCommunityId == null && _communities.isNotEmpty) {
      _activeCommunityId = _communities.first.id;
      await _preferencesBox?.put(_activeCommunityKey, _activeCommunityId);
    }

    _initialised = true;
  }

  Future<void> ensureInitialised() async {
    if (!_initialised) {
      await init();
    }
  }

  Future<List<CommunityModel>> fetchCommunities() async {
    await ensureInitialised();
    return _communities.map((community) => community).toList(growable: false);
  }

  Future<CommunityModel> createCommunity(CommunityDraft draft) async {
    await ensureInitialised();
    final community = CommunityModel(
      id: _uuid.v4(),
      name: draft.name,
      description: draft.description,
      bannerImage: draft.bannerImage,
      accentColor: draft.accentColor,
      tags: draft.tags,
      memberCount: draft.isPrivate ? 24 + _random.nextInt(42) : 120 + _random.nextInt(380),
      joined: true,
      members: _generateMembers(seed: draft.name),
      events: const <CommunityEvent>[],
      location: draft.location,
      guidelines: draft.guidelines,
      focusAreas: draft.focusAreas,
      isPrivate: draft.isPrivate,
    );
    _communities = [community, ..._communities];
    await _persistCommunities();
    await setActiveCommunityId(community.id);
    return community;
  }

  Future<CommunityModel> updateCommunity(String id, CommunityDraft draft) async {
    await ensureInitialised();
    final index = _communities.indexWhere((element) => element.id == id);
    if (index == -1) {
      throw Exception('Community not found');
    }
    final updated = _communities[index].copyWith(
      name: draft.name,
      description: draft.description,
      bannerImage: draft.bannerImage,
      accentColor: draft.accentColor,
      tags: draft.tags,
      location: draft.location,
      guidelines: draft.guidelines,
      focusAreas: draft.focusAreas,
      isPrivate: draft.isPrivate,
    );
    _communities = [
      ..._communities.sublist(0, index),
      updated,
      ..._communities.sublist(index + 1),
    ];
    await _persistCommunities();
    return updated;
  }

  Future<void> deleteCommunity(String id) async {
    await ensureInitialised();
    _communities = _communities.where((element) => element.id != id).toList();
    _posts = _posts.where((post) => post.communityId != id).toList();
    await _persistCommunities();
    await _persistPosts();
    if (_activeCommunityId == id) {
      _activeCommunityId = _communities.isNotEmpty ? _communities.first.id : null;
      await _preferencesBox?.put(_activeCommunityKey, _activeCommunityId);
    }
  }

  Future<CommunityModel> toggleMembership(String id, {required bool join}) async {
    await ensureInitialised();
    final index = _communities.indexWhere((element) => element.id == id);
    if (index == -1) {
      throw Exception('Community not found');
    }
    final community = _communities[index];
    final updated = community.copyWith(
      joined: join,
      memberCount: max(community.memberCount + (join ? 1 : -1), 0),
    );
    _communities = [
      ..._communities.sublist(0, index),
      updated,
      ..._communities.sublist(index + 1),
    ];
    await _persistCommunities();
    return updated;
  }

  Future<CommunityEvent> addEvent(String communityId, CommunityEventDraft draft) async {
    await ensureInitialised();
    final index = _communities.indexWhere((element) => element.id == communityId);
    if (index == -1) throw Exception('Community not found');
    final event = CommunityEvent(
      id: _uuid.v4(),
      title: draft.title,
      description: draft.description,
      start: draft.start,
      end: draft.end,
      location: draft.location,
      coverImage: draft.coverImage,
      meetingUrl: draft.meetingUrl,
    );
    final community = _communities[index];
    final updated = community.copyWith(events: [event, ...community.events]);
    _communities = [
      ..._communities.sublist(0, index),
      updated,
      ..._communities.sublist(index + 1),
    ];
    await _persistCommunities();
    _resources = [
      ExplorerResource(
        id: 'event-${event.id}',
        entityType: 'event',
        title: event.title,
        subtitle: community.name,
        description: event.description,
        tags: [...community.tags, 'event'],
        updatedAt: event.start,
        coverImage: event.coverImage,
        communityId: community.id,
        link: event.meetingUrl,
        owner: community.name,
      ),
      ..._resources.where((resource) => resource.id != 'event-${event.id}'),
    ];
    await _persistResources();
    return event;
  }

  Future<CommunityEvent> updateEvent(
    String communityId,
    String eventId,
    CommunityEventDraft draft,
  ) async {
    await ensureInitialised();
    final communityIndex = _communities.indexWhere((element) => element.id == communityId);
    if (communityIndex == -1) throw Exception('Community not found');
    final community = _communities[communityIndex];
    final events = community.events;
    final eventIndex = events.indexWhere((event) => event.id == eventId);
    if (eventIndex == -1) throw Exception('Event not found');

    final updatedEvent = events[eventIndex].copyWith(
      title: draft.title,
      description: draft.description,
      start: draft.start,
      end: draft.end,
      location: draft.location,
      coverImage: draft.coverImage,
      meetingUrl: draft.meetingUrl,
    );

    final updatedCommunity = community.copyWith(
      events: [
        ...events.sublist(0, eventIndex),
        updatedEvent,
        ...events.sublist(eventIndex + 1),
      ],
    );

    _communities = [
      ..._communities.sublist(0, communityIndex),
      updatedCommunity,
      ..._communities.sublist(communityIndex + 1),
    ];
    await _persistCommunities();

    final resourceId = 'event-$eventId';
    final resourceIndex = _resources.indexWhere((resource) => resource.id == resourceId);
    if (resourceIndex != -1) {
      final existing = _resources[resourceIndex];
      final updatedResource = existing.copyWith(
        title: updatedEvent.title,
        subtitle: updatedCommunity.name,
        description: updatedEvent.description,
        tags: [
          ...{...updatedCommunity.tags, 'event'},
        ],
        updatedAt: updatedEvent.start,
        coverImage: updatedEvent.coverImage,
        communityId: updatedCommunity.id,
        link: updatedEvent.meetingUrl,
        owner: updatedCommunity.name,
      );
      _resources = [
        ..._resources.sublist(0, resourceIndex),
        updatedResource,
        ..._resources.sublist(resourceIndex + 1),
      ];
      await _persistResources();
    } else {
      _resources = [
        ExplorerResource(
          id: resourceId,
          entityType: 'event',
          title: updatedEvent.title,
          subtitle: updatedCommunity.name,
          description: updatedEvent.description,
          tags: [
            ...{...updatedCommunity.tags, 'event'},
          ],
          updatedAt: updatedEvent.start,
          coverImage: updatedEvent.coverImage,
          communityId: updatedCommunity.id,
          link: updatedEvent.meetingUrl,
          owner: updatedCommunity.name,
        ),
        ..._resources,
      ];
      await _persistResources();
    }

    return updatedEvent;
  }

  Future<void> removeEvent(String communityId, String eventId) async {
    await ensureInitialised();
    final index = _communities.indexWhere((element) => element.id == communityId);
    if (index == -1) throw Exception('Community not found');
    final community = _communities[index];
    final updated = community.copyWith(
      events: community.events.where((event) => event.id != eventId).toList(),
    );
    _communities = [
      ..._communities.sublist(0, index),
      updated,
      ..._communities.sublist(index + 1),
    ];
    await _persistCommunities();
    _resources = _resources.where((resource) => resource.id != 'event-$eventId').toList();
    await _persistResources();
  }

  Future<CommunityMember> addMember(String communityId, CommunityMemberDraft draft) async {
    await ensureInitialised();
    final index = _communities.indexWhere((element) => element.id == communityId);
    if (index == -1) throw Exception('Community not found');
    final member = CommunityMember(
      id: _uuid.v4(),
      name: draft.name,
      role: draft.role,
      avatarUrl: draft.avatarUrl,
      joinedAt: DateTime.now(),
    );
    final community = _communities[index];
    final updated = community.copyWith(
      members: [member, ...community.members],
      memberCount: community.memberCount + 1,
    );
    _communities = [
      ..._communities.sublist(0, index),
      updated,
      ..._communities.sublist(index + 1),
    ];
    await _persistCommunities();
    return member;
  }

  Future<CommunityMember> updateMember(
    String communityId,
    String memberId,
    CommunityMemberDraft draft,
  ) async {
    await ensureInitialised();
    final communityIndex = _communities.indexWhere((element) => element.id == communityId);
    if (communityIndex == -1) throw Exception('Community not found');
    final community = _communities[communityIndex];
    final members = community.members;
    final memberIndex = members.indexWhere((member) => member.id == memberId);
    if (memberIndex == -1) throw Exception('Member not found');

    final updatedMember = members[memberIndex].copyWith(
      name: draft.name,
      role: draft.role,
      avatarUrl: draft.avatarUrl,
    );

    final updatedCommunity = community.copyWith(
      members: [
        ...members.sublist(0, memberIndex),
        updatedMember,
        ...members.sublist(memberIndex + 1),
      ],
    );

    _communities = [
      ..._communities.sublist(0, communityIndex),
      updatedCommunity,
      ..._communities.sublist(communityIndex + 1),
    ];

    await _persistCommunities();
    return updatedMember;
  }

  Future<void> removeMember(String communityId, String memberId) async {
    await ensureInitialised();
    final index = _communities.indexWhere((element) => element.id == communityId);
    if (index == -1) throw Exception('Community not found');
    final community = _communities[index];
    final updated = community.copyWith(
      members: community.members.where((member) => member.id != memberId).toList(),
      memberCount: max(community.memberCount - 1, 0),
    );
    _communities = [
      ..._communities.sublist(0, index),
      updated,
      ..._communities.sublist(index + 1),
    ];
    await _persistCommunities();
  }

  Future<FeedPost> createPost(FeedPostDraft draft) async {
    await ensureInitialised();
    final community = _communities.firstWhere((element) => element.id == draft.communityId);
    final post = FeedPost(
      id: _uuid.v4(),
      communityId: community.id,
      communityName: community.name,
      authorName: draft.authorName,
      authorRole: draft.authorRole,
      authorAvatar: draft.authorAvatar ?? _randomAvatar(),
      message: draft.message,
      tags: draft.tags,
      createdAt: DateTime.now(),
      reactionCount: 0,
      comments: const <FeedComment>[],
      mediaUrl: draft.mediaUrl,
    );
    _posts = [post, ..._posts];
    await _persistPosts();
    _resources = [
      ExplorerResource(
        id: 'post-${post.id}',
        entityType: 'insight',
        title: '${community.name}: ${draft.tags.isNotEmpty ? draft.tags.first : 'Update'}',
        subtitle: draft.authorName,
        description: draft.message,
        tags: {...draft.tags, community.name}.toList(),
        updatedAt: post.createdAt,
        coverImage: draft.mediaUrl,
        communityId: community.id,
        owner: draft.authorName,
      ),
      ..._resources,
    ];
    await _persistResources();
    return post;
  }

  Future<FeedPost> updatePost(String id, FeedPostDraft draft) async {
    await ensureInitialised();
    final index = _posts.indexWhere((element) => element.id == id);
    if (index == -1) throw Exception('Post not found');
    final community = _communities.firstWhere((element) => element.id == draft.communityId);
    final current = _posts[index];
    final updated = current.copyWith(
      communityId: community.id,
      communityName: community.name,
      message: draft.message,
      tags: draft.tags,
      mediaUrl: draft.mediaUrl,
      authorName: draft.authorName,
      authorRole: draft.authorRole,
      authorAvatar: draft.authorAvatar ?? current.authorAvatar,
    );
    _posts = [
      updated,
      ..._posts.sublist(0, index),
      ..._posts.sublist(index + 1),
    ];
    await _persistPosts();
    _resources = _resources.map((resource) {
      if (resource.id == 'post-$id') {
        return resource.copyWith(
          title: '${community.name}: ${draft.tags.isNotEmpty ? draft.tags.first : 'Update'}',
          subtitle: draft.authorName,
          description: draft.message,
          tags: {...draft.tags, community.name}.toList(),
          updatedAt: DateTime.now(),
          coverImage: draft.mediaUrl,
          communityId: community.id,
        );
      }
      return resource;
    }).toList();
    await _persistResources();
    return updated;
  }

  Future<void> deletePost(String id) async {
    await ensureInitialised();
    _posts = _posts.where((post) => post.id != id).toList();
    await _persistPosts();
    _resources = _resources.where((resource) => resource.id != 'post-$id').toList();
    await _persistResources();
  }

  Future<FeedPost> toggleBookmark(String id) async {
    await ensureInitialised();
    final index = _posts.indexWhere((element) => element.id == id);
    if (index == -1) throw Exception('Post not found');
    final post = _posts[index];
    final updated = post.copyWith(bookmarked: !post.bookmarked);
    _posts = [
      updated,
      ..._posts.sublist(0, index),
      ..._posts.sublist(index + 1),
    ];
    await _persistPosts();
    return updated;
  }

  Future<FeedPost> togglePostReaction(String id) async {
    await ensureInitialised();
    final index = _posts.indexWhere((element) => element.id == id);
    if (index == -1) throw Exception('Post not found');
    final post = _posts[index];
    final liked = !post.liked;
    final updated = post.copyWith(
      liked: liked,
      reactionCount: max(post.reactionCount + (liked ? 1 : -1), 0),
    );
    _posts = [
      updated,
      ..._posts.sublist(0, index),
      ..._posts.sublist(index + 1),
    ];
    await _persistPosts();
    return updated;
  }

  Future<FeedComment> addComment(String postId, FeedCommentDraft draft, String message) async {
    await ensureInitialised();
    final index = _posts.indexWhere((element) => element.id == postId);
    if (index == -1) throw Exception('Post not found');
    final comment = FeedComment(
      id: _uuid.v4(),
      authorName: draft.authorName,
      authorAvatar: draft.authorAvatar ?? _randomAvatar(),
      message: message,
      createdAt: DateTime.now(),
    );
    final post = _posts[index];
    final updated = post.copyWith(comments: [comment, ...post.comments]);
    _posts = [
      updated,
      ..._posts.sublist(0, index),
      ..._posts.sublist(index + 1),
    ];
    await _persistPosts();
    return comment;
  }

  Future<void> removeComment(String postId, String commentId) async {
    await ensureInitialised();
    final index = _posts.indexWhere((element) => element.id == postId);
    if (index == -1) throw Exception('Post not found');
    final post = _posts[index];
    final updated = post.copyWith(
      comments: post.comments.where((comment) => comment.id != commentId).toList(),
    );
    _posts = [
      updated,
      ..._posts.sublist(0, index),
      ..._posts.sublist(index + 1),
    ];
    await _persistPosts();
  }

  Future<List<FeedPost>> fetchFeed({
    String? communityId,
    String? searchQuery,
    Set<String>? tags,
  }) async {
    await ensureInitialised();
    Iterable<FeedPost> results = _posts;
    if (communityId != null) {
      results = results.where((post) => post.communityId == communityId);
    }
    if (searchQuery != null && searchQuery.trim().isNotEmpty) {
      final query = searchQuery.toLowerCase();
      results = results.where(
        (post) => post.message.toLowerCase().contains(query) ||
            post.tags.any((tag) => tag.toLowerCase().contains(query)) ||
            post.authorName.toLowerCase().contains(query),
      );
    }
    if (tags != null && tags.isNotEmpty) {
      results = results.where((post) => post.tags.any(tags.contains));
    }
    return results.map((post) => post).toList(growable: false);
  }

  Future<List<ExplorerResource>> searchExplorer(ExplorerQuery query) async {
    await ensureInitialised();
    Iterable<ExplorerResource> results = _resources;
    if (query.entityTypes.isNotEmpty) {
      results = results.where((resource) => query.entityTypes.contains(resource.entityType));
    }
    if (query.tags.isNotEmpty) {
      results = results.where((resource) => resource.tags.any(query.tags.contains));
    }
    if (query.query.isNotEmpty) {
      final lower = query.query.toLowerCase();
      results = results.where((resource) =>
          resource.title.toLowerCase().contains(lower) ||
          resource.subtitle.toLowerCase().contains(lower) ||
          resource.description.toLowerCase().contains(lower));
    }
    return results.toList(growable: false);
  }

  Future<ExplorerResource> createExplorerResource(ExplorerResourceDraft draft) async {
    await ensureInitialised();
    final resource = ExplorerResource(
      id: _uuid.v4(),
      entityType: draft.entityType,
      title: draft.title,
      subtitle: draft.subtitle,
      description: draft.description,
      tags: draft.tags,
      updatedAt: DateTime.now(),
      coverImage: draft.coverImage,
      communityId: draft.communityId,
      link: draft.link,
      owner: draft.owner,
    );
    _resources = [resource, ..._resources];
    await _persistResources();
    return resource;
  }

  Future<ExplorerResource> updateExplorerResource(String id, ExplorerResourceDraft draft) async {
    await ensureInitialised();
    final index = _resources.indexWhere((element) => element.id == id);
    if (index == -1) throw Exception('Resource not found');
    final updated = _resources[index].copyWith(
      entityType: draft.entityType,
      title: draft.title,
      subtitle: draft.subtitle,
      description: draft.description,
      tags: draft.tags,
      updatedAt: DateTime.now(),
      coverImage: draft.coverImage,
      communityId: draft.communityId,
      link: draft.link,
      owner: draft.owner,
    );
    _resources = [
      updated,
      ..._resources.sublist(0, index),
      ..._resources.sublist(index + 1),
    ];
    await _persistResources();
    return updated;
  }

  Future<void> deleteExplorerResource(String id) async {
    await ensureInitialised();
    _resources = _resources.where((resource) => resource.id != id).toList();
    await _persistResources();
  }

  Future<ExplorerResource> toggleResourceFavourite(String id) async {
    await ensureInitialised();
    final index = _resources.indexWhere((element) => element.id == id);
    if (index == -1) throw Exception('Resource not found');
    final resource = _resources[index];
    final updated = resource.copyWith(isFavorite: !resource.isFavorite);
    _resources = [
      updated,
      ..._resources.sublist(0, index),
      ..._resources.sublist(index + 1),
    ];
    await _persistResources();
    return updated;
  }

  String? get activeCommunityId => _activeCommunityId;

  Future<void> setActiveCommunityId(String? id) async {
    await ensureInitialised();
    _activeCommunityId = id;
    await _preferencesBox?.put(_activeCommunityKey, id);
  }

  Future<Set<String>> loadAvailableTags() async {
    await ensureInitialised();
    final tags = <String>{};
    for (final post in _posts) {
      tags.addAll(post.tags);
    }
    return tags;
  }

  Future<Set<String>> loadExplorerTags() async {
    await ensureInitialised();
    final tags = <String>{};
    for (final resource in _resources) {
      tags.addAll(resource.tags);
    }
    return tags;
  }

  Future<void> _persistCommunities() async {
    await _directoryBox?.put(
      _communitiesKey,
      _communities.map((community) => community.toJson()).toList(),
    );
  }

  Future<void> _persistPosts() async {
    await _feedBox?.put(
      _postsKey,
      _posts.map((post) => post.toJson()).toList(),
    );
  }

  Future<void> _persistResources() async {
    await _explorerBox?.put(
      _resourcesKey,
      _resources.map((resource) => resource.toJson()).toList(),
    );
  }

  List<CommunityModel> _readCommunities() {
    final raw = _directoryBox?.get(_communitiesKey);
    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((entry) => CommunityModel.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList();
    }
    return const <CommunityModel>[];
  }

  List<FeedPost> _readPosts() {
    final raw = _feedBox?.get(_postsKey);
    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((entry) => FeedPost.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList();
    }
    return const <FeedPost>[];
  }

  List<ExplorerResource> _readResources() {
    final raw = _explorerBox?.get(_resourcesKey);
    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((entry) => ExplorerResource.fromJson(Map<String, dynamic>.from(entry as Map)))
          .toList();
    }
    return const <ExplorerResource>[];
  }

  String _randomAvatar() {
    final seed = 30 + _random.nextInt(70);
    return 'https://i.pravatar.cc/150?img=$seed';
  }

  List<CommunityMember> _generateMembers({required String seed}) {
    final members = <CommunityMember>[];
    for (var i = 0; i < 6; i++) {
      members.add(
        CommunityMember(
          id: _uuid.v4(),
          name: '$seed Member ${i + 1}',
          role: i == 0 ? 'Moderator' : 'Contributor',
          avatarUrl: _randomAvatar(),
          joinedAt: DateTime.now().subtract(Duration(days: i * 3 + 2)),
        ),
      );
    }
    return members;
  }

  List<CommunityModel> _seedCommunities() {
    final now = DateTime.now();
    final revOps = CommunityModel(
      id: _uuid.v4(),
      name: 'RevOps Guild',
      description:
          'Revenue operators scaling GTM playbooks together and trading automation rituals that keep pipelines predictable.',
      bannerImage:
          'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
      accentColor: '#EEF2FF',
      tags: const ['Revenue', 'Automation', 'Lifecycle'],
      memberCount: 2180,
      joined: true,
      members: _generateMembers(seed: 'RevOps'),
      events: [
        CommunityEvent(
          id: _uuid.v4(),
          title: 'Automation Clinic Live Lab',
          description:
              'Interactive build-along where we reverse engineer a member funnel automation and publish the blueprint.',
          start: now.add(const Duration(days: 3, hours: 18)),
          end: now.add(const Duration(days: 3, hours: 20)),
          location: 'Virtual – Edulure Broadcast Studio',
          meetingUrl: 'https://meet.edulure.com/revops-clinic',
          coverImage:
              'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
        ),
      ],
      location: 'Remote-first, global',
      guidelines: const [
        'Lead with generosity and share context when asking for help.',
        'Keep member data anonymised in shared playbooks.',
        'Respect channel rituals and async cadences.',
      ],
      focusAreas: const ['Automation', 'Playbook Design', 'Reporting'],
      isPrivate: false,
    );

    final customerEducation = CommunityModel(
      id: _uuid.v4(),
      name: 'Customer Education Collective',
      description:
          'Designing immersive customer education programmes and measuring learning impact across the lifecycle.',
      bannerImage:
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      accentColor: '#FFF7ED',
      tags: const ['Learning', 'Research', 'Advocacy'],
      memberCount: 1835,
      joined: true,
      members: _generateMembers(seed: 'Education'),
      events: [
        CommunityEvent(
          id: _uuid.v4(),
          title: 'Learner Persona Research Sprint',
          description:
              'A rapid research micro-sprint to compare persona mapping templates across regions and gather new interview kits.',
          start: now.add(const Duration(days: 7, hours: 17)),
          end: now.add(const Duration(days: 7, hours: 19)),
          location: 'Hybrid – Singapore hub + Zoom',
          meetingUrl: 'https://meet.edulure.com/collective-research',
          coverImage:
              'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
        ),
      ],
      location: 'APAC, EMEA, North America',
      guidelines: const [
        'Share wins in #celebrations so we can amplify across cohorts.',
        'Use the template vault when publishing assets to ensure QA.',
        'Flag duplicate efforts with moderators to avoid overlap.',
      ],
      focusAreas: const ['Curriculum', 'Enablement', 'Measurement'],
      isPrivate: false,
    );

    final communityLed = CommunityModel(
      id: _uuid.v4(),
      name: 'Community-Led Leaders',
      description:
          'Operators architecting community-led growth motions, sharing governance frameworks, and pairing mentorship circles.',
      bannerImage:
          'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
      accentColor: '#F1F5F9',
      tags: const ['Leadership', 'Governance', 'Playbooks'],
      memberCount: 2560,
      joined: true,
      members: _generateMembers(seed: 'Leaders'),
      events: [
        CommunityEvent(
          id: _uuid.v4(),
          title: 'Mentorship Circle Pilot',
          description:
              'Rotational peer mentorship across growth, operations, and product to exchange rituals that scale community health.',
          start: now.add(const Duration(days: 12, hours: 16)),
          end: now.add(const Duration(days: 12, hours: 18)),
          location: 'Virtual – Gather space',
          meetingUrl: 'https://meet.edulure.com/mentorship-circle',
          coverImage:
              'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        ),
      ],
      location: 'Global network',
      guidelines: const [
        'Respect regional compliance requirements when sharing data.',
        'Keep mentorship circle notes inside the shared workspace.',
        'Escalate platform risks to the admin triage team.',
      ],
      focusAreas: const ['Strategy', 'Mentorship', 'Operations'],
      isPrivate: true,
    );

    return [revOps, customerEducation, communityLed];
  }

  List<FeedPost> _seedPosts(List<CommunityModel> communities) {
    final revOps = communities.first;
    final customerEducation = communities[1];
    final communityLed = communities[2];
    final posts = <FeedPost>[
      FeedPost(
        id: _uuid.v4(),
        communityId: revOps.id,
        communityName: revOps.name,
        authorName: 'Jordan Brooks',
        authorRole: 'Head of Community Ops',
        authorAvatar: _randomAvatar(),
        message:
            'We just published the Q2 revenue operating cadence playbook complete with automation health dashboards.',
        tags: const ['Playbook', 'Automation', 'Launch'],
        createdAt: DateTime.now().subtract(const Duration(hours: 6)),
        reactionCount: 48,
        comments: const <FeedComment>[],
        mediaUrl:
            'https://images.unsplash.com/photo-1522202222400-95cb8671ee88?auto=format&fit=crop&w=1200&q=80',
      ),
      FeedPost(
        id: _uuid.v4(),
        communityId: customerEducation.id,
        communityName: customerEducation.name,
        authorName: 'Sasha Nwosu',
        authorRole: 'Learning Experience Designer',
        authorAvatar: _randomAvatar(),
        message:
            'Next week we are running a live teardown of the new onboarding experience. RSVP in the community calendar!',
        tags: const ['Onboarding', 'Live session'],
        createdAt: DateTime.now().subtract(const Duration(hours: 12)),
        reactionCount: 72,
        comments: const <FeedComment>[],
        mediaUrl:
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      ),
      FeedPost(
        id: _uuid.v4(),
        communityId: communityLed.id,
        communityName: communityLed.name,
        authorName: 'Noah Patel',
        authorRole: 'Community Strategist',
        authorAvatar: _randomAvatar(),
        message:
            'We are prototyping a new ritual around cross-community mentorship. Looking for two beta circles to stress-test.',
        tags: const ['Mentorship', 'Rituals'],
        createdAt: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
        reactionCount: 33,
        comments: const <FeedComment>[],
        mediaUrl:
            'https://images.unsplash.com/photo-1515169067865-5387ec356754?auto=format&fit=crop&w=1200&q=80',
      ),
    ];

    return posts;
  }

  List<ExplorerResource> _seedResources() {
    final now = DateTime.now();
    return [
      ExplorerResource(
        id: _uuid.v4(),
        entityType: 'playbook',
        title: 'Adaptive Cohort Launch SOP',
        subtitle: 'RevOps Guild',
        description:
            'Step-by-step operational ritual for orchestrating multi-region cohort launches with automation guardrails.',
        tags: const ['Playbook', 'Automation', 'Cohorts'],
        updatedAt: now.subtract(const Duration(days: 2)),
        coverImage:
            'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
        owner: 'Jordan Brooks',
      ),
      ExplorerResource(
        id: _uuid.v4(),
        entityType: 'event',
        title: 'Learner Persona Research Sprint',
        subtitle: 'Customer Education Collective',
        description:
            'Rapid research format to compare persona templates and update interviewing cadences across global cohorts.',
        tags: const ['Research', 'Learners', 'Sprint'],
        updatedAt: now.subtract(const Duration(days: 1)),
        coverImage:
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        owner: 'Emily Tan',
      ),
      ExplorerResource(
        id: _uuid.v4(),
        entityType: 'community',
        title: 'Community-Led Leaders',
        subtitle: 'Global leadership guild',
        description:
            'Operators architecting community-led growth, sharing governance frameworks, and pairing mentorship circles.',
        tags: const ['Leadership', 'Mentorship', 'Governance'],
        updatedAt: now.subtract(const Duration(days: 3)),
        owner: 'Community HQ',
      ),
    ];
  }

  @visibleForTesting
  Future<void> resetForTesting() async {
    if (_directoryBox?.isOpen ?? false) {
      await _directoryBox?.deleteFromDisk();
    }
    if (_feedBox?.isOpen ?? false) {
      await _feedBox?.deleteFromDisk();
    }
    if (_explorerBox?.isOpen ?? false) {
      await _explorerBox?.deleteFromDisk();
    }
    if (_preferencesBox?.isOpen ?? false) {
      await _preferencesBox?.deleteFromDisk();
    }
    _directoryBox = null;
    _feedBox = null;
    _explorerBox = null;
    _preferencesBox = null;
    _communities = const <CommunityModel>[];
    _posts = const <FeedPost>[];
    _resources = const <ExplorerResource>[];
    _activeCommunityId = null;
    _initialised = false;
  }
}

final communityDataServiceProvider = Provider<CommunityDataService>((ref) {
  return CommunityDataService.instance;
});
