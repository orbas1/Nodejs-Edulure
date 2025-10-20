import 'dart:io';

import 'package:edulure_mobile/services/commerce_models.dart';
import 'package:edulure_mobile/services/commerce_persistence_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late HiveInterface hive;
  late CommercePersistenceService persistence;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('commerce-persistence');
    hive = HiveImpl()..init(tempDir.path);
    persistence = CommercePersistenceService(
      hive: hive,
      boxName: 'commerce.test',
    );
  });

  tearDown(() async {
    await persistence.reset();
    await persistence.close();
    if (hive.isBoxOpen('commerce.test')) {
      final box = hive.box<String>('commerce.test');
      await box.close();
    }
    await hive.deleteBoxFromDisk('commerce.test');
    await tempDir.delete(recursive: true);
  });

  test('persists and hydrates commerce snapshots', () async {
    final methods = [
      CommercePaymentMethod.card(brand: 'Visa', last4: '1111', expMonth: 1, expYear: 2030),
      CommercePaymentMethod.card(brand: 'Mastercard', last4: '2222', expMonth: 12, expYear: 2032),
    ];
    final checkout = CourseCheckoutSnapshot(
      offers: const [],
      orders: const [],
      coupons: const [],
    );
    final tutor = TutorBookingSnapshot(
      requests: const [],
      packages: const [],
    );
    final community = CommunitySubscriptionSnapshot(
      plans: const [],
      subscribers: const [],
      invoices: const [],
    );

    await persistence.savePaymentMethods(methods);
    await persistence.saveCourseCheckout(checkout);
    await persistence.saveTutorBookings(tutor);
    await persistence.saveCommunitySubscriptions(community);

    final restoredMethods = await persistence.loadPaymentMethods();
    final restoredCheckout = await persistence.loadCourseCheckout();
    final restoredTutor = await persistence.loadTutorBookings();
    final restoredCommunity = await persistence.loadCommunitySubscriptions();

    expect(restoredMethods, isNotNull);
    expect(restoredMethods, hasLength(2));
    expect(restoredCheckout, isNotNull);
    expect(restoredTutor, isNotNull);
    expect(restoredCommunity, isNotNull);
    expect(restoredMethods!.map((method) => method.id).toSet().length, restoredMethods.length);
  });

  test('drops corrupted payloads gracefully', () async {
    final box = await hive.openBox<String>('commerce.test');
    await box.put('payments', 'not-json');
    await box.close();

    final result = await persistence.loadPaymentMethods();
    expect(result, isNull);

    final reopened = await hive.openBox<String>('commerce.test');
    expect(reopened.get('payments'), isNull);
    await reopened.close();
  });
}
