import 'package:flutter/material.dart';

import '../services/course_service.dart';
import '../services/session_manager.dart';

class CourseManagementScreen extends StatefulWidget {
  const CourseManagementScreen({super.key});

  @override
  State<CourseManagementScreen> createState() => _CourseManagementScreenState();
}

class _CourseManagementScreenState extends State<CourseManagementScreen> {
  final CourseService _service = CourseService();
  CourseDashboard? _dashboard;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dashboard = await _service.fetchDashboard();
      if (!mounted) return;
      setState(() {
        _dashboard = dashboard;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  void _showBriefSheet() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Launch brief template',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              const Text(
                'Capture the positioning, target audience, and delivery rhythm for your next cohort. Share this brief with your production team to align on launch milestones.',
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Launch brief created')), // placeholder feedback
                  );
                },
                child: const Text('Generate outline'),
              )
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final token = SessionManager.getAccessToken();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Course management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.note_add_outlined),
            tooltip: 'Create launch brief',
            onPressed: _showBriefSheet,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          )
        ],
      ),
      body: token == null
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('Please log in to see course pipeline and production tasks.'),
              ),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: _loading && _dashboard == null
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 220, child: Center(child: CircularProgressIndicator()))
                      ],
                    )
                  : ListView(
                      padding: const EdgeInsets.all(20),
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        if (_error != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Text(
                              _error!,
                              style: TextStyle(color: Colors.red.shade700),
                            ),
                          ),
                        _buildPipelineSection(),
                        const SizedBox(height: 20),
                        _buildProductionSection(),
                        if ((_dashboard?.pipeline.isEmpty ?? true) && (_dashboard?.production.isEmpty ?? true))
                          Padding(
                            padding: const EdgeInsets.only(top: 40),
                            child: Column(
                              children: [
                                const Icon(Icons.inbox_outlined, size: 48, color: Colors.blueGrey),
                                const SizedBox(height: 12),
                                Text(
                                  'No course operations yet',
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Sync your cohorts or create production tasks from the instructor dashboard to populate this view.',
                                  textAlign: TextAlign.center,
                                )
                              ],
                            ),
                          )
                      ],
                    ),
            ),
    );
  }

  Widget _buildPipelineSection() {
    final pipeline = _dashboard?.pipeline ?? [];
    if (pipeline.isEmpty) {
      return Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Cohort pipeline', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              SizedBox(height: 8),
              Text('Once you draft or review a cohort, it will appear here with launch timing and learner volume.'),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Cohort pipeline', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        ...pipeline.map(
          (entry) => Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          entry.stage,
                          style: TextStyle(color: Colors.blue.shade700, fontWeight: FontWeight.w600, fontSize: 12),
                        ),
                      ),
                      Text(
                        entry.startDate,
                        style: Theme.of(context).textTheme.bodySmall,
                      )
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    entry.name,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(entry.learners, style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: const [
                      Chip(label: Text('Review funnel')),
                      Chip(label: Text('Assign tutors')),
                    ],
                  )
                ],
              ),
            ),
          ),
        )
      ],
    );
  }

  Widget _buildProductionSection() {
    final production = _dashboard?.production ?? [];
    if (production.isEmpty) {
      return Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Production sprint', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              SizedBox(height: 8),
              Text('Upcoming assignments and lesson releases will populate here once scheduled.'),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Production sprint', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        ...production.map(
          (task) => Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.purple.shade50,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      task.type,
                      style: TextStyle(color: Colors.purple.shade700, fontWeight: FontWeight.w600, fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.asset,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text('Owner ${task.owner}', style: Theme.of(context).textTheme.bodySmall),
                        const SizedBox(height: 8),
                        Text(task.status, style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.open_in_new),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Opening ${task.asset} workspace...')),
                              );
                            },
                            label: const Text('Open task'),
                          ),
                        )
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        )
      ],
    );
  }
}
