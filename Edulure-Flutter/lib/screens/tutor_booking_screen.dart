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
              'Track inbound mentorship requests, confirm sessions, and maintain tutor availability in one workspace.',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
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
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      elevation: 0,
      color: Colors.grey[50],
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[700]),
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  const _DashboardCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0C000000),
            offset: Offset(0, 1),
            blurRadius: 8,
          ),
        ],
      ),
      child: child,
    );
  }
}
