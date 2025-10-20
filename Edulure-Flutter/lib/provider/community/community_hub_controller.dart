import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../services/community_hub_models.dart';
import '../../services/community_hub_repository.dart';

final communityHubRepositoryProvider = Provider<CommunityHubRepository>((ref) {
  return CommunityHubRepository();
});

final communityHubControllerProvider =
    StateNotifierProvider<CommunityHubController, CommunityHubState>((ref) {
  final repository = ref.watch(communityHubRepositoryProvider);
  return CommunityHubController(repository: repository);
});

class CommunityHubState {
  const CommunityHubState({
    this.snapshot = const CommunityHubSnapshot(),
    this.loading = false,
    this.saving = false,
    this.error,
  });

  final CommunityHubSnapshot snapshot;
  final bool loading;
  final bool saving;
  final String? error;

  CommunityHubState copyWith({
    CommunityHubSnapshot? snapshot,
    bool? loading,
    bool? saving,
    String? error,
    bool clearError = false,
  }) {
    return CommunityHubState(
      snapshot: snapshot ?? this.snapshot,
      loading: loading ?? this.loading,
      saving: saving ?? this.saving,
      error: clearError ? null : error ?? this.error,
    );
  }
}

class CommunityHubController extends StateNotifier<CommunityHubState> {
  CommunityHubController({required CommunityHubRepository repository})
      : _repository = repository,
        super(const CommunityHubState());

  final CommunityHubRepository _repository;
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
      final snapshot = await _repository.loadSnapshot();
      state = state.copyWith(snapshot: snapshot, loading: false, clearError: true);
      _bootstrapCompleter!.complete();
    } catch (error) {
      state = state.copyWith(
        loading: false,
        error: error.toString(),
      );
      _bootstrapCompleter!.completeError(error);
      rethrow;
    } finally {
      _bootstrapCompleter = null;
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final snapshot = await _repository.loadSnapshot();
      state = state.copyWith(snapshot: snapshot, loading: false, clearError: true);
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> _persist(CommunityHubSnapshot snapshot) async {
    state = state.copyWith(snapshot: snapshot, saving: true, clearError: true);
    try {
      await _repository.saveSnapshot(snapshot);
    } catch (error) {
      state = state.copyWith(error: error.toString());
      rethrow;
    } finally {
      state = state.copyWith(saving: false);
    }
  }

  Future<void> createFeedPost({
    required String title,
    required String body,
    required String author,
    String? communityId,
    String? coverImageUrl,
    List<String>? tags,
    List<String>? attachmentUrls,
  }) async {
    final now = DateTime.now();
    final post = CommunityFeedPost(
      id: _uuid.v4(),
      title: title,
      body: body,
      author: author,
      communityId: communityId,
      createdAt: now,
      updatedAt: now,
      coverImageUrl: coverImageUrl,
      tags: tags ?? const <String>[],
      attachmentUrls: attachmentUrls ?? const <String>[],
    );
    final snapshot = state.snapshot.copyWith(
      feed: [post, ...state.snapshot.feed],
    );
    await _persist(snapshot);
  }

  Future<void> updateFeedPost(CommunityFeedPost post) async {
    final posts = state.snapshot.feed
        .map((item) => item.id == post.id ? post.copyWith(updatedAt: DateTime.now()) : item)
        .toList();
    final snapshot = state.snapshot.copyWith(feed: posts);
    await _persist(snapshot);
  }

  Future<void> deleteFeedPost(String postId) async {
    final posts = state.snapshot.feed.where((item) => item.id != postId).toList();
    final snapshot = state.snapshot.copyWith(feed: posts);
    await _persist(snapshot);
  }

  Future<void> togglePostPin(String postId) async {
    final posts = state.snapshot.feed
        .map((item) =>
            item.id == postId ? item.copyWith(pinned: !item.pinned, updatedAt: DateTime.now()) : item)
        .toList();
    final snapshot = state.snapshot.copyWith(feed: posts);
    await _persist(snapshot);
  }

  Future<void> createClassroom({
    required String title,
    required String facilitator,
    required String description,
    required DateTime startTime,
    required DateTime endTime,
    required String deliveryMode,
    required int capacity,
    required String communityId,
    List<String>? resources,
    List<String>? tags,
    String? recordingUrl,
    String? coverImageUrl,
  }) async {
    final classroom = CommunityClassroom(
      id: _uuid.v4(),
      title: title,
      facilitator: facilitator,
      description: description,
      startTime: startTime,
      endTime: endTime,
      deliveryMode: deliveryMode,
      capacity: capacity,
      communityId: communityId,
      resources: resources ?? const <String>[],
      enrolled: const <String>[],
      tags: tags ?? const <String>[],
      recordingUrl: recordingUrl,
      coverImageUrl: coverImageUrl,
    );
    final snapshot = state.snapshot.copyWith(
      classrooms: [classroom, ...state.snapshot.classrooms],
    );
    await _persist(snapshot);
  }

  Future<void> updateClassroom(CommunityClassroom classroom) async {
    final classrooms = state.snapshot.classrooms
        .map((item) => item.id == classroom.id ? classroom : item)
        .toList();
    final snapshot = state.snapshot.copyWith(classrooms: classrooms);
    await _persist(snapshot);
  }

  Future<void> deleteClassroom(String classroomId) async {
    final classrooms = state.snapshot.classrooms.where((item) => item.id != classroomId).toList();
    final snapshot = state.snapshot.copyWith(classrooms: classrooms);
    await _persist(snapshot);
  }

  Future<void> enrollInClassroom(String classroomId, String memberName) async {
    final classrooms = state.snapshot.classrooms.map((item) {
      if (item.id == classroomId && !item.enrolled.contains(memberName)) {
        return item.copyWith(enrolled: [...item.enrolled, memberName]);
      }
      return item;
    }).toList();
    final snapshot = state.snapshot.copyWith(classrooms: classrooms);
    await _persist(snapshot);
  }

  Future<void> cancelClassroomEnrollment(String classroomId, String memberName) async {
    final classrooms = state.snapshot.classrooms.map((item) {
      if (item.id == classroomId && item.enrolled.contains(memberName)) {
        final updated = item.enrolled.where((name) => name != memberName).toList();
        return item.copyWith(enrolled: updated);
      }
      return item;
    }).toList();
    final snapshot = state.snapshot.copyWith(classrooms: classrooms);
    await _persist(snapshot);
  }

  Future<void> createCalendarEntry({
    required String title,
    required String description,
    required DateTime startTime,
    required DateTime endTime,
    required String location,
    required String organiser,
    String? communityId,
    List<Duration>? reminders,
    List<String>? tags,
    String? coverImageUrl,
    String? meetingUrl,
    String? notes,
    List<String>? attachments,
  }) async {
    final entry = CommunityCalendarEntry(
      id: _uuid.v4(),
      title: title,
      description: description,
      startTime: startTime,
      endTime: endTime,
      location: location,
      organiser: organiser,
      communityId: communityId,
      reminders: reminders ?? const <Duration>[],
      tags: tags ?? const <String>[],
      coverImageUrl: coverImageUrl,
      meetingUrl: meetingUrl,
      notes: notes,
      attachments: attachments ?? const <String>[],
    );
    final snapshot = state.snapshot.copyWith(
      calendarEntries: [...state.snapshot.calendarEntries, entry]..sort((a, b) => a.startTime.compareTo(b.startTime)),
    );
    await _persist(snapshot);
  }

  Future<void> updateCalendarEntry(CommunityCalendarEntry entry) async {
    final entries = state.snapshot.calendarEntries
        .map((item) => item.id == entry.id ? entry : item)
        .toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    final snapshot = state.snapshot.copyWith(calendarEntries: entries);
    await _persist(snapshot);
  }

  Future<void> deleteCalendarEntry(String entryId) async {
    final entries = state.snapshot.calendarEntries.where((item) => item.id != entryId).toList();
    final snapshot = state.snapshot.copyWith(calendarEntries: entries);
    await _persist(snapshot);
  }

  Future<void> createLivestream({
    required String title,
    required String host,
    required String streamUrl,
    required DateTime scheduledAt,
    required String status,
    required String description,
    String? communityId,
    List<String>? tags,
    String? thumbnailUrl,
  }) async {
    final stream = CommunityLivestream(
      id: _uuid.v4(),
      title: title,
      host: host,
      streamUrl: streamUrl,
      scheduledAt: scheduledAt,
      status: status,
      description: description,
      communityId: communityId,
      tags: tags ?? const <String>[],
      thumbnailUrl: thumbnailUrl,
    );
    final snapshot = state.snapshot.copyWith(
      livestreams: [stream, ...state.snapshot.livestreams]
        ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt)),
    );
    await _persist(snapshot);
  }

  Future<void> updateLivestream(CommunityLivestream stream) async {
    final streams = state.snapshot.livestreams
        .map((item) => item.id == stream.id ? stream : item)
        .toList()
      ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    final snapshot = state.snapshot.copyWith(livestreams: streams);
    await _persist(snapshot);
  }

  Future<void> deleteLivestream(String streamId) async {
    final streams = state.snapshot.livestreams.where((item) => item.id != streamId).toList();
    final snapshot = state.snapshot.copyWith(livestreams: streams);
    await _persist(snapshot);
  }

  Future<void> createPodcastEpisode({
    required String title,
    required String description,
    required String audioUrl,
    required String host,
    required DateTime publishedAt,
    required Duration duration,
    List<String>? tags,
    String? artworkUrl,
    String? communityId,
  }) async {
    final episode = CommunityPodcastEpisode(
      id: _uuid.v4(),
      title: title,
      description: description,
      audioUrl: audioUrl,
      host: host,
      publishedAt: publishedAt,
      duration: duration,
      tags: tags ?? const <String>[],
      artworkUrl: artworkUrl,
      communityId: communityId,
    );
    final snapshot = state.snapshot.copyWith(
      podcasts: [episode, ...state.snapshot.podcasts]
        ..sort((a, b) => b.publishedAt.compareTo(a.publishedAt)),
    );
    await _persist(snapshot);
  }

  Future<void> updatePodcastEpisode(CommunityPodcastEpisode episode) async {
    final episodes = state.snapshot.podcasts
        .map((item) => item.id == episode.id ? episode : item)
        .toList()
      ..sort((a, b) => b.publishedAt.compareTo(a.publishedAt));
    final snapshot = state.snapshot.copyWith(podcasts: episodes);
    await _persist(snapshot);
  }

  Future<void> deletePodcastEpisode(String episodeId) async {
    final episodes = state.snapshot.podcasts.where((item) => item.id != episodeId).toList();
    final snapshot = state.snapshot.copyWith(podcasts: episodes);
    await _persist(snapshot);
  }

  Future<void> createLeaderboardEntry({
    required String memberName,
    required int points,
    required String avatarUrl,
    List<String>? badges,
    int? trend,
  }) async {
    final current = List<CommunityLeaderboardEntry>.from(state.snapshot.leaderboard);
    final entry = CommunityLeaderboardEntry(
      id: _uuid.v4(),
      memberName: memberName,
      points: points,
      avatarUrl: avatarUrl,
      rank: 0,
      badges: badges ?? const <String>[],
      trend: trend ?? 0,
    );
    current.add(entry);
    final ranked = _rankLeaderboard(current);
    final snapshot = state.snapshot.copyWith(leaderboard: ranked);
    await _persist(snapshot);
  }

  Future<void> updateLeaderboardEntry(CommunityLeaderboardEntry entry) async {
    final current = state.snapshot.leaderboard
        .map((item) => item.id == entry.id ? entry : item)
        .toList();
    final ranked = _rankLeaderboard(current);
    final snapshot = state.snapshot.copyWith(leaderboard: ranked);
    await _persist(snapshot);
  }

  Future<void> deleteLeaderboardEntry(String entryId) async {
    final current = state.snapshot.leaderboard.where((item) => item.id != entryId).toList();
    final ranked = _rankLeaderboard(current);
    final snapshot = state.snapshot.copyWith(leaderboard: ranked);
    await _persist(snapshot);
  }

  Future<void> createEvent({
    required String title,
    required String description,
    required DateTime startTime,
    required DateTime endTime,
    required String location,
    required String host,
    String? communityId,
    int? capacity,
    List<String>? tags,
    String? coverImageUrl,
    String? registrationUrl,
  }) async {
    final event = CommunityEvent(
      id: _uuid.v4(),
      title: title,
      description: description,
      startTime: startTime,
      endTime: endTime,
      location: location,
      host: host,
      communityId: communityId,
      capacity: capacity,
      tags: tags ?? const <String>[],
      coverImageUrl: coverImageUrl,
      registrationUrl: registrationUrl,
    );
    final snapshot = state.snapshot.copyWith(
      events: [...state.snapshot.events, event]..sort((a, b) => a.startTime.compareTo(b.startTime)),
    );
    await _persist(snapshot);
  }

  Future<void> updateEvent(CommunityEvent event) async {
    final events = state.snapshot.events
        .map((item) => item.id == event.id ? event : item)
        .toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    final snapshot = state.snapshot.copyWith(events: events);
    await _persist(snapshot);
  }

  Future<void> deleteEvent(String eventId) async {
    final events = state.snapshot.events.where((item) => item.id != eventId).toList();
    final snapshot = state.snapshot.copyWith(events: events);
    await _persist(snapshot);
  }

  List<CommunityLeaderboardEntry> _rankLeaderboard(List<CommunityLeaderboardEntry> entries) {
    final sorted = entries
      ..sort((a, b) {
        final comparison = b.points.compareTo(a.points);
        if (comparison != 0) {
          return comparison;
        }
        return a.memberName.compareTo(b.memberName);
      });
    final ranked = <CommunityLeaderboardEntry>[];
    for (var index = 0; index < sorted.length; index++) {
      final entry = sorted[index];
      ranked.add(entry.copyWith(rank: index + 1));
    }
    return ranked;
  }
}
