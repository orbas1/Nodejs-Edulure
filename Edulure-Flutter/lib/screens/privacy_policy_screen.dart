import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatefulWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  State<PrivacyPolicyScreen> createState() => _PrivacyPolicyScreenState();
}

class _PrivacyPolicyScreenState extends State<PrivacyPolicyScreen> {
  bool _analyticsOptIn = true;
  bool _marketingOptIn = false;
  bool _betaOptIn = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy & data protection'),
      ),
      body: ListView(
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
            analyticsOptIn: _analyticsOptIn,
            marketingOptIn: _marketingOptIn,
            betaOptIn: _betaOptIn,
            onAnalyticsChanged: (value) => setState(() => _analyticsOptIn = value),
            onMarketingChanged: (value) => setState(() => _marketingOptIn = value),
            onBetaChanged: (value) => setState(() => _betaOptIn = value),
          ),
          const SizedBox(height: 24),
          _RightsCenter(theme: theme),
          const SizedBox(height: 24),
          _ContactPanel(theme: theme),
          const SizedBox(height: 32),
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
    required this.analyticsOptIn,
    required this.marketingOptIn,
    required this.betaOptIn,
    required this.onAnalyticsChanged,
    required this.onMarketingChanged,
    required this.onBetaChanged,
  });

  final bool analyticsOptIn;
  final bool marketingOptIn;
  final bool betaOptIn;
  final ValueChanged<bool> onAnalyticsChanged;
  final ValueChanged<bool> onMarketingChanged;
  final ValueChanged<bool> onBetaChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Data & communication preferences',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            SwitchListTile.adaptive(
              value: analyticsOptIn,
              onChanged: onAnalyticsChanged,
              title: const Text('Share anonymized product analytics'),
              subtitle: const Text('Helps us benchmark performance and ship reliability improvements.'),
            ),
            SwitchListTile.adaptive(
              value: marketingOptIn,
              onChanged: onMarketingChanged,
              title: const Text('Receive program announcements'),
              subtitle: const Text('Opt into curated updates about new cohorts, features, and playbooks.'),
            ),
            SwitchListTile.adaptive(
              value: betaOptIn,
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
  const _RightsCenter({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
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
            children: [
              FilledButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('DSR portal opened in a secure browser window.')),
                  );
                },
                icon: const Icon(Icons.lock_outline),
                label: const Text('Open data rights portal'),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Acknowledged request for privacy report.')),
                  );
                },
                icon: const Icon(Icons.picture_as_pdf_outlined),
                label: const Text('Download annual privacy report'),
              ),
            ],
          ),
        ],
      ),
    );
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
            FilledButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Privacy office hours booking sent.')),
                );
              },
              icon: const Icon(Icons.schedule_outlined),
              label: const Text('Book office hours'),
            ),
          ],
        ),
      ),
    );
  }
}
