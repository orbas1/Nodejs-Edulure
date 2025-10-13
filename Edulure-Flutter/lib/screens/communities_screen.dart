import 'package:flutter/material.dart';

enum LiveFeedScope { global, community }

class CommunitiesScreen extends StatefulWidget {
  const CommunitiesScreen({super.key});

  @override
  State<CommunitiesScreen> createState() => _CommunitiesScreenState();
}

class _CommunitiesScreenState extends State<CommunitiesScreen> {
  LiveFeedScope _selectedScope = LiveFeedScope.global;

  static const List<_Community> _communities = [
    _Community(
      name: 'RevOps Guild',
      description: 'Revenue operators scaling GTM playbooks together.',
      members: 2180,
      health: 'Thriving',
      accentColor: Color(0xFFEFF6FF),
      bannerImage: 'https://images.unsplash.com/photo-1522202222400-95cb8671ee88?auto=format&fit=crop&w=900&q=80',
      tags: ['Revenue', 'Lifecycle', 'Automation'],
    ),
    _Community(
      name: 'Customer Education Collective',
      description: 'Designing immersive customer education programmes.',
      members: 1835,
      health: 'Energised',
      accentColor: Color(0xFFFFF7ED),
      bannerImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
      tags: ['CX', 'Learning', 'Advocacy'],
    ),
    _Community(
      name: 'Community-Led Leaders',
      description: 'Leaders building global community-led organisations.',
      members: 2560,
      health: 'Scaling',
      accentColor: Color(0xFFF1F5F9),
      bannerImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
      tags: ['Leadership', 'Strategy', 'Playbooks'],
    ),
  ];

  static final List<_FeedPost> _globalFeed = [
    _FeedPost(
      authorName: 'Jordan Brooks',
      authorRole: 'Head of Community',
      communityName: 'Global broadcast',
      body:
          'We just published the Q2 community playbook with updated retention benchmarks and event templates. Dive in and share your feedback!',
      tags: const ['Playbook', 'Retention'],
    ),
    _FeedPost(
      authorName: 'Sasha Nwosu',
      authorRole: 'Learning Experience Designer',
      communityName: 'Global broadcast',
      body:
          'Next week we are running a live teardown of the new onboarding experience. RSVP if you want to join the working group.',
      tags: const ['Live session', 'Design Review'],
    ),
  ];

  static final List<_FeedPost> _communityFeed = [
    _FeedPost(
      authorName: 'Luca Martins',
      authorRole: 'Community Moderator',
      communityName: 'RevOps Guild',
      body:
          'Kicked off a member-led pipeline automation clinic. Drop your toughest workflow question and we will cover it live tomorrow.',
      tags: const ['Automation', 'Workshop'],
    ),
    _FeedPost(
      authorName: 'Emily Tan',
      authorRole: 'Programme Manager',
      communityName: 'Customer Education Collective',
      body:
          'Shared the interview kit we used to map learner personas across APAC. Curious to hear how you structure your research panels.',
      tags: const ['Research', 'Templates'],
    ),
    _FeedPost(
      authorName: 'Noah Patel',
      authorRole: 'Community Operations',
      communityName: 'Community-Led Leaders',
      body:
          'We are prototyping a new ritual around cross-community mentorship. Sign up if you would like to exchange playbooks with another operator.',
      tags: const ['Mentorship', 'Collaboration'],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Communities'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildCommunitiesHero(textTheme, colorScheme),
            const SizedBox(height: 24),
            _buildManagementSection(textTheme, colorScheme),
            const SizedBox(height: 32),
            _buildDirectorySection(textTheme),
            const SizedBox(height: 32),
            _buildLiveFeedSection(textTheme),
          ],
        ),
      ),
    );
  }

  Widget _buildCommunitiesHero(TextTheme textTheme, ColorScheme colorScheme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          colors: [colorScheme.primary.withOpacity(0.08), colorScheme.primary.withOpacity(0.03)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Community operating system',
            style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          Text(
            'Launch, grow, and manage every member journey with unified tooling across mobile and web.',
            style: textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: const [
              _HeroChip(label: 'Member CRM'),
              _HeroChip(label: 'Event engine'),
              _HeroChip(label: 'Monetisation'),
              _HeroChip(label: 'Insights'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildManagementSection(TextTheme textTheme, ColorScheme colorScheme) {
    final stats = [
      _ManagementStat(icon: Icons.person_add_alt_1_outlined, label: 'New members', value: '48 this week'),
      _ManagementStat(icon: Icons.timelapse_outlined, label: 'Avg. response', value: '2h 14m'),
      _ManagementStat(icon: Icons.auto_graph_outlined, label: 'Engagement lift', value: '+18% MoM'),
    ];

    final actions = [
      'Schedule campaign',
      'Publish announcement',
      'Launch automation',
      'Invite moderators',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Community management', style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            TextButton(
              onPressed: () {},
              child: const Text('View analytics'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth > 600;
            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: stats
                  .map(
                    (stat) => SizedBox(
                      width: isWide ? (constraints.maxWidth - 24) / 3 : (constraints.maxWidth - 12) / 2,
                      child: _ManagementCard(stat: stat, colorScheme: colorScheme),
                    ),
                  )
                  .toList(),
            );
          },
        ),
        const SizedBox(height: 16),
        Text('Quick actions', style: textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: actions
              .map(
                (action) => ActionChip(
                  label: Text(action),
                  avatar: const Icon(Icons.flash_on_outlined, size: 18),
                  onPressed: () {},
                ),
              )
              .toList(),
        ),
      ],
    );
  }

  Widget _buildDirectorySection(TextTheme textTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Communities', style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        ..._communities.map((community) => _CommunityCard(community: community)).toList(),
      ],
    );
  }

  Widget _buildLiveFeedSection(TextTheme textTheme) {
    final selectedPosts = _selectedScope == LiveFeedScope.global ? _globalFeed : _communityFeed;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Live feed', style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            SegmentedButton<LiveFeedScope>(
              segments: const [
                ButtonSegment(value: LiveFeedScope.global, label: Text('Global')),
                ButtonSegment(value: LiveFeedScope.community, label: Text('Communities')),
              ],
              selected: <LiveFeedScope>{_selectedScope},
              onSelectionChanged: (selection) {
                final next = selection.firstOrNull ?? LiveFeedScope.global;
                setState(() => _selectedScope = next);
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: selectedPosts.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final post = selectedPosts[index];
            return Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundImage: NetworkImage('https://i.pravatar.cc/150?img=${(index + 5) * 3 % 70}'),
                      ),
                      title: Text(post.authorName),
                      subtitle: Text(post.authorRole),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Text(
                          post.communityName,
                          style: textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(post.body, style: textTheme.bodyMedium),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      children: post.tags.map((tag) => Chip(label: Text('#$tag'))).toList(),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(label),
      avatar: const Icon(Icons.auto_awesome_outlined, size: 18),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}

class _ManagementStat {
  const _ManagementStat({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;
}

class _ManagementCard extends StatelessWidget {
  const _ManagementCard({required this.stat, required this.colorScheme});

  final _ManagementStat stat;
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
      color: colorScheme.surfaceVariant.withOpacity(0.35),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(stat.icon, color: colorScheme.primary),
            const SizedBox(height: 12),
            Text(stat.value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(stat.label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _Community {
  const _Community({
    required this.name,
    required this.description,
    required this.members,
    required this.health,
    required this.accentColor,
    required this.bannerImage,
    required this.tags,
  });

  final String name;
  final String description;
  final int members;
  final String health;
  final Color accentColor;
  final String bannerImage;
  final List<String> tags;
}

class _CommunityCard extends StatelessWidget {
  const _CommunityCard({required this.community});

  final _Community community;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: community.accentColor,
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: Image.network(
              community.bannerImage,
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(community.name, style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Text(
                  community.description,
                  style: textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    CircleAvatar(
                      backgroundImage:
                          NetworkImage('https://i.pravatar.cc/150?img=${community.members % 70}'),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${community.members}+ members', style: textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                          Text('Health: ${community.health}', style: textTheme.bodySmall),
                        ],
                      ),
                    ),
                    FilledButton(
                      onPressed: () {},
                      child: const Text('Manage'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: community.tags.map((tag) => Chip(label: Text(tag))).toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedPost {
  const _FeedPost({
    required this.authorName,
    required this.authorRole,
    required this.communityName,
    required this.body,
    required this.tags,
  });

  final String authorName;
  final String authorRole;
  final String communityName;
  final String body;
  final List<String> tags;
}

extension<T> on Set<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
