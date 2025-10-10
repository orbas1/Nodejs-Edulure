import 'package:flutter/material.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(32)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 40,
                      backgroundImage: NetworkImage('https://i.pravatar.cc/100?img=28'),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Alex Morgan', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                          SizedBox(height: 4),
                          Text('Founder @ Growth Operator | Instructor'),
                          SizedBox(height: 12),
                          Text('Communities: 12 • Courses: 5 live • Engagement: 87%'),
                        ],
                      ),
                    ),
                    FilledButton(onPressed: () {}, child: const Text('Edit profile')),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(32)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Active programs', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                    SizedBox(height: 12),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('Revenue Operations Intensive'),
                      subtitle: Text('Live cohort'),
                    ),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('Community Monetization Sprint'),
                      subtitle: Text('Applications open'),
                    ),
                  ],
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}
