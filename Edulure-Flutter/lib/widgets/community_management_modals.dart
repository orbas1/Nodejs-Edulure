import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/models/community_models.dart';
import '../core/state/community/community_controllers.dart';

Future<void> showCommunityEditor({
  required BuildContext context,
  required WidgetRef ref,
  CommunityModel? community,
  void Function(String message)? onMessage,
}) async {
  final nameController = TextEditingController(text: community?.name ?? '');
  final descriptionController = TextEditingController(text: community?.description ?? '');
  final bannerController = TextEditingController(text: community?.bannerImage ?? '');
  final accentController = TextEditingController(text: community?.accentColor ?? '#EEF2FF');
  final tagsController = TextEditingController(text: community?.tags.join(', ') ?? '');
  final focusController = TextEditingController(text: community?.focusAreas.join(', ') ?? '');
  final locationController = TextEditingController(text: community?.location ?? '');
  final guidelinesController = TextEditingController(
    text: community?.guidelines?.join('\n') ?? 'Lead with generosity\nShare context when requesting feedback',
  );
  bool isPrivate = community?.isPrivate ?? false;
  var currentStep = 0;
  var submitting = false;

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (context) {
      return Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: StatefulBuilder(
          builder: (context, setModalState) {
            List<String> splitCommaSeparated(TextEditingController controller) {
              return controller.text
                  .split(',')
                  .map((tag) => tag.trim())
                  .where((tag) => tag.isNotEmpty)
                  .toList();
            }

            List<String> splitLines(TextEditingController controller) {
              return controller.text
                  .split('
')
                  .map((line) => line.trim())
                  .where((line) => line.isNotEmpty)
                  .toList();
            }

            Color resolveAccentColor() {
              final hex = accentController.text.trim().replaceAll('#', '');
              if (hex.length == 6) {
                final value = int.tryParse(hex, radix: 16);
                if (value != null) {
                  return Color(0xFF000000 | value);
                }
              }
              return Theme.of(context).colorScheme.primary;
            }

            bool validateStep(int step) {
              switch (step) {
                case 0:
                  if (nameController.text.trim().isEmpty) {
                    onMessage?.call('Give your community a memorable name.');
                    return false;
                  }
                  if (descriptionController.text.trim().length < 30) {
                    onMessage?.call('Add a mission statement with at least 30 characters.');
                    return false;
                  }
                  return true;
                case 1:
                  if (bannerController.text.trim().isEmpty) {
                    onMessage?.call('Add a banner image URL so members recognise the space.');
                    return false;
                  }
                  return true;
                case 2:
                  if (splitLines(guidelinesController).isEmpty) {
                    onMessage?.call('Share at least one participation guideline.');
                    return false;
                  }
                  return true;
                default:
                  return true;
              }
            }

            Future<void> handleSubmit() async {
              if (submitting) return;
              if (!validateStep(currentStep)) {
                return;
              }
              final name = nameController.text.trim();
              final description = descriptionController.text.trim();
              final banner = bannerController.text.trim();
              final draft = CommunityDraft(
                name: name,
                description: description,
                bannerImage: banner,
                accentColor: accentController.text.trim().isEmpty ? '#EEF2FF' : accentController.text.trim(),
                tags: splitCommaSeparated(tagsController),
                focusAreas: splitCommaSeparated(focusController),
                location: locationController.text.trim().isEmpty ? null : locationController.text.trim(),
                guidelines: splitLines(guidelinesController),
                isPrivate: isPrivate,
              );
              setModalState(() {
                submitting = true;
              });
              try {
                if (community == null) {
                  await ref.read(communityDirectoryControllerProvider.notifier).createCommunity(draft);
                  onMessage?.call('Community created successfully.');
                } else {
                  await ref.read(communityDirectoryControllerProvider.notifier).updateCommunity(community.id, draft);
                  onMessage?.call('Community details updated.');
                }
                if (Navigator.of(context).canPop()) Navigator.of(context).pop();
              } catch (error) {
                onMessage?.call('Unable to save community: $error');
              } finally {
                setModalState(() {
                  submitting = false;
                });
              }
            }

            StepState stepStateFor(int step) {
              if (currentStep == step) return StepState.editing;
              if (currentStep > step) return StepState.complete;
              return StepState.indexed;
            }

            final steps = <Step>[
              Step(
                state: stepStateFor(0),
                isActive: currentStep >= 0,
                title: const Text('Identity'),
                subtitle: const Text('Clarify who this community is for'),
                content: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Community name', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descriptionController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Mission statement',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile.adaptive(
                      value: isPrivate,
                      title: const Text('Private community'),
                      subtitle: const Text('Only invited members can discover this space'),
                      onChanged: (value) {
                        setModalState(() {
                          isPrivate = value;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: accentController,
                      decoration: const InputDecoration(
                        labelText: 'Accent colour (hex)',
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (_) => setModalState(() {}),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        gradient: LinearGradient(
                          colors: [
                            resolveAccentColor().withOpacity(0.15),
                            resolveAccentColor().withOpacity(0.35),
                          ],
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.palette_rounded, color: resolveAccentColor()),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Preview accent colour',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          Text(
                            accentController.text.isEmpty ? '#EEF2FF' : accentController.text.trim(),
                            style: Theme.of(context).textTheme.bodyMedium,
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              Step(
                state: stepStateFor(1),
                isActive: currentStep >= 1,
                title: const Text('Positioning'),
                subtitle: const Text('Help members find the right rituals'),
                content: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: bannerController,
                      decoration: const InputDecoration(
                        labelText: 'Banner image URL',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: tagsController,
                      decoration: const InputDecoration(
                        labelText: 'Tags (comma separated)',
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (_) => setModalState(() {}),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final tag in splitCommaSeparated(tagsController))
                          Chip(
                            avatar: const Icon(Icons.tag, size: 16),
                            label: Text(tag),
                          ),
                      ],
                    ),
                    if (splitCommaSeparated(tagsController).isEmpty)
                      Text(
                        'Add at least one tag so explorers can filter your community.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: focusController,
                      decoration: const InputDecoration(
                        labelText: 'Focus areas (comma separated)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: locationController,
                      decoration: const InputDecoration(
                        labelText: 'Primary region or location',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
              Step(
                state: stepStateFor(2),
                isActive: currentStep >= 2,
                title: const Text('Guidelines & preview'),
                subtitle: const Text('Give members clarity before they join'),
                content: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: guidelinesController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Participation guidelines (one per line)',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (_) => setModalState(() {}),
                    ),
                    const SizedBox(height: 12),
                    Card(
                      margin: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      clipBehavior: Clip.antiAlias,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (bannerController.text.trim().isNotEmpty)
                            AspectRatio(
                              aspectRatio: 16 / 6,
                              child: Ink.image(
                                image: NetworkImage(bannerController.text.trim()),
                                fit: BoxFit.cover,
                              ),
                            ),
                          Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  nameController.text.trim().isEmpty
                                      ? 'Unnamed community'
                                      : nameController.text.trim(),
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  descriptionController.text.trim(),
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    for (final tag in splitCommaSeparated(tagsController))
                                      Chip(label: Text('#' + tag)),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    for (final guideline in splitLines(guidelinesController))
                                      Chip(
                                        avatar: const Icon(Icons.handshake_outlined, size: 16),
                                        label: Text(guideline),
                                      ),
                                  ],
                                ),
                                if (splitLines(guidelinesController).isEmpty)
                                  Text(
                                    'Share at least one welcome ritual or guideline.',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Icon(
                                      isPrivate ? Icons.lock_outline : Icons.public,
                                      color: Theme.of(context).colorScheme.primary,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(isPrivate ? 'Private community' : 'Open community'),
                                  ],
                                ),
                                if (locationController.text.trim().isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Icon(Icons.location_on_outlined, size: 18),
                                      const SizedBox(width: 8),
                                      Expanded(child: Text(locationController.text.trim())),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ];


            return SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        community == null ? 'Create community' : 'Edit community',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(context).maybePop(),
                      )
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Guide your team through the setup wizard to ensure every section is production ready.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (submitting) ...[
                    const SizedBox(height: 12),
                    const LinearProgressIndicator(),
                  ],
                  const SizedBox(height: 12),
                  Stepper(
                    currentStep: currentStep,
                    physics: const NeverScrollableScrollPhysics(),
                    controlsBuilder: (context, _) {
                      final isLastStep = currentStep == steps.length - 1;
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Row(
                          children: [
                            if (currentStep > 0)
                              TextButton(
                                onPressed: submitting
                                    ? null
                                    : () {
                                        setModalState(() {
                                          currentStep -= 1;
                                        });
                                      },
                                child: const Text('Back'),
                              ),
                            if (currentStep == 0)
                              TextButton(
                                onPressed: submitting ? null : () => Navigator.of(context).maybePop(),
                                child: const Text('Cancel'),
                              ),
                            const Spacer(),
                            FilledButton.icon(
                              icon: Icon(isLastStep ? Icons.rocket_launch_outlined : Icons.arrow_forward_rounded),
                              onPressed: submitting
                                  ? null
                                  : () async {
                                      if (currentStep < steps.length - 1) {
                                        if (!validateStep(currentStep)) return;
                                        setModalState(() {
                                          currentStep += 1;
                                        });
                                      } else {
                                        await handleSubmit();
                                      }
                                    },
                              label: Text(isLastStep ? (community == null ? 'Launch community' : 'Save updates') : 'Continue'),
                            ),
                          ],
                        ),
                      );
                    },
                    onStepTapped: (index) {
                      if (index == currentStep) return;
                      if (index > currentStep && !validateStep(currentStep)) {
                        return;
                      }
                      setModalState(() {
                        currentStep = index;
                      });
                    },
                    steps: steps,
                  ),
                ],
              ),
            );
          },
        ),
      );
    },
  );
}

Future<void> showCommunityEventPlanner({
  required BuildContext context,
  required WidgetRef ref,
  required CommunityModel community,
  CommunityEvent? editing,
  void Function(String message)? onMessage,
}) async {
  final isEditing = editing != null;
  final titleController = TextEditingController(text: editing?.title ?? '');
  final descriptionController = TextEditingController(text: editing?.description ?? '');
  final locationController = TextEditingController(
    text: editing?.location ?? community.location ?? 'Virtual',
  );
  final linkController = TextEditingController(text: editing?.meetingUrl ?? '');
  final coverController = TextEditingController(text: editing?.coverImage ?? '');
  DateTime start = editing?.start ?? DateTime.now().add(const Duration(days: 1));
  DateTime end = editing?.end ?? start.add(const Duration(hours: 1));

  Future<void> pickDate({required bool isStart, required StateSetter setModalState}) async {
    final initial = isStart ? start : end;
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (pickedDate == null) return;
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (pickedTime == null) return;
    setModalState(() {
      final combined = DateTime(
        pickedDate.year,
        pickedDate.month,
        pickedDate.day,
        pickedTime.hour,
        pickedTime.minute,
      );
      if (isStart) {
        start = combined;
        if (!combined.isBefore(end)) {
          end = combined.add(const Duration(hours: 1));
        }
      } else {
        end = combined.isAfter(start) ? combined : start.add(const Duration(hours: 1));
      }
    });
  }

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (context) {
      return Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: StatefulBuilder(
          builder: (context, setModalState) {
            return SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        isEditing
                            ? 'Update ritual for ${community.name}'
                            : 'Schedule event for ${community.name}',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(labelText: 'Event title', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descriptionController,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Event details',
                      alignLabelWithHint: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Starts'),
                          subtitle: Text(DateFormat.yMMMd().add_jm().format(start)),
                          trailing: IconButton(
                            icon: const Icon(Icons.calendar_today_outlined),
                            onPressed: () => pickDate(isStart: true, setModalState: setModalState),
                          ),
                        ),
                      ),
                      Expanded(
                        child: ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Ends'),
                          subtitle: Text(DateFormat.yMMMd().add_jm().format(end)),
                          trailing: IconButton(
                            icon: const Icon(Icons.access_time),
                            onPressed: () => pickDate(isStart: false, setModalState: setModalState),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: locationController,
                    decoration: const InputDecoration(labelText: 'Location', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: linkController,
                    decoration: const InputDecoration(
                      labelText: 'Meeting URL (optional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: coverController,
                    decoration: const InputDecoration(
                      labelText: 'Cover image URL (optional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      icon: Icon(isEditing ? Icons.event_note : Icons.event_available_outlined),
                      onPressed: () async {
                        if (titleController.text.trim().isEmpty) {
                          onMessage?.call('Give the event a clear title.');
                          return;
                        }
                        final draft = CommunityEventDraft(
                          title: titleController.text.trim(),
                          description: descriptionController.text.trim(),
                          start: start,
                          end: end,
                          location: locationController.text.trim().isEmpty
                              ? 'Virtual'
                              : locationController.text.trim(),
                          meetingUrl: linkController.text.trim().isEmpty ? null : linkController.text.trim(),
                          coverImage: coverController.text.trim().isEmpty ? null : coverController.text.trim(),
                        );
                        if (isEditing) {
                          await ref
                              .read(communityDirectoryControllerProvider.notifier)
                              .updateEvent(community.id, editing!.id, draft);
                          onMessage?.call('Event updated for ${community.name}.');
                        } else {
                          await ref.read(communityDirectoryControllerProvider.notifier).addEvent(community.id, draft);
                          onMessage?.call('Event scheduled for ${community.name}.');
                        }
                        if (Navigator.of(context).canPop()) Navigator.of(context).pop();
                      },
                      label: Text(isEditing ? 'Save changes' : 'Schedule event'),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      );
    },
  );
}
Future<void> showCommunityMemberInvite({
  required BuildContext context,
  required WidgetRef ref,
  required CommunityModel community,
  CommunityMember? editing,
  void Function(String message)? onMessage,
}) async {
  final isEditing = editing != null;
  final nameController = TextEditingController(text: editing?.name ?? '');
  final roleController = TextEditingController(text: editing?.role ?? 'Contributor');
  final avatarController = TextEditingController(
    text: editing?.avatarUrl ?? 'https://i.pravatar.cc/150?img=11',
  );
  await showDialog<void>(
    context: context,
    builder: (context) {
      return AlertDialog(
        title: Text(
          isEditing
              ? 'Update member profile'
              : 'Invite member to ${community.name}',
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Full name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: roleController,
              decoration: const InputDecoration(labelText: 'Role or headline'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: avatarController,
              decoration: const InputDecoration(labelText: 'Avatar URL'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).maybePop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) {
                onMessage?.call(isEditing
                    ? 'Member name is required to update their profile.'
                    : 'Add their name to send an invite.');
                return;
              }
              final draft = CommunityMemberDraft(
                name: nameController.text.trim(),
                role: roleController.text.trim().isEmpty
                    ? 'Contributor'
                    : roleController.text.trim(),
                avatarUrl: avatarController.text.trim().isEmpty
                    ? 'https://i.pravatar.cc/150?img=35'
                    : avatarController.text.trim(),
              );
              if (isEditing) {
                await ref
                    .read(communityDirectoryControllerProvider.notifier)
                    .updateMember(community.id, editing!.id, draft);
                onMessage?.call('Member details refreshed.');
              } else {
                await ref
                    .read(communityDirectoryControllerProvider.notifier)
                    .addMember(community.id, draft);
                onMessage?.call('Invitation queued for ${draft.name}.');
              }
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              }
            },
            child: Text(isEditing ? 'Save member' : 'Send invite'),
          )
        ],
      );
    },
  );
}
