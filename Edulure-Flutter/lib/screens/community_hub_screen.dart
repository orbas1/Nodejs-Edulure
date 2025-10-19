import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../provider/community/community_hub_controller.dart';
import '../services/community_hub_models.dart';

class CommunityHubScreen extends ConsumerStatefulWidget {
  const CommunityHubScreen({super.key});

  @override
  ConsumerState<CommunityHubScreen> createState() => _CommunityHubScreenState();
}

class _CommunityHubScreenState extends ConsumerState<CommunityHubScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final List<_HubTab> _tabs = const <_HubTab>[
    _HubTab('Feed', Icons.dynamic_feed_outlined),
    _HubTab('Classroom', Icons.class_outlined),
    _HubTab('Calendar', Icons.event_note_outlined),
    _HubTab('Live stream', Icons.videocam_outlined),
    _HubTab('Podcasts', Icons.podcasts_outlined),
    _HubTab('Scoreboard', Icons.emoji_events_outlined),
    _HubTab('Events', Icons.event_available_outlined),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref.read(communityHubControllerProvider.notifier).bootstrap();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hubState = ref.watch(communityHubControllerProvider);
    final controller = ref.read(communityHubControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Community engagement hub'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _tabs
              .map(
                (tab) => Tab(
                  text: tab.label,
                  icon: Icon(tab.icon),
                ),
              )
              .toList(),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh data',
            onPressed: controller.refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: _buildFloatingActionButton(context, controller),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: hubState.loading && hubState.snapshot.feed.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(
                    height: 320,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ],
              )
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildFeedTab(context, hubState, controller),
                  _buildClassroomsTab(context, hubState, controller),
                  _buildCalendarTab(context, hubState, controller),
                  _buildLivestreamTab(context, hubState, controller),
                  _buildPodcastsTab(context, hubState, controller),
                  _buildScoreboardTab(context, hubState, controller),
                  _buildEventsTab(context, hubState, controller),
                ],
              ),
      ),
    );
  }

  Widget? _buildFloatingActionButton(
    BuildContext context,
    CommunityHubController controller,
  ) {
    final label = _tabs[_tabController.index].label;
    switch (label) {
      case 'Feed':
        return FloatingActionButton.extended(
          heroTag: 'feed',
          onPressed: () => _openFeedComposer(context, controller),
          icon: const Icon(Icons.add_comment_outlined),
          label: const Text('New post'),
        );
      case 'Classroom':
        return FloatingActionButton.extended(
          heroTag: 'classroom',
          onPressed: () => _openClassroomComposer(context, controller),
          icon: const Icon(Icons.add),
          label: const Text('New session'),
        );
      case 'Calendar':
        return FloatingActionButton.extended(
          heroTag: 'calendar',
          onPressed: () => _openCalendarComposer(context, controller),
          icon: const Icon(Icons.add_alarm),
          label: const Text('Schedule'),
        );
      case 'Live stream':
        return FloatingActionButton.extended(
          heroTag: 'livestream',
          onPressed: () => _openLivestreamComposer(context, controller),
          icon: const Icon(Icons.wifi_tethering),
          label: const Text('Plan stream'),
        );
      case 'Podcasts':
        return FloatingActionButton.extended(
          heroTag: 'podcast',
          onPressed: () => _openPodcastComposer(context, controller),
          icon: const Icon(Icons.mic),
          label: const Text('Add episode'),
        );
      case 'Scoreboard':
        return FloatingActionButton.extended(
          heroTag: 'scoreboard',
          onPressed: () => _openLeaderboardComposer(context, controller),
          icon: const Icon(Icons.emoji_events_outlined),
          label: const Text('Add leader'),
        );
      case 'Events':
        return FloatingActionButton.extended(
          heroTag: 'event',
          onPressed: () => _openEventComposer(context, controller),
          icon: const Icon(Icons.event_available),
          label: const Text('Create event'),
        );
    }
    return null;
  }

  Widget _buildFeedTab(
    BuildContext context,
    CommunityHubState state,
    CommunityHubController controller,
  ) {
    final posts = List<CommunityFeedPost>.from(state.snapshot.feed)
      ..sort((a, b) {
        if (a.pinned != b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return b.updatedAt.compareTo(a.updatedAt);
      });
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: posts.length + (state.loading ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= posts.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        final post = posts[index];
        return _FeedCard(
          post: post,
          onEdit: () => _openFeedComposer(context, controller, initial: post),
          onDelete: () => controller.deleteFeedPost(post.id),
          onTogglePin: () => controller.togglePostPin(post.id),
          onShare: () => _launchUrl(post.attachmentUrls.isNotEmpty
              ? Uri.parse(post.attachmentUrls.first)
              : Uri.parse('https://share.example.com/posts/${post.id}')),
        );
      },
    );
  }

  Widget _buildClassroomsTab(
    BuildContext context,
    CommunityHubState state,
    CommunityHubController controller,
  ) {
    final classrooms = List<CommunityClassroom>.from(state.snapshot.classrooms)
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: classrooms.length,
      itemBuilder: (context, index) {
        final classroom = classrooms[index];
        return _ClassroomCard(
          classroom: classroom,
          onEdit: () => _openClassroomComposer(context, controller, initial: classroom),
          onDelete: () => controller.deleteClassroom(classroom.id),
          onEnroll: () => _promptEnrollment(context, classroom, controller),
          onCancelEnrollment: (member) =>
              controller.cancelClassroomEnrollment(classroom.id, member),
        );
      },
    );
  }

  Widget _buildCalendarTab(
    BuildContext context,
    CommunityHubState state,
    CommunityHubController controller,
  ) {
    final entries = List<CommunityCalendarEntry>.from(state.snapshot.calendarEntries)
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: entries.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final entry = entries[index];
        return _CalendarCard(
          entry: entry,
          onEdit: () => _openCalendarComposer(context, controller, initial: entry),
          onDelete: () => controller.deleteCalendarEntry(entry.id),
        );
      },
    );
  }

  Widget _buildLivestreamTab(
    BuildContext context,
    CommunityHubState state,
    CommunityHubController controller,
  ) {
    final streams = List<CommunityLivestream>.from(state.snapshot.livestreams)
      ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: streams.length,
      itemBuilder: (context, index) {
        final stream = streams[index];
        return _LivestreamCard(
          stream: stream,
          onEdit: () => _openLivestreamComposer(context, controller, initial: stream),
          onDelete: () => controller.deleteLivestream(stream.id),
          onOpen: () => _launchUrl(Uri.parse(stream.streamUrl)),
        );
      },
    );
  }

  Widget _buildPodcastsTab(
    BuildContext context,
    CommunityHubState state,
    CommunityHubController controller,
  ) {
    final episodes = List<CommunityPodcastEpisode>.from(state.snapshot.podcasts)
      ..sort((a, b) => b.publishedAt.compareTo(a.publishedAt));
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: episodes.length,
      itemBuilder: (context, index) {
        final episode = episodes[index];
        return _PodcastCard(
          episode: episode,
          onEdit: () => _openPodcastComposer(context, controller, initial: episode),
          onDelete: () => controller.deletePodcastEpisode(episode.id),
          onPlay: () => _launchUrl(Uri.parse(episode.audioUrl)),
        );
      },
    );
  }

  Widget _buildScoreboardTab(
    BuildContext context,
    CommunityHubState state,
    CommunityHubController controller,
  ) {
    final leaders = List<CommunityLeaderboardEntry>.from(state.snapshot.leaderboard)
      ..sort((a, b) => a.rank.compareTo(b.rank));
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        if (leaders.isEmpty)
          _buildPlaceholderCard(
            context,
            icon: Icons.emoji_events_outlined,
            title: 'No leaderboard entries yet',
            subtitle:
                'Add your champions to spotlight progress and energize community participation.',
          )
        else ...[
          _LeaderboardPodium(leaders: leaders.take(3).toList()),
          const SizedBox(height: 24),
          ...leaders.skip(3).map(
                (entry) => _LeaderboardRow(
                  entry: entry,
                  onEdit: () =>
                      _openLeaderboardComposer(context, controller, initial: entry),
                  onDelete: () => controller.deleteLeaderboardEntry(entry.id),
                ),
              ),
        ],
      ],
    );
  }

  Widget _buildEventsTab(
    BuildContext context,
    CommunityHubState state,
    CommunityHubController controller,
  ) {
    final events = List<CommunityEvent>.from(state.snapshot.events)
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        return _EventCard(
          event: event,
          onEdit: () => _openEventComposer(context, controller, initial: event),
          onDelete: () => controller.deleteEvent(event.id),
          onOpenRegistration: event.registrationUrl != null
              ? () => _launchUrl(Uri.parse(event.registrationUrl!))
              : null,
        );
      },
    );
  }

  Future<void> _openFeedComposer(
    BuildContext context,
    CommunityHubController controller, {
    CommunityFeedPost? initial,
  }) async {
    final titleController = TextEditingController(text: initial?.title ?? '');
    final authorController = TextEditingController(text: initial?.author ?? '');
    final bodyController = TextEditingController(text: initial?.body ?? '');
    final attachmentsController =
        TextEditingController(text: (initial?.attachmentUrls ?? <String>[]).join(', '));
    final tagsController =
        TextEditingController(text: (initial?.tags ?? <String>[]).join(', '));
    final communityController = TextEditingController(text: initial?.communityId ?? '');
    final coverImageController = TextEditingController(text: initial?.coverImageUrl ?? '');
    final formKey = GlobalKey<FormState>();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.8,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            builder: (context, scrollController) {
              return SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            initial == null ? 'Compose post' : 'Edit post',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          IconButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            icon: const Icon(Icons.close),
                          )
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: titleController,
                        decoration: const InputDecoration(labelText: 'Title'),
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Enter a title' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: authorController,
                        decoration: const InputDecoration(labelText: 'Author'),
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Enter an author' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: communityController,
                        decoration: const InputDecoration(
                          labelText: 'Community (optional)',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: coverImageController,
                        decoration: const InputDecoration(
                          labelText: 'Cover image URL (optional)',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: attachmentsController,
                        decoration: const InputDecoration(
                          labelText: 'Attachment URLs',
                          helperText: 'Comma separated links for videos, decks or images',
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: tagsController,
                        decoration: const InputDecoration(
                          labelText: 'Tags',
                          helperText: 'Separate tags with commas',
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: bodyController,
                        decoration: const InputDecoration(
                          labelText: 'Body',
                          alignLabelWithHint: true,
                        ),
                        maxLines: 6,
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Enter the post body' : null,
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () {
                            if (!formKey.currentState!.validate()) {
                              return;
                            }
                            Navigator.of(context).pop(true);
                          },
                          child: Text(initial == null ? 'Publish post' : 'Update post'),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );

    if (saved != true) {
      return;
    }

    final attachments = _splitList(attachmentsController.text);
    final tags = _splitList(tagsController.text);

    if (initial == null) {
      await controller.createFeedPost(
        title: titleController.text.trim(),
        body: bodyController.text.trim(),
        author: authorController.text.trim(),
        communityId:
            communityController.text.trim().isEmpty ? null : communityController.text.trim(),
        coverImageUrl:
            coverImageController.text.trim().isEmpty ? null : coverImageController.text.trim(),
        tags: tags,
        attachmentUrls: attachments,
      );
    } else {
      await controller.updateFeedPost(
        initial.copyWith(
          title: titleController.text.trim(),
          body: bodyController.text.trim(),
          author: authorController.text.trim(),
          communityId:
              communityController.text.trim().isEmpty ? null : communityController.text.trim(),
          coverImageUrl:
              coverImageController.text.trim().isEmpty ? null : coverImageController.text.trim(),
          tags: tags,
          attachmentUrls: attachments,
        ),
      );
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(initial == null ? 'Post published' : 'Post updated'),
      ),
    );
  }

  Future<void> _openClassroomComposer(
    BuildContext context,
    CommunityHubController controller, {
    CommunityClassroom? initial,
  }) async {
    final titleController = TextEditingController(text: initial?.title ?? '');
    final facilitatorController = TextEditingController(text: initial?.facilitator ?? '');
    final descriptionController = TextEditingController(text: initial?.description ?? '');
    final locationController = TextEditingController(text: initial?.deliveryMode ?? 'Virtual');
    final capacityController = TextEditingController(text: (initial?.capacity ?? 30).toString());
    final communityController = TextEditingController(text: initial?.communityId ?? 'global');
    final resourcesController =
        TextEditingController(text: (initial?.resources ?? <String>[]).join(', '));
    final tagsController = TextEditingController(text: (initial?.tags ?? <String>[]).join(', '));
    final recordingController = TextEditingController(text: initial?.recordingUrl ?? '');
    final coverController = TextEditingController(text: initial?.coverImageUrl ?? '');
    DateTime start = initial?.startTime ?? DateTime.now().add(const Duration(hours: 2));
    DateTime end = initial?.endTime ?? start.add(const Duration(hours: 1));
    final formKey = GlobalKey<FormState>();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.85,
            minChildSize: 0.6,
            maxChildSize: 0.95,
            builder: (context, scrollController) {
              return StatefulBuilder(
                builder: (context, setModalState) {
                  return SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                initial == null ? 'Create classroom session' : 'Update classroom',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              IconButton(
                                onPressed: () => Navigator.of(context).pop(false),
                                icon: const Icon(Icons.close),
                              )
                            ],
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: titleController,
                            decoration: const InputDecoration(labelText: 'Session title'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter a session title' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: facilitatorController,
                            decoration: const InputDecoration(labelText: 'Facilitator'),
                            validator: (value) => value == null || value.trim().isEmpty
                                ? 'Enter facilitator'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: communityController,
                            decoration: const InputDecoration(labelText: 'Community ID'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter the community ID' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: descriptionController,
                            decoration: const InputDecoration(
                              labelText: 'Description',
                              alignLabelWithHint: true,
                            ),
                            maxLines: 4,
                            validator: (value) => value == null || value.trim().isEmpty
                                ? 'Describe the classroom'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          _DateTile(
                            label: 'Start time',
                            value: start,
                            onChanged: (dateTime) {
                              setModalState(() => start = dateTime);
                              if (end.isBefore(dateTime)) {
                                end = dateTime.add(const Duration(hours: 1));
                              }
                            },
                          ),
                          const SizedBox(height: 8),
                          _DateTile(
                            label: 'End time',
                            value: end,
                            onChanged: (dateTime) {
                              setModalState(() => end = dateTime);
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: locationController,
                            decoration: const InputDecoration(labelText: 'Delivery mode / location'),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: capacityController,
                            decoration: const InputDecoration(labelText: 'Capacity'),
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              final parsed = int.tryParse(value ?? '');
                              if (parsed == null || parsed <= 0) {
                                return 'Enter a valid capacity';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: resourcesController,
                            decoration: const InputDecoration(
                              labelText: 'Resource links',
                              helperText: 'Comma separated URLs',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: tagsController,
                            decoration: const InputDecoration(
                              labelText: 'Tags',
                              helperText: 'Comma separated focus areas',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: recordingController,
                            decoration: const InputDecoration(
                              labelText: 'Recording URL (optional)',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: coverController,
                            decoration: const InputDecoration(
                              labelText: 'Cover image URL (optional)',
                            ),
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: () {
                                if (!formKey.currentState!.validate()) {
                                  return;
                                }
                                Navigator.of(context).pop(true);
                              },
                              child:
                                  Text(initial == null ? 'Create session' : 'Save changes'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        );
      },
    );

    if (saved != true) {
      return;
    }

    final resources = _splitList(resourcesController.text);
    final tags = _splitList(tagsController.text);
    final capacity = int.tryParse(capacityController.text.trim()) ?? 0;

    if (initial == null) {
      await controller.createClassroom(
        title: titleController.text.trim(),
        facilitator: facilitatorController.text.trim(),
        description: descriptionController.text.trim(),
        startTime: start,
        endTime: end,
        deliveryMode: locationController.text.trim(),
        capacity: capacity,
        communityId: communityController.text.trim(),
        resources: resources,
        tags: tags,
        recordingUrl:
            recordingController.text.trim().isEmpty ? null : recordingController.text.trim(),
        coverImageUrl: coverController.text.trim().isEmpty ? null : coverController.text.trim(),
      );
    } else {
      await controller.updateClassroom(
        initial.copyWith(
          title: titleController.text.trim(),
          facilitator: facilitatorController.text.trim(),
          description: descriptionController.text.trim(),
          startTime: start,
          endTime: end,
          deliveryMode: locationController.text.trim(),
          capacity: capacity,
          communityId: communityController.text.trim(),
          resources: resources,
          tags: tags,
          recordingUrl:
              recordingController.text.trim().isEmpty ? null : recordingController.text.trim(),
          coverImageUrl: coverController.text.trim().isEmpty ? null : coverController.text.trim(),
        ),
      );
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(initial == null ? 'Classroom scheduled' : 'Classroom updated'),
      ),
    );
  }

  Future<void> _openCalendarComposer(
    BuildContext context,
    CommunityHubController controller, {
    CommunityCalendarEntry? initial,
  }) async {
    final titleController = TextEditingController(text: initial?.title ?? '');
    final descriptionController = TextEditingController(text: initial?.description ?? '');
    final locationController = TextEditingController(text: initial?.location ?? '');
    final organiserController = TextEditingController(text: initial?.organiser ?? '');
    final communityController = TextEditingController(text: initial?.communityId ?? '');
    final tagsController = TextEditingController(text: (initial?.tags ?? <String>[]).join(', '));
    final coverController = TextEditingController(text: initial?.coverImageUrl ?? '');
    DateTime start = initial?.startTime ?? DateTime.now().add(const Duration(hours: 2));
    DateTime end = initial?.endTime ?? start.add(const Duration(hours: 1));
    final reminders = List<Duration>.from(initial?.reminders ?? const <Duration>[]);
    final reminderController = TextEditingController(
      text: reminders.map((duration) => duration.inMinutes.toString()).join(', '),
    );
    final formKey = GlobalKey<FormState>();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.75,
            minChildSize: 0.55,
            maxChildSize: 0.95,
            builder: (context, scrollController) {
              return StatefulBuilder(
                builder: (context, setModalState) {
                  return SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                initial == null ? 'Add calendar entry' : 'Edit calendar entry',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              IconButton(
                                onPressed: () => Navigator.of(context).pop(false),
                                icon: const Icon(Icons.close),
                              )
                            ],
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: titleController,
                            decoration: const InputDecoration(labelText: 'Title'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter the event title' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: organiserController,
                            decoration: const InputDecoration(labelText: 'Organiser'),
                            validator: (value) => value == null || value.trim().isEmpty
                                ? 'Enter organiser'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: descriptionController,
                            decoration: const InputDecoration(
                              labelText: 'Description',
                              alignLabelWithHint: true,
                            ),
                            maxLines: 4,
                            validator: (value) => value == null || value.trim().isEmpty
                                ? 'Describe the event'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          _DateTile(
                            label: 'Start time',
                            value: start,
                            onChanged: (value) {
                              setModalState(() => start = value);
                              if (end.isBefore(value)) {
                                end = value.add(const Duration(hours: 1));
                              }
                            },
                          ),
                          const SizedBox(height: 8),
                          _DateTile(
                            label: 'End time',
                            value: end,
                            onChanged: (value) {
                              setModalState(() => end = value);
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: locationController,
                            decoration: const InputDecoration(labelText: 'Location / Meeting link'),
                            validator: (value) => value == null || value.trim().isEmpty
                                ? 'Enter the location'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: communityController,
                            decoration: const InputDecoration(
                              labelText: 'Community ID (optional)',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: tagsController,
                            decoration: const InputDecoration(
                              labelText: 'Tags',
                              helperText: 'Comma separated contexts',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: reminderController,
                            decoration: const InputDecoration(
                              labelText: 'Reminder minutes',
                              helperText: 'Example: 60, 30, 10',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: coverController,
                            decoration: const InputDecoration(
                              labelText: 'Cover image URL (optional)',
                            ),
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: () {
                                if (!formKey.currentState!.validate()) {
                                  return;
                                }
                                Navigator.of(context).pop(true);
                              },
                              child:
                                  Text(initial == null ? 'Add to calendar' : 'Save changes'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        );
      },
    );

    if (saved != true) {
      return;
    }

    final tags = _splitList(tagsController.text);
    final reminderDurations = _splitList(reminderController.text)
        .map((minutes) => int.tryParse(minutes))
        .whereType<int>()
        .map(Duration(minutes: minutes))
        .toList();

    if (initial == null) {
      await controller.createCalendarEntry(
        title: titleController.text.trim(),
        description: descriptionController.text.trim(),
        startTime: start,
        endTime: end,
        location: locationController.text.trim(),
        organiser: organiserController.text.trim(),
        communityId:
            communityController.text.trim().isEmpty ? null : communityController.text.trim(),
        tags: tags,
        reminders: reminderDurations,
        coverImageUrl: coverController.text.trim().isEmpty ? null : coverController.text.trim(),
      );
    } else {
      await controller.updateCalendarEntry(
        initial.copyWith(
          title: titleController.text.trim(),
          description: descriptionController.text.trim(),
          startTime: start,
          endTime: end,
          location: locationController.text.trim(),
          organiser: organiserController.text.trim(),
          communityId:
              communityController.text.trim().isEmpty ? null : communityController.text.trim(),
          tags: tags,
          reminders: reminderDurations,
          coverImageUrl: coverController.text.trim().isEmpty ? null : coverController.text.trim(),
        ),
      );
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(initial == null ? 'Calendar entry created' : 'Calendar entry updated'),
      ),
    );
  }

  Future<void> _openLivestreamComposer(
    BuildContext context,
    CommunityHubController controller, {
    CommunityLivestream? initial,
  }) async {
    final titleController = TextEditingController(text: initial?.title ?? '');
    final hostController = TextEditingController(text: initial?.host ?? '');
    final streamUrlController = TextEditingController(text: initial?.streamUrl ?? '');
    final descriptionController = TextEditingController(text: initial?.description ?? '');
    final communityController = TextEditingController(text: initial?.communityId ?? '');
    final statusController = TextEditingController(text: initial?.status ?? 'scheduled');
    final tagsController = TextEditingController(text: (initial?.tags ?? <String>[]).join(', '));
    final thumbnailController = TextEditingController(text: initial?.thumbnailUrl ?? '');
    DateTime scheduledAt = initial?.scheduledAt ?? DateTime.now().add(const Duration(hours: 4));
    final formKey = GlobalKey<FormState>();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.75,
            minChildSize: 0.55,
            maxChildSize: 0.95,
            builder: (context, scrollController) {
              return StatefulBuilder(
                builder: (context, setModalState) {
                  return SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                initial == null ? 'Schedule live stream' : 'Update live stream',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              IconButton(
                                onPressed: () => Navigator.of(context).pop(false),
                                icon: const Icon(Icons.close),
                              )
                            ],
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: titleController,
                            decoration: const InputDecoration(labelText: 'Session title'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter the title' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: hostController,
                            decoration: const InputDecoration(labelText: 'Host'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter the host' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: streamUrlController,
                            decoration: const InputDecoration(labelText: 'Streaming URL'),
                            validator: (value) => value == null || value.trim().isEmpty
                                ? 'Enter the streaming URL'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          _DateTile(
                            label: 'Scheduled time',
                            value: scheduledAt,
                            onChanged: (value) => setModalState(() => scheduledAt = value),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: statusController,
                            decoration: const InputDecoration(
                              labelText: 'Status',
                              helperText: 'scheduled · live · completed · cancelled',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: communityController,
                            decoration: const InputDecoration(
                              labelText: 'Community ID (optional)',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: tagsController,
                            decoration: const InputDecoration(
                              labelText: 'Tags',
                              helperText: 'Comma separated themes',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: thumbnailController,
                            decoration: const InputDecoration(
                              labelText: 'Thumbnail image URL (optional)',
                            ),
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: () {
                                if (!formKey.currentState!.validate()) {
                                  return;
                                }
                                Navigator.of(context).pop(true);
                              },
                              child: Text(initial == null ? 'Schedule stream' : 'Save changes'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        );
      },
    );

    if (saved != true) {
      return;
    }

    final tags = _splitList(tagsController.text);
    final status = statusController.text.trim().isEmpty
        ? 'scheduled'
        : statusController.text.trim().toLowerCase();

    if (initial == null) {
      await controller.createLivestream(
        title: titleController.text.trim(),
        host: hostController.text.trim(),
        streamUrl: streamUrlController.text.trim(),
        scheduledAt: scheduledAt,
        status: status,
        description: descriptionController.text.trim(),
        communityId:
            communityController.text.trim().isEmpty ? null : communityController.text.trim(),
        tags: tags,
        thumbnailUrl:
            thumbnailController.text.trim().isEmpty ? null : thumbnailController.text.trim(),
      );
    } else {
      await controller.updateLivestream(
        initial.copyWith(
          title: titleController.text.trim(),
          host: hostController.text.trim(),
          streamUrl: streamUrlController.text.trim(),
          scheduledAt: scheduledAt,
          status: status,
          description: descriptionController.text.trim(),
          communityId:
              communityController.text.trim().isEmpty ? null : communityController.text.trim(),
          tags: tags,
          thumbnailUrl:
              thumbnailController.text.trim().isEmpty ? null : thumbnailController.text.trim(),
        ),
      );
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(initial == null ? 'Live stream scheduled' : 'Live stream updated'),
      ),
    );
  }

  Future<void> _openPodcastComposer(
    BuildContext context,
    CommunityHubController controller, {
    CommunityPodcastEpisode? initial,
  }) async {
    final titleController = TextEditingController(text: initial?.title ?? '');
    final hostController = TextEditingController(text: initial?.host ?? '');
    final descriptionController = TextEditingController(text: initial?.description ?? '');
    final audioController = TextEditingController(text: initial?.audioUrl ?? '');
    final artworkController = TextEditingController(text: initial?.artworkUrl ?? '');
    final tagsController = TextEditingController(text: (initial?.tags ?? <String>[]).join(', '));
    final communityController = TextEditingController(text: initial?.communityId ?? '');
    final durationController = TextEditingController(
      text: initial == null ? '30' : initial.duration.inMinutes.toString(),
    );
    DateTime publishedAt = initial?.publishedAt ?? DateTime.now();
    final formKey = GlobalKey<FormState>();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.7,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            builder: (context, scrollController) {
              return StatefulBuilder(
                builder: (context, setModalState) {
                  return SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                initial == null ? 'Add podcast episode' : 'Update episode',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              IconButton(
                                onPressed: () => Navigator.of(context).pop(false),
                                icon: const Icon(Icons.close),
                              )
                            ],
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: titleController,
                            decoration: const InputDecoration(labelText: 'Episode title'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter the title' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: hostController,
                            decoration: const InputDecoration(labelText: 'Host'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter the host' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: audioController,
                            decoration: const InputDecoration(labelText: 'Audio URL'),
                            validator: (value) => value == null || value.trim().isEmpty
                                ? 'Enter the audio URL'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          _DateTile(
                            label: 'Published on',
                            value: publishedAt,
                            onChanged: (value) => setModalState(() => publishedAt = value),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: durationController,
                            decoration: const InputDecoration(
                              labelText: 'Duration (minutes)',
                            ),
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              final parsed = int.tryParse(value ?? '');
                              if (parsed == null || parsed <= 0) {
                                return 'Enter a valid duration';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: tagsController,
                            decoration: const InputDecoration(
                              labelText: 'Tags',
                              helperText: 'Comma separated themes',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: communityController,
                            decoration: const InputDecoration(
                              labelText: 'Community ID (optional)',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: artworkController,
                            decoration: const InputDecoration(
                              labelText: 'Artwork URL (optional)',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: descriptionController,
                            decoration: const InputDecoration(
                              labelText: 'Description',
                              alignLabelWithHint: true,
                            ),
                            maxLines: 4,
                            validator: (value) => value == null || value.trim().isEmpty
                                ? 'Describe the episode'
                                : null,
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: () {
                                if (!formKey.currentState!.validate()) {
                                  return;
                                }
                                Navigator.of(context).pop(true);
                              },
                              child:
                                  Text(initial == null ? 'Add episode' : 'Save changes'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        );
      },
    );

    if (saved != true) {
      return;
    }

    final tags = _splitList(tagsController.text);
    final duration = Duration(minutes: int.tryParse(durationController.text.trim()) ?? 0);

    if (initial == null) {
      await controller.createPodcastEpisode(
        title: titleController.text.trim(),
        description: descriptionController.text.trim(),
        audioUrl: audioController.text.trim(),
        host: hostController.text.trim(),
        publishedAt: publishedAt,
        duration: duration,
        tags: tags,
        artworkUrl: artworkController.text.trim().isEmpty
            ? null
            : artworkController.text.trim(),
        communityId:
            communityController.text.trim().isEmpty ? null : communityController.text.trim(),
      );
    } else {
      await controller.updatePodcastEpisode(
        initial.copyWith(
          title: titleController.text.trim(),
          description: descriptionController.text.trim(),
          audioUrl: audioController.text.trim(),
          host: hostController.text.trim(),
          publishedAt: publishedAt,
          duration: duration,
          tags: tags,
          artworkUrl: artworkController.text.trim().isEmpty
              ? null
              : artworkController.text.trim(),
          communityId:
              communityController.text.trim().isEmpty ? null : communityController.text.trim(),
        ),
      );
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(initial == null ? 'Podcast episode added' : 'Podcast updated'),
      ),
    );
  }

  Future<void> _openLeaderboardComposer(
    BuildContext context,
    CommunityHubController controller, {
    CommunityLeaderboardEntry? initial,
  }) async {
    final nameController = TextEditingController(text: initial?.memberName ?? '');
    final pointsController = TextEditingController(text: (initial?.points ?? 0).toString());
    final avatarController = TextEditingController(text: initial?.avatarUrl ?? '');
    final badgesController = TextEditingController(text: (initial?.badges ?? <String>[]).join(', '));
    final trendController = TextEditingController(text: (initial?.trend ?? 0).toString());
    final formKey = GlobalKey<FormState>();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.65,
            minChildSize: 0.4,
            maxChildSize: 0.9,
            builder: (context, scrollController) {
              return SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            initial == null ? 'Add leaderboard entry' : 'Update leaderboard entry',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          IconButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            icon: const Icon(Icons.close),
                          )
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: nameController,
                        decoration: const InputDecoration(labelText: 'Member name'),
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Enter a member name' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: pointsController,
                        decoration: const InputDecoration(labelText: 'Points'),
                        keyboardType: TextInputType.number,
                        validator: (value) {
                          final parsed = int.tryParse(value ?? '');
                          if (parsed == null || parsed < 0) {
                            return 'Enter a valid points total';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: avatarController,
                        decoration: const InputDecoration(labelText: 'Avatar URL'),
                        validator: (value) => value == null || value.trim().isEmpty
                            ? 'Enter an avatar URL'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: badgesController,
                        decoration: const InputDecoration(
                          labelText: 'Badges',
                          helperText: 'Comma separated badge names',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: trendController,
                        decoration: const InputDecoration(
                          labelText: 'Trend (change in rank)',
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () {
                            if (!formKey.currentState!.validate()) {
                              return;
                            }
                            Navigator.of(context).pop(true);
                          },
                          child: Text(initial == null ? 'Add champion' : 'Save changes'),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );

    if (saved != true) {
      return;
    }

    final badges = _splitList(badgesController.text);
    final points = int.tryParse(pointsController.text.trim()) ?? 0;
    final trend = int.tryParse(trendController.text.trim()) ?? 0;

    if (initial == null) {
      await controller.createLeaderboardEntry(
        memberName: nameController.text.trim(),
        points: points,
        avatarUrl: avatarController.text.trim(),
        badges: badges,
        trend: trend,
      );
    } else {
      await controller.updateLeaderboardEntry(
        initial.copyWith(
          memberName: nameController.text.trim(),
          points: points,
          avatarUrl: avatarController.text.trim(),
          badges: badges,
          trend: trend,
        ),
      );
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(initial == null ? 'Leaderboard entry added' : 'Leaderboard updated'),
      ),
    );
  }

  Future<void> _openEventComposer(
    BuildContext context,
    CommunityHubController controller, {
    CommunityEvent? initial,
  }) async {
    final titleController = TextEditingController(text: initial?.title ?? '');
    final descriptionController = TextEditingController(text: initial?.description ?? '');
    final locationController = TextEditingController(text: initial?.location ?? '');
    final hostController = TextEditingController(text: initial?.host ?? '');
    final communityController = TextEditingController(text: initial?.communityId ?? '');
    final capacityController = TextEditingController(
      text: initial?.capacity != null ? initial!.capacity.toString() : '',
    );
    final tagsController = TextEditingController(text: (initial?.tags ?? <String>[]).join(', '));
    final coverController = TextEditingController(text: initial?.coverImageUrl ?? '');
    final registrationController = TextEditingController(text: initial?.registrationUrl ?? '');
    DateTime start = initial?.startTime ?? DateTime.now().add(const Duration(days: 1));
    DateTime end = initial?.endTime ?? start.add(const Duration(hours: 2));
    final formKey = GlobalKey<FormState>();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.8,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            builder: (context, scrollController) {
              return StatefulBuilder(
                builder: (context, setModalState) {
                  return SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                initial == null ? 'Create community event' : 'Update event',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              IconButton(
                                onPressed: () => Navigator.of(context).pop(false),
                                icon: const Icon(Icons.close),
                              )
                            ],
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: titleController,
                            decoration: const InputDecoration(labelText: 'Event title'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter the event title' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: hostController,
                            decoration: const InputDecoration(labelText: 'Host'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter the host' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: descriptionController,
                            decoration: const InputDecoration(
                              labelText: 'Description',
                              alignLabelWithHint: true,
                            ),
                            maxLines: 4,
                            validator: (value) => value == null || value.trim().isEmpty
                                ? 'Describe the event'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          _DateTile(
                            label: 'Start time',
                            value: start,
                            onChanged: (value) {
                              setModalState(() => start = value);
                              if (end.isBefore(value)) {
                                end = value.add(const Duration(hours: 2));
                              }
                            },
                          ),
                          const SizedBox(height: 8),
                          _DateTile(
                            label: 'End time',
                            value: end,
                            onChanged: (value) => setModalState(() => end = value),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: locationController,
                            decoration: const InputDecoration(labelText: 'Location'),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'Enter the location' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: capacityController,
                            decoration: const InputDecoration(
                              labelText: 'Capacity (optional)',
                            ),
                            keyboardType: TextInputType.number,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: communityController,
                            decoration: const InputDecoration(
                              labelText: 'Community ID (optional)',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: tagsController,
                            decoration: const InputDecoration(
                              labelText: 'Tags',
                              helperText: 'Comma separated tracks or goals',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: registrationController,
                            decoration: const InputDecoration(
                              labelText: 'Registration URL (optional)',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: coverController,
                            decoration: const InputDecoration(
                              labelText: 'Cover image URL (optional)',
                            ),
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: () {
                                if (!formKey.currentState!.validate()) {
                                  return;
                                }
                                Navigator.of(context).pop(true);
                              },
                              child: Text(initial == null ? 'Create event' : 'Save changes'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        );
      },
    );

    if (saved != true) {
      return;
    }

    final tags = _splitList(tagsController.text);
    final capacity = int.tryParse(capacityController.text.trim());

    if (initial == null) {
      await controller.createEvent(
        title: titleController.text.trim(),
        description: descriptionController.text.trim(),
        startTime: start,
        endTime: end,
        location: locationController.text.trim(),
        host: hostController.text.trim(),
        communityId:
            communityController.text.trim().isEmpty ? null : communityController.text.trim(),
        capacity: capacity,
        tags: tags,
        registrationUrl: registrationController.text.trim().isEmpty
            ? null
            : registrationController.text.trim(),
        coverImageUrl:
            coverController.text.trim().isEmpty ? null : coverController.text.trim(),
      );
    } else {
      await controller.updateEvent(
        initial.copyWith(
          title: titleController.text.trim(),
          description: descriptionController.text.trim(),
          startTime: start,
          endTime: end,
          location: locationController.text.trim(),
          host: hostController.text.trim(),
          communityId:
              communityController.text.trim().isEmpty ? null : communityController.text.trim(),
          capacity: capacity,
          tags: tags,
          registrationUrl: registrationController.text.trim().isEmpty
              ? null
              : registrationController.text.trim(),
          coverImageUrl:
              coverController.text.trim().isEmpty ? null : coverController.text.trim(),
        ),
      );
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(initial == null ? 'Event created' : 'Event updated'),
      ),
    );
  }

  Future<void> _promptEnrollment(
    BuildContext context,
    CommunityClassroom classroom,
    CommunityHubController controller,
  ) async {
    final nameController = TextEditingController();
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Enroll member'),
          content: TextField(
            controller: nameController,
            decoration: const InputDecoration(labelText: 'Member name'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Enroll'),
            ),
          ],
        );
      },
    );

    if (saved == true && nameController.text.trim().isNotEmpty) {
      await controller.enrollInClassroom(classroom.id, nameController.text.trim());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enrolled ${nameController.text.trim()}')),
      );
    }
  }

  List<String> _splitList(String input) {
    return input
        .split(',')
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toList();
  }

  Future<void> _launchUrl(Uri uri) async {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open ${uri.toString()}')),
      );
    }
  }

  Widget _buildPlaceholderCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.indigo.shade100),
        color: Colors.indigo.shade50.withOpacity(0.5),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Colors.white,
            child: Icon(icon, color: Theme.of(context).colorScheme.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DateTile extends StatelessWidget {
  const _DateTile({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final DateTime value;
  final ValueChanged<DateTime> onChanged;

  @override
  Widget build(BuildContext context) {
    final formatted = DateFormat('EEE, MMM d · h:mm a').format(value);
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      subtitle: Text(formatted),
      trailing: const Icon(Icons.calendar_today_outlined),
      onTap: () async {
        final date = await showDatePicker(
          context: context,
          initialDate: value,
          firstDate: DateTime.now().subtract(const Duration(days: 365)),
          lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
        );
        if (date == null) {
          return;
        }
        final time = await showTimePicker(
          context: context,
          initialTime: TimeOfDay.fromDateTime(value),
        );
        final next = DateTime(
          date.year,
          date.month,
          date.day,
          time?.hour ?? value.hour,
          time?.minute ?? value.minute,
        );
        onChanged(next);
      },
    );
  }
}

class _FeedCard extends StatelessWidget {
  const _FeedCard({
    required this.post,
    required this.onEdit,
    required this.onDelete,
    required this.onTogglePin,
    required this.onShare,
  });

  final CommunityFeedPost post;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onTogglePin;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: colorScheme.primary.withOpacity(0.1),
                  child: Text(post.author.substring(0, 1).toUpperCase()),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(post.author, style: Theme.of(context).textTheme.titleSmall),
                      Text(post.formattedTimestamp,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Pin post',
                  onPressed: onTogglePin,
                  icon: Icon(post.pinned ? Icons.push_pin : Icons.push_pin_outlined),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(post.title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(post.body, style: Theme.of(context).textTheme.bodyMedium),
            if (post.attachmentUrls.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: post.attachmentUrls
                    .map((url) => ActionChip(
                          avatar: const Icon(Icons.attach_file, size: 18),
                          label: Text(Uri.parse(url).host),
                          onPressed: onShare,
                        ))
                    .toList(),
              ),
            ],
            if (post.tags.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                children:
                    post.tags.map((tag) => Chip(label: Text('#$tag'), visualDensity: VisualDensity.compact)).toList(),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                FilledButton.tonalIcon(
                  onPressed: onShare,
                  icon: const Icon(Icons.share_outlined),
                  label: const Text('Share'),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Edit'),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ClassroomCard extends StatelessWidget {
  const _ClassroomCard({
    required this.classroom,
    required this.onEdit,
    required this.onDelete,
    required this.onEnroll,
    required this.onCancelEnrollment,
  });

  final CommunityClassroom classroom;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onEnroll;
  final ValueChanged<String> onCancelEnrollment;

  @override
  Widget build(BuildContext context) {
    final progress = classroom.capacity == 0
        ? 0.0
        : classroom.enrolled.length / classroom.capacity.clamp(1, classroom.capacity);
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.deepPurple.withOpacity(0.1),
                  child: const Icon(Icons.class_outlined),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(classroom.title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                      Text(classroom.windowLabel, style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                IconButton(onPressed: onEdit, icon: const Icon(Icons.edit_outlined)),
              ],
            ),
            const SizedBox(height: 12),
            Text(classroom.description, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 12),
            Row(
              children: [
                Chip(label: Text(classroom.deliveryMode)),
                const SizedBox(width: 8),
                Chip(label: Text('${classroom.capacity} seats')),
              ],
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: progress.clamp(0.0, 1.0)),
            const SizedBox(height: 8),
            Text('${classroom.enrolled.length}/${classroom.capacity} enrolled'),
            if (classroom.enrolled.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: classroom.enrolled
                    .map(
                      (member) => Chip(
                        label: Text(member),
                        deleteIcon: const Icon(Icons.close, size: 18),
                        onDeleted: () => onCancelEnrollment(member),
                      ),
                    )
                    .toList(),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: classroom.isFull ? null : onEnroll,
                  icon: const Icon(Icons.person_add_alt),
                  label: const Text('Enroll member'),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Remove'),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

class _CalendarCard extends StatelessWidget {
  const _CalendarCard({required this.entry, required this.onEdit, required this.onDelete});

  final CommunityCalendarEntry entry;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.event_available_outlined),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(entry.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                ),
                IconButton(onPressed: onEdit, icon: const Icon(Icons.edit_outlined)),
              ],
            ),
            const SizedBox(height: 8),
            Text(entry.timelineLabel, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            Text(entry.description),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 16),
                const SizedBox(width: 4),
                Text(entry.location),
              ],
            ),
            if (entry.reminders.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: entry.reminders
                    .map((duration) => Chip(label: Text('${duration.inMinutes} min reminder')))
                    .toList(),
              ),
            ],
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete'),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

class _LivestreamCard extends StatelessWidget {
  const _LivestreamCard({
    required this.stream,
    required this.onEdit,
    required this.onDelete,
    required this.onOpen,
  });

  final CommunityLivestream stream;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final statusColor = switch (stream.status) {
      'live' => Colors.red,
      'completed' => Colors.green,
      'cancelled' => Colors.grey,
      _ => Theme.of(context).colorScheme.primary,
    };
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: statusColor.withOpacity(0.1),
                  child: Icon(Icons.videocam_outlined, color: statusColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(stream.title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                      Text(DateFormat('MMM d · h:mm a').format(stream.scheduledAt),
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                Chip(
                  backgroundColor: statusColor.withOpacity(0.1),
                  label: Text(stream.statusLabel, style: TextStyle(color: statusColor)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(stream.description),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: stream.tags.map((tag) => Chip(label: Text('#$tag'))).toList(),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: onOpen,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Open stream'),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Edit'),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete'),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

class _PodcastCard extends StatelessWidget {
  const _PodcastCard({
    required this.episode,
    required this.onEdit,
    required this.onDelete,
    required this.onPlay,
  });

  final CommunityPodcastEpisode episode;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.orange.withOpacity(0.1),
                  child: const Icon(Icons.podcasts_outlined),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(episode.title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                      Text('${episode.durationLabel} • ${DateFormat('MMM d, yyyy').format(episode.publishedAt)}',
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                IconButton(onPressed: onEdit, icon: const Icon(Icons.edit_outlined)),
              ],
            ),
            const SizedBox(height: 12),
            Text(episode.description),
            if (episode.tags.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: episode.tags.map((tag) => Chip(label: Text('#$tag'))).toList(),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: onPlay,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Play episode'),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete'),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

class _LeaderboardPodium extends StatelessWidget {
  const _LeaderboardPodium({required this.leaders});

  final List<CommunityLeaderboardEntry> leaders;

  @override
  Widget build(BuildContext context) {
    if (leaders.isEmpty) {
      return const SizedBox.shrink();
    }
    final podium = leaders.take(3).toList();
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(colors: [Color(0xFFFFF5E6), Color(0xFFFFE8D1)]),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Top champions', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: podium.map((entry) => _PodiumTile(entry: entry)).toList(),
          ),
        ],
      ),
    );
  }
}

class _PodiumTile extends StatelessWidget {
  const _PodiumTile({required this.entry});

  final CommunityLeaderboardEntry entry;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CircleAvatar(
          radius: 28,
          backgroundImage: entry.avatarUrl.isNotEmpty ? NetworkImage(entry.avatarUrl) : null,
          child: entry.avatarUrl.isEmpty ? Text(entry.memberName.substring(0, 1)) : null,
        ),
        const SizedBox(height: 8),
        Text(entry.memberName, style: Theme.of(context).textTheme.titleSmall),
        Text('${entry.points} pts', style: Theme.of(context).textTheme.bodySmall),
        if (entry.badges.isNotEmpty)
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: entry.badges.map((badge) => Chip(label: Text(badge))).toList(),
          ),
      ],
    );
  }
}

class _LeaderboardRow extends StatelessWidget {
  const _LeaderboardRow({
    required this.entry,
    required this.onEdit,
    required this.onDelete,
  });

  final CommunityLeaderboardEntry entry;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final trendIcon = entry.trend > 0
        ? Icons.trending_up
        : entry.trend < 0
            ? Icons.trending_down
            : Icons.trending_flat;
    final trendColor = entry.trend > 0
        ? Colors.green
        : entry.trend < 0
            ? Colors.red
            : Colors.grey;
    return ListTile(
      leading: CircleAvatar(
        child: Text(entry.rank.toString()),
      ),
      title: Text(entry.memberName),
      subtitle: Text('${entry.points} points'),
      trailing: Wrap(
        spacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Icon(trendIcon, color: trendColor, size: 18),
          IconButton(icon: const Icon(Icons.edit_outlined), onPressed: onEdit),
          IconButton(icon: const Icon(Icons.delete_outline), onPressed: onDelete),
        ],
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({
    required this.event,
    required this.onEdit,
    required this.onDelete,
    this.onOpenRegistration,
  });

  final CommunityEvent event;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback? onOpenRegistration;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.teal.withOpacity(0.1),
                  child: const Icon(Icons.event_outlined),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(event.title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                      Text(event.scheduleLabel, style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                IconButton(onPressed: onEdit, icon: const Icon(Icons.edit_outlined)),
              ],
            ),
            const SizedBox(height: 12),
            Text(event.description),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 16),
                const SizedBox(width: 4),
                Expanded(child: Text(event.location)),
              ],
            ),
            if (event.capacity != null) ...[
              const SizedBox(height: 8),
              Text('Capacity: ${event.capacity}'),
            ],
            if (event.tags.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: event.tags.map((tag) => Chip(label: Text('#$tag'))).toList(),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                if (onOpenRegistration != null)
                  FilledButton.icon(
                    onPressed: onOpenRegistration,
                    icon: const Icon(Icons.launch),
                    label: const Text('Registration'),
                  ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete'),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

class _HubTab {
  const _HubTab(this.label, this.icon);

  final String label;
  final IconData icon;
}
