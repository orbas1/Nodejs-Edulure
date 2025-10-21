import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';

enum _TutorDirectoryAction { refresh, restoreSeed }

class TutorDirectoryScreen extends ConsumerStatefulWidget {
  const TutorDirectoryScreen({super.key});

  @override
  ConsumerState<TutorDirectoryScreen> createState() => _TutorDirectoryScreenState();
}

class _TutorDirectoryScreenState extends ConsumerState<TutorDirectoryScreen> {
  String _searchTerm = '';
  String _expertiseFilter = 'All specialties';

  @override
  Widget build(BuildContext context) {
    final tutors = ref.watch(tutorStoreProvider);
    final uniqueExpertise = {
      'All specialties',
      for (final tutor in tutors) ...tutor.expertise,
    };

    final filtered = tutors.where((tutor) {
      final matchesSearch = tutor.name.toLowerCase().contains(_searchTerm.toLowerCase()) ||
          tutor.bio.toLowerCase().contains(_searchTerm.toLowerCase()) ||
          tutor.languages.any((language) => language.toLowerCase().contains(_searchTerm.toLowerCase()));
      final matchesExpertise = _expertiseFilter == 'All specialties' || tutor.expertise.contains(_expertiseFilter);
      return matchesSearch && matchesExpertise;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tutor talent directory'),
        actions: [
          IconButton(
            tooltip: 'Invite tutor',
            icon: const Icon(Icons.person_add_alt_1_outlined),
            onPressed: () => _openTutorForm(),
          ),
          PopupMenuButton<_TutorDirectoryAction>(
            tooltip: 'Directory sync options',
            onSelected: _handleDirectoryAction,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: _TutorDirectoryAction.refresh,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.sync, size: 20),
                    SizedBox(width: 12),
                    Text('Reload saved directory'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: _TutorDirectoryAction.restoreSeed,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.restore_outlined, size: 20),
                    SizedBox(width: 12),
                    Text('Restore demo tutors'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText: 'Search tutors by name, bio, or language',
                    labelText: 'Search tutors by name, bio, or language',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onChanged: (value) => setState(() => _searchTerm = value),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    DropdownButton<String>(
                      value: _expertiseFilter,
                      onChanged: (value) => setState(() => _expertiseFilter = value ?? 'All specialties'),
                      items: [
                        for (final item in uniqueExpertise)
                          DropdownMenuItem(
                            value: item,
                            child: Text(item),
                          )
                      ],
                    ),
                    FilledButton.tonalIcon(
                      onPressed: filtered.isEmpty ? null : () => _openBulkMessageDialog(filtered),
                      icon: const Icon(Icons.mail_outline),
                      label: const Text('Message selected'),
                    ),
                  ],
                )
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const _EmptyTutorState()
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final tutor = filtered[index];
                      return _TutorCard(
                        tutor: tutor,
                        onTap: () => _openTutorProfile(tutor),
                        onEdit: () => _openTutorForm(tutor: tutor),
                        onDelete: () => _confirmDelete(tutor),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openTutorForm(),
        label: const Text('Add tutor'),
        icon: const Icon(Icons.add_circle_outline),
      ),
    );
  }

  Future<void> _handleDirectoryAction(_TutorDirectoryAction action) async {
    final notifier = ref.read(tutorStoreProvider.notifier);
    switch (action) {
      case _TutorDirectoryAction.refresh:
        await notifier.refreshFromPersistence();
        if (!mounted) return;
        _notify('Reloaded saved directory');
        break;
      case _TutorDirectoryAction.restoreSeed:
        await notifier.restoreSeedData();
        if (!mounted) return;
        _notify('Restored demo tutors');
        break;
    }
  }

  void _notify(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _openTutorForm({Tutor? tutor}) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _TutorFormSheet(tutor: tutor),
    );
  }

  void _openTutorProfile(Tutor tutor) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return FractionallySizedBox(
          heightFactor: 0.92,
          child: _TutorProfileSheet(tutor: tutor),
        );
      },
    );
  }

  Future<void> _confirmDelete(Tutor tutor) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove tutor'),
        content: Text('Remove ${tutor.name} from the directory?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          )
        ],
      ),
    );

    if (confirmed == true && mounted) {
      ref.read(tutorStoreProvider.notifier).deleteTutor(tutor.id);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${tutor.name} removed')), 
      );
    }
  }

  void _openBulkMessageDialog(List<Tutor> tutors) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Message tutors'),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${tutors.length} tutors will receive this message'),
              const SizedBox(height: 12),
              const TextField(
                decoration: InputDecoration(
                  labelText: 'Subject',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              const TextField(
                minLines: 3,
                maxLines: 6,
                decoration: InputDecoration(
                  labelText: 'Message',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Message queued for ${tutors.length} tutors')),
              );
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }
}

class _TutorCard extends StatelessWidget {
  const _TutorCard({
    required this.tutor,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
  });

  final Tutor tutor;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 3,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundImage: NetworkImage('${tutor.avatarUrl}?auto=format&fit=crop&w=200&q=80'),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tutor.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          tutor.headline,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.blueGrey.shade700,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            for (final expertise in tutor.expertise.take(3)) Chip(label: Text(expertise)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          tutor.bio,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (tutor.certifications.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              for (final credential in tutor.certifications.take(3))
                                Chip(
                                  avatar: const Icon(Icons.verified_outlined, size: 18),
                                  label: Text(credential),
                                ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.star_rate_rounded, color: Colors.amber.shade700),
                            const SizedBox(width: 4),
                            Text(tutor.rating?.toStringAsFixed(1) ?? 'New'),
                            const SizedBox(width: 12),
                            const Icon(Icons.people_outline, size: 20),
                            const SizedBox(width: 4),
                            Text('${tutor.sessionCount} sessions'),
                            const Spacer(),
                            IconButton(onPressed: onEdit, icon: const Icon(Icons.edit_outlined)),
                            IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline)),
                          ],
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TutorProfileSheet extends StatelessWidget {
  const _TutorProfileSheet({required this.tutor});

  final Tutor tutor;

  Future<void> _launchExternal(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link is invalid')),
      );
      return;
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open link')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(tutor.name),
        actions: [
          if ((tutor.introVideoUrl ?? '').isNotEmpty)
            IconButton(
              icon: const Icon(Icons.play_circle_outline),
              tooltip: 'Play intro video',
              onPressed: () => _launchExternal(context, tutor.introVideoUrl!),
            ),
          IconButton(
            icon: const Icon(Icons.event_available_outlined),
            tooltip: 'Book session',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Session booking link copied')), // placeholder action
              );
            },
          )
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 48,
                backgroundImage: NetworkImage('${tutor.avatarUrl}?auto=format&fit=crop&w=280&q=80'),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tutor.name,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tutor.headline,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.blueGrey.shade700,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        for (final expertise in tutor.expertise) Chip(label: Text(expertise)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(tutor.bio, style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      children: [
                        for (final language in tutor.languages)
                          Chip(
                            avatar: const Icon(Icons.language, size: 18),
                            label: Text(language),
                          ),
                      ],
                    ),
                    if (tutor.certifications.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          for (final credential in tutor.certifications)
                            Chip(
                              avatar: const Icon(Icons.workspace_premium_outlined, size: 18),
                              label: Text(credential),
                            ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.star_rate_rounded, color: Colors.amber.shade700),
                        const SizedBox(width: 4),
                        Text(tutor.rating?.toStringAsFixed(1) ?? 'New'),
                        const SizedBox(width: 12),
                        const Icon(Icons.people_outline, size: 20),
                        const SizedBox(width: 4),
                        Text('${tutor.sessionCount} sessions completed'),
                        const SizedBox(width: 12),
                        const Icon(Icons.reviews_outlined, size: 20),
                        const SizedBox(width: 4),
                        Text('${tutor.reviewCount} reviews'),
                      ],
                    ),
                    if ((tutor.introVideoUrl ?? '').isNotEmpty) ...[
                      const SizedBox(height: 12),
                      FilledButton.tonalIcon(
                        onPressed: () => _launchExternal(context, tutor.introVideoUrl!),
                        icon: const Icon(Icons.play_circle_fill_outlined),
                        label: const Text('Watch intro video'),
                      ),
                    ],
                  ],
                ),
              )
            ],
          ),
          const SizedBox(height: 24),
          Text('Availability', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ...tutor.availability.map(
            (slot) => Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              child: ListTile(
                leading: CircleAvatar(
                  child: Text(slot.weekday.substring(0, 2)),
                ),
                title: Text(slot.weekday),
                subtitle: Text('${slot.startTime} - ${slot.endTime}'),
                trailing: FilledButton.tonal(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Requested ${slot.weekday} ${slot.startTime} slot')), 
                    );
                  },
                  child: const Text('Request'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TutorFormSheet extends ConsumerStatefulWidget {
  const _TutorFormSheet({this.tutor});

  final Tutor? tutor;

  @override
  ConsumerState<_TutorFormSheet> createState() => _TutorFormSheetState();
}

class _TutorFormSheetState extends ConsumerState<_TutorFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _headlineController;
  late final TextEditingController _bioController;
  late final TextEditingController _avatarController;
  late final TextEditingController _languagesController;
  late final TextEditingController _expertiseController;
  late final TextEditingController _introVideoController;
  late final TextEditingController _certificationsController;
  double? _rating;
  int _sessionCount = 0;
  int _reviewCount = 0;
  final List<_AvailabilityFormData> _availability = [];

  @override
  void initState() {
    super.initState();
    final tutor = widget.tutor;
    _nameController = TextEditingController(text: tutor?.name ?? '');
    _headlineController = TextEditingController(text: tutor?.headline ?? '');
    _bioController = TextEditingController(text: tutor?.bio ?? '');
    _avatarController = TextEditingController(text: tutor?.avatarUrl ?? '');
    _languagesController = TextEditingController(text: tutor?.languages.join(', ') ?? '');
    _expertiseController = TextEditingController(text: tutor?.expertise.join(', ') ?? '');
    _introVideoController = TextEditingController(text: tutor?.introVideoUrl ?? '');
    _certificationsController = TextEditingController(text: tutor?.certifications.join(', ') ?? '');
    _rating = tutor?.rating;
    _sessionCount = tutor?.sessionCount ?? 0;
    _reviewCount = tutor?.reviewCount ?? 0;
    if (tutor != null) {
      for (final slot in tutor.availability) {
        _availability.add(
          _AvailabilityFormData(
            id: slot.weekday,
            weekdayController: TextEditingController(text: slot.weekday),
            startController: TextEditingController(text: slot.startTime),
            endController: TextEditingController(text: slot.endTime),
          ),
        );
      }
    }
    if (_availability.isEmpty) {
      _addSlot();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _headlineController.dispose();
    _bioController.dispose();
    _avatarController.dispose();
    _languagesController.dispose();
    _expertiseController.dispose();
    _introVideoController.dispose();
    _certificationsController.dispose();
    for (final slot in _availability) {
      slot.dispose();
    }
    super.dispose();
  }

  void _addSlot() {
    setState(() {
      _availability.add(_AvailabilityFormData.newEmpty());
    });
  }

  void _removeSlot(_AvailabilityFormData slot) {
    if (_availability.length <= 1) return;
    setState(() {
      _availability.remove(slot);
      slot.dispose();
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final notifier = ref.read(tutorStoreProvider.notifier);
    final certifications = _certificationsController.text
        .split(',')
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
    final tutor = notifier.buildTutorFromForm(
      id: widget.tutor?.id,
      name: _nameController.text.trim(),
      headline: _headlineController.text.trim().isEmpty ? 'Learning specialist' : _headlineController.text.trim(),
      expertise: _expertiseController.text.split(',').map((item) => item.trim()).where((item) => item.isNotEmpty).toList(),
      bio: _bioController.text.trim(),
      languages: _languagesController.text.split(',').map((item) => item.trim()).where((item) => item.isNotEmpty).toList(),
      avatarUrl: _avatarController.text.trim(),
      availability: _availability
          .map(
            (slot) => TutorAvailability(
              weekday: slot.weekdayController.text.trim().isEmpty ? 'Monday' : slot.weekdayController.text.trim(),
              startTime: slot.startController.text.trim().isEmpty ? '09:00' : slot.startController.text.trim(),
              endTime: slot.endController.text.trim().isEmpty ? '12:00' : slot.endController.text.trim(),
            ),
          )
          .toList(),
      rating: _rating,
      sessionCount: _sessionCount,
      reviewCount: _reviewCount,
      introVideoUrl: _introVideoController.text.trim().isEmpty ? null : _introVideoController.text.trim(),
      certifications: certifications,
    );

    if (widget.tutor == null) {
      notifier.createTutor(tutor);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${tutor.name} added to directory')),
      );
    } else {
      notifier.updateTutor(tutor);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tutor updated')),
      );
    }
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.tutor == null ? 'Invite tutor' : 'Edit tutor profile',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Name'),
                    validator: (value) => value == null || value.isEmpty ? 'Name required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _headlineController,
                    decoration: const InputDecoration(labelText: 'Headline'),
                    validator: (value) => value == null || value.isEmpty ? 'Headline required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _bioController,
                    decoration: const InputDecoration(labelText: 'Bio'),
                    minLines: 3,
                    maxLines: 6,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _avatarController,
                    decoration: const InputDecoration(labelText: 'Avatar URL'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _introVideoController,
                    decoration: const InputDecoration(labelText: 'Intro video URL (optional)'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _languagesController,
                    decoration: const InputDecoration(labelText: 'Languages (comma separated)'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _expertiseController,
                    decoration: const InputDecoration(labelText: 'Expertise (comma separated)'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _certificationsController,
                    decoration: const InputDecoration(labelText: 'Certifications (comma separated)'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          initialValue: _rating?.toString() ?? '',
                          decoration: const InputDecoration(labelText: 'Rating'),
                          keyboardType: TextInputType.number,
                          onChanged: (value) => _rating = double.tryParse(value),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          initialValue: _sessionCount.toString(),
                          decoration: const InputDecoration(labelText: 'Sessions completed'),
                          keyboardType: TextInputType.number,
                          onChanged: (value) => _sessionCount = int.tryParse(value) ?? 0,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          initialValue: _reviewCount.toString(),
                          decoration: const InputDecoration(labelText: 'Reviews'),
                          keyboardType: TextInputType.number,
                          onChanged: (value) => _reviewCount = int.tryParse(value) ?? 0,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Text('Availability', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: _addSlot,
                        icon: const Icon(Icons.add),
                        label: const Text('Add slot'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ..._availability.map(
                    (slot) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          color: Colors.grey.shade50,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: slot.weekdayController,
                                      decoration: const InputDecoration(labelText: 'Weekday'),
                                    ),
                                  ),
                                  IconButton(onPressed: () => _removeSlot(slot), icon: const Icon(Icons.remove_circle_outline)),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: slot.startController,
                                      decoration: const InputDecoration(labelText: 'Start time'),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: TextFormField(
                                      controller: slot.endController,
                                      decoration: const InputDecoration(labelText: 'End time'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: _submit,
                      child: Text(widget.tutor == null ? 'Add tutor' : 'Save changes'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AvailabilityFormData {
  _AvailabilityFormData({
    required this.id,
    required this.weekdayController,
    required this.startController,
    required this.endController,
  });

  factory _AvailabilityFormData.newEmpty() {
    return _AvailabilityFormData(
      id: UniqueKey().toString(),
      weekdayController: TextEditingController(text: 'Monday'),
      startController: TextEditingController(text: '09:00'),
      endController: TextEditingController(text: '11:00'),
    );
  }

  final String id;
  final TextEditingController weekdayController;
  final TextEditingController startController;
  final TextEditingController endController;

  void dispose() {
    weekdayController.dispose();
    startController.dispose();
    endController.dispose();
  }
}

class _EmptyTutorState extends StatelessWidget {
  const _EmptyTutorState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.school_outlined, size: 64, color: Colors.blueGrey),
          SizedBox(height: 16),
          Text('No tutors listed'),
          SizedBox(height: 8),
          Text('Invite your first tutor to begin onboarding learners.'),
        ],
      ),
    );
  }
}
