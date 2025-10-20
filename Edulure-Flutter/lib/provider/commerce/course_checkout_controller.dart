import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../provider/commerce/commerce_payments_controller.dart';
import '../../provider/learning/learning_store.dart';
import '../../services/commerce_models.dart';
import '../../services/commerce_persistence_service.dart';

final courseCheckoutControllerProvider =
    StateNotifierProvider<CourseCheckoutController, CourseCheckoutState>((ref) {
  final persistence = ref.watch(commercePersistenceProvider);
  return CourseCheckoutController(
    persistence: persistence,
    read: ref.read,
  );
});

class CourseCheckoutState {
  const CourseCheckoutState({
    this.loading = false,
    this.error,
    this.offers = const <CourseCheckoutOffer>[],
    this.orders = const <CourseCheckoutOrder>[],
    this.coupons = const <CourseCoupon>[],
    this.bootstrapped = false,
  });

  final bool loading;
  final String? error;
  final List<CourseCheckoutOffer> offers;
  final List<CourseCheckoutOrder> orders;
  final List<CourseCoupon> coupons;
  final bool bootstrapped;

  CourseCheckoutState copyWith({
    bool? loading,
    String? error,
    List<CourseCheckoutOffer>? offers,
    List<CourseCheckoutOrder>? orders,
    List<CourseCoupon>? coupons,
    bool? bootstrapped,
  }) {
    return CourseCheckoutState(
      loading: loading ?? this.loading,
      error: error,
      offers: offers ?? this.offers,
      orders: orders ?? this.orders,
      coupons: coupons ?? this.coupons,
      bootstrapped: bootstrapped ?? this.bootstrapped,
    );
  }

  double get totalRevenue => orders.fold<double>(0, (sum, order) => sum + order.total);

  double get monthlyRecurringRevenue {
    final now = DateTime.now();
    return orders.where((order) => order.createdAt.year == now.year && order.createdAt.month == now.month).fold<double>(
          0,
          (sum, order) => sum + order.total,
        );
  }

  int get activeOffers => offers.where((offer) => offer.published).length;

  List<CourseCheckoutOrder> ordersByStatus(CourseOrderStatus status) {
    return orders.where((order) => order.status == status).toList(growable: false);
  }

  CourseCoupon? resolveCoupon(String code) {
    final normalized = code.trim().toUpperCase();
    try {
      return coupons.firstWhere((coupon) => coupon.code == normalized);
    } catch (_) {
      return null;
    }
  }
}

class CourseCheckoutController extends StateNotifier<CourseCheckoutState> {
  CourseCheckoutController({
    required CommercePersistence persistence,
    required Reader read,
  })  : _persistence = persistence,
        _read = read,
        super(const CourseCheckoutState());

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
      final snapshot = await _persistence.loadCourseCheckout();
      if (snapshot != null) {
        state = state.copyWith(
          offers: snapshot.offers,
          orders: snapshot.orders,
          coupons: snapshot.coupons,
          bootstrapped: true,
        );
      } else {
        final seedOffers = _seedOffers();
        final seedCoupons = _seedCoupons();
        final initialState = state.copyWith(
          offers: seedOffers,
          coupons: seedCoupons,
          orders: const <CourseCheckoutOrder>[],
          bootstrapped: true,
        );
        state = initialState;
        await _persist();
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to bootstrap course checkout: $error');
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
      final snapshot = await _persistence.loadCourseCheckout();
      if (snapshot != null) {
        state = state.copyWith(
          offers: snapshot.offers,
          orders: snapshot.orders,
          coupons: snapshot.coupons,
          bootstrapped: true,
        );
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to refresh course checkout: $error');
      debugPrint('$stackTrace');
      state = state.copyWith(error: error.toString());
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  void createOffer(CourseCheckoutOffer offer) {
    state = state.copyWith(offers: [...state.offers, offer]);
    _persist();
  }

  void updateOffer(CourseCheckoutOffer offer) {
    state = state.copyWith(
      offers: [
        for (final item in state.offers)
          if (item.id == offer.id) offer else item,
      ],
    );
    _persist();
  }

  void deleteOffer(String offerId) {
    state = state.copyWith(
      offers: state.offers.where((offer) => offer.id != offerId).toList(growable: false),
    );
    state = state.copyWith(
      orders: state.orders.where((order) => order.offerId != offerId).toList(growable: false),
    );
    _persist();
  }

  CourseCheckoutOrder createOrder({
    required CourseCheckoutOffer offer,
    required String learnerName,
    required String learnerEmail,
    required int quantity,
    required CommercePaymentMethod paymentMethod,
    String? notes,
    CourseCoupon? coupon,
  }) {
    final subtotal = offer.price * quantity;
    final discount = coupon != null && coupon.active && coupon.hasCapacity && !coupon.isExpired
        ? coupon.discountAmount(subtotal)
        : 0;
    final taxable = subtotal - discount;
    final tax = (taxable * 0.08).roundToDouble();
    final total = taxable + tax;

    final order = CourseCheckoutOrder(
      id: generateCommerceId('order'),
      offerId: offer.id,
      offerName: offer.cohortName,
      learnerName: learnerName,
      learnerEmail: learnerEmail,
      quantity: quantity,
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: total,
      currency: offer.currency,
      status: CourseOrderStatus.awaitingPayment,
      createdAt: DateTime.now(),
      paymentMethodId: paymentMethod.id,
      notes: notes,
      couponCode: coupon?.code,
    );

    final orders = [...state.orders, order];
    final coupons = state.coupons.map((item) {
      if (coupon != null && item.code == coupon.code) {
        return item.copyWith(redeemed: item.redeemed + 1);
      }
      return item;
    }).toList(growable: false);

    state = state.copyWith(orders: orders, coupons: coupons);
    _persist();
    return order;
  }

  void updateOrderStatus(String orderId, CourseOrderStatus status) {
    state = state.copyWith(
      orders: [
        for (final order in state.orders)
          if (order.id == orderId) order.copyWith(status: status) else order,
      ],
    );
    _persist();
  }

  void deleteOrder(String orderId) {
    state = state.copyWith(
      orders: state.orders.where((order) => order.id != orderId).toList(growable: false),
    );
    _persist();
  }

  void addCoupon(CourseCoupon coupon) {
    final updated = [...state.coupons, coupon];
    state = state.copyWith(coupons: updated);
    _persist();
  }

  void updateCoupon(CourseCoupon coupon) {
    final updated = [
      for (final item in state.coupons)
        if (item.code == coupon.code) coupon else item,
    ];
    state = state.copyWith(coupons: updated);
    _persist();
  }

  void deleteCoupon(String code) {
    state = state.copyWith(
      coupons: state.coupons.where((coupon) => coupon.code != code).toList(growable: false),
    );
    _persist();
  }

  CourseCheckoutOffer duplicateOffer(CourseCheckoutOffer offer) {
    final copy = offer.copyWith(cohortName: '${offer.cohortName} Copy', published: false);
    final duplicated = CourseCheckoutOffer(
      id: generateCommerceId('offer'),
      courseId: offer.courseId,
      courseTitle: offer.courseTitle,
      cohortName: copy.cohortName,
      price: copy.price,
      currency: copy.currency,
      startDate: copy.startDate.add(const Duration(days: 30)),
      endDate: copy.endDate.add(const Duration(days: 30)),
      seats: copy.seats,
      deliveryFormat: copy.deliveryFormat,
      pacing: copy.pacing,
      liveSupport: copy.liveSupport,
      tags: List<String>.from(copy.tags),
      bonuses: List<String>.from(copy.bonuses),
      published: false,
    );
    createOffer(duplicated);
    return duplicated;
  }

  Future<void> _persist() async {
    try {
      final snapshot = CourseCheckoutSnapshot(
        offers: state.offers,
        orders: state.orders,
        coupons: state.coupons,
      );
      await _persistence.saveCourseCheckout(snapshot);
    } catch (error, stackTrace) {
      debugPrint('Failed to persist course checkout: $error');
      debugPrint('$stackTrace');
    }
  }

  List<CourseCheckoutOffer> _seedOffers() {
    final courses = _read(courseStoreProvider);
    if (courses.isEmpty) {
      return [
        CourseCheckoutOffer(
          id: generateCommerceId('offer'),
          courseId: 'course-1',
          courseTitle: 'Launch Operations Sprint',
          cohortName: 'May Accelerator Cohort',
          price: 249,
          currency: 'USD',
          startDate: DateTime.now().add(const Duration(days: 14)),
          endDate: DateTime.now().add(const Duration(days: 60)),
          seats: 35,
          deliveryFormat: 'Hybrid',
          pacing: '4-week sprint',
          liveSupport: true,
          tags: const ['Product', 'Operations'],
          bonuses: const ['Weekly mentor pod', 'Async feedback vault'],
        ),
      ];
    }

    final offerList = <CourseCheckoutOffer>[];
    for (final course in courses.take(3)) {
      offerList.add(
        CourseCheckoutOffer(
          id: generateCommerceId('offer'),
          courseId: course.id,
          courseTitle: course.title,
          cohortName: '${course.title} ${DateTime.now().monthName} cohort',
          price: course.price?.toDouble() ?? 249,
          currency: 'USD',
          startDate: DateTime.now().add(Duration(days: 7 * (offerList.length + 1))),
          endDate: DateTime.now().add(Duration(days: 45 + offerList.length * 14)),
          seats: 30 + offerList.length * 10,
          deliveryFormat: 'Live + async',
          pacing: '6-week guided track',
          liveSupport: offerList.length.isEven,
          tags: course.tags,
          bonuses: const ['Office hours', 'Recorded sessions'],
        ),
      );
    }
    return offerList;
  }

  List<CourseCoupon> _seedCoupons() {
    return [
      CourseCoupon(
        code: 'EARLYBIRD20',
        description: '20% off for the first learners to enroll',
        percentOff: 20,
        maxRedemptions: 25,
        expiresAt: DateTime.now().add(const Duration(days: 10)),
      ),
      CourseCoupon(
        code: 'TEAM5',
        description: '5% discount for team purchases',
        percentOff: 5,
        maxRedemptions: 200,
      ),
    ];
  }
}

extension _MonthName on DateTime {
  String get monthName {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month - 1];
  }
}
