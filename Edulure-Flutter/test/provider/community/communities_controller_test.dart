import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:edulure_mobile/provider/community/communities_controller.dart';
import 'package:edulure_mobile/services/community_service.dart';
import 'package:edulure_mobile/services/live_feed_service.dart';

class _MockCommunityService extends Mock implements CommunityService {}

CommunitySummary _summary() {
  return CommunitySummary(
    id: 'community-1',
    name: 'Ops Collective',
    slug: 'ops',
    visibility: 'public',
    membership: const CommunityMembership(role: 'member', status: 'active'),
  );
}

void main() {
  late _MockCommunityService service;
  late CommunitiesController controller;

  setUp(() {
    service = _MockCommunityService();
    controller = CommunitiesController(service: service);
  });

  test('refresh populates communities from service', () async {
    when(service.listCommunities).thenAnswer((_) async => <CommunitySummary>[_summary()]);

    await controller.refresh();

    expect(controller.state.communities.single.name, 'Ops Collective');
    expect(controller.state.loading, isFalse);
    verify(service.listCommunities).called(1);
  });

  test('refresh surfaces service errors gracefully', () async {
    when(service.listCommunities).thenThrow(DioException(
      requestOptions: RequestOptions(path: '/communities'),
      response: Response(
        requestOptions: RequestOptions(path: '/communities'),
        statusCode: 500,
        data: const {'message': 'Server busy'},
      ),
    ));

    await controller.refresh();

    expect(controller.state.error, contains('Server busy'));
    expect(controller.state.loading, isFalse);
  });

  test('getDetail caches results until force refresh requested', () async {
    final detail = CommunityDetail(
      id: 'community-1',
      name: 'Ops Collective',
      slug: 'ops',
      visibility: 'public',
      description: 'Description',
      coverImageUrl: null,
      metadata: const <String, dynamic>{},
      stats: const CommunityStats(),
      membership: const CommunityMembership(role: 'member', status: 'active'),
      permissions: const CommunityPermissions(),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      mission: 'Mission',
      tags: const <String>[],
      categories: const <String>[],
      programs: const <CommunityProgram>[],
      feed: const CommunityFeedPage(data: <CommunityPost>[], meta: FeedPagination(page: 1, perPage: 10, total: 0)),
    );

    when(() => service.getCommunity('community-1')).thenAnswer((_) async => detail);

    final first = await controller.getDetail('community-1');
    final cached = await controller.getDetail('community-1');

    expect(first.name, 'Ops Collective');
    expect(identical(first, cached), isTrue);
    verify(() => service.getCommunity('community-1')).called(1);

    await controller.getDetail('community-1', forceRefresh: true);
    verify(() => service.getCommunity('community-1')).called(2);
  });
}
