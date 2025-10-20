import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/commerce/commerce_payments_controller.dart';
import '../provider/commerce/community_subscription_controller.dart';
import '../services/commerce_models.dart';

class CommunitySubscriptionScreen extends ConsumerStatefulWidget {
  const CommunitySubscriptionScreen({super.key});

  @override
  ConsumerState<CommunitySubscriptionScreen> createState() => _CommunitySubscriptionScreenState();
}

class _CommunitySubscriptionScreenState extends ConsumerState<CommunitySubscriptionScreen> {
  final NumberFormat _currencyFormat = NumberFormat.simpleCurrency();

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      await ref.read(communitySubscriptionControllerProvider.notifier).bootstrap();
      await ref.read(commercePaymentsControllerProvider.notifier).bootstrap();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(communitySubscriptionControllerProvider);
    final controller = ref.read(communitySubscriptionControllerProvider.notifier);
    final payments = ref.watch(commercePaymentsControllerProvider).methods;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Community subscriptions'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await controller.refresh();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Subscription workspace refreshed.')), 
              );
            },
          ),
          IconButton(
            tooltip: 'New plan',
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => _openPlanSheet(context),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openSubscriberSheet(context),
        icon: const Icon(Icons.person_add_alt_1_outlined),
        label: const Text('Add subscriber'),
      ),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: state.loading && !state.bootstrapped
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 320, child: Center(child: CircularProgressIndicator())),
                ],
              )
            : ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildHero(context, state),
                  const SizedBox(height: 24),
                  _buildPlanSection(context, state.plans),
                  const SizedBox(height: 24),
                  _buildSubscriberSection(context, state),
                  const SizedBox(height: 24),
                  _buildInvoiceSection(context, state.invoices, payments),
                  const SizedBox(height: 48),
                ],
              ),
      ),
    );
  }

  Widget _buildHero(BuildContext context, CommunitySubscriptionState state) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.secondary.withOpacity(0.1), Colors.white],
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
                avatar: const Icon(Icons.people_outline),
                label: Text('${state.activeSubscribers} active members'),
              ),
              Chip(
                avatar: const Icon(Icons.payments_outlined),
                label: Text('MRR ${_currencyFormat.format(state.monthlyRecurringRevenue)}'),
              ),
              Chip(
                avatar: const Icon(Icons.trending_down_outlined),
                label: Text('Churn ${(state.churnRate * 100).toStringAsFixed(1)}%'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Community monetisation cockpit',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'Design pricing ladders, activate members, and reconcile invoices with one production-grade view.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.4),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _HeroMetric(
                  label: 'Annual run rate',
                  value: _currencyFormat.format(state.annualRunRate),
                  icon: Icons.rocket_launch_outlined,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _HeroMetric(
                  label: 'Plans live',
                  value: '${state.plans.length}',
                  icon: Icons.subscriptions_outlined,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _HeroMetric(
                  label: 'Invoices tracked',
                  value: '${state.invoices.length}',
                  icon: Icons.receipt_long_outlined,
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildPlanSection(BuildContext context, List<CommunitySubscriptionPlan> plans) {
    return _SectionCard(
      icon: Icons.layers_outlined,
      title: 'Membership plans',
      subtitle: 'Model tiers and experiments for community monetisation.',
      trailing: TextButton.icon(
        onPressed: () => _openPlanSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('New plan'),
      ),
      child: plans.isEmpty
          ? const _EmptyContent(
              icon: Icons.layers_clear,
              title: 'No plans configured',
              message: 'Publish at least one membership tier to start selling subscriptions.',
            )
          : Column(
              children: plans
                  .map(
                    (plan) => _PlanTile(
                      plan: plan,
                      onEdit: () => _openPlanSheet(context, plan: plan),
                      onDelete: () => ref.read(communitySubscriptionControllerProvider.notifier).deletePlan(plan.id),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _buildSubscriberSection(BuildContext context, CommunitySubscriptionState state) {
    final controller = ref.read(communitySubscriptionControllerProvider.notifier);
    final plans = {for (final plan in state.plans) plan.id: plan};
    final subscribers = state.subscribers;

    return _SectionCard(
      icon: Icons.people_alt_outlined,
      title: 'Subscribers',
      subtitle: 'Track lifecycle states, auto-renewals, and seats per account.',
      trailing: TextButton.icon(
        onPressed: () => _openSubscriberSheet(context),
        icon: const Icon(Icons.person_add_alt_1_outlined),
        label: const Text('Add member'),
      ),
      child: subscribers.isEmpty
          ? const _EmptyContent(
              icon: Icons.people_outline,
              title: 'No subscribers yet',
              message: 'Launch plan trials or import members from your billing system.',
            )
          : Column(
              children: subscribers
                  .map(
                    (subscriber) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(child: Text(subscriber.fullName.isNotEmpty ? subscriber.fullName[0] : '?')),
                      title: Text('${subscriber.fullName} • ${plans[subscriber.planId]?.name ?? 'Plan removed'}'),
                      subtitle: Text(
                        '${subscriber.email}\nStatus: ${subscriber.status.label} • Seats: ${subscriber.seats}\nRenewal: ${DateFormat.yMMMd().format(subscriber.currentPeriodEnd)}',
                      ),
                      isThreeLine: true,
                      trailing: Wrap(
                        spacing: 8,
                        children: [
                          TextButton(
                            onPressed: () => _openSubscriberSheet(context, subscriber: subscriber),
                            child: const Text('Edit'),
                          ),
                          TextButton(
                            onPressed: () => controller.deleteSubscriber(subscriber.id),
                            child: const Text('Remove'),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _buildInvoiceSection(
    BuildContext context,
    List<CommunityInvoice> invoices,
    List<CommercePaymentMethod> payments,
  ) {
    final controller = ref.read(communitySubscriptionControllerProvider.notifier);
    final plans = ref.read(communitySubscriptionControllerProvider).plans;
    final planNames = {for (final plan in plans) plan.id: plan.name};

    return _SectionCard(
      icon: Icons.receipt_long_outlined,
      title: 'Invoices',
      subtitle: 'Keep fiscal controls tight with real-time billing history.',
      trailing: TextButton.icon(
        onPressed: () => _openInvoiceSheet(context),
        icon: const Icon(Icons.add_chart_outlined),
        label: const Text('Record invoice'),
      ),
      child: invoices.isEmpty
          ? const _EmptyContent(
              icon: Icons.receipt_long_outlined,
              title: 'No invoices recorded',
              message: 'Sync your billing runs or manually log invoices for visibility.',
            )
          : Column(
              children: invoices
                  .map(
                    (invoice) => ExpansionTile(
                      key: ValueKey(invoice.id),
                      tilePadding: EdgeInsets.zero,
                      title: Text('Invoice ${invoice.id.substring(0, 8)}'),
                      subtitle: Text('${planNames[invoice.planId] ?? 'Plan removed'} • ${invoice.status.label}'),
                      childrenPadding: EdgeInsets.zero,
                      children: [
                        _InvoiceRow(label: 'Amount', value: _currencyFormat.format(invoice.amount)),
                        _InvoiceRow(label: 'Tax', value: _currencyFormat.format(invoice.tax)),
                        _InvoiceRow(label: 'Discount', value: _currencyFormat.format(invoice.discount)),
                        _InvoiceRow(label: 'Issued', value: DateFormat.yMMMd().format(invoice.issuedAt)),
                        _InvoiceRow(label: 'Due', value: DateFormat.yMMMd().format(invoice.dueDate)),
                        if (invoice.paidAt != null)
                          _InvoiceRow(label: 'Paid', value: DateFormat.yMMMd().format(invoice.paidAt!)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: [
                            TextButton(
                              onPressed: () => _openInvoiceSheet(context, invoice: invoice),
                              child: const Text('Edit'),
                            ),
                            TextButton(
                              onPressed: () => controller.deleteInvoice(invoice.id),
                              child: const Text('Delete'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Future<void> _openPlanSheet(BuildContext context, {CommunitySubscriptionPlan? plan}) async {
    final controller = ref.read(communitySubscriptionControllerProvider.notifier);
    final nameController = TextEditingController(text: plan?.name ?? '');
    final descriptionController = TextEditingController(text: plan?.description ?? '');
    final priceController = TextEditingController(text: plan != null ? plan.price.toStringAsFixed(0) : '79');
    final trialController = TextEditingController(text: plan?.trialDays.toString() ?? '7');
    BillingCycle cycle = plan?.billingCycle ?? BillingCycle.monthly;
    bool featured = plan?.featured ?? false;
    bool active = plan?.active ?? true;
    final featureController = TextEditingController();
    final features = plan != null ? List<String>.from(plan.features) : <String>[];

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
                    plan == null ? 'Create plan' : 'Update plan',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Plan name'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(labelText: 'Description'),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<BillingCycle>(
                    value: cycle,
                    decoration: const InputDecoration(labelText: 'Billing cycle'),
                    items: BillingCycle.values
                        .map((cycle) => DropdownMenuItem(value: cycle, child: Text(cycle.label)))
                        .toList(),
                    onChanged: (value) => setModalState(() => cycle = value ?? cycle),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: priceController,
                          decoration: const InputDecoration(labelText: 'Price (USD)'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: trialController,
                          decoration: const InputDecoration(labelText: 'Trial days'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: featureController,
                    decoration: InputDecoration(
                      labelText: 'Add feature',
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.add),
                        onPressed: () {
                          final value = featureController.text.trim();
                          if (value.isNotEmpty) {
                            setModalState(() {
                              features.add(value);
                              featureController.clear();
                            });
                          }
                        },
                      ),
                    ),
                  ),
                  if (features.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      children: features
                          .map((feature) => InputChip(
                                label: Text(feature),
                                onDeleted: () => setModalState(() => features.remove(feature)),
                              ))
                          .toList(),
                    ),
                  const SizedBox(height: 12),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Featured plan'),
                    value: featured,
                    onChanged: (value) => setModalState(() => featured = value),
                  ),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Active'),
                    value: active,
                    onChanged: (value) => setModalState(() => active = value),
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: () {
                      final price = double.tryParse(priceController.text) ?? 0;
                      final trial = int.tryParse(trialController.text) ?? 0;
                      final planModel = CommunitySubscriptionPlan(
                        id: plan?.id ?? generateCommerceId('plan'),
                        name: nameController.text.trim(),
                        description: descriptionController.text.trim(),
                        price: price,
                        currency: 'USD',
                        billingCycle: cycle,
                        trialDays: trial,
                        features: features,
                        featured: featured,
                        active: active,
                      );
                      controller.upsertPlan(planModel);
                      Navigator.of(context).pop();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('${planModel.name} saved.')), 
                      );
                    },
                    child: Text(plan == null ? 'Create plan' : 'Save changes'),
                  )
                ],
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _openSubscriberSheet(BuildContext context, {CommunitySubscriber? subscriber}) async {
    final controller = ref.read(communitySubscriptionControllerProvider.notifier);
    final plans = ref.read(communitySubscriptionControllerProvider).plans;
    final payments = ref.read(commercePaymentsControllerProvider).methods;
    final nameController = TextEditingController(text: subscriber?.fullName ?? '');
    final emailController = TextEditingController(text: subscriber?.email ?? '');
    final companyController = TextEditingController(text: subscriber?.company ?? '');
    final seatsController = TextEditingController(text: subscriber?.seats.toString() ?? '1');
    CommunitySubscriptionPlan? selectedPlan = subscriber != null
        ? plans.firstWhere((plan) => plan.id == subscriber.planId, orElse: () => plans.isNotEmpty ? plans.first : null)
        : (plans.isNotEmpty ? plans.first : null);
    SubscriptionStatus status = subscriber?.status ?? SubscriptionStatus.active;
    bool autoRenew = subscriber?.autoRenew ?? true;
    DateTime currentPeriodEnd = subscriber?.currentPeriodEnd ?? DateTime.now().add(const Duration(days: 30));
    CommercePaymentMethod? selectedPayment = subscriber?.paymentMethodId != null
        ? payments.firstWhere((method) => method.id == subscriber!.paymentMethodId, orElse: () => payments.firstOrNull)
        : (payments.firstOrNull);
    final notesController = TextEditingController(text: subscriber?.notes ?? '');

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
                    subscriber == null ? 'Add subscriber' : 'Update subscriber',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Full name'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: emailController,
                    decoration: const InputDecoration(labelText: 'Email'),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: companyController,
                    decoration: const InputDecoration(labelText: 'Company / team'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<CommunitySubscriptionPlan>(
                    value: selectedPlan,
                    decoration: const InputDecoration(labelText: 'Plan'),
                    items: plans
                        .map((plan) => DropdownMenuItem(value: plan, child: Text('${plan.name} • ${_currencyFormat.format(plan.price)}')))
                        .toList(),
                    onChanged: (value) => setModalState(() => selectedPlan = value),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<SubscriptionStatus>(
                    value: status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: SubscriptionStatus.values
                        .map((status) => DropdownMenuItem(value: status, child: Text(status.label)))
                        .toList(),
                    onChanged: (value) => setModalState(() => status = value ?? status),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: seatsController,
                          decoration: const InputDecoration(labelText: 'Seats'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _DatePickerField(
                          label: 'Current period end',
                          value: currentPeriodEnd,
                          onChanged: (date) => setModalState(() => currentPeriodEnd = date),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<CommercePaymentMethod>(
                    value: selectedPayment,
                    decoration: const InputDecoration(labelText: 'Payment method'),
                    items: payments
                        .map((method) => DropdownMenuItem(value: method, child: Text(method.displayName)))
                        .toList(),
                    onChanged: (value) => setModalState(() => selectedPayment = value),
                  ),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Auto-renew'),
                    value: autoRenew,
                    onChanged: (value) => setModalState(() => autoRenew = value),
                  ),
                  TextField(
                    controller: notesController,
                    decoration: const InputDecoration(labelText: 'Notes'),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: selectedPlan == null
                        ? null
                        : () {
                            final seats = int.tryParse(seatsController.text) ?? 1;
                            final model = CommunitySubscriber(
                              id: subscriber?.id ?? generateCommerceId('subscriber'),
                              fullName: nameController.text.trim(),
                              email: emailController.text.trim(),
                              company: companyController.text.trim(),
                              planId: selectedPlan!.id,
                              status: status,
                              joinedAt: subscriber?.joinedAt ?? DateTime.now(),
                              currentPeriodEnd: currentPeriodEnd,
                              autoRenew: autoRenew,
                              seats: seats,
                              paymentMethodId: selectedPayment?.id,
                              notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
                            );
                            if (subscriber == null) {
                              controller.upsertSubscriber(model);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('${model.fullName} subscribed.')), 
                              );
                            } else {
                              controller.upsertSubscriber(model);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Subscriber updated.')), 
                              );
                            }
                            Navigator.of(context).pop();
                          },
                    child: Text(subscriber == null ? 'Add subscriber' : 'Save changes'),
                  )
                ],
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _openInvoiceSheet(BuildContext context, {CommunityInvoice? invoice}) async {
    final controller = ref.read(communitySubscriptionControllerProvider.notifier);
    final state = ref.read(communitySubscriptionControllerProvider);
    final plans = state.plans;
    final subscribers = state.subscribers;
    CommunitySubscriber? selectedSubscriber = invoice != null
        ? subscribers.firstWhere((subscriber) => subscriber.id == invoice.subscriberId, orElse: () => subscribers.firstOrNull)
        : (subscribers.firstOrNull);
    CommunitySubscriptionPlan? selectedPlan = invoice != null
        ? plans.firstWhere((plan) => plan.id == invoice.planId, orElse: () => plans.firstOrNull)
        : (plans.firstOrNull);
    final amountController = TextEditingController(text: invoice != null ? invoice.amount.toStringAsFixed(2) : '79');
    final taxController = TextEditingController(text: invoice != null ? invoice.tax.toStringAsFixed(2) : '0');
    final discountController = TextEditingController(text: invoice != null ? invoice.discount.toStringAsFixed(2) : '0');
    DateTime issuedAt = invoice?.issuedAt ?? DateTime.now();
    DateTime dueDate = invoice?.dueDate ?? DateTime.now().add(const Duration(days: 7));
    DateTime? paidAt = invoice?.paidAt;
    InvoiceStatus status = invoice?.status ?? InvoiceStatus.open;

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
                    invoice == null ? 'Record invoice' : 'Update invoice',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<CommunitySubscriber>(
                    value: selectedSubscriber,
                    decoration: const InputDecoration(labelText: 'Subscriber'),
                    items: subscribers
                        .map((subscriber) => DropdownMenuItem(
                              value: subscriber,
                              child: Text(subscriber.fullName),
                            ))
                        .toList(),
                    onChanged: (value) {
                      setModalState(() => selectedSubscriber = value);
                      if (value != null) {
                        final plan = plans.firstWhere(
                          (plan) => plan.id == value.planId,
                          orElse: () => selectedPlan ?? plans.first,
                        );
                        setModalState(() => selectedPlan = plan);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<CommunitySubscriptionPlan>(
                    value: selectedPlan,
                    decoration: const InputDecoration(labelText: 'Plan'),
                    items: plans
                        .map((plan) => DropdownMenuItem(value: plan, child: Text(plan.name)))
                        .toList(),
                    onChanged: (value) => setModalState(() => selectedPlan = value),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: amountController,
                          decoration: const InputDecoration(labelText: 'Amount (USD)'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: taxController,
                          decoration: const InputDecoration(labelText: 'Tax (USD)'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: discountController,
                    decoration: const InputDecoration(labelText: 'Discount (USD)'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _DatePickerField(
                          label: 'Issued',
                          value: issuedAt,
                          onChanged: (date) => setModalState(() => issuedAt = date),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _DatePickerField(
                          label: 'Due',
                          value: dueDate,
                          onChanged: (date) => setModalState(() => dueDate = date),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<InvoiceStatus>(
                    value: status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: InvoiceStatus.values
                        .map((status) => DropdownMenuItem(value: status, child: Text(status.label)))
                        .toList(),
                    onChanged: (value) => setModalState(() => status = value ?? status),
                  ),
                  if (status == InvoiceStatus.paid)
                    _DatePickerField(
                      label: 'Paid at',
                      value: paidAt ?? DateTime.now(),
                      onChanged: (date) => setModalState(() => paidAt = date),
                      onClear: () => setModalState(() => paidAt = null),
                    ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: selectedSubscriber == null || selectedPlan == null
                        ? null
                        : () {
                            final amount = double.tryParse(amountController.text) ?? 0;
                            final tax = double.tryParse(taxController.text) ?? 0;
                            final discount = double.tryParse(discountController.text) ?? 0;
                            final invoiceModel = CommunityInvoice(
                              id: invoice?.id ?? generateCommerceId('invoice'),
                              subscriberId: selectedSubscriber!.id,
                              planId: selectedPlan!.id,
                              amount: amount,
                              currency: 'USD',
                              tax: tax,
                              discount: discount,
                              status: status,
                              issuedAt: issuedAt,
                              dueDate: dueDate,
                              paidAt: paidAt,
                            );
                            controller.upsertInvoice(invoiceModel);
                            Navigator.of(context).pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Invoice ${invoiceModel.id.substring(0, 8)} saved.')), 
                            );
                          },
                    child: Text(invoice == null ? 'Record invoice' : 'Save changes'),
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

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: Theme.of(context).colorScheme.secondary.withOpacity(0.12),
      ),
      child: Row(
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.secondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.labelMedium),
                Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
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
                      Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
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
          Icon(icon, size: 36, color: Theme.of(context).colorScheme.secondary),
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

class _PlanTile extends StatelessWidget {
  const _PlanTile({required this.plan, required this.onEdit, required this.onDelete});

  final CommunitySubscriptionPlan plan;
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
        border: Border.all(color: theme.colorScheme.secondary.withOpacity(0.12)),
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
                    Text(plan.name, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(plan.description, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              Chip(
                avatar: Icon(plan.featured ? Icons.rocket_launch_outlined : Icons.layers_outlined),
                label: Text(plan.featured ? 'Featured' : plan.billingCycle.label),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text('${NumberFormat.simpleCurrency().format(plan.price)} • Trial ${plan.trialDays} days'),
          if (plan.features.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: plan.features.map((feature) => Chip(label: Text(feature))).toList(),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              OutlinedButton.icon(onPressed: onEdit, icon: const Icon(Icons.edit_outlined), label: const Text('Edit plan')),
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

class _InvoiceRow extends StatelessWidget {
  const _InvoiceRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(width: 140, child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
          Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyMedium)),
        ],
      ),
    );
  }
}

class _DatePickerField extends StatelessWidget {
  const _DatePickerField({
    required this.label,
    required this.value,
    required this.onChanged,
    this.onClear,
  });

  final String label;
  final DateTime value;
  final ValueChanged<DateTime> onChanged;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final controller = TextEditingController(text: DateFormat.yMMMd().format(value));
    return TextField(
      controller: controller,
      readOnly: true,
      decoration: InputDecoration(
        labelText: label,
        suffixIcon: onClear != null
            ? IconButton(
                icon: const Icon(Icons.clear),
                onPressed: onClear,
              )
            : const Icon(Icons.calendar_month_outlined),
      ),
      onTap: () async {
        final now = DateTime.now();
        final picked = await showDatePicker(
          context: context,
          initialDate: value,
          firstDate: DateTime(now.year - 1),
          lastDate: DateTime(now.year + 3),
        );
        if (picked != null) {
          onChanged(picked);
        }
      },
    );
  }
}

extension _FirstOrNull<E> on List<E> {
  E? get firstOrNull => isEmpty ? null : first;
}
