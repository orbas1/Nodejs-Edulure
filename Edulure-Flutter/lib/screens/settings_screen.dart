import 'package:flutter/material.dart';

import '../services/notification_preference_service.dart';
import '../services/session_manager.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final NotificationPreferenceService _preferenceService;
  late final TextEditingController _slackChannelController;
  late final VoidCallback _preferenceListener;

  NotificationPreferences? _preferences;
  bool _loadingPreferences = true;
  bool _savingPreferences = false;
  bool _queuedMessage = false;
  String? _preferenceMessage;
  String? _preferenceError;

  bool _mfaEnabled = false;
  bool _riskAlerts = true;

  @override
  void initState() {
    super.initState();
    _preferenceService = NotificationPreferenceService.instance;
    _slackChannelController = TextEditingController();
    _preferenceListener = () {
      if (!mounted) return;
      final prefs = _preferenceService.cachedPreferences;
      setState(() {
        _preferences = prefs;
        _queuedMessage = prefs?.syncPending ?? false;
        if (prefs?.slackChannel != null &&
            prefs!.slackChannel != _slackChannelController.text.trim()) {
          _slackChannelController.text = prefs.slackChannel ?? '';
        }
      });
    };
    _preferenceService.preferencesListenable.addListener(_preferenceListener);
    _bootstrapSession();
    final cachedPreferences = _preferenceService.cachedPreferences;
    if (cachedPreferences != null) {
      _preferences = cachedPreferences;
      _slackChannelController.text = cachedPreferences.slackChannel ?? '';
      _loadingPreferences = false;
      _queuedMessage = cachedPreferences.syncPending;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPreferences();
    });
  }

  void _bootstrapSession() {
    final session = SessionManager.getSession();
    if (session == null) {
      return;
    }
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
      _riskAlerts = role == 'admin' ? _riskAlerts : true;
    }
  }

  Future<void> _loadPreferences() async {
    setState(() {
      _loadingPreferences = true;
      _preferenceError = null;
    });
    try {
      final prefs =
          await _preferenceService.loadPreferences(forceRefresh: true);
      if (!mounted) return;
      setState(() {
        _preferences = prefs;
        _slackChannelController.text = prefs.slackChannel ?? '';
        _loadingPreferences = false;
        _queuedMessage = prefs.syncPending;
      });
    } on NotificationPreferenceException catch (error) {
      if (!mounted) return;
      setState(() {
        _loadingPreferences = false;
        _preferenceError = error.message;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadingPreferences = false;
        _preferenceError = 'Unable to load notification preferences.';
      });
    }
  }

  @override
  void dispose() {
    _preferenceService.preferencesListenable
        .removeListener(_preferenceListener);
    _slackChannelController.dispose();
    super.dispose();
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
                    const Icon(Icons.lock_outline,
                        size: 64, color: Colors.blueGrey),
                    const SizedBox(height: 16),
                    Text(
                      'Sign in to manage settings',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Your settings are secured. Sign in to adjust notification and security preferences.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () =>
                          Navigator.pushReplacementNamed(context, '/login'),
                      child: const Text('Go to login'),
                    )
                  ],
                ),
              ),
            ),
          );
        }

        final user = session['user'] is Map
            ? Map<String, dynamic>.from(session['user'])
            : <String, dynamic>{};
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
                Text(
                  'Workspace settings',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                if (email != null)
                  Text(
                    email,
                    style: Theme.of(context)
                        .textTheme
                        .labelSmall
                        ?.copyWith(color: Colors.blueGrey),
                  ),
              ],
            ),
          ),
          body: RefreshIndicator(
            onRefresh: _loadPreferences,
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                _buildProfileCard(context, displayName, email),
                const SizedBox(height: 24),
                Text(
                  'Notification preferences',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                _buildNotificationPreferences(context),
                const SizedBox(height: 24),
                Text(
                  'Security posture',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                _buildToggleTile(
                  context,
                  title: 'Multi-factor authentication',
                  subtitle:
                      'Require authenticator apps, security keys, or SMS codes on every sign-in.',
                  value: _mfaEnabled,
                  onChanged: (value) => setState(() => _mfaEnabled = value),
                ),
                _buildToggleTile(
                  context,
                  title: 'Risk alerts',
                  subtitle:
                      'Notify when we detect unfamiliar devices or impossible travel scenarios.',
                  value: _riskAlerts,
                  onChanged: (value) => setState(() => _riskAlerts = value),
                ),
                const SizedBox(height: 24),
                Text(
                  'Trusted devices',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                _buildDeviceCard(
                  context,
                  label: 'MacBook Pro · Product Ops',
                  lastSeen: '2 hours ago · London, UK',
                  risk: 'Low risk',
                ),
                const SizedBox(height: 12),
                _buildDeviceCard(
                  context,
                  label: 'iPhone 15 · Programme Lead',
                  lastSeen: 'Yesterday · Singapore',
                  risk: 'Low risk',
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _savingPreferences
                      ? null
                      : () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Settings saved. Your preferences are synced.',
                              ),
                            ),
                          );
                        },
                  child: _savingPreferences
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save configuration'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildProfileCard(
    BuildContext context,
    String displayName,
    String? email,
  ) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              displayName,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            if (email != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  email,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: Colors.blueGrey),
                ),
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
    );
  }

  Widget _buildNotificationPreferences(BuildContext context) {
    if (_loadingPreferences && _preferences == null) {
      return Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        elevation: 0,
        child: const Padding(
          padding: EdgeInsets.all(24),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    if (_preferenceError != null && _preferences == null) {
      return Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        elevation: 0,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Notification centre unavailable',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                _preferenceError!,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: Colors.blueGrey),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _loadPreferences,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              )
            ],
          ),
        ),
      );
    }

    final prefs = _preferences ?? NotificationPreferences.initial();
    final statusColor = prefs.syncPending
        ? Colors.orange.shade700
        : Theme.of(context).colorScheme.primary;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_preferenceMessage != null)
              _buildStatusBanner(
                context,
                message: _preferenceMessage!,
                queued: _queuedMessage,
              ),
            if (_queuedMessage)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Icon(Icons.sync_problem, color: statusColor, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Updates pending sync. They will replay automatically once the device reconnects.',
                        style: Theme.of(context)
                            .textTheme
                            .labelMedium
                            ?.copyWith(color: statusColor),
                      ),
                    ),
                  ],
                ),
              ),
            if (prefs.lastSyncedAt != null)
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Text(
                  'Last synced ${_formatRelativeTime(prefs.lastSyncedAt!)}',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: Colors.blueGrey),
                ),
              ),
            _buildToggleTile(
              context,
              title: 'Email updates',
              subtitle:
                  'Weekly digests and high-priority alerts for your programmes.',
              value: prefs.emailEnabled,
              onChanged: _savingPreferences
                  ? null
                  : (value) => _onChannelToggle('email', value),
            ),
            _buildToggleTile(
              context,
              title: 'Push notifications',
              subtitle: 'Instant push alerts to the Edulure mobile experience.',
              value: prefs.pushEnabled,
              onChanged: _savingPreferences
                  ? null
                  : (value) => _onChannelToggle('push', value),
            ),
            _buildToggleTile(
              context,
              title: 'SMS escalations',
              subtitle:
                  'Escalate bookings, compliance events, and outages to on-call operators.',
              value: prefs.smsEnabled,
              onChanged: _savingPreferences
                  ? null
                  : (value) => _onChannelToggle('sms', value),
            ),
            _buildToggleTile(
              context,
              title: 'Slack escalations',
              subtitle:
                  'Send high-priority incidents into your connected Slack channel.',
              value: prefs.slackEnabled,
              onChanged: _savingPreferences
                  ? null
                  : (value) => _onChannelToggle('slack', value),
            ),
            if (prefs.slackEnabled) _buildSlackChannelEditor(context, prefs),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Push categories',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: _buildCategoryChips(context, prefs),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSlackChannelEditor(
      BuildContext context, NotificationPreferences prefs) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _slackChannelController,
            decoration: InputDecoration(
              labelText: 'Slack channel',
              hintText: '#ops-alerts',
              helperText:
                  'Updates will be delivered to this channel using the integrations gateway.',
              suffixIcon: IconButton(
                icon: const Icon(Icons.check_circle_outline),
                onPressed: _savingPreferences
                    ? null
                    : () => _onSlackChannelSubmitted(prefs),
              ),
            ),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _onSlackChannelSubmitted(prefs),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              FilledButton.icon(
                onPressed:
                    _savingPreferences ? null : () => _sendSlackTest(context),
                icon: const Icon(Icons.send_outlined),
                label: const Text('Send test to Slack'),
              ),
              const SizedBox(width: 12),
              Text(
                prefs.slackWorkspace != null
                    ? 'Workspace: ${prefs.slackWorkspace}'
                    : 'Slack workspace linked via admin console',
                style: Theme.of(context)
                    .textTheme
                    .labelMedium
                    ?.copyWith(color: Colors.blueGrey),
              ),
            ],
          ),
        ],
      ),
    );
  }

  List<Widget> _buildCategoryChips(
      BuildContext context, NotificationPreferences prefs) {
    const categories = <String, String>{
      'learning': 'Learning & enrolments',
      'payments': 'Payments & payouts',
      'compliance': 'Compliance & incidents',
      'community': 'Community & messaging',
    };
    return categories.entries.map((entry) {
      final enabled = prefs.allowsChannel('push', category: entry.key);
      return FilterChip(
        label: Text(entry.value),
        selected: enabled,
        onSelected: _savingPreferences
            ? null
            : (!prefs.pushEnabled
                ? null
                : (value) => _onCategoryToggle(entry.key, value)),
        enabled: prefs.pushEnabled,
        selectedColor:
            Theme.of(context).colorScheme.primary.withOpacity(0.14),
        checkmarkColor: Theme.of(context).colorScheme.primary,
      );
    }).toList();
  }

  Widget _buildStatusBanner(BuildContext context,
      {required String message, required bool queued}) {
    final color = queued ? Colors.orange.shade700 : Colors.green.shade700;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(20, 12, 20, 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(queued ? Icons.sync : Icons.verified, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleTile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool>? onChanged,
  }) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 0,
      child: SwitchListTile.adaptive(
        title: Text(
          title,
          style: Theme.of(context)
              .textTheme
              .titleSmall
              ?.copyWith(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(subtitle),
        value: value,
        onChanged: onChanged,
      ),
    );
  }

  Widget _buildDeviceCard(BuildContext context,
      {required String label, required String lastSeen, required String risk}) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 0,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor:
              Theme.of(context).colorScheme.primary.withOpacity(0.1),
          child: const Icon(Icons.devices_other_outlined),
        ),
        title: Text(
          label,
          style: Theme.of(context)
              .textTheme
              .titleSmall
              ?.copyWith(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(lastSeen),
        trailing: Text(
          risk,
          style: Theme.of(context)
              .textTheme
              .labelSmall
              ?.copyWith(color: Colors.green.shade600),
        ),
        onTap: () {},
      ),
    );
  }

  Future<void> _onChannelToggle(String channel, bool value) async {
    final prefs = _preferences ?? NotificationPreferences.initial();
    NotificationPreferences optimistic;
    switch (channel) {
      case 'email':
        optimistic = prefs.copyWith(emailEnabled: value);
        break;
      case 'push':
        optimistic = prefs.copyWith(pushEnabled: value);
        break;
      case 'sms':
        optimistic = prefs.copyWith(smsEnabled: value);
        break;
      case 'slack':
        optimistic = prefs.copyWith(slackEnabled: value);
        break;
      default:
        optimistic = prefs;
    }

    setState(() {
      _preferences = optimistic;
      _preferenceMessage = null;
      _queuedMessage = optimistic.syncPending;
      _savingPreferences = true;
    });

    try {
      final result = await _preferenceService.updatePreferences(
        emailEnabled: channel == 'email' ? value : null,
        pushEnabled: channel == 'push' ? value : null,
        smsEnabled: channel == 'sms' ? value : null,
        slackEnabled: channel == 'slack' ? value : null,
        slackChannel: channel == 'slack'
            ? _slackChannelController.text.trim().isEmpty
                ? null
                : _slackChannelController.text.trim()
            : null,
      );
      if (!mounted) return;
      setState(() {
        _preferences = result.preferences;
        _queuedMessage = result.queued;
        _preferenceMessage = result.queued
            ? (result.message ??
                'Updates queued offline. We will sync automatically when back online.')
            : 'Notification preferences updated.';
      });
    } on NotificationPreferenceException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to update notification preferences.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _savingPreferences = false;
        });
      }
    }
  }

  Future<void> _onSlackChannelSubmitted(NotificationPreferences prefs) async {
    final channel = _slackChannelController.text.trim();
    if (channel.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a Slack channel before saving.')),
      );
      return;
    }
    setState(() {
      _savingPreferences = true;
      _preferenceMessage = null;
    });
    try {
      final result = await _preferenceService.updatePreferences(
        slackChannel: channel.startsWith('#') ? channel : '#$channel',
      );
      if (!mounted) return;
      setState(() {
        _preferences = result.preferences;
        _queuedMessage = result.queued;
        _preferenceMessage = result.queued
            ? (result.message ??
                'Slack updates queued. They will send once we reconnect.')
            : 'Slack channel updated successfully.';
      });
    } on NotificationPreferenceException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) {
        setState(() {
          _savingPreferences = false;
        });
      }
    }
  }

  Future<void> _onCategoryToggle(String category, bool enabled) async {
    final prefs = _preferences ?? NotificationPreferences.initial();
    final overrides = Map<String, bool>.from(prefs.categoryOverrides);
    overrides['push:$category'] = enabled;
    setState(() {
      _preferences = prefs.copyWith(categoryOverrides: overrides);
      _savingPreferences = true;
      _preferenceMessage = null;
    });
    try {
      final result = await _preferenceService.updatePreferences(
        categoryOverrides: overrides,
      );
      if (!mounted) return;
      setState(() {
        _preferences = result.preferences;
        _queuedMessage = result.queued;
        _preferenceMessage = result.queued
            ? (result.message ??
                'Category updates queued offline. We will sync once online.')
            : 'Notification categories updated.';
      });
    } on NotificationPreferenceException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) {
        setState(() {
          _savingPreferences = false;
        });
      }
    }
  }

  Future<void> _sendSlackTest(BuildContext context) async {
    setState(() {
      _savingPreferences = true;
      _preferenceMessage = null;
    });
    try {
      await _preferenceService.sendSlackTestEvent();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Slack test event sent successfully.')),
      );
    } on NotificationPreferenceException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to send Slack test event.')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _savingPreferences = false;
        });
      }
    }
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

  String _formatRelativeTime(DateTime dateTime) {
    final difference = DateTime.now().difference(dateTime);
    if (difference.inSeconds < 60) {
      return 'just now';
    }
    if (difference.inMinutes < 60) {
      return '${difference.inMinutes} minute${difference.inMinutes == 1 ? '' : 's'} ago';
    }
    if (difference.inHours < 24) {
      return '${difference.inHours} hour${difference.inHours == 1 ? '' : 's'} ago';
    }
    if (difference.inDays < 7) {
      return '${difference.inDays} day${difference.inDays == 1 ? '' : 's'} ago';
    }
    return dateTime.toLocal().toString();
  }
}
