import 'package:edulure_mobile/services/commerce_models.dart';
import 'package:edulure_mobile/services/commerce_persistence_service.dart';

class FakeCommercePersistence implements CommercePersistence {
  List<CommercePaymentMethod>? _payments;
  CourseCheckoutSnapshot? _courseSnapshot;
  TutorBookingSnapshot? _tutorSnapshot;
  CommunitySubscriptionSnapshot? _communitySnapshot;

  CourseCheckoutSnapshot? get courseSnapshot => _courseSnapshot;
  TutorBookingSnapshot? get tutorSnapshot => _tutorSnapshot;
  CommunitySubscriptionSnapshot? get communitySnapshot => _communitySnapshot;

  @override
  Future<List<CommercePaymentMethod>?> loadPaymentMethods() async => _payments;

  @override
  Future<void> savePaymentMethods(List<CommercePaymentMethod> methods) async {
    _payments = List<CommercePaymentMethod>.from(methods);
  }

  @override
  Future<CourseCheckoutSnapshot?> loadCourseCheckout() async => _courseSnapshot;

  @override
  Future<void> saveCourseCheckout(CourseCheckoutSnapshot snapshot) async {
    _courseSnapshot = snapshot;
  }

  @override
  Future<TutorBookingSnapshot?> loadTutorBookings() async => _tutorSnapshot;

  @override
  Future<void> saveTutorBookings(TutorBookingSnapshot snapshot) async {
    _tutorSnapshot = snapshot;
  }

  @override
  Future<CommunitySubscriptionSnapshot?> loadCommunitySubscriptions() async => _communitySnapshot;

  @override
  Future<void> saveCommunitySubscriptions(CommunitySubscriptionSnapshot snapshot) async {
    _communitySnapshot = snapshot;
  }

  @override
  Future<void> reset() async {
    _payments = null;
    _courseSnapshot = null;
    _tutorSnapshot = null;
    _communitySnapshot = null;
  }
}
