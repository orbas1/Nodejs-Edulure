import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/provider_transition/provider_transition_controller.dart';
import '../core/provider_transition/provider_transition_models.dart';

class ProviderTransitionCenterScreen extends ConsumerWidget {
  const ProviderTransitionCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcementsAsync = ref.watch(providerTransitionAnnouncementsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Provider transition hub'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(providerTransitionAnnouncementsProvider.notifier).refresh(forceNetwork: true);
            },
          ),
        ],
      ),
      body: announcementsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorState(error: error),
        data: (state) => _AnnouncementList(state: state),
      ),
    );
  }
}

class _AnnouncementList extends ConsumerWidget {
  const _AnnouncementList({required this.state});

  final ProviderTransitionAnnouncementsState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return RefreshIndicator(
      onRefresh: () => ref.read(providerTransitionAnnouncementsProvider.notifier).refresh(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        itemCount: state.announcements.length + (state.offlineFallback ? 1 : 0),
        itemBuilder: (context, index) {
          if (state.offlineFallback && index == 0) {
            return const _OfflineBanner();
          }
          final bundleIndex = state.offlineFallback ? index - 1 : index;
          final bundle = state.announcements[bundleIndex];
          return _AnnouncementCard(bundle: bundle);
        },
      ),
    );
  }
}

class _AnnouncementCard extends ConsumerWidget {
  const _AnnouncementCard({required this.bundle});

  final ProviderTransitionAnnouncementBundle bundle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final announcement = bundle.announcement;
    final deadline = announcement.ackDeadline;
    final ackRequired = announcement.ackRequired;
    final latestStatus = bundle.latestStatus;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 12),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        announcement.title,
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        announcement.summary,
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Chip(
                      avatar: const Icon(Icons.people_outline, size: 18),
                      label: Text('${bundle.acknowledgementTotal} acknowledgements'),
                    ),
                    if (latestStatus != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Chip(
                          avatar: const Icon(Icons.flag_outlined, size: 18),
                          label: Text('Latest status: ${latestStatus.statusCode}'),
                        ),
                      ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (announcement.bodyMarkdown.trim().isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceVariant.withOpacity(0.35),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: MarkdownBody(
                  data: announcement.bodyMarkdown,
                  shrinkWrap: true,
                  styleSheet: MarkdownStyleSheet.fromTheme(theme).copyWith(
                    h1: theme.textTheme.titleLarge,
                    h2: theme.textTheme.titleMedium,
                    p: theme.textTheme.bodyMedium,
                  ),
                ),
              ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ElevatedButton.icon(
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Acknowledge readiness'),
                  onPressed: () => _showAcknowledgementSheet(context, ref, bundle),
                ),
                OutlinedButton.icon(
                  icon: const Icon(Icons.update),
                  label: const Text('Record status update'),
                  onPressed: () => _showStatusSheet(context, ref, bundle),
                ),
                if (deadline != null && ackRequired)
                  Chip(
                    avatar: const Icon(Icons.schedule, size: 18),
                    label: Text('Ack by ${MaterialLocalizations.of(context).formatShortDate(deadline)}'),
                  ),
                if (bundle.offlineSource)
                  const Chip(
                    avatar: Icon(Icons.cloud_off, size: 18),
                    label: Text('Offline snapshot'),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            if (bundle.timeline.isNotEmpty)
              _TimelineSection(entries: bundle.timeline),
            if (bundle.resources.isNotEmpty) ...[
              const SizedBox(height: 16),
              _ResourceSection(resources: bundle.resources),
            ],
          ],
        ),
      ),
    );
  }
}

class _TimelineSection extends StatelessWidget {
  const _TimelineSection({required this.entries});

  final List<ProviderTransitionTimelineEntry> entries;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Milestones', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        ...entries.map((entry) {
          return ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.event_available_outlined),
                Text(
                  MaterialLocalizations.of(context).formatShortDate(entry.occursOn),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
            title: Text(entry.headline, style: theme.textTheme.titleSmall),
            subtitle: MarkdownBody(
              data: entry.detailsMarkdown,
              styleSheet: MarkdownStyleSheet.fromTheme(theme).copyWith(p: theme.textTheme.bodySmall),
            ),
            trailing: entry.ctaUrl != null
                ? IconButton(
                    tooltip: entry.ctaLabel ?? 'Open resource',
                    icon: const Icon(Icons.open_in_new),
                    onPressed: () => _launchUrl(entry.ctaUrl!),
                  )
                : null,
          );
        }).toList(),
      ],
    );
  }
}

class _ResourceSection extends StatelessWidget {
  const _ResourceSection({required this.resources});

  final List<ProviderTransitionResource> resources;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Resources', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: resources.map((resource) {
            return ActionChip(
              avatar: const Icon(Icons.description_outlined),
              label: Text(resource.label),
              onPressed: () => _launchUrl(resource.url),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _OfflineBanner extends StatelessWidget {
  const _OfflineBanner();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.cloud_off, color: colorScheme.onErrorContainer),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Showing the latest cached snapshot. Some actions may be unavailable offline.',
              style: TextStyle(color: colorScheme.onErrorContainer),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48),
            const SizedBox(height: 16),
            Text(
              'Unable to load provider transition updates. ${error.toString()}',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _launchUrl(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) {
    return;
  }
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    debugPrint('Failed to launch $url');
  }
}

Future<void> _showAcknowledgementSheet(
  BuildContext context,
  WidgetRef ref,
  ProviderTransitionAnnouncementBundle bundle,
) async {
  final formKey = GlobalKey<FormState>();
  final organisationController = TextEditingController();
  final contactNameController = TextEditingController();
  final contactEmailController = TextEditingController();
  final followUpNotesController = TextEditingController();
  String ackMethod = 'portal';
  bool followUpRequired = false;
  bool submitting = false;

  try {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
      final bottomInset = MediaQuery.of(context).viewInsets.bottom;
      return Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> submit() async {
              if (!formKey.currentState!.validate()) {
                return;
              }
              setSheetState(() => submitting = true);
              try {
                await ref.read(providerTransitionAnnouncementsProvider.notifier).acknowledge(
                      bundle.announcement.slug,
                      ProviderTransitionAcknowledgementRequest(
                        organisationName: organisationController.text.trim(),
                        contactName: contactNameController.text.trim(),
                        contactEmail: contactEmailController.text.trim(),
                        ackMethod: ackMethod,
                        followUpRequired: followUpRequired,
                        followUpNotes: followUpNotesController.text.trim().isEmpty
                            ? null
                            : followUpNotesController.text.trim(),
                        metadata: bundle.announcement.metadata,
                      ),
                    );
                if (context.mounted) {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Acknowledgement recorded successfully.')),
                  );
                }
              } catch (error) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Unable to record acknowledgement: $error')),
                  );
                }
              } finally {
                if (context.mounted) {
                  setSheetState(() => submitting = false);
                }
              }
            }

            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Confirm readiness for ${bundle.announcement.title}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      controller: organisationController,
                      decoration: const InputDecoration(labelText: 'Organisation name'),
                      validator: (value) => value == null || value.trim().isEmpty
                          ? 'Enter the organisation name'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: contactNameController,
                      decoration: const InputDecoration(labelText: 'Contact name'),
                      validator: (value) => value == null || value.trim().isEmpty
                          ? 'Enter your name'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: contactEmailController,
                      decoration: const InputDecoration(labelText: 'Contact email'),
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Enter a contact email';
                        }
                        if (!value.contains('@')) {
                          return 'Enter a valid email address';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: ackMethod,
                      decoration: const InputDecoration(labelText: 'Acknowledgement method'),
                      items: const [
                        DropdownMenuItem(value: 'portal', child: Text('Portal confirmation')),
                        DropdownMenuItem(value: 'email', child: Text('Email confirmation')),
                        DropdownMenuItem(value: 'webinar', child: Text('Webinar session')),
                        DropdownMenuItem(value: 'support', child: Text('Support ticket')),
                      ],
                      onChanged: submitting
                          ? null
                          : (value) {
                              if (value != null) {
                                setSheetState(() => ackMethod = value);
                              }
                            },
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      value: followUpRequired,
                      title: const Text('Follow-up required'),
                      onChanged: submitting
                          ? null
                          : (value) {
                              setSheetState(() => followUpRequired = value);
                            },
                    ),
                    if (followUpRequired)
                      TextFormField(
                        controller: followUpNotesController,
                        decoration: const InputDecoration(labelText: 'Follow-up notes'),
                        minLines: 2,
                        maxLines: 4,
                      ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton(
                            onPressed: submitting ? null : submit,
                            child: submitting
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('Submit acknowledgement'),
                          ),
                        ),
                      ],
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
  } finally {
    organisationController.dispose();
    contactNameController.dispose();
    contactEmailController.dispose();
    followUpNotesController.dispose();
  }
}

Future<void> _showStatusSheet(
  BuildContext context,
  WidgetRef ref,
  ProviderTransitionAnnouncementBundle bundle,
) async {
  final formKey = GlobalKey<FormState>();
  final providerReferenceController = TextEditingController();
  final notesController = TextEditingController();
  String statusCode = 'not-started';
  bool submitting = false;

  try {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
      final bottomInset = MediaQuery.of(context).viewInsets.bottom;
      return Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> submit() async {
              if (!formKey.currentState!.validate()) {
                return;
              }
              setSheetState(() => submitting = true);
              try {
                await ref.read(providerTransitionAnnouncementsProvider.notifier).recordStatus(
                      bundle.announcement.slug,
                      statusCode: statusCode,
                      providerReference: providerReferenceController.text.trim().isEmpty
                          ? null
                          : providerReferenceController.text.trim(),
                      notes: notesController.text.trim().isEmpty
                          ? null
                          : notesController.text.trim(),
                    );
                if (context.mounted) {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Status update recorded.')),
                  );
                }
              } catch (error) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Unable to record status update: $error')),
                  );
                }
              } finally {
                if (context.mounted) {
                  setSheetState(() => submitting = false);
                }
              }
            }

            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Update progress for ${bundle.announcement.title}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 20),
                    DropdownButtonFormField<String>(
                      value: statusCode,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem(value: 'not-started', child: Text('Not started')),
                        DropdownMenuItem(value: 'migration-in-progress', child: Text('Migration in progress')),
                        DropdownMenuItem(value: 'testing', child: Text('Testing / validation')),
                        DropdownMenuItem(value: 'blocked', child: Text('Blocked')),
                        DropdownMenuItem(value: 'completed', child: Text('Completed')),
                        DropdownMenuItem(value: 'deferred', child: Text('Deferred')),
                      ],
                      onChanged: submitting
                          ? null
                          : (value) {
                              if (value != null) {
                                setSheetState(() => statusCode = value);
                              }
                            },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: providerReferenceController,
                      decoration: const InputDecoration(
                        labelText: 'Provider reference (optional)',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: notesController,
                      minLines: 2,
                      maxLines: 4,
                      decoration: const InputDecoration(labelText: 'Notes (optional)'),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton(
                            onPressed: submitting ? null : submit,
                            child: submitting
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('Record status'),
                          ),
                        ),
                      ],
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
  } finally {
    providerReferenceController.dispose();
    notesController.dispose();
  }
}
