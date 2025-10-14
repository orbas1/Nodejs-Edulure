import 'package:flutter/material.dart';

import '../services/session_manager.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _emailUpdates = true;
  bool _pushUpdates = true;
  bool _smsAlerts = false;
  bool _mfaEnabled = false;
  bool _riskAlerts = true;

  @override
  void initState() {
    super.initState();
    final session = SessionManager.getSession();
    if (session != null) {
      final verification = session['verification'];
      if (verification is Map) {
        final mfa = verification['mfaEnabled'];
        if (mfa is bool) {
          _mfaEnabled = mfa;
        }
      }
      final user = session['user'];
      if (user is Map) {
        final role = user['role']?.toString();
        _smsAlerts = role == 'admin';
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: SessionManager.sessionListenable(),
      builder: (context, box, _) {
        final session = SessionManager.getSession();
        if (session == null) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Workspace settings'),
              elevation: 0.4,
            ),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.lock_outline, size: 64, color: Colors.blueGrey),
                    const SizedBox(height: 16),
                    Text(
                      'Sign in to manage settings',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Your settings are secured. Sign in to adjust notification and security preferences.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
                      child: const Text('Go to login'),
                    )
                  ],
                ),
              ),
            ),
          );
        }

        final user = session['user'] is Map ? Map<String, dynamic>.from(session['user']) : <String, dynamic>{};
        final displayName = _displayNameFromUser(user);
        final email = user['email']?.toString();

        return Scaffold(
          appBar: AppBar(
            titleSpacing: 16,
            elevation: 0.4,
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.white,
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Workspace settings', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                if (email != null)
                  Text(email, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.blueGrey)),
              ],
            ),
          ),
          body: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                elevation: 0,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(displayName, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                      if (email != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(email, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.blueGrey)),
                        ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: const [
                          Chip(label: Text('Secure session')), 
                          Chip(label: Text('Policy compliant')),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text('Notification preferences', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              _buildToggleTile(
                context,
                title: 'Email updates',
                subtitle: 'Weekly digests and high-priority alerts for your programmes.',
                value: _emailUpdates,
                onChanged: (value) => setState(() => _emailUpdates = value),
              ),
              _buildToggleTile(
                context,
                title: 'Push notifications',
                subtitle: 'Instant push alerts to the Edulure mobile experience.',
                value: _pushUpdates,
                onChanged: (value) => setState(() => _pushUpdates = value),
              ),
              _buildToggleTile(
                context,
                title: 'SMS escalations',
                subtitle: 'Escalate bookings, compliance events, and outages to on-call operators.',
                value: _smsAlerts,
                onChanged: (value) => setState(() => _smsAlerts = value),
              ),
              const SizedBox(height: 24),
              Text('Security posture', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              _buildToggleTile(
                context,
                title: 'Multi-factor authentication',
                subtitle: 'Require authenticator apps, security keys, or SMS codes on every sign-in.',
                value: _mfaEnabled,
                onChanged: (value) => setState(() => _mfaEnabled = value),
              ),
              _buildToggleTile(
                context,
                title: 'Risk alerts',
                subtitle: 'Notify when we detect unfamiliar devices or impossible travel scenarios.',
                value: _riskAlerts,
                onChanged: (value) => setState(() => _riskAlerts = value),
              ),
              const SizedBox(height: 24),
              Text('Trusted devices', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              _buildDeviceCard(context, label: 'MacBook Pro · Product Ops', lastSeen: '2 hours ago · London, UK', risk: 'Low risk'),
              const SizedBox(height: 12),
              _buildDeviceCard(context, label: 'iPhone 15 · Programme Lead', lastSeen: 'Yesterday · Singapore', risk: 'Low risk'),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Settings saved. Your preferences are synced.')),
                  );
                },
                child: const Text('Save configuration'),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildToggleTile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 0,
      child: SwitchListTile.adaptive(
        title: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        value: value,
        onChanged: onChanged,
      ),
    );
  }

  Widget _buildDeviceCard(BuildContext context, {required String label, required String lastSeen, required String risk}) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 0,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
          child: const Icon(Icons.devices_other_outlined),
        ),
        title: Text(label, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
        subtitle: Text(lastSeen),
        trailing: Text(risk, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.green.shade600)),
        onTap: () {},
      ),
    );
  }

  String _displayNameFromUser(Map<String, dynamic> user) {
    final firstName = user['firstName']?.toString() ?? '';
    final lastName = user['lastName']?.toString() ?? '';
    final name = '$firstName $lastName'.trim();
    if (name.isNotEmpty) {
      return name;
    }
    return user['email']?.toString() ?? 'Workspace member';
  }
}
