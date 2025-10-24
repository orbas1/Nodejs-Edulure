import 'dart:convert';

import 'package:flutter/foundation.dart';

String _generateCommerceId(String prefix) {
  final timestamp = DateTime.now().microsecondsSinceEpoch;
  final random = (timestamp * 9973) % 1000000;
  return '$prefix-$timestamp-$random';
}

String generateCommerceId(String prefix) => _generateCommerceId(prefix);

enum CourseOrderStatus {
  draft,
  awaitingPayment,
  paid,
  provisioning,
  completed,
  refunded,
  canceled,
}

enum TutorBookingStatus {
  intake,
  pending,
  awaitingPayment,
  confirmed,
  inProgress,
  completed,
  canceled,
}

enum BillingCycle {
  monthly,
  quarterly,
  yearly,
}

enum SubscriptionStatus {
  trialing,
  active,
  pastDue,
  canceled,
}

enum InvoiceStatus {
  draft,
  open,
  paid,
  voided,
  refunded,
  failed,
}

extension CourseOrderStatusX on CourseOrderStatus {
  String get label {
    switch (this) {
      case CourseOrderStatus.draft:
        return 'Draft';
      case CourseOrderStatus.awaitingPayment:
        return 'Awaiting payment';
      case CourseOrderStatus.paid:
        return 'Paid';
      case CourseOrderStatus.provisioning:
        return 'Provisioning';
      case CourseOrderStatus.completed:
        return 'Completed';
      case CourseOrderStatus.refunded:
        return 'Refunded';
      case CourseOrderStatus.canceled:
        return 'Canceled';
    }
  }

  static CourseOrderStatus fromName(String value) {
    return CourseOrderStatus.values.firstWhere(
      (status) => describeEnum(status) == value,
      orElse: () => CourseOrderStatus.draft,
    );
  }
}

extension TutorBookingStatusX on TutorBookingStatus {
  String get label {
    switch (this) {
      case TutorBookingStatus.intake:
        return 'Needs intake';
      case TutorBookingStatus.pending:
        return 'Pending routing';
      case TutorBookingStatus.awaitingPayment:
        return 'Awaiting payment';
      case TutorBookingStatus.confirmed:
        return 'Confirmed';
      case TutorBookingStatus.inProgress:
        return 'In progress';
      case TutorBookingStatus.completed:
        return 'Completed';
      case TutorBookingStatus.canceled:
        return 'Canceled';
    }
  }

  static TutorBookingStatus fromName(String value) {
    return TutorBookingStatus.values.firstWhere(
      (status) => describeEnum(status) == value,
      orElse: () => TutorBookingStatus.pending,
    );
  }
}

extension BillingCycleX on BillingCycle {
  String get label {
    switch (this) {
      case BillingCycle.monthly:
        return 'Monthly';
      case BillingCycle.quarterly:
        return 'Quarterly';
      case BillingCycle.yearly:
        return 'Yearly';
    }
  }

  static BillingCycle fromName(String value) {
    return BillingCycle.values.firstWhere(
      (cycle) => describeEnum(cycle) == value,
      orElse: () => BillingCycle.monthly,
    );
  }
}

extension SubscriptionStatusX on SubscriptionStatus {
  String get label {
    switch (this) {
      case SubscriptionStatus.trialing:
        return 'Trialing';
      case SubscriptionStatus.active:
        return 'Active';
      case SubscriptionStatus.pastDue:
        return 'Past due';
      case SubscriptionStatus.canceled:
        return 'Canceled';
    }
  }

  static SubscriptionStatus fromName(String value) {
    return SubscriptionStatus.values.firstWhere(
      (status) => describeEnum(status) == value,
      orElse: () => SubscriptionStatus.active,
    );
  }
}

extension InvoiceStatusX on InvoiceStatus {
  String get label {
    switch (this) {
      case InvoiceStatus.draft:
        return 'Draft';
      case InvoiceStatus.open:
        return 'Open';
      case InvoiceStatus.paid:
        return 'Paid';
      case InvoiceStatus.voided:
        return 'Voided';
      case InvoiceStatus.refunded:
        return 'Refunded';
      case InvoiceStatus.failed:
        return 'Failed';
    }
  }

  static InvoiceStatus fromName(String value) {
    return InvoiceStatus.values.firstWhere(
      (status) => describeEnum(status) == value,
      orElse: () => InvoiceStatus.draft,
    );
  }
}

class CommercePaymentMethod {
  CommercePaymentMethod({
    required this.id,
    required this.type,
    required this.displayName,
    required this.brand,
    required this.last4,
    required this.expMonth,
    required this.expYear,
    required this.country,
    this.accountHolder,
    this.billingEmail,
    this.defaultMethod = false,
  });

  factory CommercePaymentMethod.card({
    required String brand,
    required String last4,
    required int expMonth,
    required int expYear,
    String? accountHolder,
    String? billingEmail,
    bool defaultMethod = false,
    String country = 'US',
  }) {
    final id = generateCommerceId('pm');
    return CommercePaymentMethod(
      id: id,
      type: 'card',
      displayName: '$brand •••• $last4',
      brand: brand,
      last4: last4,
      expMonth: expMonth,
      expYear: expYear,
      country: country,
      accountHolder: accountHolder,
      billingEmail: billingEmail,
      defaultMethod: defaultMethod,
    );
  }

  factory CommercePaymentMethod.fromJson(Map<String, dynamic> json) {
    return CommercePaymentMethod(
      id: json['id']?.toString() ?? generateCommerceId('pm'),
      type: json['type']?.toString() ?? 'card',
      displayName: json['displayName']?.toString() ?? 'Payment method',
      brand: json['brand']?.toString() ?? 'Card',
      last4: json['last4']?.toString() ?? '0000',
      expMonth: json['expMonth'] is int
          ? json['expMonth'] as int
          : int.tryParse(json['expMonth']?.toString() ?? '') ?? 1,
      expYear: json['expYear'] is int
          ? json['expYear'] as int
          : int.tryParse(json['expYear']?.toString() ?? '') ?? DateTime.now().year,
      country: json['country']?.toString() ?? 'US',
      accountHolder: json['accountHolder']?.toString(),
      billingEmail: json['billingEmail']?.toString(),
      defaultMethod: json['defaultMethod'] == true,
    );
  }

  final String id;
  final String type;
  final String displayName;
  final String brand;
  final String last4;
  final int expMonth;
  final int expYear;
  final String country;
  final String? accountHolder;
  final String? billingEmail;
  final bool defaultMethod;

  CommercePaymentMethod copyWith({
    String? displayName,
    String? brand,
    String? last4,
    int? expMonth,
    int? expYear,
    String? country,
    String? accountHolder,
    String? billingEmail,
    bool? defaultMethod,
  }) {
    return CommercePaymentMethod(
      id: id,
      type: type,
      displayName: displayName ?? this.displayName,
      brand: brand ?? this.brand,
      last4: last4 ?? this.last4,
      expMonth: expMonth ?? this.expMonth,
      expYear: expYear ?? this.expYear,
      country: country ?? this.country,
      accountHolder: accountHolder ?? this.accountHolder,
      billingEmail: billingEmail ?? this.billingEmail,
      defaultMethod: defaultMethod ?? this.defaultMethod,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'displayName': displayName,
      'brand': brand,
      'last4': last4,
      'expMonth': expMonth,
      'expYear': expYear,
      'country': country,
      'accountHolder': accountHolder,
      'billingEmail': billingEmail,
      'defaultMethod': defaultMethod,
    };
  }
}

class CourseCoupon {
  CourseCoupon({
    required this.code,
    required this.description,
    required this.percentOff,
    this.maxRedemptions,
    this.redeemed = 0,
    this.active = true,
    this.expiresAt,
  });

  factory CourseCoupon.fromJson(Map<String, dynamic> json) {
    return CourseCoupon(
      code: json['code']?.toString().toUpperCase() ?? 'SAVE10',
      description: json['description']?.toString() ?? 'Limited-time savings',
      percentOff: json['percentOff'] is num
          ? (json['percentOff'] as num).toDouble()
          : double.tryParse(json['percentOff']?.toString() ?? '') ?? 0,
      maxRedemptions: json['maxRedemptions'] is int
          ? json['maxRedemptions'] as int
          : int.tryParse(json['maxRedemptions']?.toString() ?? ''),
      redeemed: json['redeemed'] is int ? json['redeemed'] as int : int.tryParse('${json['redeemed']}') ?? 0,
      active: json['active'] != false,
      expiresAt: json['expiresAt'] != null
          ? DateTime.tryParse(json['expiresAt'].toString())
          : null,
    );
  }

  final String code;
  final String description;
  final double percentOff;
  final int? maxRedemptions;
  final int redeemed;
  final bool active;
  final DateTime? expiresAt;

  bool get hasCapacity => maxRedemptions == null || redeemed < maxRedemptions!;

  bool get isExpired => expiresAt != null && DateTime.now().isAfter(expiresAt!);

  double discountAmount(double subtotal) => subtotal * (percentOff / 100);

  CourseCoupon copyWith({
    String? description,
    double? percentOff,
    int? maxRedemptions,
    int? redeemed,
    bool? active,
    DateTime? expiresAt,
  }) {
    return CourseCoupon(
      code: code,
      description: description ?? this.description,
      percentOff: percentOff ?? this.percentOff,
      maxRedemptions: maxRedemptions ?? this.maxRedemptions,
      redeemed: redeemed ?? this.redeemed,
      active: active ?? this.active,
      expiresAt: expiresAt ?? this.expiresAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'code': code,
      'description': description,
      'percentOff': percentOff,
      'maxRedemptions': maxRedemptions,
      'redeemed': redeemed,
      'active': active,
      'expiresAt': expiresAt?.toIso8601String(),
    };
  }
}

class CourseCheckoutOffer {
  CourseCheckoutOffer({
    required this.id,
    required this.courseId,
    required this.courseTitle,
    required this.cohortName,
    required this.price,
    required this.currency,
    required this.startDate,
    required this.endDate,
    required this.seats,
    required this.deliveryFormat,
    required this.pacing,
    required this.liveSupport,
    required this.tags,
    required this.bonuses,
    this.published = true,
  });

  factory CourseCheckoutOffer.fromJson(Map<String, dynamic> json) {
    return CourseCheckoutOffer(
      id: json['id']?.toString() ?? generateCommerceId('offer'),
      courseId: json['courseId']?.toString() ?? 'course-1',
      courseTitle: json['courseTitle']?.toString() ?? 'Course',
      cohortName: json['cohortName']?.toString() ?? 'Cohort',
      price: json['price'] is num ? (json['price'] as num).toDouble() : double.tryParse('${json['price']}') ?? 0,
      currency: json['currency']?.toString() ?? 'USD',
      startDate: DateTime.tryParse(json['startDate']?.toString() ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(json['endDate']?.toString() ?? '') ?? DateTime.now().add(const Duration(days: 30)),
      seats: json['seats'] is int ? json['seats'] as int : int.tryParse('${json['seats']}') ?? 0,
      deliveryFormat: json['deliveryFormat']?.toString() ?? 'Hybrid',
      pacing: json['pacing']?.toString() ?? '4-week sprint',
      liveSupport: json['liveSupport'] != false,
      tags: (json['tags'] as List?)?.map((item) => item.toString()).toList() ?? const <String>[],
      bonuses: (json['bonuses'] as List?)?.map((item) => item.toString()).toList() ?? const <String>[],
      published: json['published'] != false,
    );
  }

  final String id;
  final String courseId;
  final String courseTitle;
  final String cohortName;
  final double price;
  final String currency;
  final DateTime startDate;
  final DateTime endDate;
  final int seats;
  final String deliveryFormat;
  final String pacing;
  final bool liveSupport;
  final List<String> tags;
  final List<String> bonuses;
  final bool published;

  CourseCheckoutOffer copyWith({
    String? cohortName,
    double? price,
    String? currency,
    DateTime? startDate,
    DateTime? endDate,
    int? seats,
    String? deliveryFormat,
    String? pacing,
    bool? liveSupport,
    List<String>? tags,
    List<String>? bonuses,
    bool? published,
  }) {
    return CourseCheckoutOffer(
      id: id,
      courseId: courseId,
      courseTitle: courseTitle,
      cohortName: cohortName ?? this.cohortName,
      price: price ?? this.price,
      currency: currency ?? this.currency,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      seats: seats ?? this.seats,
      deliveryFormat: deliveryFormat ?? this.deliveryFormat,
      pacing: pacing ?? this.pacing,
      liveSupport: liveSupport ?? this.liveSupport,
      tags: tags ?? List<String>.from(this.tags),
      bonuses: bonuses ?? List<String>.from(this.bonuses),
      published: published ?? this.published,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'courseId': courseId,
      'courseTitle': courseTitle,
      'cohortName': cohortName,
      'price': price,
      'currency': currency,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'seats': seats,
      'deliveryFormat': deliveryFormat,
      'pacing': pacing,
      'liveSupport': liveSupport,
      'tags': tags,
      'bonuses': bonuses,
      'published': published,
    };
  }
}

class CourseCheckoutOrder {
  CourseCheckoutOrder({
    required this.id,
    required this.offerId,
    required this.offerName,
    required this.learnerName,
    required this.learnerEmail,
    required this.quantity,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    required this.currency,
    required this.status,
    required this.createdAt,
    required this.paymentMethodId,
    this.invoiceId,
    this.notes,
    this.scheduledAt,
    this.couponCode,
  });

  factory CourseCheckoutOrder.fromJson(Map<String, dynamic> json) {
    return CourseCheckoutOrder(
      id: json['id']?.toString() ?? generateCommerceId('order'),
      offerId: json['offerId']?.toString() ?? 'offer',
      offerName: json['offerName']?.toString() ?? 'Course offer',
      learnerName: json['learnerName']?.toString() ?? 'Learner',
      learnerEmail: json['learnerEmail']?.toString() ?? 'learner@example.com',
      quantity: json['quantity'] is int ? json['quantity'] as int : int.tryParse('${json['quantity']}') ?? 1,
      subtotal: json['subtotal'] is num ? (json['subtotal'] as num).toDouble() : double.tryParse('${json['subtotal']}') ?? 0,
      discount: json['discount'] is num ? (json['discount'] as num).toDouble() : double.tryParse('${json['discount']}') ?? 0,
      tax: json['tax'] is num ? (json['tax'] as num).toDouble() : double.tryParse('${json['tax']}') ?? 0,
      total: json['total'] is num ? (json['total'] as num).toDouble() : double.tryParse('${json['total']}') ?? 0,
      currency: json['currency']?.toString() ?? 'USD',
      status: CourseOrderStatusX.fromName(json['status']?.toString() ?? 'draft'),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      paymentMethodId: json['paymentMethodId']?.toString() ?? 'pm',
      invoiceId: json['invoiceId']?.toString(),
      notes: json['notes']?.toString(),
      scheduledAt: json['scheduledAt'] != null ? DateTime.tryParse(json['scheduledAt'].toString()) : null,
      couponCode: json['couponCode']?.toString(),
    );
  }

  final String id;
  final String offerId;
  final String offerName;
  final String learnerName;
  final String learnerEmail;
  final int quantity;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final String currency;
  final CourseOrderStatus status;
  final DateTime createdAt;
  final String paymentMethodId;
  final String? invoiceId;
  final String? notes;
  final DateTime? scheduledAt;
  final String? couponCode;

  CourseCheckoutOrder copyWith({
    int? quantity,
    double? subtotal,
    double? discount,
    double? tax,
    double? total,
    CourseOrderStatus? status,
    String? paymentMethodId,
    String? invoiceId,
    String? notes,
    DateTime? scheduledAt,
    String? couponCode,
  }) {
    return CourseCheckoutOrder(
      id: id,
      offerId: offerId,
      offerName: offerName,
      learnerName: learnerName,
      learnerEmail: learnerEmail,
      quantity: quantity ?? this.quantity,
      subtotal: subtotal ?? this.subtotal,
      discount: discount ?? this.discount,
      tax: tax ?? this.tax,
      total: total ?? this.total,
      currency: currency,
      status: status ?? this.status,
      createdAt: createdAt,
      paymentMethodId: paymentMethodId ?? this.paymentMethodId,
      invoiceId: invoiceId ?? this.invoiceId,
      notes: notes ?? this.notes,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      couponCode: couponCode ?? this.couponCode,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'offerId': offerId,
      'offerName': offerName,
      'learnerName': learnerName,
      'learnerEmail': learnerEmail,
      'quantity': quantity,
      'subtotal': subtotal,
      'discount': discount,
      'tax': tax,
      'total': total,
      'currency': currency,
      'status': describeEnum(status),
      'createdAt': createdAt.toIso8601String(),
      'paymentMethodId': paymentMethodId,
      'invoiceId': invoiceId,
      'notes': notes,
      'scheduledAt': scheduledAt?.toIso8601String(),
      'couponCode': couponCode,
    };
  }
}

class TutorPackage {
  const TutorPackage({
    required this.id,
    required this.name,
    required this.description,
    required this.tutorId,
    required this.sessionCount,
    required this.sessionDurationMinutes,
    required this.price,
    required this.currency,
    required this.active,
  });

  factory TutorPackage.fromJson(Map<String, dynamic> json) {
    return TutorPackage(
      id: json['id']?.toString() ?? generateCommerceId('pkg'),
      name: json['name']?.toString() ?? 'Mentorship package',
      description: json['description']?.toString() ?? 'Mentorship bundle',
      tutorId: json['tutorId']?.toString() ?? 'tutor-1',
      sessionCount: json['sessionCount'] is int
          ? json['sessionCount'] as int
          : int.tryParse(json['sessionCount']?.toString() ?? '') ?? 4,
      sessionDurationMinutes: json['sessionDurationMinutes'] is int
          ? json['sessionDurationMinutes'] as int
          : int.tryParse(json['sessionDurationMinutes']?.toString() ?? '') ?? 60,
      price: json['price'] is num ? (json['price'] as num).toDouble() : double.tryParse('${json['price']}') ?? 0,
      currency: json['currency']?.toString() ?? 'USD',
      active: json['active'] != false,
    );
  }

  final String id;
  final String name;
  final String description;
  final String tutorId;
  final int sessionCount;
  final int sessionDurationMinutes;
  final double price;
  final String currency;
  final bool active;

  TutorPackage copyWith({
    String? name,
    String? description,
    String? tutorId,
    int? sessionCount,
    int? sessionDurationMinutes,
    double? price,
    String? currency,
    bool? active,
  }) {
    return TutorPackage(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      tutorId: tutorId ?? this.tutorId,
      sessionCount: sessionCount ?? this.sessionCount,
      sessionDurationMinutes: sessionDurationMinutes ?? this.sessionDurationMinutes,
      price: price ?? this.price,
      currency: currency ?? this.currency,
      active: active ?? this.active,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'tutorId': tutorId,
      'sessionCount': sessionCount,
      'sessionDurationMinutes': sessionDurationMinutes,
      'price': price,
      'currency': currency,
      'active': active,
    };
  }
}

class TutorBookingRequest {
  TutorBookingRequest({
    required this.id,
    required this.learnerName,
    required this.learnerEmail,
    required this.topic,
    required this.requestedAt,
    required this.durationMinutes,
    required this.rate,
    required this.currency,
    required this.status,
    this.tutorId,
    this.notes,
    this.intakeUrl,
    this.scheduledAt,
    this.paymentMethodId,
    this.meetingUrl,
  });

  factory TutorBookingRequest.fromJson(Map<String, dynamic> json) {
    return TutorBookingRequest(
      id: json['id']?.toString() ?? generateCommerceId('booking'),
      learnerName: json['learnerName']?.toString() ?? 'Learner',
      learnerEmail: json['learnerEmail']?.toString() ?? 'learner@example.com',
      topic: json['topic']?.toString() ?? 'Session topic',
      requestedAt: DateTime.tryParse(json['requestedAt']?.toString() ?? '') ?? DateTime.now(),
      durationMinutes: json['durationMinutes'] is int
          ? json['durationMinutes'] as int
          : int.tryParse('${json['durationMinutes']}') ?? 60,
      rate: json['rate'] is num ? (json['rate'] as num).toDouble() : double.tryParse('${json['rate']}') ?? 0,
      currency: json['currency']?.toString() ?? 'USD',
      status: TutorBookingStatusX.fromName(json['status']?.toString() ?? 'pending'),
      tutorId: json['tutorId']?.toString(),
      notes: json['notes']?.toString(),
      intakeUrl: json['intakeUrl']?.toString(),
      scheduledAt: json['scheduledAt'] != null ? DateTime.tryParse(json['scheduledAt'].toString()) : null,
      paymentMethodId: json['paymentMethodId']?.toString(),
      meetingUrl: json['meetingUrl']?.toString(),
    );
  }

  final String id;
  final String learnerName;
  final String learnerEmail;
  final String topic;
  final DateTime requestedAt;
  final int durationMinutes;
  final double rate;
  final String currency;
  final TutorBookingStatus status;
  final String? tutorId;
  final String? notes;
  final String? intakeUrl;
  final DateTime? scheduledAt;
  final String? paymentMethodId;
  final String? meetingUrl;

  double get totalValue => rate * (durationMinutes / 60);

  TutorBookingRequest copyWith({
    String? learnerName,
    String? learnerEmail,
    String? topic,
    DateTime? requestedAt,
    int? durationMinutes,
    double? rate,
    String? currency,
    TutorBookingStatus? status,
    String? tutorId,
    String? notes,
    String? intakeUrl,
    DateTime? scheduledAt,
    String? paymentMethodId,
    String? meetingUrl,
  }) {
    return TutorBookingRequest(
      id: id,
      learnerName: learnerName ?? this.learnerName,
      learnerEmail: learnerEmail ?? this.learnerEmail,
      topic: topic ?? this.topic,
      requestedAt: requestedAt ?? this.requestedAt,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      rate: rate ?? this.rate,
      currency: currency ?? this.currency,
      status: status ?? this.status,
      tutorId: tutorId ?? this.tutorId,
      notes: notes ?? this.notes,
      intakeUrl: intakeUrl ?? this.intakeUrl,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      paymentMethodId: paymentMethodId ?? this.paymentMethodId,
      meetingUrl: meetingUrl ?? this.meetingUrl,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'learnerName': learnerName,
      'learnerEmail': learnerEmail,
      'topic': topic,
      'requestedAt': requestedAt.toIso8601String(),
      'durationMinutes': durationMinutes,
      'rate': rate,
      'currency': currency,
      'status': describeEnum(status),
      'tutorId': tutorId,
      'notes': notes,
      'intakeUrl': intakeUrl,
      'scheduledAt': scheduledAt?.toIso8601String(),
      'paymentMethodId': paymentMethodId,
      'meetingUrl': meetingUrl,
    };
  }
}

class CommunitySubscriptionPlan {
  CommunitySubscriptionPlan({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.currency,
    required this.billingCycle,
    required this.trialDays,
    required this.features,
    this.featured = false,
    this.active = true,
  });

  factory CommunitySubscriptionPlan.fromJson(Map<String, dynamic> json) {
    return CommunitySubscriptionPlan(
      id: json['id']?.toString() ?? generateCommerceId('plan'),
      name: json['name']?.toString() ?? 'Community plan',
      description: json['description']?.toString() ?? 'Community membership tier',
      price: json['price'] is num ? (json['price'] as num).toDouble() : double.tryParse('${json['price']}') ?? 0,
      currency: json['currency']?.toString() ?? 'USD',
      billingCycle: BillingCycleX.fromName(json['billingCycle']?.toString() ?? 'monthly'),
      trialDays: json['trialDays'] is int ? json['trialDays'] as int : int.tryParse('${json['trialDays']}') ?? 0,
      features: (json['features'] as List?)?.map((item) => item.toString()).toList() ?? const <String>[],
      featured: json['featured'] == true,
      active: json['active'] != false,
    );
  }

  final String id;
  final String name;
  final String description;
  final double price;
  final String currency;
  final BillingCycle billingCycle;
  final int trialDays;
  final List<String> features;
  final bool featured;
  final bool active;

  CommunitySubscriptionPlan copyWith({
    String? name,
    String? description,
    double? price,
    String? currency,
    BillingCycle? billingCycle,
    int? trialDays,
    List<String>? features,
    bool? featured,
    bool? active,
  }) {
    return CommunitySubscriptionPlan(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      currency: currency ?? this.currency,
      billingCycle: billingCycle ?? this.billingCycle,
      trialDays: trialDays ?? this.trialDays,
      features: features ?? List<String>.from(this.features),
      featured: featured ?? this.featured,
      active: active ?? this.active,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'currency': currency,
      'billingCycle': describeEnum(billingCycle),
      'trialDays': trialDays,
      'features': features,
      'featured': featured,
      'active': active,
    };
  }
}

class CommunitySubscriber {
  CommunitySubscriber({
    required this.id,
    required this.fullName,
    required this.email,
    required this.company,
    required this.planId,
    required this.status,
    required this.joinedAt,
    required this.currentPeriodEnd,
    required this.autoRenew,
    required this.seats,
    this.paymentMethodId,
    this.notes,
  });

  factory CommunitySubscriber.fromJson(Map<String, dynamic> json) {
    return CommunitySubscriber(
      id: json['id']?.toString() ?? generateCommerceId('subscriber'),
      fullName: json['fullName']?.toString() ?? 'Member',
      email: json['email']?.toString() ?? 'member@example.com',
      company: json['company']?.toString() ?? '',
      planId: json['planId']?.toString() ?? 'plan',
      status: SubscriptionStatusX.fromName(json['status']?.toString() ?? 'active'),
      joinedAt: DateTime.tryParse(json['joinedAt']?.toString() ?? '') ?? DateTime.now(),
      currentPeriodEnd:
          DateTime.tryParse(json['currentPeriodEnd']?.toString() ?? '') ?? DateTime.now().add(const Duration(days: 30)),
      autoRenew: json['autoRenew'] != false,
      seats: json['seats'] is int ? json['seats'] as int : int.tryParse('${json['seats']}') ?? 1,
      paymentMethodId: json['paymentMethodId']?.toString(),
      notes: json['notes']?.toString(),
    );
  }

  final String id;
  final String fullName;
  final String email;
  final String company;
  final String planId;
  final SubscriptionStatus status;
  final DateTime joinedAt;
  final DateTime currentPeriodEnd;
  final bool autoRenew;
  final int seats;
  final String? paymentMethodId;
  final String? notes;

  CommunitySubscriber copyWith({
    String? fullName,
    String? email,
    String? company,
    String? planId,
    SubscriptionStatus? status,
    DateTime? currentPeriodEnd,
    bool? autoRenew,
    int? seats,
    String? paymentMethodId,
    String? notes,
  }) {
    return CommunitySubscriber(
      id: id,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      company: company ?? this.company,
      planId: planId ?? this.planId,
      status: status ?? this.status,
      joinedAt: joinedAt,
      currentPeriodEnd: currentPeriodEnd ?? this.currentPeriodEnd,
      autoRenew: autoRenew ?? this.autoRenew,
      seats: seats ?? this.seats,
      paymentMethodId: paymentMethodId ?? this.paymentMethodId,
      notes: notes ?? this.notes,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'email': email,
      'company': company,
      'planId': planId,
      'status': describeEnum(status),
      'joinedAt': joinedAt.toIso8601String(),
      'currentPeriodEnd': currentPeriodEnd.toIso8601String(),
      'autoRenew': autoRenew,
      'seats': seats,
      'paymentMethodId': paymentMethodId,
      'notes': notes,
    };
  }
}

class CommunityInvoice {
  CommunityInvoice({
    required this.id,
    required this.subscriberId,
    required this.planId,
    required this.amount,
    required this.currency,
    required this.tax,
    required this.discount,
    required this.status,
    required this.issuedAt,
    required this.dueDate,
    this.paidAt,
  });

  factory CommunityInvoice.fromJson(Map<String, dynamic> json) {
    return CommunityInvoice(
      id: json['id']?.toString() ?? generateCommerceId('invoice'),
      subscriberId: json['subscriberId']?.toString() ?? 'subscriber',
      planId: json['planId']?.toString() ?? 'plan',
      amount: json['amount'] is num ? (json['amount'] as num).toDouble() : double.tryParse('${json['amount']}') ?? 0,
      currency: json['currency']?.toString() ?? 'USD',
      tax: json['tax'] is num ? (json['tax'] as num).toDouble() : double.tryParse('${json['tax']}') ?? 0,
      discount: json['discount'] is num
          ? (json['discount'] as num).toDouble()
          : double.tryParse('${json['discount']}') ?? 0,
      status: InvoiceStatusX.fromName(json['status']?.toString() ?? 'open'),
      issuedAt: DateTime.tryParse(json['issuedAt']?.toString() ?? '') ?? DateTime.now(),
      dueDate: DateTime.tryParse(json['dueDate']?.toString() ?? '') ?? DateTime.now().add(const Duration(days: 7)),
      paidAt: json['paidAt'] != null ? DateTime.tryParse(json['paidAt'].toString()) : null,
    );
  }

  final String id;
  final String subscriberId;
  final String planId;
  final double amount;
  final String currency;
  final double tax;
  final double discount;
  final InvoiceStatus status;
  final DateTime issuedAt;
  final DateTime dueDate;
  final DateTime? paidAt;

  CommunityInvoice copyWith({
    double? amount,
    double? tax,
    double? discount,
    InvoiceStatus? status,
    DateTime? dueDate,
    DateTime? paidAt,
  }) {
    return CommunityInvoice(
      id: id,
      subscriberId: subscriberId,
      planId: planId,
      amount: amount ?? this.amount,
      currency: currency,
      tax: tax ?? this.tax,
      discount: discount ?? this.discount,
      status: status ?? this.status,
      issuedAt: issuedAt,
      dueDate: dueDate ?? this.dueDate,
      paidAt: paidAt ?? this.paidAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subscriberId': subscriberId,
      'planId': planId,
      'amount': amount,
      'currency': currency,
      'tax': tax,
      'discount': discount,
      'status': describeEnum(status),
      'issuedAt': issuedAt.toIso8601String(),
      'dueDate': dueDate.toIso8601String(),
      'paidAt': paidAt?.toIso8601String(),
    };
  }
}

class CourseCheckoutSnapshot {
  CourseCheckoutSnapshot({
    required this.offers,
    required this.orders,
    required this.coupons,
  });

  factory CourseCheckoutSnapshot.fromJson(Map<String, dynamic> json) {
    return CourseCheckoutSnapshot(
      offers: (json['offers'] as List?)
              ?.map((item) => CourseCheckoutOffer.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList() ??
          const <CourseCheckoutOffer>[],
      orders: (json['orders'] as List?)
              ?.map((item) => CourseCheckoutOrder.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList() ??
          const <CourseCheckoutOrder>[],
      coupons: (json['coupons'] as List?)
              ?.map((item) => CourseCoupon.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList() ??
          const <CourseCoupon>[],
    );
  }

  final List<CourseCheckoutOffer> offers;
  final List<CourseCheckoutOrder> orders;
  final List<CourseCoupon> coupons;

  Map<String, dynamic> toJson() {
    return {
      'offers': offers.map((offer) => offer.toJson()).toList(growable: false),
      'orders': orders.map((order) => order.toJson()).toList(growable: false),
      'coupons': coupons.map((coupon) => coupon.toJson()).toList(growable: false),
    };
  }
}

class TutorBookingSnapshot {
  TutorBookingSnapshot({
    required this.requests,
    required this.packages,
  });

  factory TutorBookingSnapshot.fromJson(Map<String, dynamic> json) {
    return TutorBookingSnapshot(
      requests: (json['requests'] as List?)
              ?.map((item) => TutorBookingRequest.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList() ??
          const <TutorBookingRequest>[],
      packages: (json['packages'] as List?)
              ?.map((item) => TutorPackage.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList() ??
          const <TutorPackage>[],
    );
  }

  final List<TutorBookingRequest> requests;
  final List<TutorPackage> packages;

  Map<String, dynamic> toJson() {
    return {
      'requests': requests.map((request) => request.toJson()).toList(growable: false),
      'packages': packages.map((pkg) => pkg.toJson()).toList(growable: false),
    };
  }
}

class CommunitySubscriptionSnapshot {
  CommunitySubscriptionSnapshot({
    required this.plans,
    required this.subscribers,
    required this.invoices,
  });

  factory CommunitySubscriptionSnapshot.fromJson(Map<String, dynamic> json) {
    return CommunitySubscriptionSnapshot(
      plans: (json['plans'] as List?)
              ?.map((item) => CommunitySubscriptionPlan.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList() ??
          const <CommunitySubscriptionPlan>[],
      subscribers: (json['subscribers'] as List?)
              ?.map((item) => CommunitySubscriber.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList() ??
          const <CommunitySubscriber>[],
      invoices: (json['invoices'] as List?)
              ?.map((item) => CommunityInvoice.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList() ??
          const <CommunityInvoice>[],
    );
  }

  final List<CommunitySubscriptionPlan> plans;
  final List<CommunitySubscriber> subscribers;
  final List<CommunityInvoice> invoices;

  Map<String, dynamic> toJson() {
    return {
      'plans': plans.map((plan) => plan.toJson()).toList(growable: false),
      'subscribers': subscribers.map((member) => member.toJson()).toList(growable: false),
      'invoices': invoices.map((invoice) => invoice.toJson()).toList(growable: false),
    };
  }
}

class BillingProduct {
  BillingProduct({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.currency,
    required this.billingCycle,
    required this.active,
    this.planType,
    this.trialDays,
    this.metadata = const <String, dynamic>{},
  });

  factory BillingProduct.fromJson(Map<String, dynamic> json) {
    return BillingProduct(
      id: json['id']?.toString() ?? generateCommerceId('product'),
      name: json['name']?.toString() ?? 'Subscription plan',
      description: json['description']?.toString() ?? '',
      price: json['price'] is num
          ? (json['price'] as num).toDouble()
          : double.tryParse('${json['price']}') ??
              0,
      currency: json['currency']?.toString() ?? 'USD',
      billingCycle: BillingCycleX.fromName(
        json['billingCycle']?.toString() ?? 'monthly',
      ),
      active: json['active'] != false,
      planType: json['planType']?.toString(),
      trialDays: json['trialDays'] is int
          ? json['trialDays'] as int
          : int.tryParse('${json['trialDays']}'),
      metadata: json['metadata'] is Map
          ? Map<String, dynamic>.from(
              json['metadata'] as Map,
            )
          : const <String, dynamic>{},
    );
  }

  final String id;
  final String name;
  final String description;
  final double price;
  final String currency;
  final BillingCycle billingCycle;
  final bool active;
  final String? planType;
  final int? trialDays;
  final Map<String, dynamic> metadata;

  BillingProduct copyWith({
    String? name,
    String? description,
    double? price,
    String? currency,
    BillingCycle? billingCycle,
    bool? active,
    String? planType,
    int? trialDays,
    Map<String, dynamic>? metadata,
  }) {
    return BillingProduct(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      currency: currency ?? this.currency,
      billingCycle: billingCycle ?? this.billingCycle,
      active: active ?? this.active,
      planType: planType ?? this.planType,
      trialDays: trialDays ?? this.trialDays,
      metadata: metadata ?? Map<String, dynamic>.from(this.metadata),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'currency': currency,
      'billingCycle': describeEnum(billingCycle),
      'active': active,
      if (planType != null) 'planType': planType,
      if (trialDays != null) 'trialDays': trialDays,
      if (metadata.isNotEmpty) 'metadata': metadata,
    };
  }
}

class BillingCatalogSnapshot {
  BillingCatalogSnapshot({
    required this.products,
    required this.fetchedAt,
    this.expiresAt,
    this.source,
  });

  factory BillingCatalogSnapshot.fromJson(Map<String, dynamic> json) {
    return BillingCatalogSnapshot(
      products: (json['products'] as List?)
              ?.map(
                (item) => BillingProduct.fromJson(
                  Map<String, dynamic>.from(item as Map),
                ),
              )
              .toList(growable: false) ??
          const <BillingProduct>[],
      fetchedAt: json['fetchedAt'] is String
          ? DateTime.tryParse(json['fetchedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      expiresAt: json['expiresAt'] is String
          ? DateTime.tryParse(json['expiresAt'] as String)
          : null,
      source: json['source']?.toString(),
    );
  }

  factory BillingCatalogSnapshot.fromApi(
    Map<String, dynamic> json, {
    DateTime? fetchedAt,
    Duration? ttl,
  }) {
    final products = (json['products'] as List?)
            ?.map((item) => BillingProduct.fromJson(
                  Map<String, dynamic>.from(item as Map),
                ))
            .toList(growable: false) ??
        const <BillingProduct>[];
    final resolvedFetchedAt = fetchedAt ?? DateTime.now();
    final expiresAt = ttl == null ? null : resolvedFetchedAt.add(ttl);
    return BillingCatalogSnapshot(
      products: products,
      fetchedAt: resolvedFetchedAt,
      expiresAt: expiresAt,
      source: 'network',
    );
  }

  final List<BillingProduct> products;
  final DateTime fetchedAt;
  final DateTime? expiresAt;
  final String? source;

  bool get isExpired {
    final expiry = expiresAt;
    if (expiry == null) {
      return false;
    }
    return DateTime.now().isAfter(expiry);
  }

  BillingCatalogSnapshot copyWith({
    List<BillingProduct>? products,
    DateTime? fetchedAt,
    DateTime? expiresAt,
    String? source,
  }) {
    return BillingCatalogSnapshot(
      products: products ?? List<BillingProduct>.from(this.products),
      fetchedAt: fetchedAt ?? this.fetchedAt,
      expiresAt: expiresAt ?? this.expiresAt,
      source: source ?? this.source,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'products': products.map((product) => product.toJson()).toList(growable: false),
      'fetchedAt': fetchedAt.toIso8601String(),
      if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
      if (source != null) 'source': source,
    };
  }
}

class PendingReceipt {
  PendingReceipt({
    required this.id,
    required this.transactionId,
    required this.productId,
    required this.purchaseToken,
    required this.createdAt,
    this.platform,
    this.retryCount = 0,
    this.lastAttemptAt,
    this.metadata = const <String, dynamic>{},
  });

  factory PendingReceipt.fromJson(Map<String, dynamic> json) {
    return PendingReceipt(
      id: json['id']?.toString() ?? generateCommerceId('receipt'),
      transactionId: json['transactionId']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      purchaseToken: json['purchaseToken']?.toString() ?? '',
      platform: json['platform']?.toString(),
      createdAt: json['createdAt'] is String
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      retryCount: json['retryCount'] is int
          ? json['retryCount'] as int
          : int.tryParse('${json['retryCount']}') ?? 0,
      lastAttemptAt: json['lastAttemptAt'] is String
          ? DateTime.tryParse(json['lastAttemptAt'] as String)
          : null,
      metadata: json['metadata'] is Map
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : const <String, dynamic>{},
    );
  }

  final String id;
  final String transactionId;
  final String productId;
  final String purchaseToken;
  final DateTime createdAt;
  final String? platform;
  final int retryCount;
  final DateTime? lastAttemptAt;
  final Map<String, dynamic> metadata;

  PendingReceipt copyWith({
    int? retryCount,
    DateTime? lastAttemptAt,
    Map<String, dynamic>? metadata,
  }) {
    return PendingReceipt(
      id: id,
      transactionId: transactionId,
      productId: productId,
      purchaseToken: purchaseToken,
      platform: platform,
      createdAt: createdAt,
      retryCount: retryCount ?? this.retryCount,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      metadata: metadata ?? Map<String, dynamic>.from(this.metadata),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'transactionId': transactionId,
      'productId': productId,
      'purchaseToken': purchaseToken,
      'createdAt': createdAt.toIso8601String(),
      if (platform != null) 'platform': platform,
      'retryCount': retryCount,
      if (lastAttemptAt != null) 'lastAttemptAt': lastAttemptAt!.toIso8601String(),
      if (metadata.isNotEmpty) 'metadata': metadata,
    };
  }

  Map<String, dynamic> toApiPayload() {
    return {
      'receiptId': id,
      'transactionId': transactionId,
      'productId': productId,
      'purchaseToken': purchaseToken,
      'platform': platform,
      'createdAt': createdAt.toIso8601String(),
      'retryCount': retryCount,
      if (lastAttemptAt != null) 'lastAttemptAt': lastAttemptAt!.toIso8601String(),
      if (metadata.isNotEmpty) 'metadata': metadata,
    };
  }
}

class CommerceJsonEncoder {
  const CommerceJsonEncoder();

  String encodeCourseSnapshot(CourseCheckoutSnapshot snapshot) {
    return jsonEncode(snapshot.toJson());
  }

  String encodeTutorSnapshot(TutorBookingSnapshot snapshot) {
    return jsonEncode(snapshot.toJson());
  }

  String encodeCommunitySnapshot(CommunitySubscriptionSnapshot snapshot) {
    return jsonEncode(snapshot.toJson());
  }

  String encodePaymentMethods(List<CommercePaymentMethod> methods) {
    return jsonEncode(methods.map((method) => method.toJson()).toList(growable: false));
  }

  CourseCheckoutSnapshot decodeCourseSnapshot(String payload) {
    return CourseCheckoutSnapshot.fromJson(jsonDecode(payload) as Map<String, dynamic>);
  }

  TutorBookingSnapshot decodeTutorSnapshot(String payload) {
    return TutorBookingSnapshot.fromJson(jsonDecode(payload) as Map<String, dynamic>);
  }

  CommunitySubscriptionSnapshot decodeCommunitySnapshot(String payload) {
    return CommunitySubscriptionSnapshot.fromJson(jsonDecode(payload) as Map<String, dynamic>);
  }

  List<CommercePaymentMethod> decodePaymentMethods(String payload) {
    final data = jsonDecode(payload);
    if (data is List) {
      return data
          .map((item) => CommercePaymentMethod.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(growable: false);
    }
    return const <CommercePaymentMethod>[];
  }

  String encodeBillingCatalog(BillingCatalogSnapshot snapshot) {
    return jsonEncode(snapshot.toJson());
  }

  BillingCatalogSnapshot decodeBillingCatalog(String payload) {
    return BillingCatalogSnapshot.fromJson(jsonDecode(payload) as Map<String, dynamic>);
  }

  String encodePendingReceipts(List<PendingReceipt> receipts) {
    return jsonEncode(receipts.map((receipt) => receipt.toJson()).toList(growable: false));
  }

  List<PendingReceipt> decodePendingReceipts(String payload) {
    final data = jsonDecode(payload);
    if (data is List) {
      return data
          .map((item) => PendingReceipt.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(growable: false);
    }
    return const <PendingReceipt>[];
  }
}
