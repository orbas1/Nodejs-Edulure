import 'dart:async';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';

import 'api_config.dart';
import 'commerce_models.dart';
import 'commerce_persistence_service.dart';
import 'session_manager.dart';

class BillingException implements Exception {
  BillingException(this.message);

  final String message;

  @override
  String toString() => 'BillingException: $message';
}

enum BillingSubscriptionStatus { active, trialing, pastDue, canceled }

enum BillingInvoiceStatus { paid, open, voided, pending, pastDue }

@immutable
class BillingPlan {
  const BillingPlan({
    required this.id,
    required this.name,
    required this.description,
    required this.amount,
    required this.currency,
    required this.cycle,
    required this.entitlements,
    this.trialDays,
    this.maxSeats = 1,
    this.metadata = const <String, dynamic>{},
  });

  final String id;
  final String name;
  final String description;
  final double amount;
  final String currency;
  final BillingCycle cycle;
  final List<String> entitlements;
  final int? trialDays;
  final int maxSeats;
  final Map<String, dynamic> metadata;

  BillingPlan copyWith({
    String? id,
    String? name,
    String? description,
    double? amount,
    String? currency,
    BillingCycle? cycle,
    List<String>? entitlements,
    int? trialDays,
    int? maxSeats,
    Map<String, dynamic>? metadata,
  }) {
    return BillingPlan(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      cycle: cycle ?? this.cycle,
      entitlements: entitlements ?? this.entitlements,
      trialDays: trialDays ?? this.trialDays,
      maxSeats: maxSeats ?? this.maxSeats,
      metadata: metadata ?? this.metadata,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'amount': amount,
      'currency': currency,
      'cycle': cycle.name,
      'entitlements': entitlements,
      'trialDays': trialDays,
      'maxSeats': maxSeats,
      'metadata': metadata,
    };
  }

  factory BillingPlan.fromJson(Map<String, dynamic> json) {
    return BillingPlan(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'USD',
      cycle: BillingCycleX.fromName(json['cycle']?.toString() ?? 'monthly'),
      entitlements: (json['entitlements'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(growable: false),
      trialDays: json['trialDays'] as int?,
      maxSeats: json['maxSeats'] as int? ?? 1,
      metadata: json['metadata'] is Map
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : const <String, dynamic>{},
    );
  }
}

@immutable
class BillingInvoiceLine {
  const BillingInvoiceLine({
    required this.title,
    required this.quantity,
    required this.amount,
    this.unitPrice,
    this.metadata = const <String, dynamic>{},
  });

  final String title;
  final double quantity;
  final double amount;
  final double? unitPrice;
  final Map<String, dynamic> metadata;

  Map<String, dynamic> toJson() => {
        'title': title,
        'quantity': quantity,
        'amount': amount,
        'unitPrice': unitPrice,
        'metadata': metadata,
      };

  factory BillingInvoiceLine.fromJson(Map<String, dynamic> json) {
    return BillingInvoiceLine(
      title: json['title']?.toString() ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0,
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      unitPrice: (json['unitPrice'] as num?)?.toDouble(),
      metadata: json['metadata'] is Map
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : const <String, dynamic>{},
    );
  }
}

@immutable
class BillingInvoice {
  const BillingInvoice({
    required this.id,
    required this.number,
    required this.amount,
    required this.currency,
    required this.status,
    required this.issuedAt,
    this.dueAt,
    this.paidAt,
    this.lines = const <BillingInvoiceLine>[],
    this.tax = 0,
    this.discount = 0,
  });

  final String id;
  final String number;
  final double amount;
  final String currency;
  final BillingInvoiceStatus status;
  final DateTime issuedAt;
  final DateTime? dueAt;
  final DateTime? paidAt;
  final List<BillingInvoiceLine> lines;
  final double tax;
  final double discount;

  BillingInvoice copyWith({
    String? id,
    String? number,
    double? amount,
    String? currency,
    BillingInvoiceStatus? status,
    DateTime? issuedAt,
    DateTime? dueAt,
    DateTime? paidAt,
    List<BillingInvoiceLine>? lines,
    double? tax,
    double? discount,
  }) {
    return BillingInvoice(
      id: id ?? this.id,
      number: number ?? this.number,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      status: status ?? this.status,
      issuedAt: issuedAt ?? this.issuedAt,
      dueAt: dueAt ?? this.dueAt,
      paidAt: paidAt ?? this.paidAt,
      lines: lines ?? this.lines,
      tax: tax ?? this.tax,
      discount: discount ?? this.discount,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'number': number,
      'amount': amount,
      'currency': currency,
      'status': status.name,
      'issuedAt': issuedAt.toIso8601String(),
      'dueAt': dueAt?.toIso8601String(),
      'paidAt': paidAt?.toIso8601String(),
      'lines': lines.map((line) => line.toJson()).toList(growable: false),
      'tax': tax,
      'discount': discount,
    };
  }

  factory BillingInvoice.fromJson(Map<String, dynamic> json) {
    return BillingInvoice(
      id: json['id'] as String,
      number: json['number']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      currency: json['currency']?.toString() ?? 'USD',
      status: BillingInvoiceStatus.values.firstWhere(
        (value) => value.name == json['status'],
        orElse: () => BillingInvoiceStatus.open,
      ),
      issuedAt: DateTime.tryParse(json['issuedAt']?.toString() ?? '') ?? DateTime.now(),
      dueAt: json['dueAt'] != null
          ? DateTime.tryParse(json['dueAt'].toString())
          : null,
      paidAt: json['paidAt'] != null
          ? DateTime.tryParse(json['paidAt'].toString())
          : null,
      lines: (json['lines'] as List<dynamic>? ?? const [])
          .map((item) => BillingInvoiceLine.fromJson(
                Map<String, dynamic>.from(item as Map),
              ))
          .toList(growable: false),
      tax: (json['tax'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
    );
  }
}

@immutable
class BillingUsageMetric {
  const BillingUsageMetric({
    required this.metric,
    required this.unit,
    required this.quantity,
    this.limit,
    this.included = 0,
  });

  final String metric;
  final String unit;
  final double quantity;
  final double? limit;
  final double included;

  Map<String, dynamic> toJson() => {
        'metric': metric,
        'unit': unit,
        'quantity': quantity,
        'limit': limit,
        'included': included,
      };

  factory BillingUsageMetric.fromJson(Map<String, dynamic> json) {
    return BillingUsageMetric(
      metric: json['metric']?.toString() ?? '',
      unit: json['unit']?.toString() ?? 'count',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0,
      limit: (json['limit'] as num?)?.toDouble(),
      included: (json['included'] as num?)?.toDouble() ?? 0,
    );
  }
}

@immutable
class BillingAccountSnapshot {
  const BillingAccountSnapshot({
    required this.customerId,
    required this.status,
    required this.plan,
    required this.currentPeriodEnd,
    required this.invoices,
    required this.usage,
    required this.updatedAt,
    this.paymentMethodRequired = false,
    this.gracePeriodEndsAt,
  });

  final String customerId;
  final BillingSubscriptionStatus status;
  final BillingPlan plan;
  final DateTime? currentPeriodEnd;
  final List<BillingInvoice> invoices;
  final List<BillingUsageMetric> usage;
  final DateTime updatedAt;
  final bool paymentMethodRequired;
  final DateTime? gracePeriodEndsAt;

  bool isStale(Duration threshold) {
    final age = DateTime.now().difference(updatedAt);
    return age > threshold;
  }

  BillingAccountSnapshot copyWith({
    String? customerId,
    BillingSubscriptionStatus? status,
    BillingPlan? plan,
    DateTime? currentPeriodEnd,
    List<BillingInvoice>? invoices,
    List<BillingUsageMetric>? usage,
    DateTime? updatedAt,
    bool? paymentMethodRequired,
    DateTime? gracePeriodEndsAt,
  }) {
    return BillingAccountSnapshot(
      customerId: customerId ?? this.customerId,
      status: status ?? this.status,
      plan: plan ?? this.plan,
      currentPeriodEnd: currentPeriodEnd ?? this.currentPeriodEnd,
      invoices: invoices ?? this.invoices,
      usage: usage ?? this.usage,
      updatedAt: updatedAt ?? this.updatedAt,
      paymentMethodRequired: paymentMethodRequired ?? this.paymentMethodRequired,
      gracePeriodEndsAt: gracePeriodEndsAt ?? this.gracePeriodEndsAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'customerId': customerId,
      'status': status.name,
      'plan': plan.toJson(),
      'currentPeriodEnd': currentPeriodEnd?.toIso8601String(),
      'invoices': invoices.map((invoice) => invoice.toJson()).toList(growable: false),
      'usage': usage.map((item) => item.toJson()).toList(growable: false),
      'updatedAt': updatedAt.toIso8601String(),
      'paymentMethodRequired': paymentMethodRequired,
      'gracePeriodEndsAt': gracePeriodEndsAt?.toIso8601String(),
    };
  }

  factory BillingAccountSnapshot.fromJson(Map<String, dynamic> json) {
    return BillingAccountSnapshot(
      customerId: json['customerId']?.toString() ?? 'customer-unknown',
      status: BillingSubscriptionStatus.values.firstWhere(
        (value) => value.name == json['status'],
        orElse: () => BillingSubscriptionStatus.active,
      ),
      plan: BillingPlan.fromJson(Map<String, dynamic>.from(json['plan'] as Map)),
      currentPeriodEnd: json['currentPeriodEnd'] != null
          ? DateTime.tryParse(json['currentPeriodEnd'].toString())
          : null,
      invoices: (json['invoices'] as List<dynamic>? ?? const [])
          .map((item) => BillingInvoice.fromJson(
                Map<String, dynamic>.from(item as Map),
              ))
          .toList(growable: false),
      usage: (json['usage'] as List<dynamic>? ?? const [])
          .map((item) => BillingUsageMetric.fromJson(
                Map<String, dynamic>.from(item as Map),
              ))
          .toList(growable: false),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      paymentMethodRequired: json['paymentMethodRequired'] == true,
      gracePeriodEndsAt: json['gracePeriodEndsAt'] != null
          ? DateTime.tryParse(json['gracePeriodEndsAt'].toString())
          : null,
    );
  }
}

@immutable
class BillingPurchase {
  const BillingPurchase({
    required this.planId,
    required this.purchaseToken,
    required this.amount,
    required this.currency,
    required this.platform,
    required this.purchasedAt,
    this.trial,
    this.metadata = const <String, dynamic>{},
  });

  final String planId;
  final String purchaseToken;
  final double amount;
  final String currency;
  final String platform;
  final DateTime purchasedAt;
  final bool? trial;
  final Map<String, dynamic> metadata;

  Map<String, dynamic> toJson() {
    return {
      'planId': planId,
      'purchaseToken': purchaseToken,
      'amount': amount,
      'currency': currency,
      'platform': platform,
      'purchasedAt': purchasedAt.toIso8601String(),
      'trial': trial,
      'metadata': metadata,
    };
  }
}

@immutable
class BillingQueuedPurchase {
  const BillingQueuedPurchase({
    required this.id,
    required this.purchase,
    required this.createdAt,
    this.lastAttemptAt,
    this.attempts = 0,
    this.lastError,
  });

  final String id;
  final BillingPurchase purchase;
  final DateTime createdAt;
  final DateTime? lastAttemptAt;
  final int attempts;
  final String? lastError;

  BillingQueuedPurchase copyWith({
    DateTime? lastAttemptAt,
    int? attempts,
    String? lastError,
  }) {
    return BillingQueuedPurchase(
      id: id,
      purchase: purchase,
      createdAt: createdAt,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      attempts: attempts ?? this.attempts,
      lastError: lastError,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'purchase': purchase.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'lastAttemptAt': lastAttemptAt?.toIso8601String(),
      'attempts': attempts,
      'lastError': lastError,
    };
  }

  factory BillingQueuedPurchase.fromJson(Map<String, dynamic> json) {
    return BillingQueuedPurchase(
      id: json['id'] as String,
      purchase: BillingPurchase(
        planId: json['purchase']?['planId']?.toString() ?? '',
        purchaseToken: json['purchase']?['purchaseToken']?.toString() ?? '',
        amount: (json['purchase']?['amount'] as num?)?.toDouble() ?? 0,
        currency: json['purchase']?['currency']?.toString() ?? 'USD',
        platform: json['purchase']?['platform']?.toString() ?? 'unknown',
        purchasedAt: DateTime.tryParse(json['purchase']?['purchasedAt']?.toString() ?? '') ?? DateTime.now(),
        trial: json['purchase']?['trial'] as bool?,
        metadata: json['purchase']?['metadata'] is Map
            ? Map<String, dynamic>.from(json['purchase']['metadata'] as Map)
            : const <String, dynamic>{},
      ),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      lastAttemptAt: json['lastAttemptAt'] != null
          ? DateTime.tryParse(json['lastAttemptAt'].toString())
          : null,
      attempts: json['attempts'] as int? ?? 0,
      lastError: json['lastError'] as String?,
    );
  }
}

class BillingCacheStore {
  const BillingCacheStore({
    Box<dynamic>? snapshotBox,
    Box<dynamic>? outboxBox,
  })  : _snapshotBox = snapshotBox,
        _outboxBox = outboxBox;

  final Box<dynamic>? _snapshotBox;
  final Box<dynamic>? _outboxBox;

  static const _snapshotKey = 'billing.snapshot';

  Box<dynamic> get _snapshot => _snapshotBox ?? SessionManager.billingAccountCache;
  Box<dynamic> get _outbox => _outboxBox ?? SessionManager.billingOutbox;

  Future<BillingAccountSnapshot?> readSnapshot() async {
    final raw = _snapshot.get(_snapshotKey);
    if (raw is! Map) {
      return null;
    }
    return BillingAccountSnapshot.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<void> writeSnapshot(BillingAccountSnapshot snapshot) async {
    await _snapshot.put(_snapshotKey, snapshot.toJson());
  }

  Future<List<BillingQueuedPurchase>> readOutbox() async {
    final keys = _outbox.keys.toList(growable: false);
    return keys
        .map((key) => _outbox.get(key))
        .whereType<Map>()
        .map((value) => BillingQueuedPurchase.fromJson(
              Map<String, dynamic>.from(value),
            ))
        .toList(growable: false);
  }

  Future<void> saveOutbox(List<BillingQueuedPurchase> events) async {
    await _outbox.clear();
    for (final event in events) {
      await _outbox.put(event.id, event.toJson());
    }
  }

  Future<void> append(BillingQueuedPurchase event) async {
    await _outbox.put(event.id, event.toJson());
  }

  Future<void> remove(String id) async {
    await _outbox.delete(id);
  }
}

class BillingService {
  BillingService({
    Dio? httpClient,
    BillingCacheStore? cacheStore,
    CommercePersistence? commercePersistence,
    Duration snapshotStaleDuration = const Duration(minutes: 30),
  })  : _httpClient = httpClient ?? ApiConfig.createHttpClient(),
        _cache = cacheStore ?? const BillingCacheStore(),
        _commercePersistence = commercePersistence ?? CommercePersistenceService(),
        _snapshotStaleDuration = snapshotStaleDuration;

  final Dio _httpClient;
  final BillingCacheStore _cache;
  final CommercePersistence _commercePersistence;
  final Duration _snapshotStaleDuration;
  final StreamController<BillingAccountSnapshot> _snapshotController =
      StreamController<BillingAccountSnapshot>.broadcast();

  bool _disposed = false;

  Stream<BillingAccountSnapshot> get snapshots => _snapshotController.stream;

  Future<BillingAccountSnapshot> loadSnapshot({bool forceRefresh = false}) async {
    final cached = await _cache.readSnapshot();
    if (cached != null && !forceRefresh && !cached.isStale(_snapshotStaleDuration)) {
      return cached;
    }

    final fresh = await _fetchSnapshotFromApi();
    if (fresh != null) {
      await _cache.writeSnapshot(fresh);
      _emit(fresh);
      return fresh;
    }

    if (cached != null) {
      return cached;
    }

    final seeded = _seedSnapshot();
    await _cache.writeSnapshot(seeded);
    _emit(seeded);
    return seeded;
  }

  Future<BillingInvoice> recordPurchase(BillingPurchase purchase,
      {bool queueIfOffline = true}) async {
    final payload = purchase.toJson();
    final options = await _authOptions();
    try {
      final response = await _httpClient.post(
        '/mobile/billing/purchases',
        data: payload,
        options: options,
      );
      final data = response.data;
      if (data is Map<String, dynamic> && data['invoice'] is Map<String, dynamic>) {
        final invoice = BillingInvoice.fromJson(
          Map<String, dynamic>.from(data['invoice'] as Map),
        );
        await refreshSnapshot();
        return invoice;
      }
      await refreshSnapshot();
      return _buildPendingInvoice(purchase);
    } on DioException catch (error) {
      if (!queueIfOffline || !_shouldQueue(error)) {
        final message = error.response?.data is Map
            ? (error.response!.data['message']?.toString() ?? 'Billing purchase failed')
            : 'Billing purchase failed';
        throw BillingException(message);
      }
      final queued = _queuePurchase(purchase, lastError: error.message);
      final snapshot = await loadSnapshot();
      final pendingInvoice = _buildPendingInvoice(purchase, status: BillingInvoiceStatus.pending);
      final updated = snapshot.copyWith(
        invoices: [pendingInvoice, ...snapshot.invoices],
        paymentMethodRequired: false,
        updatedAt: DateTime.now(),
      );
      await _cache.writeSnapshot(updated);
      _emit(updated);
      return pendingInvoice.copyWith(number: queued.id);
    }
  }

  Future<BillingAccountSnapshot> refreshSnapshot() {
    return loadSnapshot(forceRefresh: true);
  }

  Future<List<BillingQueuedPurchase>> loadQueuedPurchases() {
    return _cache.readOutbox();
  }

  Future<List<BillingQueuedPurchase>> flushOutbox() async {
    final pending = await _cache.readOutbox();
    if (pending.isEmpty) {
      return const <BillingQueuedPurchase>[];
    }

    final token = SessionManager.getAccessToken();
    if (token == null) {
      return pending;
    }

    final resolved = <BillingQueuedPurchase>[];
    for (final entry in pending) {
      final options = await _authOptions();
      try {
        await _httpClient.post(
          '/mobile/billing/purchases',
          data: entry.purchase.toJson(),
          options: options,
        );
        await _cache.remove(entry.id);
        resolved.add(entry);
      } on DioException catch (error) {
        if (_shouldQueue(error)) {
          final updated = entry.copyWith(
            attempts: entry.attempts + 1,
            lastAttemptAt: DateTime.now(),
            lastError: error.message,
          );
          await _cache.append(updated);
        } else {
          await _cache.remove(entry.id);
        }
      }
    }

    if (resolved.isNotEmpty) {
      await refreshSnapshot();
    }
    return resolved;
  }

  Future<void> cancelSubscription({String? reason}) async {
    final options = await _authOptions();
    try {
      await _httpClient.post(
        '/mobile/billing/cancel',
        data: {'reason': reason},
        options: options,
      );
      await refreshSnapshot();
    } on DioException catch (error) {
      if (!_shouldQueue(error)) {
        throw BillingException('Unable to cancel subscription: ${error.message}');
      }
      final snapshot = await loadSnapshot();
      final updated = snapshot.copyWith(
        status: BillingSubscriptionStatus.canceled,
        updatedAt: DateTime.now(),
      );
      await _cache.writeSnapshot(updated);
      _emit(updated);
    }
  }

  Future<void> ensurePaymentMethodsCached() async {
    final stored = await _commercePersistence.loadPaymentMethods();
    if (stored == null || stored.isEmpty) {
      final controllerSeed = CommercePaymentsControllerSeed.seedMethods();
      await _commercePersistence.savePaymentMethods(controllerSeed);
    }
  }

  Future<void> dispose() async {
    if (_disposed) {
      return;
    }
    _disposed = true;
    await _snapshotController.close();
  }

  Future<BillingAccountSnapshot?> _fetchSnapshotFromApi() async {
    final options = await _authOptions(optional: true);
    try {
      final response = await _httpClient.get(
        '/mobile/billing/snapshot',
        options: options,
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final plan = data['plan'] is Map<String, dynamic>
            ? BillingPlan.fromJson(Map<String, dynamic>.from(data['plan'] as Map))
            : _seedPlan();
        final snapshot = BillingAccountSnapshot(
          customerId: data['customerId']?.toString() ?? 'customer-seeded',
          status: BillingSubscriptionStatus.values.firstWhere(
            (value) => value.name == data['status'],
            orElse: () => BillingSubscriptionStatus.active,
          ),
          plan: plan,
          currentPeriodEnd: data['currentPeriodEnd'] != null
              ? DateTime.tryParse(data['currentPeriodEnd'].toString())
              : null,
          invoices: (data['invoices'] as List<dynamic>? ?? const [])
              .map((item) => BillingInvoice.fromJson(
                    Map<String, dynamic>.from(item as Map),
                  ))
              .toList(growable: false),
          usage: (data['usage'] as List<dynamic>? ?? const [])
              .map((item) => BillingUsageMetric.fromJson(
                    Map<String, dynamic>.from(item as Map),
                  ))
              .toList(growable: false),
          updatedAt: DateTime.now(),
          paymentMethodRequired: data['paymentMethodRequired'] == true,
          gracePeriodEndsAt: data['gracePeriodEndsAt'] != null
              ? DateTime.tryParse(data['gracePeriodEndsAt'].toString())
              : null,
        );
        return snapshot;
      }
    } on DioException catch (error) {
      if (!_shouldQueue(error)) {
        debugPrint('Billing snapshot request failed: ${error.message}');
      }
    }
    return null;
  }

  BillingAccountSnapshot _seedSnapshot() {
    final plan = _seedPlan();
    final invoices = <BillingInvoice>[
      BillingInvoice(
        id: 'inv-2024-08',
        number: 'INV-2024-08',
        amount: plan.amount,
        currency: plan.currency,
        status: BillingInvoiceStatus.paid,
        issuedAt: DateTime.now().subtract(const Duration(days: 30)),
        paidAt: DateTime.now().subtract(const Duration(days: 23)),
        dueAt: DateTime.now().subtract(const Duration(days: 20)),
        lines: [
          BillingInvoiceLine(
            title: plan.name,
            quantity: 1,
            amount: plan.amount,
            metadata: const {'cycle': 'monthly'},
          ),
        ],
      ),
      BillingInvoice(
        id: 'inv-2024-07',
        number: 'INV-2024-07',
        amount: plan.amount,
        currency: plan.currency,
        status: BillingInvoiceStatus.paid,
        issuedAt: DateTime.now().subtract(const Duration(days: 60)),
        paidAt: DateTime.now().subtract(const Duration(days: 54)),
        dueAt: DateTime.now().subtract(const Duration(days: 50)),
        lines: [
          BillingInvoiceLine(
            title: plan.name,
            quantity: 1,
            amount: plan.amount,
          ),
        ],
      ),
    ];

    return BillingAccountSnapshot(
      customerId: 'cust-edulure-mobile',
      status: BillingSubscriptionStatus.active,
      plan: plan,
      currentPeriodEnd: DateTime.now().add(const Duration(days: 17)),
      invoices: invoices,
      usage: const <BillingUsageMetric>[
        BillingUsageMetric(
          metric: 'activeSeats',
          unit: 'seats',
          quantity: 85,
          limit: 100,
          included: 100,
        ),
        BillingUsageMetric(
          metric: 'creatorLicenses',
          unit: 'seats',
          quantity: 12,
          limit: 15,
          included: 15,
        ),
        BillingUsageMetric(
          metric: 'storage',
          unit: 'gb',
          quantity: 540,
          limit: 600,
          included: 600,
        ),
      ],
      updatedAt: DateTime.now(),
      paymentMethodRequired: false,
      gracePeriodEndsAt: null,
    );
  }

  BillingPlan _seedPlan() {
    return const BillingPlan(
      id: 'plan-scale-monthly',
      name: 'Scale Plan',
      description: 'Designed for academies with multi-cohort delivery and live learning.',
      amount: 899,
      currency: 'USD',
      cycle: BillingCycle.monthly,
      entitlements: <String>[
        'Unlimited cohorts',
        'Advanced analytics dashboards',
        'Priority live-support SLAs',
        'Billing exports & reconciliation',
      ],
      trialDays: 14,
      maxSeats: 500,
      metadata: {'supportLevel': 'priority'},
    );
  }

  BillingInvoice _buildPendingInvoice(BillingPurchase purchase,
      {BillingInvoiceStatus status = BillingInvoiceStatus.open}) {
    return BillingInvoice(
      id: 'pending-${purchase.purchaseToken}',
      number: 'PENDING-${purchase.purchaseToken.substring(0, min(8, purchase.purchaseToken.length))}',
      amount: purchase.amount,
      currency: purchase.currency,
      status: status,
      issuedAt: purchase.purchasedAt,
      dueAt: purchase.purchasedAt,
      lines: [
        BillingInvoiceLine(
          title: 'Mobile purchase (${purchase.planId})',
          quantity: 1,
          amount: purchase.amount,
          metadata: {
            'platform': purchase.platform,
            ...purchase.metadata,
          },
        ),
      ],
    );
  }

  BillingQueuedPurchase _queuePurchase(BillingPurchase purchase, {String? lastError}) {
    final random = Random();
    final id = '${DateTime.now().microsecondsSinceEpoch}-${random.nextInt(9999).toString().padLeft(4, '0')}';
    final queued = BillingQueuedPurchase(
      id: id,
      purchase: purchase,
      createdAt: DateTime.now(),
      attempts: 0,
      lastError: lastError,
    );
    unawaited(_cache.append(queued));
    return queued;
  }

  Future<Options> _authOptions({bool optional = false}) async {
    final token = SessionManager.getAccessToken();
    if (token == null && !optional) {
      throw BillingException('User session required for billing operations');
    }
    return Options(
      headers: {
        if (token != null) 'Authorization': 'Bearer $token',
      },
    );
  }

  bool _shouldQueue(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return true;
    }
    final status = error.response?.statusCode ?? 0;
    return status == 408 || status == 429 || status == 500 || status == 502 || status == 503 || status == 504;
  }

  void _emit(BillingAccountSnapshot snapshot) {
    if (_disposed) {
      return;
    }
    if (!_snapshotController.isClosed) {
      _snapshotController.add(snapshot);
    }
  }
}

/// Helper used by [BillingService.ensurePaymentMethodsCached] to seed default
/// payment methods without creating a dependency loop with the Riverpod
/// controller implementation.
class CommercePaymentsControllerSeed {
  static List<CommercePaymentMethod> seedMethods() {
    final now = DateTime.now();
    return [
      CommercePaymentMethod.card(
        brand: 'Visa',
        last4: '4242',
        expMonth: 12,
        expYear: now.year + 3,
        accountHolder: 'Edulure Finance',
        billingEmail: 'finance@edulure.com',
        defaultMethod: true,
        country: 'US',
      ),
      CommercePaymentMethod.card(
        brand: 'Mastercard',
        last4: '1188',
        expMonth: 6,
        expYear: now.year + 4,
        accountHolder: 'Community Operations',
        billingEmail: 'ops@edulure.com',
        country: 'CA',
      ),
    ];
  }
}
