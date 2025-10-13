import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/content_library_screen.dart';
import 'screens/feed_screen.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/register_screen.dart';
import 'services/push_notification_service.dart';
import 'services/session_manager.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SessionManager.init();
  await PushNotificationService.instance.initialize();
  runApp(const EdulureApp());
}

class EdulureApp extends StatelessWidget {
  const EdulureApp({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.interTextTheme(ThemeData.light().textTheme);
    return MaterialApp(
      title: 'Edulure',
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
        '/feed': (_) => const FeedScreen(),
        '/profile': (_) => const ProfileScreen(),
        '/content': (_) => const ContentLibraryScreen(),
      },
    );
  }
}
