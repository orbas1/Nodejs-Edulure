import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:edulure_mobile/services/commerce_models.dart';
import 'package:edulure_mobile/services/commerce_persistence_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('commerce_persistence_test');
    Hive.init(tempDir.path);
  });

  tearDown(() async {
    for (final name in Hive.boxNames.toList(growable: false)) {
      if (Hive.isBoxOpen(name)) {
        final box = Hive.box(name);
        await box.close();
      }
      await Hive.deleteBoxFromDisk(name);
    }
  });

  test('persists and restores checkout snapshots', () async {
    final service = CommercePersistenceService(
      boxName: 'commerce.snapshot',
      hive: Hive,
    );

    final methods = [
      CommercePaymentMethod.card(
        brand: 'Visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
        defaultMethod: true,
      ),
    ];
    final checkout = CourseCheckoutSnapshot(offers: const [], orders: const [], coupons: const []);
    final tutor = TutorBookingSnapshot(requests: const [], packages: const []);
    final community = CommunitySubscriptionSnapshot(
      plans: const [],
      subscribers: const [],
      invoices: const [],
    );

    await service.savePaymentMethods(methods);
    await service.saveCourseCheckout(checkout);
    await service.saveTutorBookings(tutor);
    await service.saveCommunitySubscriptions(community);

    final restoredMethods = await service.loadPaymentMethods();
    final restoredCheckout = await service.loadCourseCheckout();
    final restoredTutor = await service.loadTutorBookings();
    final restoredCommunity = await service.loadCommunitySubscriptions();

    expect(restoredMethods, isNotNull);
    expect(restoredMethods!.single.brand, 'Visa');
    expect(restoredMethods.single.defaultMethod, isTrue);
    expect(restoredCheckout, isNotNull);
    expect(restoredCheckout!.offers, isEmpty);
    expect(restoredTutor, isNotNull);
    expect(restoredTutor!.packages, isEmpty);
    expect(restoredCommunity, isNotNull);
    expect(restoredCommunity!.plans, isEmpty);
  });

  test('reset clears persisted state', () async {
    final service = CommercePersistenceService(
      boxName: 'commerce.reset',
      hive: Hive,
    );

    await service.savePaymentMethods([
      CommercePaymentMethod.card(
        brand: 'Mastercard',
        last4: '5100',
        expMonth: 1,
        expYear: 2031,
      ),
    ]);

    await service.reset();

    expect(await service.loadPaymentMethods(), isNull);
    expect(await service.loadCourseCheckout(), isNull);
    expect(await service.loadTutorBookings(), isNull);
    expect(await service.loadCommunitySubscriptions(), isNull);
  });
}
