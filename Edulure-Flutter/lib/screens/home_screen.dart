import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../services/session_manager.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edulure'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pushNamed(context, '/login'),
            child: const Text('Login'),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: () => Navigator.pushNamed(context, '/register'),
            child: const Text('Join Edulure'),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFEEF2FF), Color(0xFFEFF6FF)],
              ),
              borderRadius: BorderRadius.circular(32),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Learning communities engineered for scale',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                Text(
                  'Blend courses, community, and live sessions into one seamless mobile experience.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                Wrap(
                  spacing: 12,
                  children: const [
                    Chip(label: Text('Communities')), Chip(label: Text('Classrooms')), Chip(label: Text('Analytics'))
                  ],
                )
              ],
            ),
          ),
          const SizedBox(height: 24),
          ValueListenableBuilder(
            valueListenable: SessionManager.assetsCache.listenable(),
            builder: (context, box, _) {
              return Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.groups_3_outlined),
                    title: const Text('Communities'),
                    subtitle: const Text('Curate your hubs and monitor health in real time.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/communities'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.dashboard_customize_outlined),
                    title: const Text('Live feed'),
                    subtitle: const Text('Stay up to date with every community in a unified stream.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/feed'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.person_outline),
                    title: const Text('Profile'),
                    subtitle: const Text('Personalise your instructor and member presence.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/profile'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.library_books_outlined),
                    title: const Text('Content library'),
                    subtitle: const Text('Download decks and ebooks with offline support.'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(context, '/content'),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}
