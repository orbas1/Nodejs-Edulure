import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../provider/commerce/commerce_payments_controller.dart';
import '../provider/commerce/course_checkout_controller.dart';
import '../provider/learning/learning_models.dart';
import '../provider/learning/learning_store.dart';
import '../services/commerce_models.dart';

class CoursePurchaseScreen extends ConsumerStatefulWidget {
  const CoursePurchaseScreen({super.key});

  @override
  ConsumerState<CoursePurchaseScreen> createState() => _CoursePurchaseScreenState();
}

class _CoursePurchaseScreenState extends ConsumerState<CoursePurchaseScreen> {
  final TextEditingController _searchController = TextEditingController();
  final NumberFormat _currencyFormat = NumberFormat.simpleCurrency();
  String _orderFilter = 'all';
  bool _showArchivedOffers = false;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      await ref.read(courseCheckoutControllerProvider.notifier).bootstrap();
      await ref.read(commercePaymentsControllerProvider.notifier).bootstrap();
      await ref.read(courseStoreProvider.notifier).ready;
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final checkoutState = ref.watch(courseCheckoutControllerProvider);
    final checkoutController = ref.read(courseCheckoutControllerProvider.notifier);
    final paymentState = ref.watch(commercePaymentsControllerProvider);
    final paymentsController = ref.read(commercePaymentsControllerProvider.notifier);
    final courses = ref.watch(courseStoreProvider);

    final offers = _filteredOffers(checkoutState.offers);
    final orders = _filteredOrders(checkoutState.orders);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Purchase courses'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await checkoutController.refresh();
              await paymentsController.bootstrap();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Commerce data refreshed')), 
              );
            },
          ),
          IconButton(
            tooltip: 'Add new cohort offer',
            icon: const Icon(Icons.add_card_outlined),
            onPressed: () => _openOfferSheet(context, courses: courses),
          ),
        ],
      ),
      floatingActionButton: checkoutState.offers.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openOrderWizard(context),
              icon: const Icon(Icons.shopping_bag_outlined),
              label: const Text('Create enrollment'),
            ),
      body: RefreshIndicator(
        onRefresh: () async {
          await checkoutController.refresh();
          await paymentsController.bootstrap();
        },
        child: checkoutState.loading && !checkoutState.bootstrapped
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 320, child: Center(child: CircularProgressIndicator())),
                ],
              )
            : ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildHeroSection(context, checkoutState),
                  const SizedBox(height: 24),
                  _buildPaymentMethodsCard(context, paymentState, paymentsController),
                  const SizedBox(height: 24),
                  _buildOfferSection(context, offers, courses),
                  const SizedBox(height: 24),
                  _buildCouponSection(context),
                  const SizedBox(height: 24),
                  _buildOrderSection(context, orders),
                  const SizedBox(height: 48),
                ],
              ),
      ),
    );
  }

  List<CourseCheckoutOffer> _filteredOffers(List<CourseCheckoutOffer> offers) {
    final query = _searchController.text.trim().toLowerCase();
    return offers.where((offer) {
      if (!_showArchivedOffers && !offer.published) {
        return false;
      }
      if (query.isEmpty) {
        return true;
      }
      return offer.cohortName.toLowerCase().contains(query) ||
          offer.courseTitle.toLowerCase().contains(query) ||
          offer.tags.any((tag) => tag.toLowerCase().contains(query));
    }).toList(growable: false);
  }

  List<CourseCheckoutOrder> _filteredOrders(List<CourseCheckoutOrder> orders) {
    if (_orderFilter == 'all') {
      return orders;
    }
    final status = CourseOrderStatus.values.firstWhere(
      (status) => status.name == _orderFilter,
      orElse: () => CourseOrderStatus.awaitingPayment,
    );
    return orders.where((order) => order.status == status).toList(growable: false);
  }

  Widget _buildHeroSection(BuildContext context, CourseCheckoutState state) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          colors: [theme.colorScheme.primary.withOpacity(0.12), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: theme.colorScheme.primary.withOpacity(0.12)),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 16, offset: Offset(0, 12)),
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Chip(
                avatar: const Icon(Icons.bolt_outlined),
                label: Text('${state.activeOffers} active cohorts'),
              ),
              Chip(
                avatar: const Icon(Icons.payments_outlined),
                label: Text('MRR ${_currencyFormat.format(state.monthlyRecurringRevenue)}'),
              ),
              Chip(
                avatar: const Icon(Icons.receipt_long_outlined),
                label: Text('${state.orders.length} orders recorded'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Run launch-grade course commerce',
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'Curate cohort offers, orchestrate high-intent checkouts, and reconcile payment signals without leaving the app.',
            style: theme.textTheme.bodyLarge?.copyWith(height: 1.4),
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              return Row(
                children: [
                  Expanded(child: _MetricTile(label: 'Total revenue', value: _currencyFormat.format(state.totalRevenue))),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _MetricTile(
                      label: 'Awaiting payment',
                      value: '${state.ordersByStatus(CourseOrderStatus.awaitingPayment).length} orders',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _MetricTile(
                      label: 'Completed enrollments',
                      value: '${state.ordersByStatus(CourseOrderStatus.completed).length}',
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search offers and cohorts',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => setState(() => _searchController.clear()),
                    ),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          SwitchListTile.adaptive(
            title: const Text('Show archived / unpublished cohorts'),
            contentPadding: EdgeInsets.zero,
            value: _showArchivedOffers,
            onChanged: (value) => setState(() => _showArchivedOffers = value),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodsCard(
    BuildContext context,
    CommercePaymentsState paymentState,
    CommercePaymentsController controller,
  ) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.credit_card_outlined),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Payment rails',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _openPaymentMethodForm(context),
                  icon: const Icon(Icons.add),
                  label: const Text('Add method'),
                )
              ],
            ),
            const SizedBox(height: 12),
            if (paymentState.loading)
              const LinearProgressIndicator(minHeight: 2),
            if (paymentState.error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  paymentState.error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            const SizedBox(height: 12),
            if (paymentState.methods.isEmpty)
              const Text('No payment methods configured yet.'),
            if (paymentState.methods.isNotEmpty)
              Column(
                children: paymentState.methods
                    .map(
                      (method) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.12),
                          child: Text(method.brand[0]),
                        ),
                        title: Text(method.displayName),
                        subtitle: Text('${method.brand.toUpperCase()} • Expires ${method.expMonth.toString().padLeft(2, '0')}/${method.expYear}'),
                        trailing: Wrap(
                          spacing: 8,
                          children: [
                            if (method.defaultMethod)
                              Chip(
                                avatar: const Icon(Icons.verified_outlined, size: 16),
                                label: const Text('Default'),
                              )
                            else
                              TextButton(
                                onPressed: () => controller.setDefault(method.id),
                                child: const Text('Make default'),
                              ),
                            IconButton(
                              tooltip: 'Edit method',
                              icon: const Icon(Icons.edit_outlined),
                              onPressed: () => _openPaymentMethodForm(context, method: method),
                            ),
                            IconButton(
                              tooltip: 'Remove method',
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () => controller.removeMethod(method.id),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              )
          ],
        ),
      ),
    );
  }

  Widget _buildOfferSection(
    BuildContext context,
    List<CourseCheckoutOffer> offers,
    List<Course> courses,
  ) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(20),
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
                        'Cohort offers',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      const Text('Clone, refine, and schedule conversion-ready course launches.'),
                    ],
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _openOfferSheet(context, courses: courses),
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text('New cohort'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (offers.isEmpty)
              const _EmptyState(
                icon: Icons.campaign_outlined,
                title: 'No offers yet',
                message: 'Create a cohort to publish in the catalog and unlock checkouts.',
              )
            else
              Column(
                children: offers.map((offer) => _buildOfferCard(context, offer, courses)).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfferCard(BuildContext context, CourseCheckoutOffer offer, List<Course> courses) {
    final controller = ref.read(courseCheckoutControllerProvider.notifier);
    final duration = offer.endDate.difference(offer.startDate).inDays;
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.primary.withOpacity(0.08)),
        color: offer.published ? Colors.white : theme.colorScheme.surfaceVariant.withOpacity(0.25),
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
                      offer.cohortName,
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text('${offer.courseTitle} • ${offer.deliveryFormat} • ${offer.pacing}',
                        style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              Chip(
                avatar: Icon(
                  offer.published ? Icons.public_outlined : Icons.archive_outlined,
                  size: 18,
                ),
                label: Text(offer.published ? 'Published' : 'Archived'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _OfferStat(icon: Icons.calendar_today_outlined, label: 'Launch', value: _formatDate(offer.startDate)),
              _OfferStat(icon: Icons.event_available_outlined, label: 'Wrap', value: _formatDate(offer.endDate)),
              _OfferStat(icon: Icons.people_alt_outlined, label: 'Seats', value: '${offer.seats} learners'),
              _OfferStat(icon: Icons.timer_outlined, label: 'Duration', value: '$duration days'),
              _OfferStat(icon: Icons.price_change_outlined, label: 'Tuition', value: _currencyFormat.format(offer.price)),
            ],
          ),
          const SizedBox(height: 12),
          if (offer.bonuses.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: offer.bonuses
                  .map(
                    (bonus) => Chip(
                      backgroundColor: theme.colorScheme.primary.withOpacity(0.08),
                      label: Text(bonus),
                    ),
                  )
                  .toList(),
            ),
          if (offer.tags.isNotEmpty) const SizedBox(height: 8),
          if (offer.tags.isNotEmpty)
            Wrap(
              spacing: 6,
              children: offer.tags.map((tag) => Chip(label: Text(tag))).toList(),
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: () => _openOfferSheet(context, offer: offer, courses: courses),
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Edit'),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: () {
                  final duplicated = controller.duplicateOffer(offer);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${duplicated.cohortName} duplicated. Update details before publishing.')),
                  );
                },
                icon: const Icon(Icons.copy_all_outlined),
                label: const Text('Duplicate'),
              ),
              const SizedBox(width: 12),
              TextButton.icon(
                style: TextButton.styleFrom(foregroundColor: theme.colorScheme.error),
                onPressed: () => _confirmDeleteOffer(context, offer.id),
                icon: const Icon(Icons.delete_outline),
                label: const Text('Delete'),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildCouponSection(BuildContext context) {
    final controller = ref.read(courseCheckoutControllerProvider.notifier);
    final coupons = ref.watch(courseCheckoutControllerProvider).coupons;
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.local_offer_outlined),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Coupons & incentives',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _openCouponSheet(context),
                  icon: const Icon(Icons.add),
                  label: const Text('Add coupon'),
                )
              ],
            ),
            const SizedBox(height: 12),
            if (coupons.isEmpty)
              const _EmptyState(
                icon: Icons.local_offer_outlined,
                title: 'No coupons configured',
                message: 'Incentivise early cohorts and corporate enrolments with managed discounts.',
              )
            else
              Column(
                children: coupons
                    .map(
                      (coupon) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.secondary.withOpacity(0.12),
                          child: Text(coupon.percentOff.toStringAsFixed(0)),
                        ),
                        title: Text('${coupon.code} • ${coupon.description}'),
                        subtitle: Text(_describeCoupon(coupon)),
                        trailing: Wrap(
                          spacing: 8,
                          children: [
                            IconButton(
                              tooltip: 'Edit coupon',
                              icon: const Icon(Icons.edit_outlined),
                              onPressed: () => _openCouponSheet(context, coupon: coupon),
                            ),
                            IconButton(
                              tooltip: 'Delete coupon',
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () => controller.deleteCoupon(coupon.code),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              )
          ],
        ),
      ),
    );
  }

  Widget _buildOrderSection(BuildContext context, List<CourseCheckoutOrder> orders) {
    final checkoutController = ref.read(courseCheckoutControllerProvider.notifier);
    final payments = ref.watch(commercePaymentsControllerProvider).methods;
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.receipt_long_outlined),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Order ledger',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                DropdownButton<String>(
                  value: _orderFilter,
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All statuses')),
                  ] +
                      CourseOrderStatus.values
                          .map((status) => DropdownMenuItem(
                                value: status.name,
                                child: Text(status.label),
                              ))
                          .toList(),
                  onChanged: (value) => setState(() => _orderFilter = value ?? 'all'),
                )
              ],
            ),
            const SizedBox(height: 12),
            if (orders.isEmpty)
              const _EmptyState(
                icon: Icons.receipt_long_outlined,
                title: 'No orders yet',
                message: 'Create an enrollment to generate invoices and fulfilment workflows.',
              )
            else
              Column(
                children: orders
                    .map(
                      (order) => ExpansionTile(
                        key: ValueKey(order.id),
                        tilePadding: EdgeInsets.zero,
                        expandedCrossAxisAlignment: CrossAxisAlignment.start,
                        title: Text(order.offerName),
                        subtitle: Text('${order.learnerName} • ${order.status.label}'),
                        children: [
                          const SizedBox(height: 8),
                          _OrderSummaryRow(label: 'Email', value: order.learnerEmail),
                          _OrderSummaryRow(label: 'Quantity', value: order.quantity.toString()),
                          _OrderSummaryRow(label: 'Subtotal', value: _currencyFormat.format(order.subtotal)),
                          _OrderSummaryRow(label: 'Discounts', value: _currencyFormat.format(order.discount)),
                          _OrderSummaryRow(label: 'Tax', value: _currencyFormat.format(order.tax)),
                          _OrderSummaryRow(label: 'Total', value: _currencyFormat.format(order.total)),
                          _OrderSummaryRow(
                            label: 'Payment method',
                            value: payments.firstWhere(
                                  (method) => method.id == order.paymentMethodId,
                                  orElse: () => CommercePaymentMethod.card(
                                    brand: 'Card',
                                    last4: '0000',
                                    expMonth: 1,
                                    expYear: DateTime.now().year,
                                  ),
                                ).displayName,
                          ),
                          _OrderSummaryRow(
                            label: 'Created',
                            value: DateFormat.yMMMd().add_jm().format(order.createdAt),
                          ),
                          if (order.notes != null && order.notes!.isNotEmpty)
                            _OrderSummaryRow(label: 'Notes', value: order.notes!),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              if (order.status == CourseOrderStatus.awaitingPayment)
                                FilledButton.tonalIcon(
                                  onPressed: () => checkoutController.updateOrderStatus(order.id, CourseOrderStatus.paid),
                                  icon: const Icon(Icons.verified_outlined),
                                  label: const Text('Mark as paid'),
                                ),
                              if (order.status == CourseOrderStatus.paid)
                                FilledButton.tonalIcon(
                                  onPressed: () => checkoutController.updateOrderStatus(order.id, CourseOrderStatus.provisioning),
                                  icon: const Icon(Icons.settings_suggest_outlined),
                                  label: const Text('Start provisioning'),
                                ),
                              if (order.status == CourseOrderStatus.provisioning)
                                FilledButton.tonalIcon(
                                  onPressed: () => checkoutController.updateOrderStatus(order.id, CourseOrderStatus.completed),
                                  icon: const Icon(Icons.check_circle_outlined),
                                  label: const Text('Complete enrollment'),
                                ),
                              TextButton.icon(
                                onPressed: () => checkoutController.updateOrderStatus(order.id, CourseOrderStatus.refunded),
                                icon: const Icon(Icons.undo_outlined),
                                label: const Text('Refund'),
                              ),
                              TextButton.icon(
                                onPressed: () => checkoutController.updateOrderStatus(order.id, CourseOrderStatus.canceled),
                                icon: const Icon(Icons.cancel_outlined),
                                label: const Text('Cancel order'),
                              ),
                              TextButton.icon(
                                style: TextButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
                                onPressed: () => checkoutController.deleteOrder(order.id),
                                icon: const Icon(Icons.delete_outline),
                                label: const Text('Remove record'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
                    )
                    .toList(),
              )
          ],
        ),
      ),
    );
  }

  Future<void> _openOfferSheet(
    BuildContext context, {
    CourseCheckoutOffer? offer,
    required List<Course> courses,
  }) async {
    final cohortController = TextEditingController(text: offer?.cohortName ?? '');
    final priceController = TextEditingController(text: offer != null ? offer.price.toStringAsFixed(0) : '249');
    final seatsController = TextEditingController(text: offer?.seats.toString() ?? '30');
    final pacingController = TextEditingController(text: offer?.pacing ?? '6-week sprint');
    final deliveryController = TextEditingController(text: offer?.deliveryFormat ?? 'Hybrid');
    final notesController = TextEditingController();
    DateTime startDate = offer?.startDate ?? DateTime.now().add(const Duration(days: 14));
    DateTime endDate = offer?.endDate ?? DateTime.now().add(const Duration(days: 60));
    bool liveSupport = offer?.liveSupport ?? true;
    bool published = offer?.published ?? true;
    final tags = offer != null ? List<String>.from(offer.tags) : <String>[];
    final bonuses = offer != null ? List<String>.from(offer.bonuses) : <String>[];
    String? selectedCourseId = offer?.courseId ?? (courses.isNotEmpty ? courses.first.id : null);

    final bonusController = TextEditingController();
    final tagController = TextEditingController();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
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
              return Form(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        offer == null ? 'Create cohort offer' : 'Edit ${offer.cohortName}',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 16),
                      if (courses.isNotEmpty)
                        DropdownButtonFormField<String>(
                          decoration: const InputDecoration(labelText: 'Source course'),
                          value: selectedCourseId,
                          items: courses
                              .map((course) => DropdownMenuItem(value: course.id, child: Text(course.title)))
                              .toList(),
                          onChanged: (value) => setModalState(() => selectedCourseId = value),
                        )
                      else
                        const Text('Add courses to the catalog to link new cohorts.'),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: cohortController,
                        decoration: const InputDecoration(labelText: 'Cohort name'),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: priceController,
                              decoration: const InputDecoration(labelText: 'Tuition (USD)'),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: seatsController,
                              decoration: const InputDecoration(labelText: 'Seats available'),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: deliveryController,
                        decoration: const InputDecoration(labelText: 'Delivery format'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: pacingController,
                        decoration: const InputDecoration(labelText: 'Learning cadence'),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _DateField(
                              label: 'Start date',
                              value: startDate,
                              onChanged: (date) => setModalState(() => startDate = date),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _DateField(
                              label: 'End date',
                              value: endDate,
                              onChanged: (date) => setModalState(() => endDate = date),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SwitchListTile.adaptive(
                        title: const Text('Include live mentor pods'),
                        contentPadding: EdgeInsets.zero,
                        value: liveSupport,
                        onChanged: (value) => setModalState(() => liveSupport = value),
                      ),
                      SwitchListTile.adaptive(
                        title: const Text('Publish immediately'),
                        contentPadding: EdgeInsets.zero,
                        value: published,
                        onChanged: (value) => setModalState(() => published = value),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: bonusController,
                        decoration: InputDecoration(
                          labelText: 'Add bonus',
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: () {
                              final value = bonusController.text.trim();
                              if (value.isNotEmpty) {
                                setModalState(() {
                                  bonuses.add(value);
                                  bonusController.clear();
                                });
                              }
                            },
                          ),
                        ),
                      ),
                      if (bonuses.isNotEmpty)
                        Wrap(
                          spacing: 8,
                          children: bonuses
                              .map(
                                (bonus) => InputChip(
                                  label: Text(bonus),
                                  onDeleted: () => setModalState(() => bonuses.remove(bonus)),
                                ),
                              )
                              .toList(),
                        ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: tagController,
                        decoration: InputDecoration(
                          labelText: 'Add tag',
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: () {
                              final value = tagController.text.trim();
                              if (value.isNotEmpty) {
                                setModalState(() {
                                  tags.add(value);
                                  tagController.clear();
                                });
                              }
                            },
                          ),
                        ),
                      ),
                      if (tags.isNotEmpty)
                        Wrap(
                          spacing: 8,
                          children: tags
                              .map(
                                (tag) => InputChip(
                                  label: Text(tag),
                                  onDeleted: () => setModalState(() => tags.remove(tag)),
                                ),
                              )
                              .toList(),
                        ),
                      const SizedBox(height: 20),
                      if (offer != null)
                        TextFormField(
                          controller: notesController,
                          decoration: const InputDecoration(
                            labelText: 'Internal notes',
                            hintText: 'Track changes or copy requests for ops',
                          ),
                          maxLines: 2,
                        ),
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: () {
                          if (selectedCourseId == null) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Select a course to link this cohort.')),
                            );
                            return;
                          }
                          final course = courses.firstWhere(
                            (course) => course.id == selectedCourseId,
                            orElse: () => courses.isNotEmpty ? courses.first : Course.empty(),
                          );
                          final controller = ref.read(courseCheckoutControllerProvider.notifier);
                          final price = double.tryParse(priceController.text) ?? 0;
                          final seats = int.tryParse(seatsController.text) ?? 0;
                          final newOffer = CourseCheckoutOffer(
                            id: offer?.id ?? generateCommerceId('offer'),
                            courseId: selectedCourseId!,
                            courseTitle: course.title,
                            cohortName: cohortController.text.trim().isEmpty
                                ? '${course.title} cohort'
                                : cohortController.text.trim(),
                            price: price,
                            currency: 'USD',
                            startDate: startDate,
                            endDate: endDate,
                            seats: seats,
                            deliveryFormat: deliveryController.text.trim(),
                            pacing: pacingController.text.trim(),
                            liveSupport: liveSupport,
                            tags: tags,
                            bonuses: bonuses,
                            published: published,
                          );
                          if (offer == null) {
                            controller.createOffer(newOffer);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('${newOffer.cohortName} created')),
                            );
                          } else {
                            controller.updateOffer(newOffer);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('${newOffer.cohortName} updated')), 
                            );
                          }
                          Navigator.of(context).pop();
                        },
                        child: Text(offer == null ? 'Save cohort offer' : 'Save changes'),
                      )
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _openCouponSheet(BuildContext context, {CourseCoupon? coupon}) async {
    final controller = ref.read(courseCheckoutControllerProvider.notifier);
    final codeController = TextEditingController(text: coupon?.code ?? '');
    final descriptionController = TextEditingController(text: coupon?.description ?? '');
    final percentController = TextEditingController(text: coupon != null ? coupon.percentOff.toStringAsFixed(0) : '10');
    final maxController = TextEditingController(text: coupon?.maxRedemptions?.toString() ?? '');
    DateTime? expiresAt = coupon?.expiresAt;
    bool active = coupon?.active ?? true;

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
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
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    coupon == null ? 'Create coupon' : 'Update ${coupon.code}',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: codeController,
                    decoration: const InputDecoration(labelText: 'Coupon code (auto uppercased)'),
                    enabled: coupon == null,
                    textCapitalization: TextCapitalization.characters,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: descriptionController,
                    decoration: const InputDecoration(labelText: 'Description'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: percentController,
                    decoration: const InputDecoration(labelText: 'Percent off'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: maxController,
                    decoration: const InputDecoration(labelText: 'Max redemptions (optional)'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  _DateField(
                    label: 'Expires on',
                    value: expiresAt,
                    onChanged: (date) => setModalState(() => expiresAt = date),
                    onClear: () => setModalState(() => expiresAt = null),
                  ),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Active'),
                    value: active,
                    onChanged: (value) => setModalState(() => active = value),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      final percent = double.tryParse(percentController.text) ?? 0;
                      final max = int.tryParse(maxController.text);
                      final codeValue = (codeController.text.isNotEmpty
                              ? codeController.text
                              : coupon?.code ??
                                  (descriptionController.text.split(' ').firstOrNull?.toUpperCase() ?? 'SAVE${percent.toInt()}'))
                          .toUpperCase();
                      final updated = CourseCoupon(
                        code: codeValue,
                        description: descriptionController.text.trim(),
                        percentOff: percent.clamp(0, 100),
                        maxRedemptions: max,
                        redeemed: coupon?.redeemed ?? 0,
                        active: active,
                        expiresAt: expiresAt,
                      );
                      if (coupon == null) {
                        controller.addCoupon(updated);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${updated.code} created.')), 
                        );
                      } else {
                        controller.updateCoupon(updated);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${updated.code} updated.')), 
                        );
                      }
                      Navigator.of(context).pop();
                    },
                    child: Text(coupon == null ? 'Add coupon' : 'Save coupon'),
                  )
                ],
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _openPaymentMethodForm(BuildContext context, {CommercePaymentMethod? method}) async {
    final controller = ref.read(commercePaymentsControllerProvider.notifier);
    final holderController = TextEditingController(text: method?.accountHolder ?? '');
    final brandController = TextEditingController(text: method?.brand ?? 'Visa');
    final last4Controller = TextEditingController(text: method?.last4 ?? '4242');
    final expMonthController = TextEditingController(text: method?.expMonth.toString().padLeft(2, '0') ?? '12');
    final expYearController = TextEditingController(text: method?.expYear.toString() ?? (DateTime.now().year + 3).toString());
    final emailController = TextEditingController(text: method?.billingEmail ?? '');
    final countryController = TextEditingController(text: method?.country ?? 'US');
    bool defaultMethod = method?.defaultMethod ?? false;

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
                    method == null ? 'Add payment method' : 'Update ${method.displayName}',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: holderController,
                    decoration: const InputDecoration(labelText: 'Account holder'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: brandController,
                          decoration: const InputDecoration(labelText: 'Brand'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: last4Controller,
                          decoration: const InputDecoration(labelText: 'Last 4 digits'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: expMonthController,
                          decoration: const InputDecoration(labelText: 'Exp month'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: expYearController,
                          decoration: const InputDecoration(labelText: 'Exp year'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: emailController,
                    decoration: const InputDecoration(labelText: 'Billing email'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: countryController,
                    decoration: const InputDecoration(labelText: 'Country'),
                  ),
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Set as default'),
                    value: defaultMethod,
                    onChanged: (value) => setModalState(() => defaultMethod = value ?? false),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      final expMonth = int.tryParse(expMonthController.text) ?? 1;
                      final expYear = int.tryParse(expYearController.text) ?? DateTime.now().year;
                      final payment = CommercePaymentMethod(
                        id: method?.id ?? generateCommerceId('pm'),
                        type: 'card',
                        displayName: '${brandController.text.toUpperCase()} •••• ${last4Controller.text}',
                        brand: brandController.text.trim(),
                        last4: last4Controller.text.trim(),
                        expMonth: expMonth,
                        expYear: expYear,
                        country: countryController.text.trim(),
                        accountHolder: holderController.text.trim(),
                        billingEmail: emailController.text.trim().isEmpty ? null : emailController.text.trim(),
                        defaultMethod: defaultMethod,
                      );
                      if (method == null) {
                        controller.addMethod(payment);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${payment.displayName} added.')), 
                        );
                      } else {
                        controller.updateMethod(payment);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${payment.displayName} updated.')), 
                        );
                      }
                      Navigator.of(context).pop();
                    },
                    child: Text(method == null ? 'Save method' : 'Save changes'),
                  )
                ],
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _openOrderWizard(BuildContext context) async {
    final checkoutState = ref.read(courseCheckoutControllerProvider);
    final checkoutController = ref.read(courseCheckoutControllerProvider.notifier);
    final paymentState = ref.read(commercePaymentsControllerProvider);

    if (checkoutState.offers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Create a cohort offer before raising an order.')),
      );
      return;
    }

    CourseCheckoutOffer selectedOffer = checkoutState.offers.first;
    CommercePaymentMethod? selectedPayment = paymentState.defaultMethod ??
        (paymentState.methods.isNotEmpty ? paymentState.methods.first : null);
    int quantity = 1;
    String learnerName = '';
    String learnerEmail = '';
    String notes = '';
    CourseCoupon? coupon;
    final couponController = TextEditingController();

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
              final subtotal = selectedOffer.price * quantity;
              final discount = coupon?.discountAmount(subtotal) ?? 0;
              final tax = (subtotal - discount) * 0.08;
              final total = subtotal - discount + tax;
              return SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Create enrollment order',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<CourseCheckoutOffer>(
                      value: selectedOffer,
                      decoration: const InputDecoration(labelText: 'Select cohort offer'),
                      items: checkoutState.offers
                          .map((offer) => DropdownMenuItem(
                                value: offer,
                                child: Text('${offer.cohortName} • ${_currencyFormat.format(offer.price)}'),
                              ))
                          .toList(),
                      onChanged: (value) => setModalState(() => selectedOffer = value ?? selectedOffer),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Learner name'),
                      onChanged: (value) => learnerName = value,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Learner email'),
                      keyboardType: TextInputType.emailAddress,
                      onChanged: (value) => learnerEmail = value,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            decoration: const InputDecoration(labelText: 'Seats purchased'),
                            keyboardType: TextInputType.number,
                            onChanged: (value) => setModalState(() => quantity = int.tryParse(value) ?? 1),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<CommercePaymentMethod>(
                            value: selectedPayment,
                            decoration: const InputDecoration(labelText: 'Payment method'),
                            items: paymentState.methods
                                .map((method) => DropdownMenuItem(
                                      value: method,
                                      child: Text(method.displayName),
                                    ))
                                .toList(),
                            onChanged: (value) => setModalState(() => selectedPayment = value),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: couponController,
                      decoration: InputDecoration(
                        labelText: 'Coupon code',
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.redeem_outlined),
                          onPressed: () {
                            final resolved = ref.read(courseCheckoutControllerProvider).resolveCoupon(couponController.text);
                            if (resolved == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Coupon not found or inactive.')),
                              );
                            } else {
                              setModalState(() => coupon = resolved);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('${resolved.code} applied.')), 
                              );
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(
                        labelText: 'Order notes',
                        hintText: 'Log procurement requirements or custom onboarding.',
                      ),
                      maxLines: 2,
                      onChanged: (value) => notes = value,
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.35),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Order summary',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          _SummaryLine(label: 'Subtotal', value: _currencyFormat.format(subtotal)),
                          _SummaryLine(label: 'Discount', value: '-${_currencyFormat.format(discount)}'),
                          _SummaryLine(label: 'Estimated tax (8%)', value: _currencyFormat.format(tax)),
                          const Divider(),
                          _SummaryLine(
                            label: 'Total due',
                            value: _currencyFormat.format(total),
                            highlight: true,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: selectedPayment == null
                          ? null
                          : () {
                              if (learnerName.trim().isEmpty || learnerEmail.trim().isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Add learner details to create the order.')),
                                );
                                return;
                              }
                              final order = checkoutController.createOrder(
                                offer: selectedOffer,
                                learnerName: learnerName.trim(),
                                learnerEmail: learnerEmail.trim(),
                                quantity: quantity,
                                paymentMethod: selectedPayment!,
                                notes: notes.trim().isEmpty ? null : notes.trim(),
                                coupon: coupon,
                              );
                              Navigator.of(context).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Order ${order.id} created for ${order.learnerName}.')), 
                              );
                            },
                      child: const Text('Raise order'),
                    )
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _confirmDeleteOffer(BuildContext context, String offerId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete cohort offer'),
          content: const Text('Deleting this offer will also remove related orders. Continue?'),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: TextButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );
    if (confirmed == true) {
      ref.read(courseCheckoutControllerProvider.notifier).deleteOffer(offerId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Offer deleted.')), 
      );
    }
  }

  String _formatDate(DateTime date) => DateFormat.yMMMd().format(date);

  String _describeCoupon(CourseCoupon coupon) {
    final buffer = StringBuffer('${coupon.percentOff.toStringAsFixed(0)}% off • ${coupon.redeemed}/${coupon.maxRedemptions ?? '∞'} used');
    if (coupon.expiresAt != null) {
      buffer.write(' • Expires ${DateFormat.yMMMd().format(coupon.expiresAt!)}');
    }
    if (!coupon.active) {
      buffer.write(' • Inactive');
    }
    return buffer.toString();
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 4),
          Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _OfferStat extends StatelessWidget {
  const _OfferStat({required this.icon, required this.label, required this.value});

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

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.title, required this.message});

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

class _OrderSummaryRow extends StatelessWidget {
  const _OrderSummaryRow({required this.label, required this.value});

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

class _SummaryLine extends StatelessWidget {
  const _SummaryLine({required this.label, required this.value, this.highlight = false});

  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final style = highlight
        ? Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)
        : Theme.of(context).textTheme.bodyMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.onChanged,
    this.value,
    this.onClear,
  });

  final String label;
  final DateTime? value;
  final ValueChanged<DateTime> onChanged;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final controller = TextEditingController(text: value != null ? DateFormat.yMMMd().format(value!) : '');
    return TextField(
      controller: controller,
      readOnly: true,
      decoration: InputDecoration(
        labelText: label,
        suffixIcon: onClear != null && value != null
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
          initialDate: value ?? now,
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

extension _ListFirstOrNull<E> on List<E> {
  E? get firstOrNull => isEmpty ? null : first;
}

extension CourseX on Course {
  static Course empty() {
    return Course(
      id: 'course-empty',
      title: 'Course',
      category: 'General',
      level: 'Beginner',
      summary: '',
      thumbnailUrl: '',
      price: 0,
      language: 'English',
      tags: const <String>[],
      modules: const [],
      learningOutcomes: const [],
      rating: 0,
      isPublished: true,
    );
  }
}
