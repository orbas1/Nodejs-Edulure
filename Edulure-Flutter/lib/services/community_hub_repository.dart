import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'community_hub_models.dart';

class CommunityHubRepository {
  CommunityHubRepository({
    HiveInterface? hive,
    String boxName = _defaultBoxName,
  })  : _hive = hive ?? Hive,
        _boxName = boxName;

  static const String _defaultBoxName = 'community_hub';
  static const String _feedKey = 'feed_posts';
  static const String _classroomsKey = 'classrooms';
  static const String _calendarKey = 'calendar_entries';
  static const String _livestreamsKey = 'livestreams';
  static const String _podcastsKey = 'podcasts';
  static const String _scoreboardKey = 'scoreboard';
  static const String _eventsKey = 'events';
  static const String _seededKey = 'seeded';

  final HiveInterface _hive;
  final String _boxName;

  Future<Box<dynamic>> _ensureBox() async {
    if (!_hive.isBoxOpen(_boxName)) {
      await _hive.openBox<dynamic>(_boxName);
    }
    return _hive.box<dynamic>(_boxName);
  }

  Future<void> seedIfNeeded() async {
    final box = await _ensureBox();
    if (box.get(_seededKey) == true) {
      return;
    }

    final now = DateTime.now();
    final seedFeed = <CommunityFeedPost>[
      CommunityFeedPost(
        id: 'seed-post-1',
        title: 'Welcome to the community hub',
        body:
            'Start collaborating by posting updates, sharing wins, and asking for feedback. Tap the + button to create your first post.',
        author: 'Community Ops',
        communityId: 'global',
        createdAt: now.subtract(const Duration(hours: 6)),
        updatedAt: now.subtract(const Duration(hours: 6)),
        tags: const ['announcement', 'getting-started'],
        likes: 14,
        attachmentUrls: const <String>[],
      ),
    ];

    final seedClassrooms = <CommunityClassroom>[
      CommunityClassroom(
        id: 'seed-class-1',
        title: 'Onboarding Navigator',
        facilitator: 'Taylor Morgan',
        description:
            'A live classroom to help new members navigate resources, set goals, and connect with mentors.',
        startTime: now.add(const Duration(days: 1, hours: 2)),
        endTime: now.add(const Duration(days: 1, hours: 3)),
        deliveryMode: 'Virtual · Google Meet',
        capacity: 60,
        communityId: 'global',
        resources: const [
          'https://docs.example.com/community-handbook',
          'https://meet.example.com/onboarding'
        ],
        enrolled: const <String>[],
        tags: const ['orientation'],
      ),
    ];

    final seedCalendar = <CommunityCalendarEntry>[
      CommunityCalendarEntry(
        id: 'seed-cal-1',
        title: 'Mentor office hours',
        description: 'Drop-in coaching with certified mentors for your active cohorts.',
        startTime: now.add(const Duration(days: 2, hours: 3)),
        endTime: now.add(const Duration(days: 2, hours: 4)),
        location: 'Virtual breakout rooms',
        organiser: 'Mentor Collective',
        communityId: 'global',
        reminders: const [Duration(hours: 24), Duration(minutes: 30)],
        tags: const ['mentorship'],
        meetingUrl: 'https://meet.example.com/mentor-office-hours',
        notes: 'Auto-syncs with mentor CRM. Hosts rotate weekly.',
        attachments: const ['https://docs.example.com/mentor-playbook.pdf'],
      ),
    ];

    final seedLivestreams = <CommunityLivestream>[
      CommunityLivestream(
        id: 'seed-live-1',
        title: 'Weekly wins live stream',
        host: 'Amelia Chen',
        streamUrl: 'https://video.example.com/streams/weekly-wins',
        scheduledAt: now.add(const Duration(days: 3, hours: 1)),
        status: 'scheduled',
        description:
            'Celebrate member progress with a live shout-out show, featuring quick demos and lightning talks.',
        communityId: 'global',
        tags: const ['celebration'],
        viewers: 128,
      ),
    ];

    final seedPodcasts = <CommunityPodcastEpisode>[
      CommunityPodcastEpisode(
        id: 'seed-podcast-1',
        title: 'Retention rituals that work',
        description: 'A 22-minute conversation about the rituals that keep members engaged every week.',
        audioUrl: 'https://cdn.example.com/audio/retention-rituals.mp3',
        host: 'Product Community Studio',
        publishedAt: now.subtract(const Duration(days: 2)),
        duration: const Duration(minutes: 22),
        tags: const ['engagement'],
      ),
    ];

    final seedScoreboard = <CommunityLeaderboardEntry>[
      CommunityLeaderboardEntry(
        id: 'seed-leader-1',
        memberName: 'Jordan Rivers',
        points: 1240,
        avatarUrl: 'https://cdn.example.com/avatars/jordan.png',
        rank: 1,
        badges: const ['Community Champion', 'Mentor'],
        trend: 3,
      ),
      CommunityLeaderboardEntry(
        id: 'seed-leader-2',
        memberName: 'Priya Patel',
        points: 1175,
        avatarUrl: 'https://cdn.example.com/avatars/priya.png',
        rank: 2,
        badges: const ['Top Contributor'],
        trend: 1,
      ),
    ];

    final seedEvents = <CommunityEvent>[
      CommunityEvent(
        id: 'seed-event-1',
        title: 'Community hack night',
        description: 'Collaborate on automations, dashboards, and member rituals in this 3-hour hack night.',
        startTime: now.add(const Duration(days: 5, hours: 4)),
        endTime: now.add(const Duration(days: 5, hours: 7)),
        location: 'Hybrid · HQ + Zoom',
        host: 'Community Ops',
        communityId: 'global',
        capacity: 120,
        tags: const ['collaboration', 'live'],
        registrationUrl: 'https://events.example.com/hack-night',
        rsvpCount: 86,
      ),
    ];

    await box.put(_feedKey, seedFeed.map((post) => post.toJson()).toList());
    await box.put(_classroomsKey, seedClassrooms.map((item) => item.toJson()).toList());
    await box.put(_calendarKey, seedCalendar.map((item) => item.toJson()).toList());
    await box.put(_livestreamsKey, seedLivestreams.map((item) => item.toJson()).toList());
    await box.put(_podcastsKey, seedPodcasts.map((item) => item.toJson()).toList());
    await box.put(_scoreboardKey, seedScoreboard.map((item) => item.toJson()).toList());
    await box.put(_eventsKey, seedEvents.map((item) => item.toJson()).toList());
    await box.put(_seededKey, true);
  }

  Future<CommunityHubSnapshot> loadSnapshot() async {
    final box = await _ensureBox();
    return CommunityHubSnapshot(
      feed: _readList(box.get(_feedKey), CommunityFeedPost.fromJson),
      classrooms: _readList(box.get(_classroomsKey), CommunityClassroom.fromJson),
      calendarEntries: _readList(box.get(_calendarKey), CommunityCalendarEntry.fromJson),
      livestreams: _readList(box.get(_livestreamsKey), CommunityLivestream.fromJson),
      podcasts: _readList(box.get(_podcastsKey), CommunityPodcastEpisode.fromJson),
      leaderboard: _readList(box.get(_scoreboardKey), CommunityLeaderboardEntry.fromJson),
      events: _readList(box.get(_eventsKey), CommunityEvent.fromJson),
    );
  }

  Future<void> saveSnapshot(CommunityHubSnapshot snapshot) async {
    final box = await _ensureBox();
    await Future.wait([
      box.put(_feedKey, snapshot.feed.map((post) => post.toJson()).toList()),
      box.put(_classroomsKey, snapshot.classrooms.map((item) => item.toJson()).toList()),
      box.put(_calendarKey, snapshot.calendarEntries.map((item) => item.toJson()).toList()),
      box.put(_livestreamsKey, snapshot.livestreams.map((item) => item.toJson()).toList()),
      box.put(_podcastsKey, snapshot.podcasts.map((item) => item.toJson()).toList()),
      box.put(_scoreboardKey, snapshot.leaderboard.map((item) => item.toJson()).toList()),
      box.put(_eventsKey, snapshot.events.map((item) => item.toJson()).toList()),
    ]);
  }

  Future<void> clear() async {
    final box = await _ensureBox();
    await box.clear();
  }

  List<T> _readList<T>(dynamic value, T Function(Map<String, dynamic>) mapper) {
    if (value is List) {
      return value
          .whereType<Map>()
          .map((entry) => mapper(Map<String, dynamic>.from(entry as Map)))
          .toList();
    }
    return const <T>[];
  }
}

class CommunityHubSnapshot {
  CommunityHubSnapshot({
    this.feed = const <CommunityFeedPost>[],
    this.classrooms = const <CommunityClassroom>[],
    this.calendarEntries = const <CommunityCalendarEntry>[],
    this.livestreams = const <CommunityLivestream>[],
    this.podcasts = const <CommunityPodcastEpisode>[],
    this.leaderboard = const <CommunityLeaderboardEntry>[],
    this.events = const <CommunityEvent>[],
  });

  final List<CommunityFeedPost> feed;
  final List<CommunityClassroom> classrooms;
  final List<CommunityCalendarEntry> calendarEntries;
  final List<CommunityLivestream> livestreams;
  final List<CommunityPodcastEpisode> podcasts;
  final List<CommunityLeaderboardEntry> leaderboard;
  final List<CommunityEvent> events;

  CommunityHubSnapshot copyWith({
    List<CommunityFeedPost>? feed,
    List<CommunityClassroom>? classrooms,
    List<CommunityCalendarEntry>? calendarEntries,
    List<CommunityLivestream>? livestreams,
    List<CommunityPodcastEpisode>? podcasts,
    List<CommunityLeaderboardEntry>? leaderboard,
    List<CommunityEvent>? events,
  }) {
    return CommunityHubSnapshot(
      feed: feed ?? this.feed,
      classrooms: classrooms ?? this.classrooms,
      calendarEntries: calendarEntries ?? this.calendarEntries,
      livestreams: livestreams ?? this.livestreams,
      podcasts: podcasts ?? this.podcasts,
      leaderboard: leaderboard ?? this.leaderboard,
      events: events ?? this.events,
    );
  }
}
