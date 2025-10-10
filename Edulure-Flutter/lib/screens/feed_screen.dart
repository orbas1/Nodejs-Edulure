import 'package:flutter/material.dart';

class FeedScreen extends StatelessWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final posts = List.generate(3, (index) => index);
    return Scaffold(
      appBar: AppBar(title: const Text('Live feed')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.blue.shade100),
              ),
              child: Row(
                children: const [
                  CircleAvatar(backgroundImage: NetworkImage('https://i.pravatar.cc/100?img=5')),
                  SizedBox(width: 12),
                  Expanded(child: Text('Share something with your communities...')),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.separated(
                itemCount: posts.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  return Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: CircleAvatar(backgroundImage: NetworkImage('https://i.pravatar.cc/100?img=12')),
                            title: Text('Stella Park'),
                            subtitle: Text('Curriculum Architect'),
                          ),
                          Text('Just launched our new adaptive lesson flow template. Feedback welcome!'),
                          SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            children: [Chip(label: Text('#Launch')), Chip(label: Text('#Templates'))],
                          )
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
