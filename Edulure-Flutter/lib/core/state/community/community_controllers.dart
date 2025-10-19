import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../services/community_data_service.dart';
import '../../models/community_models.dart';

enum FeedScope { all, activeCommunity, bookmarked }

typedef CommunityId = String?;

class FeedFilter {
  const FeedFilter({
    required this.scope,
    this.communityId,
    this.query = '',
    Set<String>? tags,
  }) : tags = tags ?? const <String>{};

  final FeedScope scope;
  final String? communityId;
  final String query;
  final Set<String> tags;

  FeedFilter copyWith({
    FeedScope? scope,
    String? communityId,
    String? query,
    Set<String>? tags,
  }) {
    return FeedFilter(
      scope: scope ?? this.scope,
      communityId: communityId ?? this.communityId,
      query: query ?? this.query,
      tags: tags ?? this.tags,
    );
  }
}

final feedFilterProvider = StateProvider<FeedFilter>((ref) {
  return const FeedFilter(scope: FeedScope.all);
});

class ActiveCommunityNotifier extends Notifier<String?> {
  @override
  String? build() {
    final service = ref.watch(communityDataServiceProvider);
    return service.activeCommunityId;
  }

  Future<void> setActive(String? communityId) async {
    final service = ref.read(communityDataServiceProvider);
    await service.setActiveCommunityId(communityId);
    state = communityId;
    final filterController = ref.read(feedFilterProvider.notifier);
    final filter = filterController.state;
    if (filter.scope == FeedScope.activeCommunity) {
      filterController.state = filter.copyWith(communityId: communityId);
    }
  }
}

final activeCommunityProvider = NotifierProvider<ActiveCommunityNotifier, String?>(
  ActiveCommunityNotifier.new,
);

class CommunityFeedController extends AsyncNotifier<List<FeedPost>> {
  Future<List<FeedPost>> _loadFeed() {
    final filter = ref.read(feedFilterProvider);
    final service = ref.read(communityDataServiceProvider);
    String? communityId;
    if (filter.scope == FeedScope.activeCommunity) {
      communityId = filter.communityId ?? ref.read(activeCommunityProvider);
    }
    final searchTags = filter.tags.isEmpty ? null : filter.tags;
    return service.fetchFeed(
      communityId: communityId,
      searchQuery: filter.query.isEmpty ? null : filter.query,
      tags: searchTags,
    ).then((posts) {
      if (filter.scope == FeedScope.bookmarked) {
        return posts.where((post) => post.bookmarked).toList();
      }
      if (filter.scope == FeedScope.all) {
        return posts;
      }
      return posts;
    });
  }

  @override
  Future<List<FeedPost>> build() {
    ref.watch(feedFilterProvider);
    ref.watch(activeCommunityProvider);
    return _loadFeed();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_loadFeed);
  }

  Future<FeedPost> createPost(FeedPostDraft draft) async {
    final service = ref.read(communityDataServiceProvider);
    final created = await service.createPost(draft);
    await refresh();
    return created;
  }

  Future<FeedPost> updatePost(String id, FeedPostDraft draft) async {
    final service = ref.read(communityDataServiceProvider);
    final updated = await service.updatePost(id, draft);
    await refresh();
    return updated;
  }

  Future<void> deletePost(String id) async {
    final service = ref.read(communityDataServiceProvider);
    await service.deletePost(id);
    await refresh();
  }

  Future<FeedPost> toggleBookmark(String id) async {
    final service = ref.read(communityDataServiceProvider);
    final updated = await service.toggleBookmark(id);
    state = state.whenData((posts) {
      return posts
          .map((post) => post.id == id ? updated : post)
          .toList(growable: false);
    });
    return updated;
  }

  Future<FeedPost> toggleReaction(String id) async {
    final service = ref.read(communityDataServiceProvider);
    final updated = await service.togglePostReaction(id);
    state = state.whenData((posts) {
      return posts
          .map((post) => post.id == id ? updated : post)
          .toList(growable: false);
    });
    return updated;
  }

  Future<FeedComment> addComment(String postId, FeedCommentDraft draft, String message) async {
    final service = ref.read(communityDataServiceProvider);
    final comment = await service.addComment(postId, draft, message);
    state = state.whenData((posts) {
      return posts.map((post) {
        if (post.id == postId) {
          return post.copyWith(comments: [comment, ...post.comments]);
        }
        return post;
      }).toList(growable: false);
    });
    return comment;
  }

  Future<void> removeComment(String postId, String commentId) async {
    final service = ref.read(communityDataServiceProvider);
    await service.removeComment(postId, commentId);
    state = state.whenData((posts) {
      return posts.map((post) {
        if (post.id == postId) {
          return post.copyWith(
            comments: post.comments.where((comment) => comment.id != commentId).toList(),
          );
        }
        return post;
      }).toList(growable: false);
    });
  }
}

final communityFeedControllerProvider = AsyncNotifierProvider<CommunityFeedController, List<FeedPost>>(
  CommunityFeedController.new,
);

class CommunityDirectoryController extends AsyncNotifier<List<CommunityModel>> {
  Future<List<CommunityModel>> _loadCommunities() async {
    final service = ref.read(communityDataServiceProvider);
    return service.fetchCommunities();
  }

  @override
  Future<List<CommunityModel>> build() async {
    return _loadCommunities();
  }

  Future<CommunityModel> createCommunity(CommunityDraft draft) async {
    final service = ref.read(communityDataServiceProvider);
    final community = await service.createCommunity(draft);
    await refreshDirectory();
    await ref.read(activeCommunityProvider.notifier).setActive(community.id);
    return community;
  }

  Future<CommunityModel> updateCommunity(String id, CommunityDraft draft) async {
    final service = ref.read(communityDataServiceProvider);
    final community = await service.updateCommunity(id, draft);
    await refreshDirectory();
    return community;
  }

  Future<void> deleteCommunity(String id) async {
    final service = ref.read(communityDataServiceProvider);
    await service.deleteCommunity(id);
    await refreshDirectory();
    final active = service.activeCommunityId;
    await ref.read(activeCommunityProvider.notifier).setActive(active);
  }

  Future<CommunityModel> toggleMembership(String id, bool join) async {
    final service = ref.read(communityDataServiceProvider);
    final community = await service.toggleMembership(id, join: join);
    state = state.whenData((communities) {
      return communities
          .map((entry) => entry.id == id ? community : entry)
          .toList(growable: false);
    });
    return community;
  }

  Future<CommunityEvent> addEvent(String id, CommunityEventDraft draft) async {
    final service = ref.read(communityDataServiceProvider);
    final event = await service.addEvent(id, draft);
    await refreshDirectory();
    return event;
  }

  Future<CommunityEvent> updateEvent(
    String communityId,
    String eventId,
    CommunityEventDraft draft,
  ) async {
    final service = ref.read(communityDataServiceProvider);
    final event = await service.updateEvent(communityId, eventId, draft);
    await refreshDirectory();
    return event;
  }

  Future<void> removeEvent(String communityId, String eventId) async {
    final service = ref.read(communityDataServiceProvider);
    await service.removeEvent(communityId, eventId);
    await refreshDirectory();
  }

  Future<CommunityMember> addMember(String id, CommunityMemberDraft draft) async {
    final service = ref.read(communityDataServiceProvider);
    final member = await service.addMember(id, draft);
    await refreshDirectory();
    return member;
  }

  Future<CommunityMember> updateMember(
    String communityId,
    String memberId,
    CommunityMemberDraft draft,
  ) async {
    final service = ref.read(communityDataServiceProvider);
    final member = await service.updateMember(communityId, memberId, draft);
    await refreshDirectory();
    return member;
  }

  Future<void> removeMember(String communityId, String memberId) async {
    final service = ref.read(communityDataServiceProvider);
    await service.removeMember(communityId, memberId);
    await refreshDirectory();
  }

  Future<void> refreshDirectory() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_loadCommunities);
  }
}

final communityDirectoryControllerProvider =
    AsyncNotifierProvider<CommunityDirectoryController, List<CommunityModel>>(
  CommunityDirectoryController.new,
);

class ExplorerState {
  const ExplorerState({
    required this.results,
    required this.query,
    required this.entityFilters,
    required this.tagFilters,
    required this.availableTags,
  });

  final List<ExplorerResource> results;
  final String query;
  final Set<String> entityFilters;
  final Set<String> tagFilters;
  final Set<String> availableTags;

  ExplorerState copyWith({
    List<ExplorerResource>? results,
    String? query,
    Set<String>? entityFilters,
    Set<String>? tagFilters,
    Set<String>? availableTags,
  }) {
    return ExplorerState(
      results: results ?? this.results,
      query: query ?? this.query,
      entityFilters: entityFilters ?? this.entityFilters,
      tagFilters: tagFilters ?? this.tagFilters,
      availableTags: availableTags ?? this.availableTags,
    );
  }
}

class ExplorerController extends AsyncNotifier<ExplorerState> {
  static const defaultEntities = {'playbook', 'event', 'community', 'insight'};

  Future<ExplorerState> _search({
    String? query,
    Set<String>? entities,
    Set<String>? tags,
  }) async {
    final service = ref.read(communityDataServiceProvider);
    final q = ExplorerQuery(
      query: query ?? state.value?.query ?? '',
      entityTypes: entities ?? state.value?.entityFilters ?? defaultEntities,
      tags: tags ?? state.value?.tagFilters ?? const <String>{},
    );
    final results = await service.searchExplorer(q);
    final availableTags = await service.loadExplorerTags();
    return ExplorerState(
      results: results,
      query: q.query,
      entityFilters: q.entityTypes,
      tagFilters: q.tags,
      availableTags: availableTags,
    );
  }

  @override
  Future<ExplorerState> build() async {
    return _search(query: '', entities: defaultEntities, tags: const <String>{});
  }

  Future<void> submitQuery(String query) async {
    final next = await _search(query: query.trim());
    state = AsyncValue.data(next);
  }

  Future<void> toggleEntity(String entity) async {
    final current = state.value;
    if (current == null) return;
    final filters = current.entityFilters.toSet();
    if (filters.contains(entity)) {
      if (filters.length == 1) {
        return;
      }
      filters.remove(entity);
    } else {
      filters.add(entity);
    }
    final next = await _search(entities: filters);
    state = AsyncValue.data(next);
  }

  Future<void> toggleTag(String tag) async {
    final current = state.value;
    if (current == null) return;
    final tags = current.tagFilters.toSet();
    if (tags.contains(tag)) {
      tags.remove(tag);
    } else {
      tags.add(tag);
    }
    final next = await _search(tags: tags);
    state = AsyncValue.data(next);
  }

  Future<void> clearFilters() async {
    final next = await _search(entities: defaultEntities, tags: const <String>{});
    state = AsyncValue.data(next.copyWith(query: ''));
  }

  Future<ExplorerResource> createResource(ExplorerResourceDraft draft) async {
    final service = ref.read(communityDataServiceProvider);
    final resource = await service.createExplorerResource(draft);
    final next = await _search();
    final updatedTags = await service.loadExplorerTags();
    state = AsyncValue.data(next.copyWith(availableTags: updatedTags));
    return resource;
  }

  Future<ExplorerResource> updateResource(String id, ExplorerResourceDraft draft) async {
    final service = ref.read(communityDataServiceProvider);
    final resource = await service.updateExplorerResource(id, draft);
    final next = await _search();
    state = AsyncValue.data(next);
    return resource;
  }

  Future<void> deleteResource(String id) async {
    final service = ref.read(communityDataServiceProvider);
    await service.deleteExplorerResource(id);
    final next = await _search();
    state = AsyncValue.data(next);
  }

  Future<ExplorerResource> toggleFavourite(String id) async {
    final service = ref.read(communityDataServiceProvider);
    final resource = await service.toggleResourceFavourite(id);
    state = state.whenData((current) {
      return current.copyWith(
        results: current.results
            .map((entry) => entry.id == id ? resource : entry)
            .toList(growable: false),
      );
    });
    return resource;
  }
}

final explorerControllerProvider = AsyncNotifierProvider<ExplorerController, ExplorerState>(
  ExplorerController.new,
);

final feedTagCatalogueProvider = FutureProvider<Set<String>>((ref) async {
  final service = ref.watch(communityDataServiceProvider);
  return service.loadAvailableTags();
});

final explorerTagCatalogueProvider = FutureProvider<Set<String>>((ref) async {
  final service = ref.watch(communityDataServiceProvider);
  return service.loadExplorerTags();
});
