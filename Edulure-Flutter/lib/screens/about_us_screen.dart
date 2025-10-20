import 'package:flutter/material.dart';

class AboutUsScreen extends StatelessWidget {
  const AboutUsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('About Edulure'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _HeroSection(theme: theme),
          const SizedBox(height: 24),
          _ImpactHighlights(theme: theme),
          const SizedBox(height: 24),
          _LeadershipGrid(theme: theme),
          const SizedBox(height: 24),
          _Timeline(theme: theme),
          const SizedBox(height: 24),
          _SocialProof(theme: theme),
          const SizedBox(height: 24),
          _CallToAction(theme: theme),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEEF2FF), Color(0xFFE0F2FE)],
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'We help educators scale transformational learning experiences.',
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Text(
            'Edulure pairs community-driven instruction with enterprise-grade operations tooling. '
            'We believe every cohort deserves reliable delivery, adaptive learning paths, and authentic human support.',
            style: theme.textTheme.bodyLarge,
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 12,
            children: const [
              Chip(label: Text('Learning analytics')),
              Chip(label: Text('Community orchestration')),
              Chip(label: Text('Global cohorts')),
            ],
          ),
        ],
      ),
    );
  }
}

class _ImpactHighlights extends StatelessWidget {
  const _ImpactHighlights({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final items = [
      _ImpactItem(
        value: '245K+',
        label: 'Lessons delivered',
        description: 'Live and async instruction shipped to learners across 42 countries.',
      ),
      _ImpactItem(
        value: '92%',
        label: 'Completion rate',
        description: 'Average completion across signature programs with built-in accountability.',
      ),
      _ImpactItem(
        value: '4.8/5',
        label: 'Learner satisfaction',
        description: 'Measured from 12k verified NPS responses over the last 12 months.',
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 700;
        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: items
              .map(
                (item) => SizedBox(
                  width: isWide ? (constraints.maxWidth - 32) / 3 : constraints.maxWidth,
                  child: Card(
                    elevation: 0,
                    color: theme.colorScheme.primaryContainer.withOpacity(0.3),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.value, style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          Text(item.label, style: theme.textTheme.titleMedium),
                          const SizedBox(height: 8),
                          Text(item.description),
                        ],
                      ),
                    ),
                  ),
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class _ImpactItem {
  const _ImpactItem({
    required this.value,
    required this.label,
    required this.description,
  });

  final String value;
  final String label;
  final String description;
}

class _LeadershipGrid extends StatelessWidget {
  const _LeadershipGrid({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final leaders = [
      const _LeaderCard(
        name: 'Morgan Ellis',
        role: 'CEO & Co-founder',
        bio: 'Scaled multi-cohort academies with 30k alumni. Obsessed with durable pedagogy and ops.',
        image:
            'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80',
      ),
      const _LeaderCard(
        name: 'Priya Patel',
        role: 'Chief Learning Officer',
        bio: 'Former curriculum lead at top accelerators. Designs adaptive learning systems.',
        image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
      ),
      const _LeaderCard(
        name: 'Ethan Chu',
        role: 'CTO',
        bio: 'Built observability pipelines for edtech unicorns. Leads platform reliability and AI research.',
        image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=400&q=80',
      ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Leadership', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth > 900;
            final width = isWide ? (constraints.maxWidth - 32) / 3 : constraints.maxWidth;
            return Wrap(
              spacing: 16,
              runSpacing: 16,
              children: leaders
                  .map(
                    (leader) => SizedBox(width: width, child: leader),
                  )
                  .toList(),
            );
          },
        ),
      ],
    );
  }
}

class _LeaderCard extends StatelessWidget {
  const _LeaderCard({
    required this.name,
    required this.role,
    required this.bio,
    required this.image,
  });

  final String name;
  final String role;
  final String bio;
  final String image;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Image.network(image, height: 160, width: double.infinity, fit: BoxFit.cover),
            ),
            const SizedBox(height: 12),
            Text(name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            Text(role, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey)),
            const SizedBox(height: 8),
            Text(bio),
          ],
        ),
      ),
    );
  }
}

class _Timeline extends StatelessWidget {
  const _Timeline({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final milestones = [
      ('2018', 'Prototype the first async-first cohort toolkit with three pilot academies.'),
      ('2020', 'Launch Edulure platform with real-time community analytics and content DRM.'),
      ('2022', 'Introduce adaptive learning journeys and live whiteboard collaboration tools.'),
      ('2024', 'Expand to multilingual onboarding and AI-assisted coaching insights.'),
    ];
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Timeline', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            ...milestones.map(
              (milestone) => ListTile(
                leading: CircleAvatar(
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(milestone.$1),
                ),
                title: Text(milestone.$2),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SocialProof extends StatelessWidget {
  const _SocialProof({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final testimonials = [
      _Testimonial(
        quote:
            '“Edulure enabled us to scale from one flagship program to a full academy without sacrificing learner outcomes.”',
        name: 'Frida Morales',
        role: 'Director of Learning, Atlas Labs',
      ),
      _Testimonial(
        quote: '“From compliance-ready assessments to community heatmaps, it\'s the operator-friendly platform we needed.”',
        name: 'Dev Patel',
        role: 'Program Manager, The Founders Forum',
      ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('What partners say', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        ...testimonials.map(
          (testimonial) => Card(
            margin: const EdgeInsets.only(bottom: 16),
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(testimonial.quote, style: theme.textTheme.titleMedium),
                  const SizedBox(height: 12),
                  Text('${testimonial.name} • ${testimonial.role}',
                      style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Testimonial {
  const _Testimonial({required this.quote, required this.name, required this.role});

  final String quote;
  final String name;
  final String role;
}

class _CallToAction extends StatelessWidget {
  const _CallToAction({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Ready to build the next generation of learning experiences?',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Text('Schedule a blueprint session with our team. We\'ll map your cohort vision to scalable operations.'),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            children: [
              FilledButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Calendly link copied to clipboard.')),
                  );
                },
                icon: const Icon(Icons.video_call_outlined),
                label: const Text('Book strategy call'),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Partnership deck emailed.')),
                  );
                },
                icon: const Icon(Icons.mail_outline),
                label: const Text('Request partnership deck'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
