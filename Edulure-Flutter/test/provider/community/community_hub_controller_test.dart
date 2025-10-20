import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/provider/community/community_hub_controller.dart';
import 'package:edulure_mobile/services/community_hub_models.dart';
import 'package:edulure_mobile/services/community_hub_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CommunityHubController', () {
    late InMemoryCommunityHubRepository repository;
    late CommunityHubController controller;

    setUp(() {
      repository = InMemoryCommunityHubRepository();
      controller = CommunityHubController(repository: repository);
    });

    test('bootstrap seeds repository and loads snapshot', () async {
      expect(repository.seeded, isFalse);

      await controller.bootstrap();

      expect(repository.seeded, isTrue);
      expect(controller.state.loading, isFalse);
      expect(controller.state.snapshot.feed, isNotEmpty);
      expect(controller.state.snapshot.feed.first.title, 'Welcome note');
    });

    test('createFeedPost prepends post and persists snapshot', () async {
      await controller.bootstrap();
      final initialLength = controller.state.snapshot.feed.length;

      await controller.createFeedPost(
        title: 'New community update',
        body: 'We just shipped an interactive roadmap. Share your feedback!',
        author: 'Community Ops',
      );

      final snapshot = controller.state.snapshot;
      expect(snapshot.feed.length, initialLength + 1);
      expect(snapshot.feed.first.title, 'New community update');
      expect(repository.snapshot.feed.first.title, 'New community update');
      expect(controller.state.saving, isFalse);
    });

    test('togglePostPin flips pinned flag and persists', () async {
      await controller.bootstrap();
      final firstPostId = controller.state.snapshot.feed.first.id;
      final originalPinned = controller.state.snapshot.feed.first.pinned;

      await controller.togglePostPin(firstPostId);

      final updatedPost = controller.state.snapshot.feed.firstWhere((post) => post.id == firstPostId);
      expect(updatedPost.pinned, !originalPinned);
      expect(repository.snapshot.feed.firstWhere((post) => post.id == firstPostId).pinned, !originalPinned);
    });
  });
}

class InMemoryCommunityHubRepository implements CommunityHubRepository {
  InMemoryCommunityHubRepository()
      : snapshot = CommunityHubSnapshot(
          feed: [
            CommunityFeedPost(
              id: 'post-1',
              title: 'Welcome note',
              body: 'Start the week by sharing a win from your cohort.',
              author: 'Community Team',
              createdAt: DateTime.now().subtract(const Duration(hours: 2)),
              updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
              tags: const ['announcement'],
            ),
          ],
        ),
        seeded = false;

  CommunityHubSnapshot snapshot;

  bool seeded;

  @override
  Future<void> clear() async {
    snapshot = CommunityHubSnapshot(feed: []);
  }

  @override
  Future<CommunityHubSnapshot> loadSnapshot() async => snapshot;

  @override
  Future<void> saveSnapshot(CommunityHubSnapshot snapshot) async {
    this.snapshot = snapshot;
  }

  @override
  Future<void> seedIfNeeded() async {
    seeded = true;
  }
}
