import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'bootstrap/app_bootstrap.dart';
import 'core/feature_flags/feature_flag_notifier.dart';
import 'screens/assessments_screen.dart';
import 'screens/blog_screen.dart';
import 'screens/communities_screen.dart';
import 'screens/community_dashboard_screen.dart';
import 'screens/community_profile_screen.dart';
import 'screens/content_library_screen.dart';
import 'screens/course_management_screen.dart';
import 'screens/course_purchase_screen.dart';
import 'screens/explorer_screen.dart';
import 'screens/feed_screen.dart';
import 'screens/home_screen.dart';
import 'screens/inbox_screen.dart';
import 'screens/instructor_dashboard_screen.dart';
import 'screens/learner_dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/register_screen.dart';
import 'screens/service_suite_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/tutor_booking_screen.dart';
import 'screens/mobile_creation_companion_screen.dart';
import 'screens/mobile_ads_governance_screen.dart';
import 'screens/provider_transition_center_screen.dart';
import 'services/language_service.dart';
import 'widgets/capability_status_banner.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final bootstrap = await AppBootstrap.create();
  await bootstrap.run(const EdulureApp());
}

class EdulureApp extends ConsumerWidget {
  const EdulureApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = GoogleFonts.interTextTheme(ThemeData.light().textTheme);
    final flagsAsync = ref.watch(featureFlagControllerProvider);

    return ValueListenableBuilder<String>(
      valueListenable: LanguageService.listenable(),
      builder: (context, code, _) {
        final locale = Locale(code);
        final featureFlags = flagsAsync.maybeWhen(
          data: (flags) => flags,
          orElse: () => const <String, bool>{},
        );

        final routes = <String, WidgetBuilder>{
          '/': (_) => const HomeScreen(),
          '/login': (_) => const LoginScreen(),
          '/register': (_) => const RegisterScreen(),
          '/communities': (_) => const CommunitiesScreen(),
          '/communities/profile': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            final communityId = args?.toString();
            if (communityId == null || communityId.isEmpty) {
              return const Scaffold(
                body: Center(child: Text('Missing community identifier')),
              );
            }
            return CommunityProfileScreen(communityId: communityId);
          },
          '/feed': (_) => const FeedScreen(),
          '/explorer': (_) => const ExplorerScreen(),
          '/inbox': (_) => const InboxScreen(),
          '/profile': (_) => const ProfileScreen(),
          '/dashboard/learner': (_) => const LearnerDashboardScreen(),
          '/dashboard/assessments': (_) => const AssessmentsScreen(),
          '/dashboard/community': (_) => const CommunityDashboardScreen(),
          '/content': (_) => const ContentLibraryScreen(),
          '/tutor-bookings': (_) => const TutorBookingScreen(),
          '/instructor-dashboard': (_) => const InstructorDashboardScreen(),
          '/courses/manage': (_) => const CourseManagementScreen(),
          '/courses/purchase': (_) => const CoursePurchaseScreen(),
          '/blog': (_) => const BlogScreen(),
          '/settings': (_) => const SettingsScreen(),
          '/creation/companion': (_) => const MobileCreationCompanionScreen(),
          '/provider-transition': (_) => const ProviderTransitionCenterScreen(),
        };

        if (featureFlags['mobile.serviceSuite'] != false) {
          routes['/services'] = (_) => const ServiceSuiteScreen();
        }
        if (featureFlags['mobile.adsGovernance'] != false) {
          routes['/ads/governance'] = (_) => const MobileAdsGovernanceScreen();
        }

        return MaterialApp(
          title: 'Edulure',
          debugShowCheckedModeBanner: false,
          locale: locale,
          supportedLocales: LanguageService.supportedLocales,
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF2D62FF),
              primary: const Color(0xFF2D62FF),
              secondary: const Color(0xFFFF7A59),
            ),
            scaffoldBackgroundColor: Colors.white,
            textTheme: textTheme,
            useMaterial3: true,
          ),
          routes: routes,
          builder: (context, child) {
            if (child == null) {
              return const SizedBox.shrink();
            }
            return CapabilityStatusBanner(child: child);
          },
        );
      },
    );
  }
}
