
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/profile/user_profile_controller.dart';
import '../services/user_profile_repository.dart';

class UserProfileViewScreen extends ConsumerStatefulWidget {
  const UserProfileViewScreen({super.key, this.initialProfileId});

  final String? initialProfileId;

  @override
  ConsumerState<UserProfileViewScreen> createState() => _UserProfileViewScreenState();
}

class _UserProfileViewScreenState extends ConsumerState<UserProfileViewScreen> {
  late final PageController _pageController;
  int _currentIndex = 0;
  String? _targetProfileId;
  bool _alignedToTarget = false;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.85);
    _targetProfileId = widget.initialProfileId;
    Future.microtask(() => ref.read(userProfileControllerProvider.notifier).bootstrap());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final routeArg = ModalRoute.of(context)?.settings.arguments;
    if (_targetProfileId == null && routeArg is String && routeArg.isNotEmpty) {
      _targetProfileId = routeArg;
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(userProfileControllerProvider);
    final profiles = state.snapshot.profiles;
    final theme = Theme.of(context);

    if (!_alignedToTarget && _targetProfileId != null && profiles.isNotEmpty) {
      final index = profiles.indexWhere((profile) => profile.id == _targetProfileId);
      if (index >= 0) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          _pageController.jumpToPage(index);
          setState(() {
            _currentIndex = index;
            _alignedToTarget = true;
          });
        });
      } else {
        _alignedToTarget = true;
      }
    }

    if (state.loading && profiles.isEmpty) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (profiles.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Profiles')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('No profiles available. Create one from the workspace to explore.'),
          ),
        ),
      );
    }

    final activeProfile = profiles[_currentIndex.clamp(0, profiles.length - 1)];

    return Scaffold(
      appBar: AppBar(
        title: Text(activeProfile.displayName),
        actions: [
          IconButton(
            tooltip: 'Copy calendar',
            onPressed: activeProfile.calendarUrl.isEmpty
                ? null
                : () => _copy(context, activeProfile.calendarUrl, message: 'Booking link copied'),
            icon: const Icon(Icons.calendar_month_outlined),
          ),
          IconButton(
            tooltip: 'Share profile',
            onPressed: () => _copy(context, _buildShareMessage(activeProfile), message: 'Profile snapshot copied'),
            icon: const Icon(Icons.share_outlined),
          ),
          IconButton(
            tooltip: 'Edit in workspace',
            onPressed: () => Navigator.pushNamed(context, '/profile'),
            icon: const Icon(Icons.edit_outlined),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/calendar'),
        icon: const Icon(Icons.event_available_outlined),
        label: const Text('Schedule session'),
      ),
      body: Column(
        children: [
          const SizedBox(height: 16),
          SizedBox(
            height: 260,
            child: PageView.builder(
              controller: _pageController,
              itemCount: profiles.length,
              onPageChanged: (index) {
                setState(() {
                  _currentIndex = index;
                  _targetProfileId = profiles[index].id;
                });
              },
              itemBuilder: (context, index) {
                final profile = profiles[index];
                final isActive = index == _currentIndex;
                return AnimatedScale(
                  duration: const Duration(milliseconds: 280),
                  scale: isActive ? 1.0 : 0.94,
                  child: _ProfilePreviewCard(profile: profile, isActive: isActive),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: _ProfileDetailView(
                key: ValueKey(activeProfile.id),
                profile: activeProfile,
                onBook: () => Navigator.pushNamed(context, '/calendar'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _buildShareMessage(UserProfile profile) {
    final buffer = StringBuffer()
      ..writeln('Profile: ${profile.displayName}')
      ..writeln('Headline: ${profile.headline}')
      ..writeln('Email: ${profile.email}')
      ..writeln('Skills: ${profile.skills.join(', ')}');
    if (profile.calendarUrl.isNotEmpty) {
      buffer.writeln('Calendar: ${profile.calendarUrl}');
    }
    if (profile.portfolioUrl.isNotEmpty) {
      buffer.writeln('Portfolio: ${profile.portfolioUrl}');
    }
    return buffer.toString();
  }

  void _copy(BuildContext context, String value, {String? message}) {
    Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message ?? 'Copied to clipboard')),
    );
  }
}

class _ProfilePreviewCard extends StatelessWidget {
  const _ProfilePreviewCard({required this.profile, required this.isActive});

  final UserProfile profile;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: isActive ? 10 : 2,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(32)),
      child: Stack(
        children: [
          Ink.image(
            image: NetworkImage(profile.bannerUrl),
            fit: BoxFit.cover,
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.1),
                    Colors.black.withOpacity(0.65),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(
                  radius: 34,
                  backgroundImage: NetworkImage(profile.avatarUrl),
                  backgroundColor: theme.colorScheme.primaryContainer,
                ),
                const SizedBox(height: 12),
                Text(
                  profile.displayName,
                  style: theme.textTheme.titleLarge
                      ?.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  profile.headline,
                  style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white70),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final skill in profile.skills.take(3))
                      Chip(
                        label: Text(skill),
                        backgroundColor: Colors.white.withOpacity(0.15),
                        labelStyle: const TextStyle(color: Colors.white),
                      ),
                    if (profile.skills.length > 3)
                      Chip(
                        label: Text('+${profile.skills.length - 3} more'),
                        backgroundColor: Colors.white.withOpacity(0.15),
                        labelStyle: const TextStyle(color: Colors.white),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileDetailView extends StatelessWidget {
  const _ProfileDetailView({super.key, required this.profile, required this.onBook});

  final UserProfile profile;
  final VoidCallback onBook;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat.yMMM();
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 120),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _DetailSection(
            title: 'Story & positioning',
            child: Text(
              profile.bio.isEmpty
                  ? 'This creator has not published their story yet. Check back soon for an updated narrative.'
                  : profile.bio,
            ),
          ),
          const SizedBox(height: 16),
          _DetailSection(
            title: 'Contact',
            child: Column(
              children: [
                _ContactTile(icon: Icons.email_outlined, label: profile.email),
                _ContactTile(icon: Icons.phone_outlined, label: profile.phone),
                _ContactTile(icon: Icons.place_outlined, label: profile.location),
                if (profile.calendarUrl.isNotEmpty)
                  _ContactTile(
                    icon: Icons.calendar_month_outlined,
                    label: profile.calendarUrl,
                    onTap: onBook,
                  ),
                if (profile.portfolioUrl.isNotEmpty)
                  _ContactTile(
                    icon: Icons.language_outlined,
                    label: profile.portfolioUrl,
                    onTap: () => _copyToClipboard(context, profile.portfolioUrl),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _DetailSection(
            title: 'Skill stack',
            child: profile.skills.isEmpty
                ? const Text('No skills recorded yet.')
                : Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final skill in profile.skills)
                        Chip(
                          label: Text(skill),
                          avatar: const Icon(Icons.local_offer_outlined, size: 16),
                        ),
                    ],
                  ),
          ),
          const SizedBox(height: 16),
          if (profile.videoIntroUrl.isNotEmpty)
            _DetailSection(
              title: 'Video introduction',
              child: InkWell(
                onTap: () => _copyToClipboard(context, profile.videoIntroUrl),
                borderRadius: BorderRadius.circular(24),
                child: Ink(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    gradient: LinearGradient(
                      colors: [
                        Theme.of(context).colorScheme.primary.withOpacity(0.15),
                        Theme.of(context).colorScheme.primary.withOpacity(0.05),
                      ],
                    ),
                  ),
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        child: const Icon(Icons.play_arrow, color: Colors.white),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          profile.videoIntroUrl,
                          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.primary),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const Icon(Icons.copy),
                    ],
                  ),
                ),
              ),
            ),
          if (profile.videoIntroUrl.isNotEmpty) const SizedBox(height: 16),
          _DetailSection(
            title: 'Experience timeline',
            child: profile.experiences.isEmpty
                ? const Text('No experience added yet. Tap edit in the workspace to add engagements.')
                : Column(
                    children: [
                      for (final experience in profile.experiences)
                        _TimelineTile(
                          title: experience.role,
                          subtitle: experience.organisation,
                          description: experience.highlights.isEmpty
                              ? null
                              : experience.highlights.join('\n'),
                          trailing: experience.isCurrent
                              ? 'Present'
                              : experience.endDate == null
                                  ? 'Present'
                                  : dateFormat.format(experience.endDate!),
                          leading: dateFormat.format(experience.startDate),
                        ),
                    ],
                  ),
          ),
          const SizedBox(height: 16),
          _DetailSection(
            title: 'Education & credentials',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (profile.education.isEmpty)
                  const Text('No education history recorded.')
                else
                  ...profile.education.map(
                    (education) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _TimelineTile(
                        title: education.institution,
                        subtitle: education.fieldOfStudy,
                        leading: dateFormat.format(education.startDate),
                        trailing: education.endDate == null
                            ? 'Present'
                            : dateFormat.format(education.endDate!),
                        description: education.achievements.join(', '),
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                if (profile.certifications.isNotEmpty)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final certification in profile.certifications)
                        _StatChip(
                          icon: Icons.workspace_premium_outlined,
                          label: certification.name,
                          tooltip: certification.credentialUrl,
                          onTap: certification.credentialUrl == null
                              ? null
                              : () => _copyToClipboard(context, certification.credentialUrl!),
                        ),
                    ],
                  )
                else
                  const _EmptyBadge(label: 'No certifications yet'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _DetailSection(
            title: 'Social channels',
            child: profile.socialLinks.isEmpty
                ? const Text('No public links shared yet.')
                : Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      for (final link in profile.socialLinks)
                        ActionChip(
                          label: Text(link.platform),
                          avatar: const Icon(Icons.open_in_new_outlined),
                          onPressed: () => _copyToClipboard(context, link.url),
                        ),
                    ],
                  ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onBook,
            icon: const Icon(Icons.calendar_today_outlined),
            label: const Text('Book a session'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => Navigator.pushNamed(context, '/profile'),
            icon: const Icon(Icons.edit_outlined),
            label: const Text('Edit in workspace'),
          ),
        ],
      ),
    );
  }
}

class _DetailSection extends StatelessWidget {
  const _DetailSection({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style:
                  Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _ContactTile extends StatelessWidget {
  const _ContactTile({required this.icon, required this.label, this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon),
      title: Text(label),
      trailing: onTap == null ? const Icon(Icons.copy) : const Icon(Icons.launch_outlined),
      onTap: onTap ?? () => _copyToClipboard(context, label),
    );
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({
    required this.title,
    required this.subtitle,
    required this.leading,
    required this.trailing,
    this.description,
  });

  final String title;
  final String subtitle;
  final String leading;
  final String trailing;
  final String? description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final descriptionLines = description
            ?.split('\n')
            .map((line) => line.trim())
            .where((line) => line.isNotEmpty)
            .toList() ??
        const <String>[];
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(leading, style: theme.textTheme.bodySmall),
          const Icon(Icons.more_vert, size: 16),
          Text(trailing, style: theme.textTheme.bodySmall),
        ],
      ),
      title: Text(title),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(subtitle),
          if (descriptionLines.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final line in descriptionLines)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• '),
                          Expanded(child: Text(line)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _EmptyBadge extends StatelessWidget {
  const _EmptyBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: Text(label),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.icon, required this.label, this.tooltip, this.onTap});

  final IconData icon;
  final String label;
  final String? tooltip;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final chip = ActionChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      onPressed: onTap ?? () {},
    );
    if (tooltip == null || tooltip!.isEmpty) {
      return chip;
    }
    return Tooltip(message: tooltip!, child: chip);
  }
}


void _copyToClipboard(BuildContext context, String value) {
  Clipboard.setData(ClipboardData(text: value));
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Copied to clipboard')),
  );
}
