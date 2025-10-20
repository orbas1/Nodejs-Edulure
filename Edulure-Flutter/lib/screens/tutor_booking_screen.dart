import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/commerce/commerce_payments_controller.dart';
import '../provider/commerce/tutor_booking_controller.dart';
import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';
import '../services/commerce_models.dart';

class TutorBookingScreen extends ConsumerStatefulWidget {
  const TutorBookingScreen({super.key});

  @override
  ConsumerState<TutorBookingScreen> createState() => _TutorBookingScreenState();
}

class _TutorBookingScreenState extends ConsumerState<TutorBookingScreen> {
  final NumberFormat _currencyFormat = NumberFormat.simpleCurrency();

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      await ref.read(tutorBookingControllerProvider.notifier).bootstrap();
      await ref.read(commercePaymentsControllerProvider.notifier).bootstrap();
      await ref.read(tutorStoreProvider.notifier).ready;
    });
  }

  @override
  Widget build(BuildContext context) {
    final tutorState = ref.watch(tutorBookingControllerProvider);
    final bookingController = ref.read(tutorBookingControllerProvider.notifier);
    final tutors = ref.watch(tutorStoreProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tutor bookings'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () async {
              await bookingController.refresh();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Tutor pipelines refreshed.')), 
              );
            },
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'New booking request',
            onPressed: () => _openRequestForm(context, tutors: tutors),
            icon: const Icon(Icons.add_circle_outline),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openPackageForm(context, tutors: tutors),
        icon: const Icon(Icons.card_membership_outlined),
        label: const Text('Add package'),
      ),
      body: RefreshIndicator(
        onRefresh: bookingController.refresh,
        child: tutorState.loading && !tutorState.bootstrapped
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 320, child: Center(child: CircularProgressIndicator())),
                ],
              )
            : ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildHero(context, tutorState),
                  const SizedBox(height: 24),
                  _buildPendingSection(context, tutorState.pendingRequests, tutors),
                  const SizedBox(height: 24),
                  _buildAwaitingPayment(context, tutorState.awaitingPayments),
                  const SizedBox(height: 24),
                  _buildConfirmedSection(context, tutorState.confirmedSessions),
                  const SizedBox(height: 24),
                  _buildPackageSection(context, tutorState.packages, tutors),
                  const SizedBox(height: 24),
                  _buildCompletedSection(context, tutorState.completedSessions),
                  const SizedBox(height: 48),
                ],
              ),
      ),
    );
  }

  Widget _buildHero(BuildContext context, TutorBookingState state) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primary.withOpacity(0.12), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 16, offset: Offset(0, 12)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              Chip(
                avatar: const Icon(Icons.inbox_outlined),
                label: Text('${state.pendingRequests.length} pending intake'),
              ),
              Chip(
                avatar: const Icon(Icons.schedule_outlined),
                label: Text('${state.confirmedSessions.length} upcoming sessions'),
              ),
              Chip(
                avatar: const Icon(Icons.payments_outlined),
                label: Text('Forecast ${_currencyFormat.format(state.forecastedRevenue)}'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Mentor bookings command centre',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'Qualify intake, orchestrate mentor pods, and celebrate outcomes in one actionable dashboard.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.4),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _MetricPill(
                  label: 'Monthly revenue',
                  value: _currencyFormat.format(state.monthlyRevenue),
                  icon: Icons.trending_up,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricPill(
                  label: 'Awaiting payment',
                  value: '${state.awaitingPayments.length} requests',
                  icon: Icons.hourglass_bottom,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricPill(
                  label: 'Completed sessions',
                  value: '${state.completedSessions.length}',
                  icon: Icons.emoji_events_outlined,
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildPendingSection(
    BuildContext context,
    List<TutorBookingRequest> requests,
    List<Tutor> tutors,
  ) {
    return _SectionCard(
      icon: Icons.assignment_outlined,
      title: 'Intake queue',
      subtitle: 'Qualify inbound requests, route mentors, and trigger prep workflows.',
      trailing: TextButton.icon(
        onPressed: () => _openRequestForm(context, tutors: tutors),
        icon: const Icon(Icons.add),
        label: const Text('New request'),
      ),
      child: requests.isEmpty
          ? const _EmptyContent(
              icon: Icons.assignment_turned_in_outlined,
              title: 'No pending requests',
              message: 'Everything is routed. Enjoy the calm before the next launch wave.',
            )
          : Column(
              children: requests
                  .map((request) => _RequestCard(
                        request: request,
                        tutors: tutors,
                        onAssign: () => _openAssignSheet(context, request, tutors: tutors),
                        onEdit: () => _openRequestForm(context, request: request, tutors: tutors),
                        onCancel: () => ref.read(tutorBookingControllerProvider.notifier).cancelRequest(request.id),
                        onDelete: () => ref.read(tutorBookingControllerProvider.notifier).deleteRequest(request.id),
                      ))
                  .toList(),
            ),
    );
  }

  Widget _buildAwaitingPayment(BuildContext context, List<TutorBookingRequest> requests) {
    return _SectionCard(
      icon: Icons.payments_outlined,
      title: 'Awaiting payment',
      subtitle: 'Nudge procurement teams and keep SLAs within 24 hours.',
      child: requests.isEmpty
          ? const _EmptyContent(
              icon: Icons.verified_user_outlined,
              title: 'No outstanding payments',
              message: 'Payment confirmations will appear here when pending.',
            )
          : Column(
              children: requests
                  .map(
                    (request) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(child: Text(request.learnerName.isNotEmpty ? request.learnerName[0] : '?')),
                      title: Text('${request.learnerName} • ${_currencyFormat.format(request.totalValue)}'),
                      subtitle: Text('${request.topic}\nRequested ${DateFormat.yMMMd().format(request.requestedAt)}'),
                      isThreeLine: true,
                      trailing: FilledButton.tonalIcon(
                        onPressed: () => ref
                            .read(tutorBookingControllerProvider.notifier)
                            .confirmRequest(
                              requestId: request.id,
                              scheduledAt: DateTime.now().add(const Duration(days: 2)),
                              meetingUrl: 'https://meet.edulure.com/${request.learnerName.toLowerCase().replaceAll(' ', '-')}',
                            ),
                        icon: const Icon(Icons.verified_outlined),
                        label: const Text('Mark paid'),
                      ),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _buildConfirmedSection(
    BuildContext context,
    List<TutorBookingRequest> sessions,
  ) {
    return _SectionCard(
      icon: Icons.event_available_outlined,
      title: 'Confirmed sessions',
      subtitle: 'Coordinate prep notes, hosts, and capture post-session reviews.',
      child: sessions.isEmpty
          ? const _EmptyContent(
              icon: Icons.event_busy_outlined,
              title: 'No confirmed sessions',
              message: 'Convert intake requests into scheduled mentor sessions to see them here.',
            )
          : Column(
              children: sessions
                  .map(
                    (session) => _ConfirmedSessionRow(
                      request: session,
                      onProgress: () => ref.read(tutorBookingControllerProvider.notifier).markInProgress(session.id),
                      onComplete: () => ref.read(tutorBookingControllerProvider.notifier).completeSession(session.id),
                      onCancel: () => ref.read(tutorBookingControllerProvider.notifier).cancelRequest(session.id),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _buildPackageSection(
    BuildContext context,
    List<TutorPackage> packages,
    List<Tutor> tutors,
  ) {
    return _SectionCard(
      icon: Icons.card_membership_outlined,
      title: 'Mentor packages',
      subtitle: 'Templatise high-performing bundles for team-based coaching.',
      trailing: TextButton.icon(
        onPressed: () => _openPackageForm(context, tutors: tutors),
        icon: const Icon(Icons.add_circle_outline),
        label: const Text('New package'),
      ),
      child: packages.isEmpty
          ? const _EmptyContent(
              icon: Icons.workspace_premium_outlined,
              title: 'No packages configured',
              message: 'Bundle sessions and async coaching deliverables to streamline procurement.',
            )
          : Column(
              children: packages
                  .map(
                    (pkg) => _PackageTile(
                      package: pkg,
                      tutor: tutors.firstWhere(
                        (tutor) => tutor.id == pkg.tutorId,
                        orElse: () => tutors.isNotEmpty ? tutors.first : Tutor.empty(),
                      ),
                      onEdit: () => _openPackageForm(context, package: pkg, tutors: tutors),
                      onDelete: () => ref.read(tutorBookingControllerProvider.notifier).deletePackage(pkg.id),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _buildCompletedSection(BuildContext context, List<TutorBookingRequest> sessions) {
    return _SectionCard(
      icon: Icons.emoji_events_outlined,
      title: 'Celebrated wins',
      subtitle: 'Closed mentorship loops and capture testimonials.',
      child: sessions.isEmpty
          ? const _EmptyContent(
              icon: Icons.sentiment_satisfied_alt_outlined,
              title: 'No sessions completed yet',
              message: 'Mark sessions complete after retros to celebrate momentum.',
            )
          : Column(
              children: sessions
                  .map(
                    (session) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.star_outline),
                      title: Text(session.learnerName),
                      subtitle: Text(
                        '${session.topic}\nCompleted ${DateFormat.yMMMd().format(session.scheduledAt ?? session.requestedAt)}',
                      ),
                      isThreeLine: true,
                      trailing: Text(_currencyFormat.format(session.totalValue)),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Future<void> _openRequestForm(
    BuildContext context, {
    TutorBookingRequest? request,
    required List<Tutor> tutors,
  }) async {
    final nameController = TextEditingController(text: request?.learnerName ?? '');
    final emailController = TextEditingController(text: request?.learnerEmail ?? '');
    final topicController = TextEditingController(text: request?.topic ?? '');
    final durationController = TextEditingController(text: request?.durationMinutes.toString() ?? '60');
    final rateController = TextEditingController(text: request != null ? request.rate.toStringAsFixed(0) : '240');
    final notesController = TextEditingController(text: request?.notes ?? '');
    Tutor? selectedTutor = request != null && request.tutorId != null
        ? tutors.firstWhere(
            (tutor) => tutor.id == request.tutorId,
            orElse: () => tutors.isNotEmpty ? tutors.first : Tutor.empty(),
          )
        : (tutors.isNotEmpty ? tutors.first : null);

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            top: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                request == null ? 'Capture booking request' : 'Update request',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Learner name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailController,
                decoration: const InputDecoration(labelText: 'Learner email'),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: topicController,
                decoration: const InputDecoration(labelText: 'Session focus'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: durationController,
                      decoration: const InputDecoration(labelText: 'Duration (minutes)'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: rateController,
                      decoration: const InputDecoration(labelText: 'Rate (USD/hour)'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<Tutor>(
                value: selectedTutor,
                decoration: const InputDecoration(labelText: 'Preferred mentor'),
                items: tutors
                    .map((tutor) => DropdownMenuItem(value: tutor, child: Text(tutor.name)))
                    .toList(),
                onChanged: (value) => selectedTutor = value,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesController,
                decoration: const InputDecoration(labelText: 'Internal notes'),
                maxLines: 2,
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () {
                  final duration = int.tryParse(durationController.text) ?? 60;
                  final rate = double.tryParse(rateController.text) ?? 200;
                  final requestModel = TutorBookingRequest(
                    id: request?.id ?? generateCommerceId('booking'),
                    learnerName: nameController.text.trim(),
                    learnerEmail: emailController.text.trim(),
                    topic: topicController.text.trim(),
                    requestedAt: request?.requestedAt ?? DateTime.now(),
                    durationMinutes: duration,
                    rate: rate,
                    currency: 'USD',
                    status: request?.status ?? TutorBookingStatus.intake,
                    tutorId: selectedTutor?.id,
                    notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
                    intakeUrl: request?.intakeUrl,
                    scheduledAt: request?.scheduledAt,
                    paymentMethodId: request?.paymentMethodId,
                  );
                  final controller = ref.read(tutorBookingControllerProvider.notifier);
                  if (request == null) {
                    controller.createRequest(requestModel);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('${requestModel.learnerName} request captured.')), 
                    );
                  } else {
                    controller.updateRequest(requestModel);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Request updated.')), 
                    );
                  }
                  Navigator.of(context).pop();
                },
                child: Text(request == null ? 'Save request' : 'Save changes'),
              )
            ],
          ),
        );
      },
    );
  }

  Future<void> _openAssignSheet(
    BuildContext context,
    TutorBookingRequest request, {
    required List<Tutor> tutors,
  }) async {
    final controller = ref.read(tutorBookingControllerProvider.notifier);
    Tutor? selectedTutor = request.tutorId != null
        ? tutors.firstWhere(
            (tutor) => tutor.id == request.tutorId,
            orElse: () => tutors.isNotEmpty ? tutors.first : Tutor.empty(),
          )
        : (tutors.isNotEmpty ? tutors.first : null);
    final intakeController = TextEditingController(text: request.intakeUrl ?? '');

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            top: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Assign mentor to ${request.learnerName}',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<Tutor>(
                value: selectedTutor,
                items: tutors.map((tutor) => DropdownMenuItem(value: tutor, child: Text(tutor.name))).toList(),
                onChanged: (value) => selectedTutor = value,
                decoration: const InputDecoration(labelText: 'Mentor'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: intakeController,
                decoration: const InputDecoration(labelText: 'Intake or prep form URL'),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: selectedTutor == null
                    ? null
                    : () {
                        controller.assignTutor(
                          requestId: request.id,
                          tutorId: selectedTutor!.id,
                          intakeUrl: intakeController.text.trim().isEmpty ? null : intakeController.text.trim(),
                        );
                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${selectedTutor!.name} assigned.')), 
                        );
                      },
                child: const Text('Assign mentor'),
              )
            ],
          ),
        );
      },
    );
  }

  Future<void> _openPackageForm(
    BuildContext context, {
    TutorPackage? package,
    required List<Tutor> tutors,
  }) async {
    final nameController = TextEditingController(text: package?.name ?? '');
    final descriptionController = TextEditingController(text: package?.description ?? '');
    final sessionCountController = TextEditingController(text: package?.sessionCount.toString() ?? '4');
    final durationController = TextEditingController(text: package?.sessionDurationMinutes.toString() ?? '60');
    final priceController = TextEditingController(text: package != null ? package.price.toStringAsFixed(0) : '960');
    final tutor = package != null
        ? tutors.firstWhere(
            (tutor) => tutor.id == package.tutorId,
            orElse: () => tutors.isNotEmpty ? tutors.first : Tutor.empty(),
          )
        : (tutors.isNotEmpty ? tutors.first : null);
    bool active = package?.active ?? true;
    Tutor? selectedTutor = tutor;

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            top: 24,
          ),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    package == null ? 'Create mentor package' : 'Update package',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Package name'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(labelText: 'Description'),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<Tutor>(
                    value: selectedTutor,
                    decoration: const InputDecoration(labelText: 'Primary mentor'),
                    items: tutors
                        .map((tutor) => DropdownMenuItem(value: tutor, child: Text(tutor.name)))
                        .toList(),
                    onChanged: (value) => setModalState(() => selectedTutor = value),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: sessionCountController,
                          decoration: const InputDecoration(labelText: 'Number of sessions'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: durationController,
                          decoration: const InputDecoration(labelText: 'Duration (minutes)'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: priceController,
                    decoration: const InputDecoration(labelText: 'Package price (USD)'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Active package'),
                    value: active,
                    onChanged: (value) => setModalState(() => active = value),
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: selectedTutor == null
                        ? null
                        : () {
                            final sessions = int.tryParse(sessionCountController.text) ?? 4;
                            final duration = int.tryParse(durationController.text) ?? 60;
                            final price = double.tryParse(priceController.text) ?? 0;
                            final pkgModel = TutorPackage(
                              id: package?.id ?? generateCommerceId('package'),
                              name: nameController.text.trim(),
                              description: descriptionController.text.trim(),
                              tutorId: selectedTutor!.id,
                              sessionCount: sessions,
                              sessionDurationMinutes: duration,
                              price: price,
                              currency: 'USD',
                              active: active,
                            );
                            final controller = ref.read(tutorBookingControllerProvider.notifier);
                            controller.upsertPackage(pkgModel);
                            Navigator.of(context).pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('${pkgModel.name} saved.')), 
                            );
                          },
                    child: Text(package == null ? 'Create package' : 'Save changes'),
                  )
                ],
              );
            },
          ),
        );
      },
    );
  }
}

class _MetricPill extends StatelessWidget {
  const _MetricPill({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
      ),
      child: Row(
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.labelMedium),
                Text(
                  value,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget child;
  final Widget? trailing;

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
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                    ],
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

class _EmptyContent extends StatelessWidget {
  const _EmptyContent({required this.icon, required this.title, required this.message});

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.4),
      ),
      child: Column(
        children: [
          Icon(icon, size: 36, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 12),
          Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    required this.tutors,
    required this.onAssign,
    required this.onEdit,
    required this.onCancel,
    required this.onDelete,
  });

  final TutorBookingRequest request;
  final List<Tutor> tutors;
  final VoidCallback onAssign;
  final VoidCallback onEdit;
  final VoidCallback onCancel;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tutor = request.tutorId != null
        ? tutors.firstWhere(
            (tutor) => tutor.id == request.tutorId,
            orElse: () => tutors.isNotEmpty ? tutors.first : Tutor.empty(),
          )
        : null;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.primary.withOpacity(0.08)),
      ),
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
                      request.learnerName,
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(request.topic, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              Chip(
                label: Text(request.status.label),
                avatar: Icon(
                  request.status == TutorBookingStatus.awaitingPayment
                      ? Icons.payments_outlined
                      : request.status == TutorBookingStatus.intake
                          ? Icons.assignment_outlined
                          : Icons.pending_actions_outlined,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text('${request.durationMinutes} minutes • ${NumberFormat.simpleCurrency().format(request.totalValue)}'),
          if (tutor != null) ...[
            const SizedBox(height: 6),
            Text('Preferred mentor: ${tutor.name}', style: theme.textTheme.bodySmall),
          ],
          if (request.notes != null && request.notes!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(request.notes!, style: theme.textTheme.bodySmall),
          ],
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.tonalIcon(
                onPressed: onAssign,
                icon: const Icon(Icons.route_outlined),
                label: const Text('Assign mentor'),
              ),
              OutlinedButton.icon(
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Edit'),
              ),
              TextButton.icon(
                onPressed: onCancel,
                icon: const Icon(Icons.cancel_outlined),
                label: const Text('Cancel'),
              ),
              TextButton.icon(
                style: TextButton.styleFrom(foregroundColor: theme.colorScheme.error),
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline),
                label: const Text('Delete'),
              ),
            ],
          )
        ],
      ),
    );
  }
}

class _ConfirmedSessionRow extends StatelessWidget {
  const _ConfirmedSessionRow({
    required this.request,
    required this.onProgress,
    required this.onComplete,
    required this.onCancel,
  });

  final TutorBookingRequest request;
  final VoidCallback onProgress;
  final VoidCallback onComplete;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.video_camera_front_outlined),
      title: Text(request.topic),
      subtitle: Text(
        '${request.learnerName}\n${DateFormat.yMMMd().add_jm().format(request.scheduledAt ?? DateTime.now())}',
      ),
      isThreeLine: true,
      trailing: Wrap(
        spacing: 8,
        children: [
          if (request.status == TutorBookingStatus.confirmed)
            TextButton(onPressed: onProgress, child: const Text('Start session')),
          TextButton(onPressed: onComplete, child: const Text('Complete')),
          TextButton(onPressed: onCancel, child: const Text('Cancel')),
        ],
      ),
    );
  }
}

class _PackageTile extends StatelessWidget {
  const _PackageTile({
    required this.package,
    required this.tutor,
    required this.onEdit,
    required this.onDelete,
  });

  final TutorPackage package;
  final Tutor tutor;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.primary.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(package.name, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('Mentor: ${tutor.name}', style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              Chip(
                avatar: Icon(package.active ? Icons.check_circle_outline : Icons.pause_circle_outline),
                label: Text(package.active ? 'Active' : 'Paused'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(package.description, style: theme.textTheme.bodyMedium),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            children: [
              _PackageStat(icon: Icons.calendar_today_outlined, label: 'Sessions', value: package.sessionCount.toString()),
              _PackageStat(icon: Icons.timer_outlined, label: 'Duration', value: '${package.sessionDurationMinutes} mins'),
              _PackageStat(icon: Icons.price_change_outlined, label: 'Price', value: NumberFormat.simpleCurrency().format(package.price)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              OutlinedButton.icon(onPressed: onEdit, icon: const Icon(Icons.edit_outlined), label: const Text('Edit package')),
              const SizedBox(width: 12),
              TextButton.icon(
                style: TextButton.styleFrom(foregroundColor: theme.colorScheme.error),
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline),
                label: const Text('Delete'),
              ),
            ],
          )
        ],
      ),
    );
  }
}

class _PackageStat extends StatelessWidget {
  const _PackageStat({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            Text(value, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          ],
        )
      ],
    );
  }
}

extension TutorX on Tutor {
  static Tutor empty() {
    return Tutor(
      id: 'tutor-empty',
      name: 'Tutor',
      headline: '',
      expertise: const <String>[],
      bio: '',
      languages: const <String>[],
      avatarUrl: '',
      availability: const <TutorAvailability>[],
    );
  }
}
