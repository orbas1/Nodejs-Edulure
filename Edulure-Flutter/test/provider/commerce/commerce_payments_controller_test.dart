import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:edulure_mobile/provider/commerce/commerce_payments_controller.dart';
import 'package:edulure_mobile/services/commerce_models.dart';
import 'package:edulure_mobile/services/commerce_persistence_service.dart';

class _MockCommercePersistence extends Mock implements CommercePersistence {}

void main() {
  late _MockCommercePersistence persistence;
  late CommercePaymentsController controller;

  setUp(() {
    persistence = _MockCommercePersistence();
    controller = CommercePaymentsController(persistence: persistence);
    registerFallbackValue(<CommercePaymentMethod>[]);
    when(persistence.savePaymentMethods).thenAnswer((_) async {});
  });

  CommercePaymentMethod _card({
    String id = 'pm_1',
    bool isDefault = false,
  }) {
    return CommercePaymentMethod.card(
      id: id,
      brand: 'Visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2030,
      accountHolder: 'Ops',
      billingEmail: 'ops@example.com',
      defaultMethod: isDefault,
      country: 'US',
    );
  }

  test('bootstrap restores persisted methods', () async {
    when(persistence.loadPaymentMethods).thenAnswer((_) async => <CommercePaymentMethod>[
          _card(id: 'pm_saved', isDefault: true),
        ]);

    await controller.bootstrap();

    expect(controller.state.methods.single.id, 'pm_saved');
    expect(controller.state.bootstrapped, isTrue);
    verifyNever(() => persistence.savePaymentMethods(any()));
  });

  test('bootstrap seeds default methods when none exist', () async {
    when(persistence.loadPaymentMethods).thenAnswer((_) async => null);

    await controller.bootstrap();

    expect(controller.state.methods, isNotEmpty);
    expect(controller.state.methods.first.defaultMethod, isTrue);
    verify(() => persistence.savePaymentMethods(controller.state.methods)).called(1);
  });

  test('addMethod respects default flag and persists', () async {
    when(persistence.loadPaymentMethods).thenAnswer((_) async => <CommercePaymentMethod>[_card(isDefault: true)]);
    await controller.bootstrap();

    final method = _card(id: 'pm_new', isDefault: true);
    controller.addMethod(method);

    final defaults = controller.state.methods.where((m) => m.defaultMethod);
    expect(defaults.length, 1);
    expect(controller.state.methods.any((m) => m.id == 'pm_new'), isTrue);
    verify(() => persistence.savePaymentMethods(controller.state.methods)).called(greaterThan(0));
  });

  test('setDefault updates default method correctly', () async {
    when(persistence.loadPaymentMethods).thenAnswer((_) async => <CommercePaymentMethod>[
          _card(id: 'pm_primary', isDefault: true),
          _card(id: 'pm_secondary'),
        ]);
    await controller.bootstrap();

    controller.setDefault('pm_secondary');

    final methods = controller.state.methods;
    expect(methods.firstWhere((m) => m.id == 'pm_secondary').defaultMethod, isTrue);
    expect(methods.firstWhere((m) => m.id == 'pm_primary').defaultMethod, isFalse);
  });
}
