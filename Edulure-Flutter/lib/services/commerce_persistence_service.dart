import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'commerce_models.dart';

abstract class CommercePersistence {
  const CommercePersistence();

  Future<List<CommercePaymentMethod>?> loadPaymentMethods();
  Future<void> savePaymentMethods(List<CommercePaymentMethod> methods);

  Future<CourseCheckoutSnapshot?> loadCourseCheckout();
  Future<void> saveCourseCheckout(CourseCheckoutSnapshot snapshot);

  Future<TutorBookingSnapshot?> loadTutorBookings();
  Future<void> saveTutorBookings(TutorBookingSnapshot snapshot);

  Future<CommunitySubscriptionSnapshot?> loadCommunitySubscriptions();
  Future<void> saveCommunitySubscriptions(CommunitySubscriptionSnapshot snapshot);

  Future<BillingCatalogSnapshot?> loadBillingCatalog();
  Future<void> saveBillingCatalog(BillingCatalogSnapshot snapshot);

  Future<List<PendingReceipt>> loadPendingReceipts();
  Future<void> savePendingReceipts(List<PendingReceipt> receipts);

  Future<void> reset();
}

class CommercePersistenceService implements CommercePersistence {
  CommercePersistenceService({
    String boxName = _defaultBoxName,
    HiveInterface? hive,
    CommerceJsonEncoder? encoder,
  })  : _boxName = boxName,
        _hive = hive ?? Hive,
        _encoder = encoder ?? const CommerceJsonEncoder();

  static const _defaultBoxName = 'commerce.state';
  static const _paymentsKey = 'payments';
  static const _courseKey = 'courses.checkout';
  static const _tutorKey = 'tutors.booking';
  static const _communityKey = 'community.subscriptions';
  static const _catalogKey = 'billing.catalog';
  static const _receiptsKey = 'billing.receipts';

  final String _boxName;
  final HiveInterface _hive;
  final CommerceJsonEncoder _encoder;
  Box<String>? _cachedBox;

  Future<Box<String>> _box() async {
    final cached = _cachedBox;
    if (cached != null && cached.isOpen) {
      return cached;
    }
    final box = await _hive.openBox<String>(_boxName);
    _cachedBox = box;
    return box;
  }

  @override
  Future<List<CommercePaymentMethod>?> loadPaymentMethods() async {
    return _read(_paymentsKey, _encoder.decodePaymentMethods);
  }

  @override
  Future<void> savePaymentMethods(List<CommercePaymentMethod> methods) {
    return _write(_paymentsKey, _encoder.encodePaymentMethods(methods));
  }

  @override
  Future<CourseCheckoutSnapshot?> loadCourseCheckout() {
    return _read(_courseKey, _encoder.decodeCourseSnapshot);
  }

  @override
  Future<void> saveCourseCheckout(CourseCheckoutSnapshot snapshot) {
    return _write(_courseKey, _encoder.encodeCourseSnapshot(snapshot));
  }

  @override
  Future<TutorBookingSnapshot?> loadTutorBookings() {
    return _read(_tutorKey, _encoder.decodeTutorSnapshot);
  }

  @override
  Future<void> saveTutorBookings(TutorBookingSnapshot snapshot) {
    return _write(_tutorKey, _encoder.encodeTutorSnapshot(snapshot));
  }

  @override
  Future<CommunitySubscriptionSnapshot?> loadCommunitySubscriptions() {
    return _read(_communityKey, _encoder.decodeCommunitySnapshot);
  }

  @override
  Future<void> saveCommunitySubscriptions(CommunitySubscriptionSnapshot snapshot) {
    return _write(_communityKey, _encoder.encodeCommunitySnapshot(snapshot));
  }

  @override
  Future<BillingCatalogSnapshot?> loadBillingCatalog() {
    return _read(_catalogKey, _encoder.decodeBillingCatalog);
  }

  @override
  Future<void> saveBillingCatalog(BillingCatalogSnapshot snapshot) {
    return _write(_catalogKey, _encoder.encodeBillingCatalog(snapshot));
  }

  @override
  Future<List<PendingReceipt>> loadPendingReceipts() async {
    final receipts = await _read<List<PendingReceipt>>(
      _receiptsKey,
      _encoder.decodePendingReceipts,
    );
    return receipts ?? const <PendingReceipt>[];
  }

  @override
  Future<void> savePendingReceipts(List<PendingReceipt> receipts) {
    return _write(_receiptsKey, _encoder.encodePendingReceipts(receipts));
  }

  @override
  Future<void> reset() async {
    final box = await _box();
    await box.clear();
  }

  Future<T?> _read<T>(String key, T Function(String payload) decoder) async {
    try {
      final box = await _box();
      final raw = box.get(key);
      if (raw == null || raw.isEmpty) {
        return null;
      }
      return decoder(raw);
    } catch (error, stackTrace) {
      debugPrint('Failed to read commerce key $key: $error');
      debugPrint('$stackTrace');
      return null;
    }
  }

  Future<void> _write(String key, String payload) async {
    try {
      final box = await _box();
      if (payload.isEmpty) {
        await box.delete(key);
      } else {
        await box.put(key, payload);
      }
    } catch (error, stackTrace) {
      debugPrint('Failed to persist commerce key $key: $error');
      debugPrint('$stackTrace');
    }
  }
}
