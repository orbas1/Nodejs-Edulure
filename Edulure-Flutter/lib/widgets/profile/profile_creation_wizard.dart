import 'package:flutter/material.dart';

import '../../services/user_profile_repository.dart';

/// Immutable data collected from the profile creation wizard.
class ProfileFormData {
  const ProfileFormData({
    required this.displayName,
    required this.headline,
    required this.bio,
    required this.email,
    required this.phone,
    required this.location,
    required this.avatarUrl,
    required this.bannerUrl,
    required this.videoIntroUrl,
    required this.calendarUrl,
    required this.portfolioUrl,
    required this.skills,
  });

  final String displayName;
  final String headline;
  final String bio;
  final String email;
  final String phone;
  final String location;
  final String avatarUrl;
  final String bannerUrl;
  final String videoIntroUrl;
  final String calendarUrl;
  final String portfolioUrl;
  final List<String> skills;
}

/// Guided, multi-step onboarding experience for creating a new profile.
class ProfileCreationWizard extends StatefulWidget {
  const ProfileCreationWizard({
    super.key,
    required this.onSubmit,
    this.initial,
  });

  final Future<void> Function(ProfileFormData data) onSubmit;
  final UserProfile? initial;

  @override
  State<ProfileCreationWizard> createState() => _ProfileCreationWizardState();
}

class _ProfileCreationWizardState extends State<ProfileCreationWizard> {
  static const _totalSteps = 4;
  static const _skillSuggestions = <String>[
    'Curriculum Design',
    'Community Ops',
    'Growth Strategy',
    'Learning Facilitation',
    'Product Coaching',
  ];

  final _formKeys = List.generate(3, (_) => GlobalKey<FormState>());
  final _scrollController = ScrollController();

  late final TextEditingController _nameController;
  late final TextEditingController _headlineController;
  late final TextEditingController _bioController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _locationController;
  late final TextEditingController _avatarController;
  late final TextEditingController _bannerController;
  late final TextEditingController _videoController;
  late final TextEditingController _calendarController;
  late final TextEditingController _portfolioController;
  final TextEditingController _skillController = TextEditingController();
  final FocusNode _skillFocusNode = FocusNode();

  late List<String> _skills;
  int _currentStep = 0;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _nameController = TextEditingController(text: initial?.displayName ?? '');
    _headlineController = TextEditingController(text: initial?.headline ?? '');
    _bioController = TextEditingController(text: initial?.bio ?? '');
    _emailController = TextEditingController(text: initial?.email ?? '');
    _phoneController = TextEditingController(text: initial?.phone ?? '');
    _locationController = TextEditingController(text: initial?.location ?? '');
    _avatarController = TextEditingController(text: initial?.avatarUrl ?? '');
    _bannerController = TextEditingController(text: initial?.bannerUrl ?? '');
    _videoController = TextEditingController(text: initial?.videoIntroUrl ?? '');
    _calendarController = TextEditingController(text: initial?.calendarUrl ?? '');
    _portfolioController = TextEditingController(text: initial?.portfolioUrl ?? '');
    _skills = List.of(initial?.skills ?? const <String>[]);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _nameController.dispose();
    _headlineController.dispose();
    _bioController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _locationController.dispose();
    _avatarController.dispose();
    _bannerController.dispose();
    _videoController.dispose();
    _calendarController.dispose();
    _portfolioController.dispose();
    _skillController.dispose();
    _skillFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final progress = (_currentStep + 1) / _totalSteps;
    final stepContent = _buildStepContent(context);
    final needsForm = _currentStep < _formKeys.length;
    Widget content = SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: stepContent,
    );
    if (needsForm) {
      content = Form(key: _formKeys[_currentStep], child: content);
    }

    return FractionallySizedBox(
      heightFactor: 0.92,
      child: SafeArea(
        child: AnimatedPadding(
          duration: const Duration(milliseconds: 200),
          padding: EdgeInsets.only(bottom: mediaQuery.viewInsets.bottom),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Profile setup wizard',
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 12),
                        if (_saving)
                          const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Create a polished profile with guided steps. You can fine tune details later from the workspace.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 16),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 6,
                        backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text('Step ${_currentStep + 1} of $_totalSteps',
                        style: Theme.of(context).textTheme.labelMedium),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: content,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
                child: _WizardControls(
                  canGoBack: _currentStep > 0,
                  isSaving: _saving,
                  primaryLabel: _currentStep == _totalSteps - 1 ? 'Create profile' : 'Continue',
                  secondaryLabel: _currentStep == 0 ? 'Cancel' : 'Back',
                  onBack: _saving
                      ? null
                      : () {
                          if (_currentStep == 0) {
                            Navigator.pop(context, false);
                          } else {
                            _goToStep(_currentStep - 1);
                          }
                        },
                  onContinue: _saving
                      ? null
                      : () {
                          FocusScope.of(context).unfocus();
                          if (_currentStep == _totalSteps - 1) {
                            _submit();
                          } else if (_currentStep < _formKeys.length) {
                            final form = _formKeys[_currentStep].currentState;
                            if (form != null && form.validate()) {
                              _goToStep(_currentStep + 1);
                            }
                          } else {
                            _goToStep(_currentStep + 1);
                          }
                        },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _goToStep(int step) {
    setState(() => _currentStep = step);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Widget _buildStepContent(BuildContext context) {
    switch (_currentStep) {
      case 0:
        return _IdentityStep(
          nameController: _nameController,
          headlineController: _headlineController,
          bioController: _bioController,
        );
      case 1:
        return _ContactStep(
          emailController: _emailController,
          phoneController: _phoneController,
          locationController: _locationController,
        );
      case 2:
        return _MediaStep(
          avatarController: _avatarController,
          bannerController: _bannerController,
          videoController: _videoController,
          calendarController: _calendarController,
          portfolioController: _portfolioController,
          skillController: _skillController,
          skillFocusNode: _skillFocusNode,
          skills: _skills,
          onSkillAdded: _addSkill,
          onSkillRemoved: _removeSkill,
          suggestedSkills: _skillSuggestions,
        );
      default:
        return _ReviewStep(
          name: _nameController.text.trim(),
          headline: _headlineController.text.trim(),
          bio: _bioController.text.trim(),
          email: _emailController.text.trim(),
          phone: _phoneController.text.trim(),
          location: _locationController.text.trim(),
          avatarUrl: _avatarController.text.trim(),
          bannerUrl: _bannerController.text.trim(),
          videoUrl: _videoController.text.trim(),
          calendarUrl: _calendarController.text.trim(),
          portfolioUrl: _portfolioController.text.trim(),
          skills: _skills,
        );
    }
  }

  void _addSkill(String raw) {
    final value = raw.trim();
    if (value.isEmpty) {
      _skillController.clear();
      return;
    }
    final exists = _skills.any((skill) => skill.toLowerCase() == value.toLowerCase());
    if (exists) {
      _skillController.clear();
      return;
    }
    setState(() {
      _skills = [..._skills, value];
      _skillController.clear();
    });
  }

  void _removeSkill(String skill) {
    setState(() {
      _skills = _skills.where((item) => item != skill).toList();
    });
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    final payload = ProfileFormData(
      displayName: _nameController.text.trim(),
      headline: _headlineController.text.trim(),
      bio: _bioController.text.trim(),
      email: _emailController.text.trim(),
      phone: _phoneController.text.trim(),
      location: _locationController.text.trim(),
      avatarUrl: _avatarController.text.trim(),
      bannerUrl: _bannerController.text.trim(),
      videoIntroUrl: _videoController.text.trim(),
      calendarUrl: _calendarController.text.trim(),
      portfolioUrl: _portfolioController.text.trim(),
      skills: _skills,
    );
    try {
      await widget.onSubmit(payload);
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to save profile: $error')),
      );
    }
  }
}

class _IdentityStep extends StatelessWidget {
  const _IdentityStep({
    required this.nameController,
    required this.headlineController,
    required this.bioController,
  });

  final TextEditingController nameController;
  final TextEditingController headlineController;
  final TextEditingController bioController;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tell us about you',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('wizard_display_name'),
          controller: nameController,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            labelText: 'Display name',
            hintText: 'e.g. Alex Morgan',
          ),
          validator: (value) =>
              value == null || value.trim().isEmpty ? 'Enter a display name' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('wizard_headline'),
          controller: headlineController,
          decoration: const InputDecoration(
            labelText: 'Headline',
            hintText: 'e.g. Founder · Growth Operator',
          ),
          validator: (value) => value == null || value.trim().isEmpty ? 'Enter a headline' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: bioController,
          decoration: const InputDecoration(
            labelText: 'Signature story',
            helperText: 'Share your approach, wins, and how you help learners succeed.',
            alignLabelWithHint: true,
          ),
          maxLines: 5,
        ),
      ],
    );
  }
}

class _ContactStep extends StatelessWidget {
  const _ContactStep({
    required this.emailController,
    required this.phoneController,
    required this.locationController,
  });

  final TextEditingController emailController;
  final TextEditingController phoneController;
  final TextEditingController locationController;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('How can people reach you?', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('wizard_email'),
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email'),
          validator: (value) => value == null || value.trim().isEmpty ? 'Enter an email address' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('wizard_phone'),
          controller: phoneController,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Phone number'),
          validator: (value) => value == null || value.trim().isEmpty ? 'Enter a phone number' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('wizard_location'),
          controller: locationController,
          decoration: const InputDecoration(labelText: 'Location & timezone'),
          validator: (value) => value == null || value.trim().isEmpty ? 'Add your location' : null,
        ),
      ],
    );
  }
}

class _MediaStep extends StatelessWidget {
  const _MediaStep({
    required this.avatarController,
    required this.bannerController,
    required this.videoController,
    required this.calendarController,
    required this.portfolioController,
    required this.skillController,
    required this.skillFocusNode,
    required this.skills,
    required this.onSkillAdded,
    required this.onSkillRemoved,
    required this.suggestedSkills,
  });

  final TextEditingController avatarController;
  final TextEditingController bannerController;
  final TextEditingController videoController;
  final TextEditingController calendarController;
  final TextEditingController portfolioController;
  final TextEditingController skillController;
  final FocusNode skillFocusNode;
  final List<String> skills;
  final ValueChanged<String> onSkillAdded;
  final ValueChanged<String> onSkillRemoved;
  final List<String> suggestedSkills;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Bring your profile to life', style: theme.textTheme.titleMedium),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('wizard_avatar'),
          controller: avatarController,
          decoration: const InputDecoration(labelText: 'Avatar image URL'),
          validator: (value) =>
              value == null || value.trim().isEmpty ? 'Provide an avatar image URL' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('wizard_banner'),
          controller: bannerController,
          decoration: const InputDecoration(labelText: 'Banner image URL'),
          validator: (value) =>
              value == null || value.trim().isEmpty ? 'Provide a banner image URL' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: videoController,
          decoration: const InputDecoration(
            labelText: 'Video intro URL',
            helperText: 'Share a welcome video or keynote replay.',
          ),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: calendarController,
          decoration: const InputDecoration(
            labelText: 'Booking calendar URL',
            helperText: 'Link to Calendly, Cal.com, or your scheduling hub.',
          ),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: portfolioController,
          decoration: const InputDecoration(labelText: 'Portfolio or website URL'),
        ),
        const SizedBox(height: 16),
        Text('Skills & focus areas', style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                key: const ValueKey('wizard_skill_input'),
                controller: skillController,
                focusNode: skillFocusNode,
                decoration: const InputDecoration(hintText: 'Add a skill'),
                onSubmitted: onSkillAdded,
              ),
            ),
            const SizedBox(width: 12),
            IconButton.filled(
              key: const ValueKey('wizard_skill_add'),
              onPressed: () => onSkillAdded(skillController.text),
              icon: const Icon(Icons.add),
              tooltip: 'Add skill',
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final skill in skills)
              InputChip(
                key: ValueKey('wizard_skill_$skill'),
                label: Text(skill),
                onDeleted: () => onSkillRemoved(skill),
              ),
            if (skills.isEmpty)
              const Text('No skills yet. Add at least one to highlight your expertise.'),
          ],
        ),
        const SizedBox(height: 12),
        Text('Suggestions', style: theme.textTheme.labelMedium),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final suggestion in suggestedSkills)
              ActionChip(
                label: Text(suggestion),
                onPressed: () => onSkillAdded(suggestion),
              ),
          ],
        ),
      ],
    );
  }
}

class _ReviewStep extends StatelessWidget {
  const _ReviewStep({
    required this.name,
    required this.headline,
    required this.bio,
    required this.email,
    required this.phone,
    required this.location,
    required this.avatarUrl,
    required this.bannerUrl,
    required this.videoUrl,
    required this.calendarUrl,
    required this.portfolioUrl,
    required this.skills,
  });

  final String name;
  final String headline;
  final String bio;
  final String email;
  final String phone;
  final String location;
  final String avatarUrl;
  final String bannerUrl;
  final String videoUrl;
  final String calendarUrl;
  final String portfolioUrl;
  final List<String> skills;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Review & confirm', style: theme.textTheme.titleMedium),
        const SizedBox(height: 12),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _BannerPreview(bannerUrl: bannerUrl),
              ListTile(
                leading: _AvatarPreview(url: avatarUrl),
                title: Text(name.isEmpty ? 'Profile' : name),
                subtitle: Text(headline.isEmpty ? 'Add a headline' : headline),
              ),
              if (bio.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Text(bio),
                ),
              const Divider(height: 1),
              _SummaryTile(icon: Icons.email_outlined, label: email),
              _SummaryTile(icon: Icons.phone_outlined, label: phone),
              _SummaryTile(icon: Icons.public_outlined, label: location),
              if (calendarUrl.isNotEmpty)
                _SummaryTile(icon: Icons.calendar_month_outlined, label: calendarUrl),
              if (portfolioUrl.isNotEmpty)
                _SummaryTile(icon: Icons.link_outlined, label: portfolioUrl),
              if (videoUrl.isNotEmpty)
                _SummaryTile(icon: Icons.play_circle_outline, label: videoUrl),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Skill stack', style: theme.textTheme.titleSmall),
                    const SizedBox(height: 8),
                    if (skills.isEmpty)
                      Text(
                        'No skills added yet. Tap back to include the capabilities you want to highlight.',
                        style: theme.textTheme.bodySmall,
                      )
                    else
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final skill in skills)
                            Chip(label: Text(skill)),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    if (label.isEmpty) {
      return const SizedBox.shrink();
    }
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
    );
  }
}

class _BannerPreview extends StatelessWidget {
  const _BannerPreview({required this.bannerUrl});

  final String bannerUrl;

  @override
  Widget build(BuildContext context) {
    if (bannerUrl.isEmpty) {
      return Container(
        height: 140,
        width: double.infinity,
        color: Theme.of(context).colorScheme.surfaceVariant,
        child: const Center(child: Icon(Icons.image_outlined, size: 32)),
      );
    }
    return SizedBox(
      height: 140,
      width: double.infinity,
      child: Image.network(
        bannerUrl,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: Theme.of(context).colorScheme.surfaceVariant,
            child: const Center(child: Icon(Icons.broken_image_outlined, size: 32)),
          );
        },
      ),
    );
  }
}

class _AvatarPreview extends StatelessWidget {
  const _AvatarPreview({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) {
      return const CircleAvatar(child: Icon(Icons.person_outline));
    }
    return CircleAvatar(
      backgroundImage: NetworkImage(url),
      onBackgroundImageError: (_, __) {},
    );
  }
}

class _WizardControls extends StatelessWidget {
  const _WizardControls({
    required this.canGoBack,
    required this.onBack,
    required this.onContinue,
    required this.primaryLabel,
    required this.secondaryLabel,
    required this.isSaving,
  });

  final bool canGoBack;
  final VoidCallback? onBack;
  final VoidCallback? onContinue;
  final String primaryLabel;
  final String secondaryLabel;
  final bool isSaving;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        TextButton(
          onPressed: canGoBack ? onBack : null,
          child: Text(secondaryLabel),
        ),
        const SizedBox(width: 12),
        FilledButton(
          onPressed: onContinue,
          child: isSaving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : Text(primaryLabel),
        ),
      ],
    );
  }
}
