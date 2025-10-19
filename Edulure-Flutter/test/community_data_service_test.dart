import 'dart:io';

import 'package:edulure_mobile/core/models/community_models.dart';
import 'package:edulure_mobile/services/community_data_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('community_service_test');
    Hive.init(tempDir.path);
    await CommunityDataService.instance.resetForTesting();
    await CommunityDataService.instance.init();
  });

  tearDown(() async {
    await CommunityDataService.instance.resetForTesting();
    await Hive.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test('community CRUD cycle updates the directory and active community', () async {
    final service = CommunityDataService.instance;
    final existing = await service.fetchCommunities();
    final initialCount = existing.length;

    final created = await service.createCommunity(
      const CommunityDraft(
        name: 'AI Storytellers',
        description: 'Narrative engineers building immersive experiences for learners.',
        bannerImage: 'https://cdn.edulure.ai/banners/storytellers.jpg',
        accentColor: '#3366FF',
        tags: ['Storytelling', 'AI'],
        location: 'Remote',
        guidelines: ['Share actionable playbooks', 'Respect collaboration timezones'],
        focusAreas: ['Narrative Design', 'Interactive Media'],
        isPrivate: true,
      ),
    );

    expect(created.id, isNotEmpty);
    expect(created.name, 'AI Storytellers');

    final afterCreate = await service.fetchCommunities();
    expect(afterCreate.length, initialCount + 1);
    expect(afterCreate.first.id, created.id);

    final updated = await service.updateCommunity(
      created.id,
      const CommunityDraft(
        name: 'AI Storytellers Guild',
        description: 'Narrative engineers building immersive experiences for learners.',
        bannerImage: 'https://cdn.edulure.ai/banners/storytellers.jpg',
        accentColor: '#FF6633',
        tags: ['Storytelling', 'AI', 'Mentorship'],
        location: 'Remote',
        guidelines: ['Share actionable playbooks', 'Respect collaboration timezones'],
        focusAreas: ['Narrative Design', 'Interactive Media'],
        isPrivate: true,
      ),
    );

    expect(updated.name, 'AI Storytellers Guild');
    expect(updated.accentColor, '#FF6633');
    expect(updated.tags, containsAll(['Mentorship', 'AI']));

    await service.deleteCommunity(created.id);
    final afterDelete = await service.fetchCommunities();
    expect(afterDelete.length, initialCount);
    expect(afterDelete.any((c) => c.id == created.id), isFalse);
  });

  test('feed CRUD operations support bookmarking, reactions, and comments', () async {
    final service = CommunityDataService.instance;
    final communityId = (await service.fetchCommunities()).first.id;

    final created = await service.createPost(
      FeedPostDraft(
        communityId: communityId,
        message: 'Launching our interactive learning sprint this Friday!',
        tags: const ['Launch', 'Sprint'],
        mediaUrl: 'https://cdn.edulure.ai/media/sprint-intro.mp4',
        authorName: 'Sofia Ramirez',
        authorRole: 'Community Lead',
      ),
    );

    expect(created.message, contains('interactive learning sprint'));

    final updated = await service.updatePost(
      created.id,
      FeedPostDraft(
        communityId: communityId,
        message: 'Launch moved to next Monday so everyone can join live!',
        tags: const ['Launch', 'Update'],
        mediaUrl: 'https://cdn.edulure.ai/media/sprint-intro.mp4',
        authorName: 'Sofia Ramirez',
        authorRole: 'Community Lead',
      ),
    );

    expect(updated.message, contains('next Monday'));
    expect(updated.tags, contains('Update'));

    final bookmarked = await service.toggleBookmark(updated.id);
    expect(bookmarked.bookmarked, isTrue);

    final reacted = await service.togglePostReaction(updated.id);
    expect(reacted.liked, isTrue);
    expect(reacted.reactionCount, greaterThan(updated.reactionCount));

    final comment = await service.addComment(
      updated.id,
      const FeedCommentDraft(authorName: 'QA Reviewer'),
      'Excited to see the updated live session!',
    );

    expect(comment.message, contains('Excited'));

    var posts = await service.fetchFeed(communityId: communityId);
    final withComment = posts.firstWhere((post) => post.id == updated.id);
    expect(withComment.comments.any((c) => c.id == comment.id), isTrue);

    await service.removeComment(updated.id, comment.id);
    posts = await service.fetchFeed(communityId: communityId);
    final afterRemoval = posts.firstWhere((post) => post.id == updated.id);
    expect(afterRemoval.comments.any((c) => c.id == comment.id), isFalse);

    await service.deletePost(updated.id);
    posts = await service.fetchFeed(communityId: communityId);
    expect(posts.any((post) => post.id == updated.id), isFalse);
  });

  test('explorer resources support advanced search and favourites', () async {
    final service = CommunityDataService.instance;

    final draft = ExplorerResourceDraft(
      entityType: 'guide',
      title: 'Community Playbook Deep Dive',
      subtitle: 'Live onboarding walkthrough',
      description:
          'Step-by-step workflows, video assets, and practice templates for facilitators.',
      tags: const ['Playbook', 'Live Training'],
      coverImage: 'https://cdn.edulure.ai/resources/playbook.png',
      link: 'https://edulure.ai/resources/playbook',
      owner: 'Enablement Studio',
    );

    final created = await service.createExplorerResource(draft);
    expect(created.title, contains('Playbook'));

    final updated = await service.updateExplorerResource(
      created.id,
      ExplorerResourceDraft(
        entityType: 'guide',
        title: 'Community Playbook Deep Dive',
        subtitle: 'Live onboarding walkthrough',
        description:
            'Step-by-step workflows, video assets, and practice templates for facilitators.',
        tags: const ['Playbook', 'Live Training', 'Featured'],
        coverImage: 'https://cdn.edulure.ai/resources/playbook.png',
        link: 'https://edulure.ai/resources/playbook',
        owner: 'Enablement Studio',
      ),
    );

    expect(updated.tags, contains('Featured'));

    final favourite = await service.toggleResourceFavourite(updated.id);
    expect(favourite.isFavorite, isTrue);

    final tags = await service.loadExplorerTags();
    expect(tags, contains('Featured'));

    final results = await service.searchExplorer(
      ExplorerQuery(
        query: 'Playbook',
        entityTypes: {'guide'},
        tags: {'Featured'},
      ),
    );

    expect(results.map((resource) => resource.id), contains(updated.id));

    await service.deleteExplorerResource(updated.id);
    final afterDelete = await service.searchExplorer(
      const ExplorerQuery(query: 'Playbook', entityTypes: {'guide'}, tags: {}),
    );
    expect(afterDelete.any((resource) => resource.id == updated.id), isFalse);
  });
}
