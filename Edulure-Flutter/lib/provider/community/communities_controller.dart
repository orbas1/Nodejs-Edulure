import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/community_service.dart';
import '../../services/live_feed_service.dart';

final communitiesControllerProvider =
    StateNotifierProvider<CommunitiesController, CommunitiesState>((ref) {
  return CommunitiesController(service: ref.watch(communityServiceProvider));
});

class CommunitiesState {
  const CommunitiesState({
    this.loading = false,
    this.error,
    this.communities = const <CommunitySummary>[],
    this.details = const <String, CommunityDetail>{},
    this.lastSyncedAt,
  });

  final bool loading;
  final String? error;
  final List<CommunitySummary> communities;
  final Map<String, CommunityDetail> details;
  final DateTime? lastSyncedAt;

  CommunitiesState copyWith({
    bool? loading,
    String? error,
    bool clearError = false,
    List<CommunitySummary>? communities,
    Map<String, CommunityDetail>? details,
    DateTime? lastSyncedAt,
  }) {
    return CommunitiesState(
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
      communities: communities ?? this.communities,
      details: details ?? this.details,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }
}

class CommunitiesController extends StateNotifier<CommunitiesState> {
  CommunitiesController({required CommunityService service})
      : _service = service,
        super(const CommunitiesState());

  final CommunityService _service;

  Future<void> refresh() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final communities = await _service.listCommunities();
      state = state.copyWith(
        loading: false,
        communities: communities,
        lastSyncedAt: DateTime.now(),
        clearError: true,
      );
    } catch (error, stackTrace) {
      debugPrint('Failed to load communities: $error\n$stackTrace');
      state = state.copyWith(
        loading: false,
        error: _mapError(error),
      );
    }
  }

  Future<CommunitySummary> createCommunity(CreateCommunityInput input) async {
    final created = await _service.createCommunity(input);
    final updated = [created, ...state.communities];
    state = state.copyWith(communities: updated, lastSyncedAt: DateTime.now());
    return created;
  }

  Future<CommunitySummary> joinCommunity(String communityId) async {
    final joined = await _service.joinCommunity(communityId);
    final updated = state.communities
        .map((community) => community.id == joined.id ? joined : community)
        .toList();
    state = state.copyWith(communities: updated, lastSyncedAt: DateTime.now());
    return joined;
  }

  Future<void> leaveCommunity(String communityId, {String? reason}) async {
    await _service.leaveCommunity(communityId, reason: reason);
    final updated = state.communities.map((community) {
      if (community.id == communityId) {
        return community.copyWith(
          membership: const CommunityMembership(role: 'member', status: 'inactive'),
        );
      }
      return community;
    }).toList();
    state = state.copyWith(communities: updated, lastSyncedAt: DateTime.now());
  }

  Future<CommunityDetail> getDetail(String communityId, {bool forceRefresh = false}) async {
    if (!forceRefresh && state.details.containsKey(communityId)) {
      return state.details[communityId]!;
    }
    final detail = await _service.getCommunity(communityId);
    final nextDetails = Map<String, CommunityDetail>.from(state.details)
      ..[communityId] = detail;
    state = state.copyWith(details: nextDetails);
    return detail;
  }

  Future<CommunityFeedPage> fetchFeed(String communityId,
      {int page = 1, int perPage = 10, String? query, String? postType}) async {
    return _service.fetchCommunityFeed(
      communityId,
      page: page,
      perPage: perPage,
      query: query,
      postType: postType,
    );
  }

  String _mapError(Object error) {
    if (error is DioException) {
      final response = error.response?.data;
      if (response is Map && response['message'] is String) {
        return response['message'] as String;
      }
      return error.message ?? 'Network error';
    }
    return error.toString();
  }
}
