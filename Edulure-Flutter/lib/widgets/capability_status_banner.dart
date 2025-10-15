import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/runtime/capability_manifest_models.dart';
import '../core/runtime/capability_manifest_notifier.dart';

class CapabilityStatusBanner extends ConsumerWidget {
  const CapabilityStatusBanner({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final manifestAsync = ref.watch(capabilityManifestControllerProvider);
    final snapshot = manifestAsync.asData?.value;
    final notice = snapshot?.notice;
    final bool isRefreshing = (snapshot?.isRefreshing ?? false) || manifestAsync.isLoading;
    final bool hasError = manifestAsync.hasError || snapshot?.lastError != null;
    final Object? error = manifestAsync.asError?.error ?? snapshot?.lastError;

    Widget? banner;
    if (notice != null) {
      banner = _ImpactBanner(
        notice: notice,
        isRefreshing: isRefreshing,
        fromCache: snapshot?.fromCache ?? false,
        lastUpdated: snapshot?.manifest.generatedAt ?? snapshot?.fetchedAt,
        errorMessage: hasError ? error?.toString() : null,
        onRetry: () => ref.read(capabilityManifestControllerProvider.notifier).refresh(force: true),
      );
    } else if (manifestAsync.isLoading && snapshot == null) {
      banner = const _LinearLoadingBanner();
    } else if (hasError && snapshot == null) {
      banner = _ErrorBanner(
        message: 'Unable to load service availability. We\'ll retry automatically.',
        onRetry: () => ref.read(capabilityManifestControllerProvider.notifier).refresh(force: true),
      );
    } else if (isRefreshing) {
      banner = const _LinearLoadingBanner();
    }

    return Column(
      children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 240),
          child: banner != null
              ? KeyedSubtree(
                  key: ValueKey<String>('capability-banner-${notice?.severity ?? (hasError ? 'error' : 'loading')}'),
                  child: banner,
                )
              : const SizedBox.shrink(),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _ImpactBanner extends StatelessWidget {
  const _ImpactBanner({
    required this.notice,
    required this.isRefreshing,
    required this.fromCache,
    required this.lastUpdated,
    required this.onRetry,
    this.errorMessage,
  });

  final CapabilityImpactNotice notice;
  final bool isRefreshing;
  final bool fromCache;
  final DateTime? lastUpdated;
  final VoidCallback onRetry;
  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final severity = notice.severity;

    final backgroundColor = severity == CapabilityImpactSeverity.outage
        ? colorScheme.errorContainer
        : colorScheme.tertiaryContainer;
    final foregroundColor = severity == CapabilityImpactSeverity.outage
        ? colorScheme.onErrorContainer
        : colorScheme.onTertiaryContainer;
    final icon = severity == CapabilityImpactSeverity.outage
        ? Icons.error_outline
        : Icons.warning_amber_rounded;

    final timestampLabel = _formatTimestamp(lastUpdated);

    return Material(
      color: backgroundColor,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, color: foregroundColor, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          notice.headline,
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: foregroundColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (notice.detail != null && notice.detail!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            notice.detail!,
                            style: theme.textTheme.bodyMedium?.copyWith(color: foregroundColor.withOpacity(0.9)),
                          ),
                        ],
                        if (timestampLabel != null || fromCache || errorMessage != null) ...[
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 12,
                            runSpacing: 4,
                            children: [
                              if (timestampLabel != null)
                                _MetaPill(
                                  label: timestampLabel,
                                  color: foregroundColor,
                                ),
                              if (fromCache)
                                _MetaPill(
                                  label: 'Showing cached status',
                                  color: foregroundColor,
                                ),
                              if (errorMessage != null)
                                _MetaPill(
                                  label: 'Refresh failed – tap retry',
                                  color: foregroundColor,
                                ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (isRefreshing)
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
                        backgroundColor: foregroundColor.withOpacity(0.2),
                      ),
                    )
                  else
                    IconButton(
                      onPressed: onRetry,
                      icon: Icon(Icons.refresh, color: foregroundColor),
                      tooltip: 'Refresh status',
                    ),
                ],
              ),
              if (notice.capabilities.isNotEmpty) ...[
                const SizedBox(height: 12),
                _CapabilityChips(
                  names: notice.capabilities.map((capability) => capability.name).toList(),
                  color: foregroundColor,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _CapabilityChips extends StatelessWidget {
  const _CapabilityChips({required this.names, required this.color});

  final List<String> names;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final visible = names.length > 4 ? names.sublist(0, 4) : names;
    final remaining = names.length - visible.length;

    return Wrap(
      spacing: 8,
      runSpacing: 6,
      children: [
        for (final name in visible)
          Chip(
            label: Text(name, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color)),
            backgroundColor: Colors.white.withOpacity(0.08),
            side: BorderSide(color: color.withOpacity(0.4)),
          ),
        if (remaining > 0)
          Chip(
            label: Text('+$remaining more'),
            backgroundColor: Colors.white.withOpacity(0.08),
            side: BorderSide(color: color.withOpacity(0.3)),
          ),
      ],
    );
  }
}

class _LinearLoadingBanner extends StatelessWidget {
  const _LinearLoadingBanner();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: colorScheme.surfaceVariant,
      child: const SafeArea(
        bottom: false,
        child: SizedBox(
          height: 4,
          child: LinearProgressIndicator(),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: colorScheme.errorContainer,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Icon(Icons.cloud_off, color: colorScheme.onErrorContainer),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: colorScheme.onErrorContainer),
                ),
              ),
              TextButton.icon(
                onPressed: onRetry,
                icon: Icon(Icons.refresh, color: colorScheme.onErrorContainer),
                label: Text('Retry', style: TextStyle(color: colorScheme.onErrorContainer)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: color),
      ),
    );
  }
}

String? _formatTimestamp(DateTime? timestamp) {
  if (timestamp == null) {
    return null;
  }
  final now = DateTime.now().toUtc();
  final reference = timestamp.toUtc();
  final difference = now.difference(reference);

  if (difference.inMinutes.abs() < 1) {
    return 'Updated moments ago';
  }
  if (difference.inMinutes < 60) {
    final minutes = difference.inMinutes;
    return 'Updated ${minutes.abs()} minute${minutes.abs() == 1 ? '' : 's'} ago';
  }
  if (difference.inHours < 24) {
    final hours = difference.inHours;
    return 'Updated ${hours.abs()} hour${hours.abs() == 1 ? '' : 's'} ago';
  }
  final days = difference.inDays;
  return 'Updated ${days.abs()} day${days.abs() == 1 ? '' : 's'} ago';
}
