
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/community/community_hub_controller.dart';
import '../provider/profile/user_profile_controller.dart';
import '../services/community_hub_models.dart';
import '../services/user_profile_repository.dart';
import '../widgets/profile/profile_creation_wizard.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(userProfileControllerProvider.notifier).bootstrap();
      await ref.read(communityHubControllerProvider.notifier).bootstrap();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(userProfileControllerProvider);
    final controller = ref.read(userProfileControllerProvider.notifier);

    if (state.snapshot.activeProfileId == null && state.snapshot.profiles.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        controller.selectProfile(state.snapshot.profiles.first.id);
      });
    }

    final activeProfile = state.activeProfile ??
        (state.snapshot.profiles.isNotEmpty ? state.snapshot.profiles.first : null);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Profile workspace'),
          actions: [
            IconButton(
              tooltip: 'Refresh data',
              onPressed: state.loading ? null : controller.refresh,
              icon: const Icon(Icons.refresh_rounded),
            ),
            IconButton(
              tooltip: 'Create profile',
              onPressed: () => _openProfileCreator(context),
              icon: const Icon(Icons.person_add_alt_1_outlined),
            ),
            if (activeProfile != null)
              PopupMenuButton<String>(
                tooltip: 'More actions',
                onSelected: (value) async {
                  if (value == 'duplicate') {
                    await _duplicateProfile(activeProfile);
                  } else if (value == 'delete') {
                    await controller.deleteProfile(activeProfile.id);
                  }
                },
                itemBuilder: (context) => const [
                  PopupMenuItem(
                    value: 'duplicate',
                    child: Text('Duplicate profile'),
                  ),
                  PopupMenuItem(
                    value: 'delete',
                    child: Text('Delete profile'),
                  ),
                ],
              ),
          ],
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Overview'),
              Tab(text: 'Experience'),
              Tab(text: 'Credentials'),
            ],
          ),
        ),
        floatingActionButton: activeProfile == null
            ? null
            : FloatingActionButton.extended(
                heroTag: 'profile_quick_add',
                onPressed: () => _openQuickAddMenu(context, activeProfile.id),
                icon: const Icon(Icons.add),
                label: const Text('Quick add'),
              ),
        body: Stack(
          children: [
            if (state.loading && activeProfile == null)
              const Center(child: CircularProgressIndicator())
            else if (state.snapshot.profiles.isEmpty)
              _EmptyState(onCreate: () => _openProfileCreator(context))
            else
              TabBarView(
                children: [
                  _OverviewTab(profileId: activeProfile!.id),
                  _ExperienceTab(profileId: activeProfile.id),
                  _CredentialsTab(profileId: activeProfile.id),
                ],
              ),
            if (state.saving)
              const Positioned(
                left: 0,
                right: 0,
                top: 0,
                child: LinearProgressIndicator(minHeight: 3),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _duplicateProfile(UserProfile profile) async {
    final controller = ref.read(userProfileControllerProvider.notifier);
    await controller.createProfile(
      displayName: '${profile.displayName} (Copy)',
      headline: profile.headline,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
      bio: profile.bio,
      videoIntroUrl: profile.videoIntroUrl,
      calendarUrl: profile.calendarUrl,
      portfolioUrl: profile.portfolioUrl,
      skills: profile.skills,
    );
    final newProfile = controller.state.activeProfile;
    if (newProfile == null) {
      return;
    }
    for (final experience in profile.experiences) {
      await controller.addExperience(
        profileId: newProfile.id,
        role: experience.role,
        organisation: experience.organisation,
        startDate: experience.startDate,
        endDate: experience.endDate,
        isCurrent: experience.isCurrent,
        location: experience.location,
        highlights: experience.highlights,
      );
    }
    for (final education in profile.education) {
      await controller.addEducation(
        profileId: newProfile.id,
        institution: education.institution,
        fieldOfStudy: education.fieldOfStudy,
        startDate: education.startDate,
        endDate: education.endDate,
        achievements: education.achievements,
      );
    }
    for (final certification in profile.certifications) {
      await controller.addCertification(
        profileId: newProfile.id,
        name: certification.name,
        organisation: certification.organisation,
        issuedOn: certification.issuedOn,
        credentialUrl: certification.credentialUrl,
      );
    }
    for (final link in profile.socialLinks) {
      await controller.upsertSocialLink(
        profileId: newProfile.id,
        platform: link.platform,
        url: link.url,
      );
    }
  }

  Future<void> _openQuickAddMenu(BuildContext context, String profileId) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ListTile(
                leading: const Icon(Icons.work_outline),
                title: const Text('Experience'),
                subtitle: const Text('Add a new role or engagement milestone'),
                onTap: () async {
                  Navigator.pop(context);
                  await _openExperienceComposer(profileId: profileId);
                },
              ),
              ListTile(
                leading: const Icon(Icons.school_outlined),
                title: const Text('Education'),
                subtitle: const Text('Track academic or bootcamp history'),
                onTap: () async {
                  Navigator.pop(context);
                  await _openEducationComposer(profileId: profileId);
                },
              ),
              ListTile(
                leading: const Icon(Icons.workspace_premium_outlined),
                title: const Text('Certification'),
                subtitle: const Text('Add accreditation or license details'),
                onTap: () async {
                  Navigator.pop(context);
                  await _openCertificationComposer(profileId: profileId);
                },
              ),
              ListTile(
                leading: const Icon(Icons.share_outlined),
                title: const Text('Social link'),
                subtitle: const Text('Attach community or content channels'),
                onTap: () async {
                  Navigator.pop(context);
                  await _openSocialLinkComposer(profileId: profileId);
                },
              ),
              ListTile(
                leading: const Icon(Icons.local_offer_outlined),
                title: const Text('Skill'),
                subtitle: const Text('Tag your capabilities for discovery'),
                onTap: () async {
                  Navigator.pop(context);
                  await _openSkillComposer(profileId);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openProfileCreator(BuildContext context) async {
    final controller = ref.read(userProfileControllerProvider.notifier);
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return ProfileCreationWizard(
          onSubmit: (payload) async {
            await controller.createProfile(
              displayName: payload.displayName,
              headline: payload.headline,
              email: payload.email,
              phone: payload.phone,
              location: payload.location,
              avatarUrl: payload.avatarUrl,
              bannerUrl: payload.bannerUrl,
              bio: payload.bio,
              videoIntroUrl: payload.videoIntroUrl,
              calendarUrl: payload.calendarUrl,
              portfolioUrl: payload.portfolioUrl,
              skills: payload.skills,
            );
          },
        );
      },
    );
    if (created == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile created successfully')),
      );
    }
  }

  Future<void> _openProfileEditor(UserProfile profile) async {
    final controller = ref.read(userProfileControllerProvider.notifier);
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 24,
            right: 24,
            top: 12,
          ),
          child: _ProfileForm(
            initial: profile,
            onSubmit: (payload) async {
              final updated = profile.copyWith(
                displayName: payload.displayName,
                headline: payload.headline,
                email: payload.email,
                phone: payload.phone,
                location: payload.location,
                avatarUrl: payload.avatarUrl,
                bannerUrl: payload.bannerUrl,
                bio: payload.bio,
                videoIntroUrl: payload.videoIntroUrl,
                calendarUrl: payload.calendarUrl,
                portfolioUrl: payload.portfolioUrl,
                skills: payload.skills,
              );
              await controller.updateProfile(updated);
            },
          ),
        );
      },
    );
    if (saved == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated')),
      );
    }
  }

  Future<void> _openSkillComposer(String profileId) async {
    final controller = ref.read(userProfileControllerProvider.notifier);
    final value = await showDialog<String>(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Add a skill tag'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              labelText: 'Skill name',
              hintText: 'e.g. Lifecycle automation',
            ),
            autofocus: true,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Add')),
          ],
        );
      },
    );
    if (value != null && value.isNotEmpty) {
      await controller.upsertSkill(profileId, value);
    }
  }

  Future<void> _openExperienceComposer({required String profileId, UserExperience? initial}) async {
    final controller = ref.read(userProfileControllerProvider.notifier);
    final payload = await showModalBottomSheet<_ExperiencePayload>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 24,
            right: 24,
            top: 12,
          ),
          child: _ExperienceForm(initial: initial),
        );
      },
    );
    if (payload == null) {
      return;
    }
    if (initial == null) {
      await controller.addExperience(
        profileId: profileId,
        role: payload.role,
        organisation: payload.organisation,
        startDate: payload.startDate,
        endDate: payload.isCurrent ? null : payload.endDate,
        isCurrent: payload.isCurrent,
        location: payload.location,
        highlights: payload.highlights,
      );
    } else {
      final updated = initial.copyWith(
        role: payload.role,
        organisation: payload.organisation,
        startDate: payload.startDate,
        endDate: payload.isCurrent ? null : payload.endDate,
        isCurrent: payload.isCurrent,
        location: payload.location,
        highlights: payload.highlights,
      );
      await controller.updateExperience(profileId, updated);
    }
  }

  Future<void> _openEducationComposer({required String profileId, UserEducation? initial}) async {
    final controller = ref.read(userProfileControllerProvider.notifier);
    final payload = await showModalBottomSheet<_EducationPayload>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 24,
            right: 24,
            top: 12,
          ),
          child: _EducationForm(initial: initial),
        );
      },
    );
    if (payload == null) {
      return;
    }
    if (initial == null) {
      await controller.addEducation(
        profileId: profileId,
        institution: payload.institution,
        fieldOfStudy: payload.fieldOfStudy,
        startDate: payload.startDate,
        endDate: payload.endDate,
        achievements: payload.achievements,
      );
    } else {
      final updated = initial.copyWith(
        institution: payload.institution,
        fieldOfStudy: payload.fieldOfStudy,
        startDate: payload.startDate,
        endDate: payload.endDate,
        achievements: payload.achievements,
      );
      await controller.updateEducation(profileId, updated);
    }
  }

  Future<void> _openCertificationComposer({
    required String profileId,
    UserCertification? initial,
  }) async {
    final controller = ref.read(userProfileControllerProvider.notifier);
    final payload = await showModalBottomSheet<_CertificationPayload>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 24,
            right: 24,
            top: 12,
          ),
          child: _CertificationForm(initial: initial),
        );
      },
    );
    if (payload == null) {
      return;
    }
    if (initial == null) {
      await controller.addCertification(
        profileId: profileId,
        name: payload.name,
        organisation: payload.organisation,
        issuedOn: payload.issuedOn,
        credentialUrl: payload.credentialUrl,
      );
    } else {
      final updated = initial.copyWith(
        name: payload.name,
        organisation: payload.organisation,
        issuedOn: payload.issuedOn,
        credentialUrl: payload.credentialUrl,
      );
      await controller.updateCertification(profileId, updated);
    }
  }

  Future<void> _openSocialLinkComposer(String profileId, {UserSocialLink? initial}) async {
    final controller = ref.read(userProfileControllerProvider.notifier);
    final payload = await showModalBottomSheet<_SocialLinkPayload>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 24,
            right: 24,
            top: 12,
          ),
          child: _SocialLinkForm(initial: initial),
        );
      },
    );
    if (payload == null) {
      return;
    }
    await controller.upsertSocialLink(
      profileId: profileId,
      platform: payload.platform,
      url: payload.url,
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab({required this.profileId});

  final String profileId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(userProfileControllerProvider);
    final profile = state.snapshot.profiles.firstWhere((item) => item.id == profileId);
    final communityState = ref.watch(communityHubControllerProvider);
    final controller = ref.read(userProfileControllerProvider.notifier);
    final events = communityState.snapshot.calendarEntries
        .where((entry) => entry.startTime.isAfter(DateTime.now().subtract(const Duration(hours: 12))))
        .toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    final previewEvents = events.take(3).toList();

    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 120),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          _ProfileHero(profile: profile, onEdit: () => _openHeroEditor(context, profile)),
          const SizedBox(height: 20),
          _ProfileSelector(profileId: profileId),
          const SizedBox(height: 20),
          _SectionCard(
            title: 'Bio & story',
            trailing: IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Edit bio',
              onPressed: () => _openHeroEditor(context, profile, focusBio: true),
            ),
            child: Text(
              profile.bio.isEmpty
                  ? 'Introduce your workstyle, specialisms, and the transformations you lead.'
                  : profile.bio,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Contact & availability',
            child: Column(
              children: [
                _InfoTile(
                  icon: Icons.email_outlined,
                  label: profile.email,
                  subtitle: 'Email',
                  onTap: () => _copyToClipboard(context, profile.email),
                ),
                const Divider(height: 1),
                _InfoTile(
                  icon: Icons.phone_outlined,
                  label: profile.phone,
                  subtitle: 'Phone',
                  onTap: () => _copyToClipboard(context, profile.phone),
                ),
                const Divider(height: 1),
                _InfoTile(
                  icon: Icons.location_on_outlined,
                  label: profile.location,
                  subtitle: 'Timezone & location',
                  onTap: () => _copyToClipboard(context, profile.location),
                ),
                const Divider(height: 1),
                _InfoTile(
                  icon: Icons.calendar_month_outlined,
                  label: profile.calendarUrl.isEmpty ? 'No booking calendar added' : profile.calendarUrl,
                  subtitle: 'Booking calendar',
                  onTap: profile.calendarUrl.isEmpty
                      ? null
                      : () => _copyToClipboard(context, profile.calendarUrl),
                ),
                const Divider(height: 1),
                _InfoTile(
                  icon: Icons.language_outlined,
                  label: profile.portfolioUrl.isEmpty ? 'Add a portfolio link' : profile.portfolioUrl,
                  subtitle: 'Portfolio',
                  onTap:
                      profile.portfolioUrl.isEmpty ? null : () => _copyToClipboard(context, profile.portfolioUrl),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Skill stack',
            trailing: IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: 'Add skill',
              onPressed: () => _openSkillComposer(context, profileId),
            ),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final skill in profile.skills)
                  InputChip(
                    label: Text(skill),
                    avatar: const Icon(Icons.star_rate_rounded, size: 18),
                    onDeleted: () => ref.read(userProfileControllerProvider.notifier).removeSkill(profileId, skill),
                  ),
                if (profile.skills.isEmpty)
                  const Text('Tag your expertise so the right members can discover you.'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Social channels',
            trailing: IconButton(
              icon: const Icon(Icons.add_link),
              tooltip: 'Add social link',
              onPressed: () => _openSocialLinkComposer(context, profileId),
            ),
            child: Column(
              children: [
                for (final link in profile.socialLinks)
                  Column(
                    children: [
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.open_in_new_outlined),
                        title: Text(link.platform),
                        subtitle: Text(link.url),
                        trailing: PopupMenuButton<String>(
                          onSelected: (value) {
                            if (value == 'edit') {
                              _openSocialLinkComposer(context, profileId, initial: link);
                            } else if (value == 'delete') {
                              ref
                                  .read(userProfileControllerProvider.notifier)
                                  .deleteSocialLink(profileId, link.platform);
                            }
                          },
                          itemBuilder: (context) => const [
                            PopupMenuItem(value: 'edit', child: Text('Edit')),
                            PopupMenuItem(value: 'delete', child: Text('Remove')),
                          ],
                        ),
                        onTap: () => _copyToClipboard(context, link.url),
                      ),
                      if (link != profile.socialLinks.last) const Divider(height: 1),
                    ],
                  ),
                if (profile.socialLinks.isEmpty)
                  const ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.info_outline),
                    title: Text('No social links yet'),
                    subtitle: Text('Add your communities, newsletters, and portfolios for learners to explore.'),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Upcoming engagements',
            trailing: TextButton.icon(
              onPressed: () => Navigator.pushNamed(context, '/calendar'),
              icon: const Icon(Icons.launch),
              label: const Text('Open calendar'),
            ),
            child: Column(
              children: [
                if (events.isEmpty)
                  const ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.calendar_today_outlined),
                    title: Text('No scheduled events'),
                    subtitle: Text('Create sessions, office hours, or launches from the calendar workspace.'),
                  )
                else ...List.generate(previewEvents.length, (index) {
                  final entry = previewEvents[index];
                  return Column(
                    children: [
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: const Icon(Icons.event),
                        ),
                        title: Text(entry.title),
                        subtitle: Text('${entry.timelineLabel} • ${entry.location}'),
                        trailing: IconButton(
                          tooltip: 'Edit event',
                          icon: const Icon(Icons.edit_calendar_outlined),
                          onPressed: () async {
                            await Navigator.pushNamed(context, '/calendar', arguments: entry.id);
                          },
                        ),
                      ),
                      if (index < previewEvents.length - 1) const Divider(height: 1),
                    ],
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Media & assets',
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.play_circle_outline),
                  title: const Text('Video introduction'),
                  subtitle: Text(
                    profile.videoIntroUrl.isEmpty
                        ? 'Record or link a welcome video for learners.'
                        : profile.videoIntroUrl,
                  ),
                  onTap: profile.videoIntroUrl.isEmpty
                      ? null
                      : () => _copyToClipboard(context, profile.videoIntroUrl),
                ),
                const Divider(height: 1),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.attach_file_outlined),
                  title: const Text('Media kit prompt'),
                  subtitle: const Text('Upload slides, one-pagers, or intro decks via the content library.'),
                  onTap: () => Navigator.pushNamed(context, '/content'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openHeroEditor(BuildContext context, UserProfile profile, {bool focusBio = false}) async {
    final state = context.findAncestorStateOfType<_ProfileScreenState>();
    await state?._openProfileEditor(profile);
    if (focusBio && state?.mounted == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bio saved successfully')),
      );
    }
  }

  Future<void> _openSkillComposer(BuildContext context, String profileId) async {
    final state = context.findAncestorStateOfType<_ProfileScreenState>();
    await state?._openSkillComposer(profileId);
  }

  Future<void> _openSocialLinkComposer(BuildContext context, String profileId, {UserSocialLink? initial}) async {
    final state = context.findAncestorStateOfType<_ProfileScreenState>();
    await state?._openSocialLinkComposer(profileId, initial: initial);
  }
}

class _ExperienceTab extends ConsumerWidget {
  const _ExperienceTab({required this.profileId});

  final String profileId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(userProfileControllerProvider);
    final profile = state.snapshot.profiles.firstWhere((item) => item.id == profileId);
    final controller = context.findAncestorStateOfType<_ProfileScreenState>();
    return RefreshIndicator(
      onRefresh: ref.read(userProfileControllerProvider.notifier).refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 120),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          _ProfileHero(profile: profile, onEdit: () => controller?._openProfileEditor(profile)),
          const SizedBox(height: 20),
          _ProfileSelector(profileId: profileId),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Experience timeline', style: Theme.of(context).textTheme.titleMedium),
              OutlinedButton.icon(
                onPressed: () => controller?._openExperienceComposer(profileId: profileId),
                icon: const Icon(Icons.add),
                label: const Text('Add experience'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (profile.experiences.isEmpty)
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              child: const Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'No experience recorded yet. Track client work, volunteer leadership, or consulting engagements.',
                ),
              ),
            )
          else
            for (final experience in profile.experiences)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _ExperienceCard(
                  experience: experience,
                  onEdit: () => controller?._openExperienceComposer(
                    profileId: profileId,
                    initial: experience,
                  ),
                  onDelete: () => ref
                      .read(userProfileControllerProvider.notifier)
                      .deleteExperience(profileId, experience.id),
                ),
              ),
        ],
      ),
    );
  }
}

class _CredentialsTab extends ConsumerWidget {
  const _CredentialsTab({required this.profileId});

  final String profileId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(userProfileControllerProvider);
    final profile = state.snapshot.profiles.firstWhere((item) => item.id == profileId);
    final controller = context.findAncestorStateOfType<_ProfileScreenState>();
    final notifier = ref.read(userProfileControllerProvider.notifier);
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 120),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          _ProfileHero(profile: profile, onEdit: () => controller?._openProfileEditor(profile)),
          const SizedBox(height: 20),
          _ProfileSelector(profileId: profileId),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Education', style: Theme.of(context).textTheme.titleMedium),
              OutlinedButton.icon(
                onPressed: () => controller?._openEducationComposer(profileId: profileId),
                icon: const Icon(Icons.add),
                label: const Text('Add education'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (profile.education.isEmpty)
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              child: const Padding(
                padding: EdgeInsets.all(24),
                child: Text('Document university, bootcamps, or certifications that shaped your expertise.'),
              ),
            )
          else
            for (final education in profile.education)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _EducationCard(
                  education: education,
                  onEdit: () => controller?._openEducationComposer(
                    profileId: profileId,
                    initial: education,
                  ),
                  onDelete: () => notifier.deleteEducation(profileId, education.id),
                ),
              ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Certifications', style: Theme.of(context).textTheme.titleMedium),
              OutlinedButton.icon(
                onPressed: () => controller?._openCertificationComposer(profileId: profileId),
                icon: const Icon(Icons.add),
                label: const Text('Add certification'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (profile.certifications.isEmpty)
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              child: const Padding(
                padding: EdgeInsets.all(24),
                child: Text('Add badges, licenses, and credentials members can trust.'),
              ),
            )
          else
            for (final certification in profile.certifications)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _CertificationCard(
                  certification: certification,
                  onEdit: () => controller?._openCertificationComposer(
                    profileId: profileId,
                    initial: certification,
                  ),
                  onDelete: () => notifier.deleteCertification(profileId, certification.id),
                ),
              ),
        ],
      ),
    );
  }
}

class _ProfileHero extends StatelessWidget {
  const _ProfileHero({required this.profile, required this.onEdit});

  final UserProfile profile;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(32)),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          SizedBox(
            height: 200,
            child: Ink.image(
              image: NetworkImage(profile.bannerUrl),
              fit: BoxFit.cover,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.05),
                      Colors.black.withOpacity(0.45),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: Align(
              alignment: Alignment.bottomLeft,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    CircleAvatar(
                      radius: 38,
                      backgroundImage: NetworkImage(profile.avatarUrl),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            profile.displayName,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            profile.headline,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(color: Colors.white.withOpacity(0.9)),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 12,
                            runSpacing: 8,
                            children: [
                              FilledButton.tonal(
                                onPressed: onEdit,
                                child: const Text('Edit profile'),
                              ),
                              OutlinedButton(
                                onPressed: () => Navigator.pushNamed(context, '/profile/viewer', arguments: profile.id),
                                style: OutlinedButton.styleFrom(foregroundColor: Colors.white),
                                child: const Text('Preview profile'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileSelector extends ConsumerWidget {
  const _ProfileSelector({required this.profileId});

  final String profileId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(userProfileControllerProvider);
    final controller = ref.read(userProfileControllerProvider.notifier);
    return Align(
      alignment: Alignment.centerLeft,
      child: DropdownButton<String>(
        value: profileId,
        items: [
          for (final profile in state.snapshot.profiles)
            DropdownMenuItem(value: profile.id, child: Text(profile.displayName)),
        ],
        onChanged: (value) {
          if (value != null) {
            controller.selectProfile(value);
          }
        },
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child, this.trailing});

  final String title;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon),
      title: Text(label),
      subtitle: Text(subtitle),
      trailing: onTap == null ? null : const Icon(Icons.copy),
      onTap: onTap,
    );
  }
}

class _ExperienceCard extends StatelessWidget {
  const _ExperienceCard({
    required this.experience,
    required this.onEdit,
    required this.onDelete,
  });

  final UserExperience experience;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat.yMMM();
    final window = experience.isCurrent
        ? '${dateFormat.format(experience.startDate)} · Present'
        : '${dateFormat.format(experience.startDate)} · ${experience.endDate == null ? 'Present' : dateFormat.format(experience.endDate!)}';
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  child: const Icon(Icons.work_outline),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        experience.role,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      Text('${experience.organisation} · $window'),
                      if (experience.location.isNotEmpty)
                        Text(experience.location, style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(height: 12),
                      if (experience.highlights.isNotEmpty)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (final highlight in experience.highlights)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('• '),
                                    Expanded(child: Text(highlight)),
                                  ],
                                ),
                              ),
                          ],
                        ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'edit') {
                      onEdit();
                    } else if (value == 'delete') {
                      onDelete();
                    }
                  },
                  itemBuilder: (context) => const [
                    PopupMenuItem(value: 'edit', child: Text('Edit')),
                    PopupMenuItem(value: 'delete', child: Text('Remove')),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EducationCard extends StatelessWidget {
  const _EducationCard({
    required this.education,
    required this.onEdit,
    required this.onDelete,
  });

  final UserEducation education;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat.yMMM();
    final range = education.endDate == null
        ? '${dateFormat.format(education.startDate)} · Present'
        : '${dateFormat.format(education.startDate)} · ${dateFormat.format(education.endDate!)}';
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                  child: const Icon(Icons.school_outlined),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        education.institution,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      Text(education.fieldOfStudy),
                      Text(range, style: Theme.of(context).textTheme.bodySmall),
                      if (education.achievements.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final achievement in education.achievements)
                              Chip(label: Text(achievement)),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'edit') {
                      onEdit();
                    } else if (value == 'delete') {
                      onDelete();
                    }
                  },
                  itemBuilder: (context) => const [
                    PopupMenuItem(value: 'edit', child: Text('Edit')),
                    PopupMenuItem(value: 'delete', child: Text('Remove')),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CertificationCard extends StatelessWidget {
  const _CertificationCard({
    required this.certification,
    required this.onEdit,
    required this.onDelete,
  });

  final UserCertification certification;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.tertiaryContainer,
              child: const Icon(Icons.workspace_premium_outlined),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    certification.name,
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  Text(certification.organisation),
                  Text('Issued ${certification.issuedOn}', style: Theme.of(context).textTheme.bodySmall),
                  if (certification.credentialUrl != null && certification.credentialUrl!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: GestureDetector(
                        onTap: () => _copyToClipboard(context, certification.credentialUrl!),
                        child: Text(
                          certification.credentialUrl!,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: Theme.of(context).colorScheme.primary),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'edit') {
                  onEdit();
                } else if (value == 'delete') {
                  onDelete();
                }
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'edit', child: Text('Edit')),
                PopupMenuItem(value: 'delete', child: Text('Remove')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.person_outline, size: 64),
            const SizedBox(height: 16),
            Text(
              'Set up your first profile',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text(
              'Craft an interactive profile with your story, credentials, and booking links.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.person_add_alt),
              label: const Text('Create profile'),
            ),
          ],
        ),
      ),
    );
  }
}


class _ProfileForm extends StatefulWidget {
  const _ProfileForm({required this.onSubmit, this.initial});

  final UserProfile? initial;
  final Future<void> Function(ProfileFormData payload) onSubmit;

  @override
  State<_ProfileForm> createState() => _ProfileFormState();
}

class _ProfileFormState extends State<_ProfileForm> {
  late final TextEditingController _nameController;
  late final TextEditingController _headlineController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _locationController;
  late final TextEditingController _avatarController;
  late final TextEditingController _bannerController;
  late final TextEditingController _bioController;
  late final TextEditingController _videoController;
  late final TextEditingController _calendarController;
  late final TextEditingController _portfolioController;
  late final TextEditingController _skillsController;
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _nameController = TextEditingController(text: initial?.displayName ?? '');
    _headlineController = TextEditingController(text: initial?.headline ?? '');
    _emailController = TextEditingController(text: initial?.email ?? '');
    _phoneController = TextEditingController(text: initial?.phone ?? '');
    _locationController = TextEditingController(text: initial?.location ?? '');
    _avatarController = TextEditingController(text: initial?.avatarUrl ?? '');
    _bannerController = TextEditingController(text: initial?.bannerUrl ?? '');
    _bioController = TextEditingController(text: initial?.bio ?? '');
    _videoController = TextEditingController(text: initial?.videoIntroUrl ?? '');
    _calendarController = TextEditingController(text: initial?.calendarUrl ?? '');
    _portfolioController = TextEditingController(text: initial?.portfolioUrl ?? '');
    _skillsController = TextEditingController(text: initial?.skills.join(', ') ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _headlineController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _locationController.dispose();
    _avatarController.dispose();
    _bannerController.dispose();
    _bioController.dispose();
    _videoController.dispose();
    _calendarController.dispose();
    _portfolioController.dispose();
    _skillsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  widget.initial == null ? 'Create profile' : 'Update profile',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                if (_saving) ...[
                  const SizedBox(width: 12),
                  const CircularProgressIndicator(strokeWidth: 2.5),
                ],
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Display name'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter a name' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _headlineController,
              decoration: const InputDecoration(labelText: 'Headline'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter a headline' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _bioController,
              decoration: const InputDecoration(labelText: 'Bio', alignLabelWithHint: true),
              maxLines: 4,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter an email' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: 'Phone'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter a phone number' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _locationController,
              decoration: const InputDecoration(labelText: 'Location / timezone'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter a location' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _avatarController,
              decoration: const InputDecoration(labelText: 'Avatar image URL'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Provide an avatar URL' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _bannerController,
              decoration: const InputDecoration(labelText: 'Banner image URL'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Provide a banner URL' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _videoController,
              decoration: const InputDecoration(labelText: 'Video intro URL'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _calendarController,
              decoration: const InputDecoration(labelText: 'Booking calendar URL'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _portfolioController,
              decoration: const InputDecoration(labelText: 'Portfolio URL'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _skillsController,
              decoration: const InputDecoration(
                labelText: 'Skills',
                helperText: 'Comma separated list, e.g. Revenue Ops, Facilitation',
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _saving ? null : () => Navigator.pop(context, false),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 12),
                FilledButton(
                  onPressed: _saving ? null : _submit,
                  child: Text(widget.initial == null ? 'Create' : 'Save'),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    setState(() => _saving = true);
    final payload = ProfileFormData(
      displayName: _nameController.text.trim(),
      headline: _headlineController.text.trim(),
      email: _emailController.text.trim(),
      phone: _phoneController.text.trim(),
      location: _locationController.text.trim(),
      avatarUrl: _avatarController.text.trim(),
      bannerUrl: _bannerController.text.trim(),
      bio: _bioController.text.trim(),
      videoIntroUrl: _videoController.text.trim(),
      calendarUrl: _calendarController.text.trim(),
      portfolioUrl: _portfolioController.text.trim(),
      skills: _skillsController.text
          .split(',')
          .map((skill) => skill.trim())
          .where((skill) => skill.isNotEmpty)
          .toList(),
    );
    await widget.onSubmit(payload);
    if (mounted) {
      setState(() => _saving = false);
      Navigator.pop(context, true);
    }
  }
}

class _ExperiencePayload {
  _ExperiencePayload({
    required this.role,
    required this.organisation,
    required this.startDate,
    required this.endDate,
    required this.isCurrent,
    required this.location,
    required this.highlights,
  });

  final String role;
  final String organisation;
  final DateTime startDate;
  final DateTime? endDate;
  final bool isCurrent;
  final String location;
  final List<String> highlights;
}

class _ExperienceForm extends StatefulWidget {
  const _ExperienceForm({this.initial});

  final UserExperience? initial;

  @override
  State<_ExperienceForm> createState() => _ExperienceFormState();
}

class _ExperienceFormState extends State<_ExperienceForm> {
  late final TextEditingController _roleController;
  late final TextEditingController _organisationController;
  late final TextEditingController _locationController;
  late final TextEditingController _highlightsController;
  final _formKey = GlobalKey<FormState>();
  late DateTime _startDate;
  DateTime? _endDate;
  bool _isCurrent = false;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _roleController = TextEditingController(text: initial?.role ?? '');
    _organisationController = TextEditingController(text: initial?.organisation ?? '');
    _locationController = TextEditingController(text: initial?.location ?? '');
    _highlightsController = TextEditingController(
      text: initial?.highlights.join('\n') ?? '',
    );
    _startDate = initial?.startDate ?? DateTime.now();
    _endDate = initial?.endDate;
    _isCurrent = initial?.isCurrent ?? false;
  }

  @override
  void dispose() {
    _roleController.dispose();
    _organisationController.dispose();
    _locationController.dispose();
    _highlightsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat.yMMMMd();
    return SingleChildScrollView(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.initial == null ? 'Add experience' : 'Update experience',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _roleController,
              decoration: const InputDecoration(labelText: 'Role / title'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter the role' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _organisationController,
              decoration: const InputDecoration(labelText: 'Organisation'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter the organisation' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _locationController,
              decoration: const InputDecoration(labelText: 'Location'),
            ),
            const SizedBox(height: 12),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              value: _isCurrent,
              onChanged: (value) => setState(() => _isCurrent = value),
              title: const Text('Currently active'),
              subtitle: const Text('Toggle if this engagement is ongoing'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _DateField(
                    label: 'Start date',
                    value: dateFormat.format(_startDate),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _startDate,
                        firstDate: DateTime(1995),
                        lastDate: DateTime(2100),
                      );
                      if (picked != null) {
                        setState(() => _startDate = picked);
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DateField(
                    label: 'End date',
                    value: _isCurrent
                        ? 'Present'
                        : (_endDate == null ? 'Select date' : dateFormat.format(_endDate!)),
                    enabled: !_isCurrent,
                    onTap: () async {
                      if (_isCurrent) return;
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _endDate ?? DateTime.now(),
                        firstDate: DateTime(1995),
                        lastDate: DateTime(2100),
                      );
                      if (picked != null) {
                        setState(() => _endDate = picked);
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _highlightsController,
              decoration: const InputDecoration(
                labelText: 'Highlights',
                helperText: 'Each line becomes a bullet point',
                alignLabelWithHint: true,
              ),
              maxLines: 5,
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 12),
                FilledButton(
                  onPressed: _submit,
                  child: Text(widget.initial == null ? 'Add experience' : 'Save changes'),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final payload = _ExperiencePayload(
      role: _roleController.text.trim(),
      organisation: _organisationController.text.trim(),
      startDate: _startDate,
      endDate: _endDate,
      isCurrent: _isCurrent,
      location: _locationController.text.trim(),
      highlights: _highlightsController.text
          .split('\n')
          .map((value) => value.trim())
          .where((value) => value.isNotEmpty)
          .toList(),
    );
    Navigator.pop(context, payload);
  }
}

class _EducationPayload {
  _EducationPayload({
    required this.institution,
    required this.fieldOfStudy,
    required this.startDate,
    required this.endDate,
    required this.achievements,
  });

  final String institution;
  final String fieldOfStudy;
  final DateTime startDate;
  final DateTime? endDate;
  final List<String> achievements;
}

class _EducationForm extends StatefulWidget {
  const _EducationForm({this.initial});

  final UserEducation? initial;

  @override
  State<_EducationForm> createState() => _EducationFormState();
}

class _EducationFormState extends State<_EducationForm> {
  late final TextEditingController _institutionController;
  late final TextEditingController _fieldController;
  late final TextEditingController _achievementsController;
  late DateTime _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _institutionController = TextEditingController(text: initial?.institution ?? '');
    _fieldController = TextEditingController(text: initial?.fieldOfStudy ?? '');
    _achievementsController = TextEditingController(
      text: initial?.achievements.join('\n') ?? '',
    );
    _startDate = initial?.startDate ?? DateTime.now();
    _endDate = initial?.endDate;
  }

  @override
  void dispose() {
    _institutionController.dispose();
    _fieldController.dispose();
    _achievementsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat.yMMMMd();
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.initial == null ? 'Add education' : 'Update education',
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _institutionController,
            decoration: const InputDecoration(labelText: 'Institution'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _fieldController,
            decoration: const InputDecoration(labelText: 'Field of study'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _DateField(
                  label: 'Start date',
                  value: dateFormat.format(_startDate),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _startDate,
                      firstDate: DateTime(1990),
                      lastDate: DateTime(2100),
                    );
                    if (picked != null) {
                      setState(() => _startDate = picked);
                    }
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _DateField(
                  label: 'End date',
                  value: _endDate == null ? 'Select date' : dateFormat.format(_endDate!),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _endDate ?? DateTime.now(),
                      firstDate: DateTime(1990),
                      lastDate: DateTime(2100),
                    );
                    if (picked != null) {
                      setState(() => _endDate = picked);
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _achievementsController,
            decoration: const InputDecoration(
              labelText: 'Achievements',
              helperText: 'Each line becomes a chip',
              alignLabelWithHint: true,
            ),
            maxLines: 4,
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: () {
                  final payload = _EducationPayload(
                    institution: _institutionController.text.trim(),
                    fieldOfStudy: _fieldController.text.trim(),
                    startDate: _startDate,
                    endDate: _endDate,
                    achievements: _achievementsController.text
                        .split('\n')
                        .map((value) => value.trim())
                        .where((value) => value.isNotEmpty)
                        .toList(),
                  );
                  Navigator.pop(context, payload);
                },
                child: Text(widget.initial == null ? 'Add education' : 'Save changes'),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

class _CertificationPayload {
  _CertificationPayload({
    required this.name,
    required this.organisation,
    required this.issuedOn,
    required this.credentialUrl,
  });

  final String name;
  final String organisation;
  final String issuedOn;
  final String credentialUrl;
}

class _CertificationForm extends StatefulWidget {
  const _CertificationForm({this.initial});

  final UserCertification? initial;

  @override
  State<_CertificationForm> createState() => _CertificationFormState();
}

class _CertificationFormState extends State<_CertificationForm> {
  late final TextEditingController _nameController;
  late final TextEditingController _organisationController;
  late final TextEditingController _issuedController;
  late final TextEditingController _credentialController;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _nameController = TextEditingController(text: initial?.name ?? '');
    _organisationController = TextEditingController(text: initial?.organisation ?? '');
    _issuedController = TextEditingController(text: initial?.issuedOn ?? '');
    _credentialController = TextEditingController(text: initial?.credentialUrl ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _organisationController.dispose();
    _issuedController.dispose();
    _credentialController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.initial == null ? 'Add certification' : 'Update certification',
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Certification name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _organisationController,
            decoration: const InputDecoration(labelText: 'Issuing organisation'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _issuedController,
            decoration: const InputDecoration(labelText: 'Issued (year or date)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _credentialController,
            decoration: const InputDecoration(labelText: 'Credential URL'),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: () {
                  final payload = _CertificationPayload(
                    name: _nameController.text.trim(),
                    organisation: _organisationController.text.trim(),
                    issuedOn: _issuedController.text.trim(),
                    credentialUrl: _credentialController.text.trim(),
                  );
                  Navigator.pop(context, payload);
                },
                child: Text(widget.initial == null ? 'Add certification' : 'Save changes'),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

class _SocialLinkPayload {
  _SocialLinkPayload({required this.platform, required this.url});

  final String platform;
  final String url;
}

class _SocialLinkForm extends StatefulWidget {
  const _SocialLinkForm({this.initial});

  final UserSocialLink? initial;

  @override
  State<_SocialLinkForm> createState() => _SocialLinkFormState();
}

class _SocialLinkFormState extends State<_SocialLinkForm> {
  late final TextEditingController _platformController;
  late final TextEditingController _urlController;

  @override
  void initState() {
    super.initState();
    _platformController = TextEditingController(text: widget.initial?.platform ?? '');
    _urlController = TextEditingController(text: widget.initial?.url ?? '');
  }

  @override
  void dispose() {
    _platformController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.initial == null ? 'Add social link' : 'Update social link',
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _platformController,
            decoration: const InputDecoration(labelText: 'Platform'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _urlController,
            decoration: const InputDecoration(labelText: 'URL'),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: () {
                  final payload = _SocialLinkPayload(
                    platform: _platformController.text.trim(),
                    url: _urlController.text.trim(),
                  );
                  Navigator.pop(context, payload);
                },
                child: Text(widget.initial == null ? 'Add link' : 'Save changes'),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    this.onTap,
    this.enabled = true,
  });

  final String label;
  final String value;
  final VoidCallback? onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          enabled: enabled,
        ),
        child: Text(value),
      ),
    );
  }
}

void _copyToClipboard(BuildContext context, String value) {
  Clipboard.setData(ClipboardData(text: value));
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Copied to clipboard')),
  );
}
