import 'package:edulure_mobile/widgets/feed_composer_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/services/community_service.dart';
import 'package:edulure_mobile/services/live_feed_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('FeedComposerSheet', () {
    testWidgets('validates inputs and returns sanitized payload', (tester) async {
      FeedComposerResult? result;
      final community = CommunitySummary(
        id: '1',
        name: 'Builders Collective',
        slug: 'builders-collective',
        visibility: 'public',
        description: 'A community for ambitious operators.',
        metadata: const <String, dynamic>{},
        stats: const CommunityStats(),
        permissions: const CommunityPermissions(canModeratePosts: true, canLeave: true),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  onPressed: () async {
                    result = await showModalBottomSheet<FeedComposerResult>(
                      context: context,
                      isScrollControlled: true,
                      builder: (context) => FeedComposerSheet(
                        communities: [community],
                      ),
                    );
                  },
                  child: const Text('Compose'),
                ),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Compose'));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.byKey(const ValueKey('feed_composer_submit')));
      await tester.tap(find.byKey(const ValueKey('feed_composer_submit')));
      await tester.pump();
      expect(find.text('Share at least 20 characters'), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('feed_composer_body')),
        'This update shares a detailed plan for our upcoming community cohorts.',
      );

      await tester.enterText(
        find.byKey(const ValueKey('feed_composer_tag_input')),
        ' Growth Mindset ',
      );
      await tester.tap(find.byTooltip('Add tag'));
      await tester.pump();

      await tester.enterText(
        find.byKey(const ValueKey('feed_composer_image_url')),
        'ftp://example.com/invalid.png',
      );
      await tester.tap(find.byKey(const ValueKey('feed_composer_submit')));
      await tester.pump();
      expect(find.text('Enter a valid https:// link'), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('feed_composer_image_url')),
        'https://localhost/cover.png',
      );
      await tester.tap(find.byKey(const ValueKey('feed_composer_submit')));
      await tester.pump();
      expect(find.text('Link must target a public host.'), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('feed_composer_image_url')),
        'https://cdn.example.com/cover.png',
      );
      await tester.enterText(
        find.byKey(const ValueKey('feed_composer_video_url')),
        'https://cdn.example.com/intro.mp4',
      );

      await tester.tap(find.byKey(const ValueKey('feed_composer_submit')));
      await tester.pumpAndSettle();

      expect(result, isNotNull);
      expect(result!.community.id, community.id);
      expect(result!.input.body, contains('detailed plan'));
      expect(result!.input.status, equals('published'));
      expect(result!.input.tags, equals(['growth-mindset']));
      expect(result!.input.metadata['media'], isA<Map<String, dynamic>>());
      final media = result!.input.metadata['media'] as Map<String, dynamic>;
      expect(media['imageUrl'], 'https://cdn.example.com/cover.png');
      expect(media['videoUrl'], 'https://cdn.example.com/intro.mp4');
    });

    testWidgets('locks composer when user lacks posting permissions', (tester) async {
      final restricted = CommunitySummary(
        id: '2',
        name: 'Ops Alliance',
        slug: 'ops-alliance',
        visibility: 'private',
        description: 'Operations leaders only.',
        metadata: const <String, dynamic>{},
        stats: const CommunityStats(),
        membership: const CommunityMembership(role: 'member', status: 'pending'),
        permissions: const CommunityPermissions(canModeratePosts: false, canLeave: false),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  onPressed: () async {
                    await showModalBottomSheet<FeedComposerResult>(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) => FeedComposerSheet(
                        communities: [restricted],
                      ),
                    );
                  },
                  child: const Text('Compose'),
                ),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Compose'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Request access from an admin to publish.'), findsOneWidget);

      final submitButton = tester.widget<FilledButton>(find.byKey(const ValueKey('feed_composer_submit')));
      expect(submitButton.onPressed, isNull);

      final dropdownFinder = find.byWidgetPredicate(
        (widget) => widget is DropdownButtonFormField<CommunitySummary>,
      );
      final dropdown = tester.widget<DropdownButtonFormField<CommunitySummary>>(dropdownFinder);
      expect(dropdown.enabled, isFalse);

      final bodyField = tester.widget<TextFormField>(find.byKey(const ValueKey('feed_composer_body')));
      expect(bodyField.enabled, isFalse);
    });
  });
}
