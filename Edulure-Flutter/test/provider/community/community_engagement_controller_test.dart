import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:edulure_mobile/provider/community/community_engagement_controller.dart';
import 'package:edulure_mobile/services/community_chat_service.dart';
import 'package:edulure_mobile/services/community_engagement_storage.dart';
import 'package:edulure_mobile/services/community_hub_models.dart';
import 'package:edulure_mobile/services/community_service.dart';

class _MockChatService extends Mock implements CommunityChatService {}

class _MockEngagementStorage extends Mock implements CommunityEngagementStorage {}

CommunityDetail _detail() {
  return CommunityDetail(
    id: 'community-1',
    name: 'Ops Collective',
    slug: 'ops',
    visibility: 'public',
    description: 'Ops community',
    metadata: const <String, dynamic>{},
  );
}

void main() {
  late _MockChatService chatService;
  late _MockEngagementStorage storage;
  late CommunityEngagementController controller;

  setUp(() {
    chatService = _MockChatService();
    storage = _MockEngagementStorage();
    when(() => storage.writeSnapshot(any(), any())).thenAnswer((_) async {});
    when(() => chatService.listChannels(any())).thenThrow(Exception('offline'));
    when(() => chatService.listMessages(any(), any(), limit: any(named: 'limit')))
        .thenAnswer((_) async => const <CommunityChatMessageDto>[]);
    controller = CommunityEngagementController(
      random: Random(1),
      chatService: chatService,
      storage: storage,
    );
  });

  test('bootstrap hydrates snapshot using seeds when service unavailable', () async {
    when(() => storage.readSnapshot('community-1')).thenAnswer((_) async => null);

    await controller.bootstrap(_detail());

    final snapshot = controller.snapshotFor('community-1');
    expect(snapshot, isNotNull);
    expect(snapshot!.channels, isNotEmpty);
    verify(() => storage.writeSnapshot('community-1', any())).called(greaterThan(0));
  });

  test('createChannel appends channel and persists snapshot', () async {
    final detail = _detail();
    when(() => storage.readSnapshot(detail.id)).thenAnswer((_) async => null);

    await controller.bootstrap(detail);
    final initialCount = controller.snapshotFor(detail.id)!.channels.length;

    final input = CommunityChatChannelInput(
      name: 'Async Ops',
      description: 'Async coordination',
      type: CommunityChatChannelType.text,
      isPrivate: false,
      allowsThreads: true,
      allowsVoiceSessions: false,
      allowsBroadcasts: false,
      slowModeCooldown: const Duration(minutes: 1),
      moderators: const <String>{'ops-team'},
      tags: const <String>['ops'],
    );

    await controller.createChannel(detail.id, input);

    final snapshot = controller.snapshotFor(detail.id)!;
    expect(snapshot.channels.length, initialCount + 1);
    verify(() => storage.writeSnapshot(detail.id, any())).called(greaterThan(1));
  });
}
