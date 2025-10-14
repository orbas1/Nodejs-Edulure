import 'package:flutter/material.dart';

class TutorBookingScreen extends StatelessWidget {
  const TutorBookingScreen({super.key});

  static const List<Map<String, String>> _pendingRequests = [
    {
      'status': 'Awaiting review',
      'learner': 'Jamie Chen',
      'requested': '2h ago',
      'topic': 'RevOps pipeline automation playbook',
    },
    {
      'status': 'Intake form submitted',
      'learner': 'Priya Patel',
      'requested': '5h ago',
      'topic': 'Enterprise onboarding workflow audit',
    },
    {
      'status': 'Needs mentor assignment',
      'learner': 'Malik Okafor',
      'requested': 'Yesterday',
      'topic': 'Playbook for async coaching cadences',
    },
  ];

  static const List<Map<String, String>> _confirmedSessions = [
    {
      'date': 'Apr 21 · 9:00 AM PT',
      'topic': 'Scaling tutor pods with data ops',
      'learner': 'Amelia Rivers',
    },
    {
      'date': 'Apr 22 · 1:00 PM PT',
      'topic': 'Automation for feedback loops',
      'learner': 'Devon Clarke',
    },
  ];

  static const List<Map<String, String>> _alerts = [
    {
      'title': '3 tutor requests awaiting assignment',
      'detail': 'Route new learners to mentors to keep SLAs within 24 hours.',
    },
    {
      'title': 'Jordan Miles is over capacity',
      'detail': '12 learners across 6 slots. Consider opening additional availability.',
    },
    {
      'title': 'Ops pod session with Amelia Rivers',
      'detail': 'Begins Apr 21 at 9:00 AM PT. Share prep notes with the mentor team.',
    },
  ];

  static const List<Map<String, dynamic>> _tutorRoster = [
    {
      'name': 'Jordan Miles',
      'headline': 'RevOps coach & pod lead',
      'status': 'Active',
      'tone': 'success',
      'rate': '\$240/hr',
      'rating': '4.9 • 86 reviews',
      'availability': 'Next slot · Apr 21 · 9:00 AM PT',
      'timezone': 'PT',
      'weekly': '12 hrs/week',
      'response': '18 mins',
      'workload': '12 learners • 6 slots',
      'focus': ['RevOps', 'Enablement', 'EN'],
    },
    {
      'name': 'Harper Singh',
      'headline': 'Community monetisation strategist',
      'status': 'Active',
      'tone': 'success',
      'rate': '\$210/hr',
      'rating': '4.8 • 64 reviews',
      'availability': 'Next slot · Apr 24 · 4:00 PM PT',
      'timezone': 'PT',
      'weekly': '10 hrs/week',
      'response': '22 mins',
      'workload': '8 learners • 4 slots',
      'focus': ['Monetisation', 'Pods', 'EN'],
    },
    {
      'name': 'Robin Yu',
      'headline': 'Async coaching architect',
      'status': 'Sync calendar',
      'tone': 'warning',
      'rate': '\$195/hr',
      'rating': '4.9 • 72 reviews',
      'availability': 'Sync calendar to surface new slots',
      'timezone': 'APAC',
      'weekly': '8 hrs/week',
      'response': '25 mins',
      'workload': '10 learners • 5 slots',
      'focus': ['Automation', 'Templates', 'JA'],
    },
  ];

  static const List<Map<String, String>> _mentorAvailability = [
    {
      'mentor': 'Jordan Miles',
      'slots': '6 weekly slots',
      'learners': '12 learners assigned',
      'notes': 'Blocks on Tue/Wed are dedicated to async feedback.',
    },
    {
      'mentor': 'Harper Singh',
      'slots': '4 weekly slots',
      'learners': '8 learners assigned',
      'notes': 'Prefers cohort pods and 1:many strategy sessions.',
    },
    {
      'mentor': 'Robin Yu',
      'slots': '5 weekly slots',
      'learners': '10 learners assigned',
      'notes': 'Morning availability only. Calendar synced daily.',
    },
  ];

  static const List<Map<String, String>> _upcomingLearnerSessions = [
    {
      'status': 'Confirmed',
      'topic': 'Lifecycle analytics walkthrough',
      'mentor': 'Jordan Miles',
      'date': 'Apr 20 · 10:30 AM PT',
    },
    {
      'status': 'Awaiting prep notes',
      'topic': 'Community monetisation strategies',
      'mentor': 'Harper Singh',
      'date': 'Apr 24 · 4:00 PM PT',
    },
  ];

  static const List<Map<String, String>> _completedSessions = [
    {
      'mentor': 'Robin Yu',
      'topic': 'Async coaching templates',
      'date': 'Apr 12, 2024',
      'rating': '5.0 ★',
    },
    {
      'mentor': 'Jordan Miles',
      'topic': 'RevOps dashboards deep dive',
      'date': 'Apr 8, 2024',
      'rating': '4.8 ★',
    },
    {
      'mentor': 'Harper Singh',
      'topic': 'Revenue enablement OKRs',
      'date': 'Mar 28, 2024',
      'rating': '4.9 ★',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tutor bookings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tutor booking & management',
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              'Track inbound mentorship requests, confirm sessions, and maintain tutor availability in one Learnspace.',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _SummaryPill(
                  label: 'Pending requests',
                  value: _pendingRequests.length.toString(),
                  description: 'Awaiting routing',
                  color: Colors.blue,
                ),
                _SummaryPill(
                  label: 'Confirmed sessions',
                  value: _confirmedSessions.length.toString(),
                  description: 'On the calendar',
                  color: Colors.indigo,
                ),
                _SummaryPill(
                  label: 'Active mentors',
                  value: _tutorRoster.length.toString(),
                  description: 'Supporting pods',
                  color: Colors.teal,
                ),
                _SummaryPill(
                  label: 'Alerts',
                  value: _alerts.length.toString(),
                  description: 'Action required',
                  color: Colors.deepOrange,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                FilledButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.rule_folder_outlined),
                  label: const Text('Routing rules'),
                ),
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.calendar_today_outlined),
                  label: const Text('Sync calendars'),
                ),
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text('Request session'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            if (_alerts.isNotEmpty) ...[
              _buildSection(
                context,
                title: 'Alerts & notifications',
                subtitle: 'Stay on top of capacity risks, upcoming sessions, and workflow SLAs.',
                child: Column(
                  children: _alerts
                      .map(
                        (item) => _DashboardCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item['title']!,
                                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                item['detail']!,
                                style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[700]),
                              ),
                            ],
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
              const SizedBox(height: 24),
            ],
            _buildSection(
              context,
              title: 'Tutor roster',
              subtitle: 'Review mentor focus areas, response SLAs, and availability for each pod.',
              child: Column(
                children: _tutorRoster
                    .map(
                      (item) => _DashboardCard(
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
                                        item['name'] as String,
                                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        item['headline'] as String,
                                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[700]),
                                      ),
                                    ],
                                  ),
                                ),
                                _StatusChip(
                                  label: item['status'] as String,
                                  tone: item['tone'] as String,
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: (item['focus'] as List<String>)
                                  .map(
                                    (tag) => Chip(
                                      label: Text(tag),
                                      backgroundColor: Colors.blueGrey.withOpacity(0.08),
                                      labelStyle: theme.textTheme.labelSmall?.copyWith(color: Colors.blueGrey[700]),
                                    ),
                                  )
                                  .toList(),
                            ),
                            const SizedBox(height: 12),
                            _RosterStatRow(label: 'Rate', value: item['rate'] as String),
                            _RosterStatRow(label: 'Rating', value: item['rating'] as String),
                            _RosterStatRow(label: 'Availability', value: item['availability'] as String),
                            _RosterStatRow(label: 'Timezone', value: item['timezone'] as String),
                            _RosterStatRow(label: 'Preference', value: item['weekly'] as String),
                            _RosterStatRow(label: 'Response SLA', value: item['response'] as String),
                            _RosterStatRow(label: 'Workload', value: item['workload'] as String),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: 'Pending tutor requests',
              subtitle: 'Review the latest learner requests and assign the right mentor.',
              child: Column(
                children: _pendingRequests
                    .map(
                      (item) => _DashboardCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item['status']!,
                                        style: theme.textTheme.labelSmall?.copyWith(
                                          letterSpacing: 0.6,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.blueGrey,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        item['learner']!,
                                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      'Requested ${item['requested']}',
                                      style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                                    ),
                                    const SizedBox(height: 8),
                                    OutlinedButton(
                                      onPressed: () {},
                                      child: const Text('Assign mentor'),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              item['topic']!,
                              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: 'Confirmed sessions',
              subtitle: 'Prep materials, reschedules, and communications for upcoming mentorship.',
              child: Column(
                children: _confirmedSessions
                    .map(
                      (item) => _DashboardCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['date']!,
                              style: theme.textTheme.labelSmall?.copyWith(color: Colors.blueGrey),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              item['topic']!,
                              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'With ${item['learner']}',
                              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 12,
                              children: [
                                OutlinedButton(onPressed: () {}, child: const Text('Send prep')),
                                OutlinedButton(onPressed: () {}, child: const Text('Reschedule')),
                              ],
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: 'Mentor availability',
              subtitle: 'Keep pods staffed by tracking tutor capacity and notes.',
              child: Column(
                children: _mentorAvailability
                    .map(
                      (item) => _DashboardCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  item['mentor']!,
                                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                                ),
                                Text(
                                  item['slots']!,
                                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              item['learners']!,
                              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              item['notes']!,
                              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 12,
                              children: [
                                OutlinedButton(onPressed: () {}, child: const Text('Adjust capacity')),
                                OutlinedButton(onPressed: () {}, child: const Text('Send digest')),
                              ],
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: 'Upcoming learner bookings',
              subtitle: 'Everything learners have scheduled or awaiting confirmation.',
              child: Column(
                children: _upcomingLearnerSessions
                    .map(
                      (item) => _DashboardCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['status']!,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.4,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              item['topic']!,
                              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Mentor ${item['mentor']}',
                              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  item['date']!,
                                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                                ),
                                OutlinedButton(onPressed: () {}, child: const Text('Share prep notes')),
                              ],
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: 'Completed sessions',
              subtitle: 'Historical mentorship sessions with feedback and ratings.',
              child: Column(
                children: _completedSessions
                    .map(
                      (item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: Text(
                                item['mentor']!,
                                style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                            Expanded(
                              flex: 3,
                              child: Text(
                                item['topic']!,
                                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
                              ),
                            ),
                            Expanded(
                              flex: 2,
                              child: Text(
                                item['date']!,
                                style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                              ),
                            ),
                            SizedBox(
                              width: 70,
                              child: Text(
                                item['rating']!,
                                textAlign: TextAlign.end,
                                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.green[600]),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildSection(
    BuildContext context, {
    required String title,
    required String subtitle,
    required Widget child,
  }) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
        ),
        const SizedBox(height: 16),
        child,
      ],
    );
  }
}

class _DashboardCard extends StatelessWidget {
  const _DashboardCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: child,
      ),
    );
  }
}

class _SummaryPill extends StatelessWidget {
  const _SummaryPill({
    required this.label,
    required this.value,
    required this.description,
    required this.color,
  });

  final String label;
  final String value;
  final String description;
  final MaterialColor color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color.shade700,
                  letterSpacing: 0.6,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w700, color: color.shade900),
          ),
          const SizedBox(height: 2),
          Text(
            description,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: color.shade700),
          )
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.tone});

  final String label;
  final String tone;

  Color _resolveColor() {
    switch (tone) {
      case 'warning':
        return Colors.amber;
      case 'success':
        return Colors.teal;
      case 'info':
        return Colors.blue;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _resolveColor();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        label,
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(fontWeight: FontWeight.w600, color: color.shade700),
      ),
    );
  }
}

class _RosterStatRow extends StatelessWidget {
  const _RosterStatRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: Colors.grey[600], fontWeight: FontWeight.w500),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600, color: Colors.grey[900]),
            ),
          ),
        ],
      ),
    );
  }
}
