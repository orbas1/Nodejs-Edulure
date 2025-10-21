import 'package:edulure_mobile/services/community_service.dart';
import 'package:edulure_mobile/services/live_feed_service.dart';
import 'package:edulure_mobile/widgets/feed_entry_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher_platform_interface/url_launcher_platform_interface.dart';

class _FakeUrlLauncher extends UrlLauncherPlatform {
  String? launchedUrl;
  bool launchResult = true;

  @override
  LinkDelegate? get linkDelegate => null;

  @override
  Future<bool> canLaunch(String url) async => true;

  @override
  Future<void> closeWebView() async {}

  @override
  Future<bool> launch(
    String url, {
    required bool useSafariVC,
    required bool useWebView,
    required bool enableJavaScript,
    required bool enableDomStorage,
    required bool universalLinksOnly,
    required Map<String, String> headers,
    String? webOnlyWindowName,
  }) async {
    launchedUrl = url;
    return launchResult;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _FakeUrlLauncher urlLauncher;

  setUp(() {
    urlLauncher = _FakeUrlLauncher();
    UrlLauncherPlatform.instance = urlLauncher;
  });

  FeedEntry _buildEntry({required String? videoUrl}) {
    final post = CommunityPost(
      id: 'post-123',
      type: 'update',
      body: 'Sharing an async workshop replay.',
      publishedAt: DateTime(2024, 3, 8, 12, 0),
      scheduledAt: null,
      status: 'published',
      visibility: 'public',
      title: 'Workshop replay',
      tags: const ['async'],
      channel: null,
      community: const CommunityReference(id: 'c1', name: 'Builders Collective', slug: 'builders'),
      author: const CommunityMemberSummary(
        id: 'author-1',
        name: 'Riley Ops',
        role: 'Moderator',
        avatarUrl: '',
      ),
      stats: const CommunityPostStats(reactions: 5, comments: 2),
      moderation: const CommunityPostModeration(),
      metadata: {
        'media': {
          if (videoUrl != null) 'videoUrl': videoUrl,
        },
      },
    );

    return FeedEntry(kind: FeedEntryKind.post, post: post);
  }

  Widget _buildSubject(FeedEntry entry) {
    return MaterialApp(
      home: Scaffold(
        body: FeedEntryCard(entry: entry),
      ),
    );
  }

  testWidgets('launches public https links via the external video button', (tester) async {
    final entry = _buildEntry(videoUrl: 'https://cdn.example.com/replay.mp4');

    await tester.pumpWidget(_buildSubject(entry));

    await tester.tap(find.text('Open linked video'));
    await tester.pump();

    expect(urlLauncher.launchedUrl, equals('https://cdn.example.com/replay.mp4'));
    expect(find.text('Only public https links can be opened.'), findsNothing);
    expect(find.text('Links must use a public host.'), findsNothing);
  });

  testWidgets('prevents launching private hosts', (tester) async {
    final entry = _buildEntry(videoUrl: 'https://192.168.1.10/stream');

    await tester.pumpWidget(_buildSubject(entry));

    await tester.tap(find.text('Open linked video'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 250));

    expect(urlLauncher.launchedUrl, isNull);
    expect(find.text('Links must use a public host.'), findsOneWidget);
  });

  testWidgets('surfaces launch failures with feedback', (tester) async {
    final entry = _buildEntry(videoUrl: 'https://cdn.example.com/replay.mp4');
    urlLauncher.launchResult = false;

    await tester.pumpWidget(_buildSubject(entry));

    await tester.tap(find.text('Open linked video'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 250));

    expect(urlLauncher.launchedUrl, equals('https://cdn.example.com/replay.mp4'));
    expect(find.text('Unable to open the link. Please try again later.'), findsOneWidget);
  });

  testWidgets('rejects non https schemes', (tester) async {
    final entry = _buildEntry(videoUrl: 'http://example.com/replay.mp4');

    await tester.pumpWidget(_buildSubject(entry));

    await tester.tap(find.text('Open linked video'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 250));

    expect(urlLauncher.launchedUrl, isNull);
    expect(find.text('Only public https links can be opened.'), findsOneWidget);
  });
}
