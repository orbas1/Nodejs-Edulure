import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/communities_screen.dart';
import 'screens/content_library_screen.dart';
import 'screens/course_management_screen.dart';
import 'screens/course_purchase_screen.dart';
import 'screens/feed_screen.dart';
import 'screens/home_screen.dart';
import 'screens/explorer_screen.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/register_screen.dart';
import 'screens/learner_dashboard_screen.dart';
import 'services/push_notification_service.dart';
import 'screens/tutor_booking_screen.dart';
import 'screens/inbox_screen.dart';
import 'services/session_manager.dart';
import 'services/language_service.dart';
import 'screens/instructor_dashboard_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/community_dashboard_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SessionManager.init();
  await LanguageService.init();
  await PushNotificationService.instance.initialize();
  runApp(const EdulureApp());
}

class EdulureApp extends StatelessWidget {
  const EdulureApp({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.interTextTheme(ThemeData.light().textTheme);
    return ValueListenableBuilder<String>(
      valueListenable: LanguageService.listenable(),
      builder: (context, code, _) {
        final locale = Locale(code);
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
          routes: {
            '/': (_) => const HomeScreen(),
            '/login': (_) => const LoginScreen(),
            '/register': (_) => const RegisterScreen(),
            '/communities': (_) => const CommunitiesScreen(),
            '/feed': (_) => const FeedScreen(),
            '/explorer': (_) => const ExplorerScreen(),
            '/inbox': (_) => const InboxScreen(),
            '/profile': (_) => const ProfileScreen(),
            '/dashboard/learner': (_) => const LearnerDashboardScreen(),
            '/dashboard/community': (_) => const CommunityDashboardScreen(),
            '/content': (_) => const ContentLibraryScreen(),
            '/tutor-bookings': (_) => const TutorBookingScreen(),
            '/instructor-dashboard': (_) => const InstructorDashboardScreen(),
            '/courses/manage': (_) => const CourseManagementScreen(),
            '/courses/purchase': (_) => const CoursePurchaseScreen(),
            '/settings': (_) => const SettingsScreen(),
          },
        );
      },
    );
  }
}
