import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/privacy_service.dart';

class PrivacyPolicyScreen extends StatefulWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  State<PrivacyPolicyScreen> createState() => _PrivacyPolicyScreenState();
}

class _PrivacyPolicyScreenState extends State<PrivacyPolicyScreen> {
  late final PrivacyService _service;
  bool _loading = true;
  bool _savingPreferences = false;
  bool _submittingRequest = false;
  PrivacySettings _settings = const PrivacySettings();
  List<PrivacyRequest> _requests = const <PrivacyRequest>[];

  @override
  void initState() {
    super.initState();
    _service = PrivacyService();
    unawaited(_hydrate());
  }

  Future<void> _hydrate() async {
    await _service.ensureReady();
    final settings = await _service.loadSettings();
    final requests = await _service.loadRequests();
    if (!mounted) return;
    setState(() {
      _settings = settings;
      _requests = List<PrivacyRequest>.from(requests)
        ..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
      _loading = false;
    });
  }

  Future<void> _persistSettings(PrivacySettings settings) async {
    setState(() {
      _settings = settings;
      _savingPreferences = true;
    });
    await _service.saveSettings(settings);
    if (!mounted) return;
    setState(() => _savingPreferences = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Privacy preferences updated.')),
    );
  }

  Future<void> _resetPreferences() async {
    await _persistSettings(const PrivacySettings());
  }

  Future<void> _handleRequestLogged(PrivacyRequest request) async {
    setState(() => _submittingRequest = true);
    await _service.logRequest(request);
    final requests = await _service.loadRequests();
    if (!mounted) return;
    setState(() {
      _requests = List<PrivacyRequest>.from(requests)
        ..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
      _submittingRequest = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${request.type.label} request submitted.')),
    );
  }

  Future<void> _handleStatusChanged(
    PrivacyRequest request,
    PrivacyRequestStatus status,
  ) async {
    await _service.updateRequestStatus(request.id, status);
    if (!mounted) return;
    setState(() {
      _requests = _requests
          .map(
            (item) => item.id == request.id
                ? item.copyWith(
                    status: status,
                    resolvedAt: status == PrivacyRequestStatus.completed
                        ? DateTime.now()
                        : item.resolvedAt,
                  )
                : item,
          )
          .toList()
        ..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
    });
  }

  Future<void> _openRequestWizard() async {
    final result = await showModalBottomSheet<PrivacyRequest>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) => _RequestWizardSheet(service: _service),
    );
    if (result != null) {
      await _handleRequestLogged(result);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final latestRequest = _requests.isEmpty ? null : _requests.first;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy & data protection'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'We design Edulure with learner trust at the center.',
                            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'This policy explains how we process personal data across the Edulure platform and '
                            'provides controls for analytics, communications, and data subject rights.',
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 12,
                            children: const [
                              Chip(label: Text('GDPR-ready')),
                              Chip(label: Text('FERPA-aligned')),
                              Chip(label: Text('SOC 2 Type II')),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    ..._policySections(theme),
                    const SizedBox(height: 24),
                    _PreferenceControls(
                      settings: _settings,
                      saving: _savingPreferences,
                      onAnalyticsChanged: (value) => _persistSettings(
                        _settings.copyWith(analyticsOptIn: value),
                      ),
                      onMarketingChanged: (value) => _persistSettings(
                        _settings.copyWith(marketingOptIn: value),
                      ),
                      onBetaChanged: (value) => _persistSettings(
                        _settings.copyWith(betaOptIn: value),
                      ),
                      onReset: _resetPreferences,
                    ),
                    const SizedBox(height: 24),
                    _RightsCenter(
                      theme: theme,
                      onSubmitRequest: _openRequestWizard,
                      latestRequest: latestRequest,
                    ),
                    const SizedBox(height: 24),
                    _RequestHistory(
                      requests: _requests,
                      onStatusChanged: _handleStatusChanged,
                      onCreateRequest: _openRequestWizard,
                    ),
                    const SizedBox(height: 24),
                    _ContactPanel(theme: theme),
                    const SizedBox(height: 32),
                  ],
                ),
                if (_submittingRequest)
                  const Align(
                    alignment: Alignment.topCenter,
                    child: LinearProgressIndicator(minHeight: 2),
                  ),
              ],
            ),
    );
  }

  List<Widget> _policySections(ThemeData theme) {
    final sections = [
      (
        'Data we collect',
        'We capture account details, learning activity, and product telemetry required to deliver '
            'the Edulure experience. We never sell learner data to third parties.',
      ),
      (
        'How we use your data',
        'Data powers personalized learning paths, proactive support, and platform reliability. '
            'We minimize retention windows and pseudonymize analytics wherever possible.',
      ),
      (
        'Third-party processors',
        'We use secure infrastructure providers, messaging services, and learning analytics tools '
            'that meet our vendor due diligence standards.',
      ),
      (
        'International transfers',
        'Data may be processed in the United States and European Union with standard contractual '
            'clauses and regional data residency options for enterprise plans.',
      ),
    ];

    return sections
        .map(
          (section) => Card(
            margin: const EdgeInsets.only(bottom: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: ExpansionTile(
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              title: Text(section.$1, style: theme.textTheme.titleMedium),
              childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              children: [Text(section.$2)],
            ),
          ),
        )
        .toList();
  }
}

class _PreferenceControls extends StatelessWidget {
  const _PreferenceControls({
    required this.settings,
    required this.onAnalyticsChanged,
    required this.onMarketingChanged,
    required this.onBetaChanged,
    required this.onReset,
    this.saving = false,
  });

  final PrivacySettings settings;
  final ValueChanged<bool> onAnalyticsChanged;
  final ValueChanged<bool> onMarketingChanged;
  final ValueChanged<bool> onBetaChanged;
  final VoidCallback onReset;
  final bool saving;

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
                Expanded(
                  child: Text(
                    'Data & communication preferences',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                TextButton.icon(
                  onPressed: onReset,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Reset'),
                ),
              ],
            ),
            if (saving) ...[
              const SizedBox(height: 8),
              const LinearProgressIndicator(minHeight: 3),
              const SizedBox(height: 12),
            ] else
              const SizedBox(height: 12),
            SwitchListTile.adaptive(
              value: settings.analyticsOptIn,
              onChanged: onAnalyticsChanged,
              title: const Text('Share anonymized product analytics'),
              subtitle: const Text('Helps us benchmark performance and ship reliability improvements.'),
            ),
            SwitchListTile.adaptive(
              value: settings.marketingOptIn,
              onChanged: onMarketingChanged,
              title: const Text('Receive program announcements'),
              subtitle: const Text('Opt into curated updates about new cohorts, features, and playbooks.'),
            ),
            SwitchListTile.adaptive(
              value: settings.betaOptIn,
              onChanged: onBetaChanged,
              title: const Text('Join beta experience research'),
              subtitle: const Text('We\'ll invite you to usability tests and early feature pilots.'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RightsCenter extends StatelessWidget {
  const _RightsCenter({
    required this.theme,
    required this.onSubmitRequest,
    this.latestRequest,
  });

  final ThemeData theme;
  final VoidCallback onSubmitRequest;
  final PrivacyRequest? latestRequest;

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat('MMM d, yyyy • HH:mm');
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceVariant.withOpacity(0.6),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Manage your data rights', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Text('Submit a request to export, rectify, or delete your data. We respond within 72 hours.'),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: onSubmitRequest,
                icon: const Icon(Icons.assignment_outlined),
                label: const Text('Submit new request'),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('DSR portal opened in a secure browser window.')),
                  );
                },
                icon: const Icon(Icons.lock_outline),
                label: const Text('Launch self-service portal'),
              ),
              TextButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Template email drafted to privacy@edulure.com.')),
                  );
                },
                icon: const Icon(Icons.mail_outline),
                label: const Text('Contact privacy team'),
              ),
            ],
          ),
          if (latestRequest != null) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Latest request status', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text(latestRequest!.type.label, style: theme.textTheme.titleSmall),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Chip(
                        label: Text(latestRequest!.status.label),
                        backgroundColor: theme.colorScheme.primaryContainer.withOpacity(0.6),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        formatter.format(latestRequest!.submittedAt),
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                  if (latestRequest!.resolvedAt != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Resolved ${formatter.format(latestRequest!.resolvedAt!)}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _RequestHistory extends StatelessWidget {
  const _RequestHistory({
    required this.requests,
    required this.onStatusChanged,
    required this.onCreateRequest,
  });

  final List<PrivacyRequest> requests;
  final void Function(PrivacyRequest request, PrivacyRequestStatus status) onStatusChanged;
  final VoidCallback onCreateRequest;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formatter = DateFormat('MMM d, yyyy • HH:mm');
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Data rights request log',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                TextButton.icon(
                  onPressed: onCreateRequest,
                  icon: const Icon(Icons.add_task_outlined),
                  label: const Text('Log request'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (requests.isEmpty)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('No requests yet', style: theme.textTheme.titleSmall),
                  const SizedBox(height: 6),
                  const Text('Track every inbound privacy inquiry and mark their fulfillment status.'),
                ],
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: requests.length,
                separatorBuilder: (_, __) => const Divider(height: 24),
                itemBuilder: (context, index) {
                  final request = requests[index];
                  return _RequestTile(
                    request: request,
                    formatter: formatter,
                    onStatusChanged: (status) => onStatusChanged(request, status),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({
    required this.request,
    required this.formatter,
    required this.onStatusChanged,
  });

  final PrivacyRequest request;
  final DateFormat formatter;
  final ValueChanged<PrivacyRequestStatus> onStatusChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(request.type.label, style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 4),
                  Text(
                    request.details,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
            DropdownButtonHideUnderline(
              child: DropdownButton<PrivacyRequestStatus>(
                value: request.status,
                items: PrivacyRequestStatus.values
                    .map(
                      (status) => DropdownMenuItem(
                        value: status,
                        child: Text(status.label),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    onStatusChanged(value);
                  }
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            Chip(
              avatar: const Icon(Icons.schedule_outlined, size: 16),
              label: Text('Submitted ${formatter.format(request.submittedAt)}'),
            ),
            Chip(
              avatar: const Icon(Icons.contact_mail_outlined, size: 16),
              label: Text(request.preferredContact.isEmpty ? 'No contact provided' : request.preferredContact),
            ),
            if (request.resolvedAt != null)
              Chip(
                avatar: const Icon(Icons.verified_outlined, size: 16),
                label: Text('Resolved ${formatter.format(request.resolvedAt!)}'),
              ),
          ],
        ),
        if (request.attachments.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: request.attachments
                .map(
                  (attachment) => ActionChip(
                    avatar: const Icon(Icons.link_outlined),
                    label: Text(attachment),
                    onPressed: () => _openAttachment(context, attachment),
                  ),
                )
                .toList(),
          ),
        ],
      ],
    );
  }

  Future<void> _openAttachment(BuildContext context, String value) async {
    final uri = Uri.tryParse(value);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Invalid attachment link: $value')),
      );
      return;
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to open $value')),
      );
    }
  }
}

class _ContactPanel extends StatelessWidget {
  const _ContactPanel({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Questions about privacy?', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Text('Reach our privacy team at privacy@edulure.com or schedule an office hours session.'),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                FilledButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Drafted email to privacy@edulure.com.')),
                    );
                  },
                  icon: const Icon(Icons.mail_outline),
                  label: const Text('Email privacy team'),
                ),
                OutlinedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Scheduled privacy consultation via Calendly.')),
                    );
                  },
                  icon: const Icon(Icons.calendar_today_outlined),
                  label: const Text('Book consultation'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _RequestWizardSheet extends StatefulWidget {
  const _RequestWizardSheet({required this.service});

  final PrivacyService service;

  @override
  State<_RequestWizardSheet> createState() => _RequestWizardSheetState();
}

class _RequestWizardSheetState extends State<_RequestWizardSheet> {
  int _currentStep = 0;
  PrivacyRequestType _selectedType = PrivacyRequestType.access;
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _detailsController = TextEditingController();
  final TextEditingController _contactController = TextEditingController();
  final TextEditingController _attachmentController = TextEditingController();
  final List<String> _attachments = <String>[];

  @override
  void dispose() {
    _detailsController.dispose();
    _contactController.dispose();
    _attachmentController.dispose();
    super.dispose();
  }

  void _addAttachment() {
    final value = _attachmentController.text.trim();
    if (value.isEmpty) {
      return;
    }
    setState(() {
      _attachments.add(value);
      _attachmentController.clear();
    });
  }

  void _removeAttachment(String attachment) {
    setState(() {
      _attachments.remove(attachment);
    });
  }

  void _handleContinue() {
    if (_currentStep == 0) {
      setState(() => _currentStep = 1);
      return;
    }
    if (_currentStep == 1) {
      if (!_formKey.currentState!.validate()) {
        return;
      }
      setState(() => _currentStep = 2);
      return;
    }
    final request = widget.service.buildRequest(
      type: _selectedType,
      details: _detailsController.text.trim(),
      preferredContact: _contactController.text.trim(),
      attachments: _attachments,
    );
    Navigator.of(context).pop(request);
  }

  void _handleCancel() {
    if (_currentStep == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _currentStep -= 1);
  }

  StepState _stepState(int step) {
    if (_currentStep > step) {
      return StepState.complete;
    }
    return StepState.indexed;
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Submit a data rights request', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              const Text('We create a case for every submission and update you within 3 business days.'),
              const SizedBox(height: 20),
              Stepper(
                currentStep: _currentStep,
                physics: const ClampingScrollPhysics(),
                onStepContinue: _handleContinue,
                onStepCancel: _handleCancel,
                controlsBuilder: (context, details) {
                  return Row(
                    children: [
                      FilledButton(
                        onPressed: details.onStepContinue,
                        child: Text(_currentStep == 2 ? 'Submit request' : 'Continue'),
                      ),
                      const SizedBox(width: 12),
                      TextButton(
                        onPressed: details.onStepCancel,
                        child: Text(_currentStep == 0 ? 'Cancel' : 'Back'),
                      ),
                    ],
                  );
                },
                steps: [
                  Step(
                    title: const Text('Choose request type'),
                    state: _stepState(0),
                    isActive: _currentStep >= 0,
                    content: Column(
                      children: PrivacyRequestType.values
                          .map(
                            (type) => RadioListTile<PrivacyRequestType>(
                              value: type,
                              groupValue: _selectedType,
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() => _selectedType = value);
                                }
                              },
                              title: Text(type.label),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                  Step(
                    title: const Text('Add supporting details'),
                    state: _stepState(1),
                    isActive: _currentStep >= 1,
                    content: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextFormField(
                            controller: _detailsController,
                            maxLines: 4,
                            decoration: const InputDecoration(
                              labelText: 'Describe your request',
                              alignLabelWithHint: true,
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Provide a summary so we can prioritize the request.';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _contactController,
                            decoration: const InputDecoration(
                              labelText: 'Preferred contact (email or phone)',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _attachmentController,
                            decoration: InputDecoration(
                              labelText: 'Add attachment link (optional)',
                              suffixIcon: IconButton(
                                icon: const Icon(Icons.add_link),
                                onPressed: _addAttachment,
                              ),
                            ),
                            onSubmitted: (_) => _addAttachment(),
                          ),
                          if (_attachments.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              children: _attachments
                                  .map(
                                    (attachment) => InputChip(
                                      label: Text(attachment),
                                      onDeleted: () => _removeAttachment(attachment),
                                    ),
                                  )
                                  .toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  Step(
                    title: const Text('Review & submit'),
                    state: _stepState(2),
                    isActive: _currentStep >= 2,
                    content: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ListTile(
                          leading: const Icon(Icons.assignment_outlined),
                          title: Text(_selectedType.label),
                          subtitle: Text(_detailsController.text.trim()),
                        ),
                        if (_contactController.text.trim().isNotEmpty)
                          ListTile(
                            leading: const Icon(Icons.contact_mail_outlined),
                            title: Text(_contactController.text.trim()),
                            subtitle: const Text('We will confirm receipt and share updates.'),
                          ),
                        if (_attachments.isNotEmpty)
                          ListTile(
                            leading: const Icon(Icons.link_outlined),
                            title: const Text('Attachments'),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: _attachments.map(Text.new).toList(),
                            ),
                          ),
                        const SizedBox(height: 12),
                        const Text('Submitting will trigger an acknowledgment email and internal case assignment.'),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
