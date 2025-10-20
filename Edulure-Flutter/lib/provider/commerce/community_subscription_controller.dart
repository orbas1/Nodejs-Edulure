import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../provider/commerce/commerce_payments_controller.dart';
import '../../services/commerce_models.dart';
import '../../services/commerce_persistence_service.dart';

final communitySubscriptionControllerProvider =
    StateNotifierProvider<CommunitySubscriptionController, CommunitySubscriptionState>((ref) {
  final persistence = ref.watch(commercePersistenceProvider);
  return CommunitySubscriptionController(persistence: persistence, read: ref.read);
});

class CommunitySubscriptionState {
  const CommunitySubscriptionState({
    this.loading = false,
    this.error,
    this.plans = const <CommunitySubscriptionPlan>[],
    this.subscribers = const <CommunitySubscriber>[],
    this.invoices = const <CommunityInvoice>[],
    this.bootstrapped = false,
  });

  final bool loading;
  final String? error;
  final List<CommunitySubscriptionPlan> plans;
  final List<CommunitySubscriber> subscribers;
  final List<CommunityInvoice> invoices;
  final bool bootstrapped;

  CommunitySubscriptionState copyWith({
    bool? loading,
    String? error,
    List<CommunitySubscriptionPlan>? plans,
    List<CommunitySubscriber>? subscribers,
    List<CommunityInvoice>? invoices,
    bool? bootstrapped,
  }) {
    return CommunitySubscriptionState(
      loading: loading ?? this.loading,
      error: error,
      plans: plans ?? this.plans,
      subscribers: subscribers ?? this.subscribers,
      invoices: invoices ?? this.invoices,
      bootstrapped: bootstrapped ?? this.bootstrapped,
    );
  }

  int get activeSubscribers => subscribers.where((subscriber) => subscriber.status == SubscriptionStatus.active).length;

  double get monthlyRecurringRevenue {
    final now = DateTime.now();
    return invoices.where((invoice) {
      return invoice.status == InvoiceStatus.paid && invoice.paidAt != null &&
          invoice.paidAt!.year == now.year && invoice.paidAt!.month == now.month;
    }).fold<double>(0, (sum, invoice) => sum + invoice.amount + invoice.tax - invoice.discount);
  }

  double get annualRunRate => monthlyRecurringRevenue * 12;

  double get churnRate {
    final activeCount = activeSubscribers;
    if (activeCount == 0) {
      return 0;
    }
    final cancellations = subscribers.where((subscriber) => subscriber.status == SubscriptionStatus.canceled).length;
    return cancellations / (activeCount + cancellations);
  }

  List<CommunitySubscriber> subscribersForPlan(String planId) {
    return subscribers.where((subscriber) => subscriber.planId == planId).toList(growable: false);
  }

  CommunitySubscriptionPlan? planById(String planId) {
    try {
      return plans.firstWhere((plan) => plan.id == planId);
    } catch (_) {
      return null;
    }
  }
}

class CommunitySubscriptionController extends StateNotifier<CommunitySubscriptionState> {
  CommunitySubscriptionController({
    required CommercePersistence persistence,
    required Reader read,
  })  : _persistence = persistence,
        _read = read,
        super(const CommunitySubscriptionState());

  final CommercePersistence _persistence;
  final Reader _read;
  bool _bootstrapping = false;

  Future<void> bootstrap() async {
    if (state.bootstrapped || _bootstrapping) {
      return;
    }
    _bootstrapping = true;
    state = state.copyWith(loading: true, error: null);
    try {
      await _read(commercePaymentsControllerProvider.notifier).bootstrap();
      final snapshot = await _persistence.loadCommunitySubscriptions();
      if (snapshot != null) {
        state = state.copyWith(
          plans: snapshot.plans,
          subscribers: snapshot.subscribers,
          invoices: snapshot.invoices,
          bootstrapped: true,
        );
      } else {
        final seeded = _seedData();
        state = state.copyWith(
          plans: seeded.plans,
          subscribers: seeded.subscribers,
          invoices: seeded.invoices,
          bootstrapped: true,
        );
        await _persist();
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to bootstrap community subscriptions: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString(), bootstrapped: true);
    } finally {
      state = state.copyWith(loading: false);
      _bootstrapping = false;
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final snapshot = await _persistence.loadCommunitySubscriptions();
      if (snapshot != null) {
        state = state.copyWith(
          plans: snapshot.plans,
          subscribers: snapshot.subscribers,
          invoices: snapshot.invoices,
          bootstrapped: true,
        );
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to refresh community subscriptions: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  void upsertPlan(CommunitySubscriptionPlan plan) {
    final exists = state.plans.any((item) => item.id == plan.id);
    final plans = exists
        ? [
            for (final item in state.plans)
              if (item.id == plan.id) plan else item,
          ]
        : [...state.plans, plan];
    state = state.copyWith(plans: plans);
    _persist();
  }

  void deletePlan(String planId) {
    final remainingPlans = state.plans.where((plan) => plan.id != planId).toList(growable: false);
    final fallbackPlanId = remainingPlans.isNotEmpty ? remainingPlans.first.id : null;
    final updatedSubscribers = state.subscribers.map((subscriber) {
      if (subscriber.planId != planId) {
        return subscriber;
      }
      if (fallbackPlanId != null) {
        return subscriber.copyWith(planId: fallbackPlanId);
      }
      return subscriber.copyWith(status: SubscriptionStatus.canceled);
    }).toList(growable: false);

    state = state.copyWith(
      plans: remainingPlans,
      subscribers: updatedSubscribers,
    );
    _persist();
  }

  void upsertSubscriber(CommunitySubscriber subscriber) {
    final exists = state.subscribers.any((item) => item.id == subscriber.id);
    final subscribers = exists
        ? [
            for (final item in state.subscribers)
              if (item.id == subscriber.id) subscriber else item,
          ]
        : [...state.subscribers, subscriber];
    state = state.copyWith(subscribers: subscribers);
    _persist();
  }

  void deleteSubscriber(String subscriberId) {
    state = state.copyWith(
      subscribers: state.subscribers.where((subscriber) => subscriber.id != subscriberId).toList(growable: false),
    );
    _persist();
  }

  void upsertInvoice(CommunityInvoice invoice) {
    final exists = state.invoices.any((item) => item.id == invoice.id);
    final invoices = exists
        ? [
            for (final item in state.invoices)
              if (item.id == invoice.id) invoice else item,
          ]
        : [...state.invoices, invoice];
    state = state.copyWith(invoices: invoices);
    _persist();
  }

  void deleteInvoice(String invoiceId) {
    state = state.copyWith(
      invoices: state.invoices.where((invoice) => invoice.id != invoiceId).toList(growable: false),
    );
    _persist();
  }

  CommunitySubscriptionSnapshot _seedData() {
    final plans = <CommunitySubscriptionPlan>[
      CommunitySubscriptionPlan(
        id: generateCommerceId('plan'),
        name: 'Launch Collective',
        description: 'Founders and operators co-creating GTM launches.',
        price: 79,
        currency: 'USD',
        billingCycle: BillingCycle.monthly,
        trialDays: 14,
        features: const ['Weekly accountability pod', 'Launch playbook vault', 'Private async salon'],
        featured: true,
        active: true,
      ),
      CommunitySubscriptionPlan(
        id: generateCommerceId('plan'),
        name: 'Enablement Guild',
        description: 'Revenue enablement leaders with 1:many coaching.',
        price: 149,
        currency: 'USD',
        billingCycle: BillingCycle.monthly,
        trialDays: 7,
        features: const ['Bi-weekly mentor labs', 'Enablement asset swaps', 'Analytics huddles'],
        active: true,
      ),
      CommunitySubscriptionPlan(
        id: generateCommerceId('plan'),
        name: 'Ecosystem Partner',
        description: 'Scaled support for partner teams with bespoke pods.',
        price: 1299,
        currency: 'USD',
        billingCycle: BillingCycle.quarterly,
        trialDays: 0,
        features: const ['Dedicated partner concierge', 'Quarterly advisory', 'Private events'],
        active: true,
      ),
    ];

    final subscribers = <CommunitySubscriber>[
      CommunitySubscriber(
        id: generateCommerceId('subscriber'),
        fullName: 'Amelia Rivers',
        email: 'amelia.rivers@harborlabs.com',
        company: 'Harbor Labs',
        planId: plans[0].id,
        status: SubscriptionStatus.active,
        joinedAt: DateTime.now().subtract(const Duration(days: 28)),
        currentPeriodEnd: DateTime.now().add(const Duration(days: 2)),
        autoRenew: true,
        seats: 5,
        paymentMethodId: _read(commercePaymentsControllerProvider).defaultMethod?.id,
      ),
      CommunitySubscriber(
        id: generateCommerceId('subscriber'),
        fullName: 'Devon Clarke',
        email: 'devon.clarke@signalaxis.com',
        company: 'Signal Axis',
        planId: plans[1].id,
        status: SubscriptionStatus.trialing,
        joinedAt: DateTime.now().subtract(const Duration(days: 5)),
        currentPeriodEnd: DateTime.now().add(const Duration(days: 9)),
        autoRenew: true,
        seats: 3,
      ),
      CommunitySubscriber(
        id: generateCommerceId('subscriber'),
        fullName: 'Leila Ahmed',
        email: 'leila.ahmed@connectivesystems.com',
        company: 'Connective Systems',
        planId: plans[2].id,
        status: SubscriptionStatus.pastDue,
        joinedAt: DateTime.now().subtract(const Duration(days: 90)),
        currentPeriodEnd: DateTime.now().subtract(const Duration(days: 2)),
        autoRenew: false,
        seats: 12,
      ),
    ];

    final invoices = <CommunityInvoice>[
      CommunityInvoice(
        id: generateCommerceId('invoice'),
        subscriberId: subscribers[0].id,
        planId: plans[0].id,
        amount: plans[0].price,
        currency: 'USD',
        tax: 6.32,
        discount: 0,
        status: InvoiceStatus.paid,
        issuedAt: DateTime.now().subtract(const Duration(days: 28)),
        dueDate: DateTime.now().subtract(const Duration(days: 24)),
        paidAt: DateTime.now().subtract(const Duration(days: 27)),
      ),
      CommunityInvoice(
        id: generateCommerceId('invoice'),
        subscriberId: subscribers[2].id,
        planId: plans[2].id,
        amount: plans[2].price,
        currency: 'USD',
        tax: 118.0,
        discount: 129.9,
        status: InvoiceStatus.open,
        issuedAt: DateTime.now().subtract(const Duration(days: 10)),
        dueDate: DateTime.now().subtract(const Duration(days: 2)),
      ),
    ];

    return CommunitySubscriptionSnapshot(plans: plans, subscribers: subscribers, invoices: invoices);
  }

  Future<void> _persist() async {
    try {
      final snapshot = CommunitySubscriptionSnapshot(
        plans: state.plans,
        subscribers: state.subscribers,
        invoices: state.invoices,
      );
      await _persistence.saveCommunitySubscriptions(snapshot);
    } catch (error, stackTrace) {
      debugPrint('Failed to persist community subscriptions: $error');
      debugPrint('$stackTrace');
    }
  }
}
