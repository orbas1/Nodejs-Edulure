import 'package:flutter/material.dart';

import '../services/mobile_ads_governance_service.dart';

class MobileAdsGovernanceScreen extends StatefulWidget {
  const MobileAdsGovernanceScreen({super.key});

  @override
  State<MobileAdsGovernanceScreen> createState() => _MobileAdsGovernanceScreenState();
}

class _MobileAdsGovernanceScreenState extends State<MobileAdsGovernanceScreen> {
  final MobileAdsGovernanceService _service = MobileAdsGovernanceService();
  final Set<String> _busy = <String>{};
  final Map<String, AdsCampaignInsights> _insights = <String, AdsCampaignInsights>{};

  List<AdsCampaignSummary> _campaigns = const <AdsCampaignSummary>[];
  bool _loading = false;
  String? _error;
  DateTime? _lastSyncedAt;
  _AdsFilter _filter = _AdsFilter.attention;

  @override
  void initState() {
    super.initState();
    _campaigns = _service.loadCachedCampaigns();
    _lastSyncedAt = _service.loadLastSync();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _service.syncPendingActions();
      if (!mounted) return;
      setState(() {
        _campaigns = _service.loadCachedCampaigns();
      });
      await _refresh();
    });
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final campaigns = await _service.fetchCampaigns();
      if (!mounted) return;
      setState(() {
        _campaigns = campaigns;
        _lastSyncedAt = DateTime.now();
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is Exception ? error.toString() : 'Unable to load campaigns';
        _campaigns = _service.loadCachedCampaigns();
        _lastSyncedAt = _service.loadLastSync();
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
    }
  }

  List<AdsCampaignSummary> get _filteredCampaigns {
    final campaigns = _campaigns.where((campaign) {
      switch (_filter) {
        case _AdsFilter.attention:
          return campaign.requiresAttention || campaign.pendingActions.isNotEmpty;
        case _AdsFilter.active:
          return campaign.isActive;
        case _AdsFilter.paused:
          return campaign.isPaused;
        case _AdsFilter.completed:
          return campaign.isCompletable;
        case _AdsFilter.all:
          return true;
      }
    }).toList();

    campaigns.sort((a, b) {
      final aScore = a.riskScore;
      final bScore = b.riskScore;
      if (_filter == _AdsFilter.attention) {
        return bScore.compareTo(aScore);
      }
      final aUpdated = a.updatedAt ?? a.syncedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bUpdated = b.updatedAt ?? b.syncedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bUpdated.compareTo(aUpdated);
    });
    return campaigns;
  }

  Future<void> _handlePause(AdsCampaignSummary campaign) async {
    setState(() {
      _busy.add('${campaign.id}:pause');
    });
    try {
      final result = await _service.pauseCampaign(campaign.id);
      if (!mounted) return;
      _replaceCampaign(result.campaign);
      _showSnack(result.message ?? (result.queued ? 'Pause queued for sync' : 'Campaign paused'));
    } catch (error) {
      if (!mounted) return;
      _showSnack(error is Exception ? error.toString() : 'Failed to pause campaign');
    } finally {
      if (!mounted) return;
      setState(() {
        _busy.remove('${campaign.id}:pause');
      });
    }
  }

  Future<void> _handleResume(AdsCampaignSummary campaign) async {
    setState(() {
      _busy.add('${campaign.id}:resume');
    });
    try {
      final result = await _service.resumeCampaign(campaign.id);
      if (!mounted) return;
      _replaceCampaign(result.campaign);
      _showSnack(result.message ?? (result.queued ? 'Resume queued for sync' : 'Campaign resumed'));
    } catch (error) {
      if (!mounted) return;
      _showSnack(error is Exception ? error.toString() : 'Failed to resume campaign');
    } finally {
      if (!mounted) return;
      setState(() {
        _busy.remove('${campaign.id}:resume');
      });
    }
  }

  Future<void> _openInsights(AdsCampaignSummary campaign) async {
    setState(() {
      _busy.add('${campaign.id}:insights');
    });
    try {
      final insights = await _service.fetchInsights(campaign.id);
      if (!mounted) return;
      _insights[campaign.id] = insights;
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (context) => _InsightsSheet(
          campaign: campaign,
          insights: insights,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      _showSnack(error is Exception ? error.toString() : 'Unable to load campaign insights');
    } finally {
      if (!mounted) return;
      setState(() {
        _busy.remove('${campaign.id}:insights');
      });
    }
  }

  Future<void> _openFraudReportSheet(AdsCampaignSummary campaign) async {
    final result = await showModalBottomSheet<_FraudReportResult>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _FraudReportSheet(campaign: campaign),
    );
    if (result == null) return;
    setState(() {
      _busy.add('${campaign.id}:fraud');
    });
    try {
      final response = await _service.submitFraudReport(
        campaign: campaign,
        reason: result.reason,
        riskScore: result.riskScore,
        description: result.description,
      );
      if (!mounted) return;
      _replaceCampaign(response.campaign);
      _showSnack(response.message ?? (response.queued ? 'Fraud report queued for sync' : 'Fraud report submitted'));
    } catch (error) {
      if (!mounted) return;
      _showSnack(error is Exception ? error.toString() : 'Unable to submit fraud report');
    } finally {
      if (!mounted) return;
      setState(() {
        _busy.remove('${campaign.id}:fraud');
      });
    }
  }

  void _replaceCampaign(AdsCampaignSummary campaign) {
    final next = [..._campaigns];
    final index = next.indexWhere((entry) => entry.id == campaign.id);
    if (index >= 0) {
      next[index] = campaign;
    } else {
      next.add(campaign);
    }
    setState(() {
      _campaigns = next;
    });
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final campaigns = _filteredCampaigns;
    final busy = _busy;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ads governance'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.all(20),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              if (_error != null)
                _ErrorBanner(
                  message: _error!,
                  onRetry: _refresh,
                ),
              Text(
                'Campaign health and fraud monitoring',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'Track spend, performance, and compliance for every campaign. Pause risky activity or escalate fraud reports to trust & safety.',
                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
              ),
              const SizedBox(height: 12),
              _FiltersRow(
                filter: _filter,
                onChanged: (filter) {
                  setState(() {
                    _filter = filter;
                  });
                },
              ),
              if (_lastSyncedAt != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    'Last synced ${_formatTimestamp(_lastSyncedAt!)}',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade500),
                  ),
                ),
              const SizedBox(height: 16),
              if (_loading && campaigns.isEmpty)
                const SizedBox(
                  height: 240,
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (campaigns.isEmpty)
                _EmptyState(onRefresh: _refresh)
              else
                ...campaigns.map(
                  (campaign) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _CampaignCard(
                      campaign: campaign,
                      insights: _insights[campaign.id],
                      onViewInsights: () => _openInsights(campaign),
                      onPause: campaign.isActive ? () => _handlePause(campaign) : null,
                      onResume: campaign.isPaused ? () => _handleResume(campaign) : null,
                      onFlagFraud: () => _openFraudReportSheet(campaign),
                      busy: busy,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CampaignCard extends StatelessWidget {
  const _CampaignCard({
    required this.campaign,
    required this.onViewInsights,
    required this.onFlagFraud,
    this.onPause,
    this.onResume,
    this.insights,
    required this.busy,
  });

  final AdsCampaignSummary campaign;
  final VoidCallback onViewInsights;
  final VoidCallback onFlagFraud;
  final VoidCallback? onPause;
  final VoidCallback? onResume;
  final AdsCampaignInsights? insights;
  final Set<String> busy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final riskTone = _riskColor(context, campaign.riskScore);
    final spendRatio = campaign.budget.dailyCents == 0
        ? 0.0
        : (campaign.spend.totalCents / campaign.budget.dailyCents).clamp(0, 400) / 100;
    final isProcessingPause = busy.contains('${campaign.id}:pause');
    final isProcessingResume = busy.contains('${campaign.id}:resume');
    final isProcessingFraud = busy.contains('${campaign.id}:fraud');
    final isLoadingInsights = busy.contains('${campaign.id}:insights');

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.blueGrey.shade100),
        boxShadow: const [
          BoxShadow(
            color: Color(0x11000000),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      campaign.name,
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${campaign.objective.toUpperCase()} · ${campaign.status.replaceAll('_', ' ')}',
                      style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: riskTone.background,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  'Risk ${campaign.riskScore}',
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: riskTone.foreground,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _MetricRow(
            label: 'Lifetime spend',
            value: _formatCurrency(campaign.spend.totalCents, campaign.spend.currency),
            secondary: 'Budget/day ${_formatCurrency(campaign.budget.dailyCents, campaign.budget.currency)}',
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: LinearProgressIndicator(
              minHeight: 8,
              value: spendRatio.clamp(0, 1),
              backgroundColor: Colors.blueGrey.shade100,
              color: campaign.requiresAttention ? Colors.amber.shade600 : const Color(0xFF2D62FF),
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 20,
            runSpacing: 8,
            children: [
              _CompactMetric(
                label: 'CTR',
                value: _formatPercent(campaign.metrics.lifetime.ctr),
              ),
              _CompactMetric(
                label: 'CPA',
                value: _formatCurrency(campaign.metrics.lifetime.cpaCents, campaign.spend.currency),
              ),
              _CompactMetric(
                label: 'Conv. rate',
                value: _formatPercent(campaign.metrics.lifetime.conversionRate),
              ),
              _CompactMetric(
                label: 'Forecast daily spend',
                value: _formatCurrency(
                  campaign.metrics.forecast.expectedDailySpendCents,
                  campaign.spend.currency,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (campaign.complianceViolations.isNotEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Compliance alerts',
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: Colors.red.shade600,
                  ),
                ),
                const SizedBox(height: 8),
                ...campaign.complianceViolations.take(3).map(
                  (violation) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          violation.severity == 'critical' ? Icons.warning_rounded : Icons.report_gmailerrorred_outlined,
                          size: 18,
                          color: violation.severity == 'critical' ? Colors.red.shade600 : Colors.amber.shade700,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            violation.message,
                            style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade700),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          if (campaign.pendingActions.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: campaign.pendingActions.map((action) {
                final isFailed = action.status == PendingAdsActionStatus.failed;
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isFailed ? Colors.red.shade50 : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isFailed ? Colors.red.shade200 : Colors.orange.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        action.description,
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: isFailed ? Colors.red.shade700 : Colors.orange.shade800,
                        ),
                      ),
                      if (action.errorMessage != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          action.errorMessage!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: isFailed ? Colors.red.shade700 : Colors.orange.shade800,
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: isLoadingInsights ? null : onViewInsights,
                  icon: isLoadingInsights
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.analytics_outlined),
                  label: const Text('View insights'),
                ),
              ),
              const SizedBox(width: 12),
              if (onPause != null)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: isProcessingPause ? null : onPause,
                    icon: isProcessingPause
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.pause_circle_outline),
                    label: const Text('Pause'),
                  ),
                )
              else if (onResume != null)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: isProcessingResume ? null : onResume,
                    icon: isProcessingResume
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.play_circle_outline),
                    label: const Text('Resume'),
                  ),
                ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.tonalIcon(
                  onPressed: isProcessingFraud ? null : onFlagFraud,
                  icon: isProcessingFraud
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.shield_outlined),
                  label: const Text('Flag fraud'),
                ),
              ),
            ],
          ),
          if (insights != null) ...[
            const SizedBox(height: 16),
            _InsightSummaryInline(insights: insights!),
          ],
        ],
      ),
    );
  }

  _RiskTone _riskColor(BuildContext context, int risk) {
    if (risk >= 75) {
      return _RiskTone(Colors.red.shade50, Colors.red.shade700);
    }
    if (risk >= 50) {
      return _RiskTone(Colors.orange.shade50, Colors.orange.shade800);
    }
    return _RiskTone(Colors.green.shade50, Colors.green.shade700);
  }
}

class _RiskTone {
  const _RiskTone(this.background, this.foreground);

  final Color background;
  final Color foreground;
}

class _MetricRow extends StatelessWidget {
  const _MetricRow({required this.label, required this.value, this.secondary});

  final String label;
  final String value;
  final String? secondary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.blueGrey.shade500,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
        if (secondary != null)
          Text(
            secondary!,
            style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade500),
          ),
      ],
    );
  }
}

class _CompactMetric extends StatelessWidget {
  const _CompactMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _FiltersRow extends StatelessWidget {
  const _FiltersRow({required this.filter, required this.onChanged});

  final _AdsFilter filter;
  final ValueChanged<_AdsFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    final filters = {
      _AdsFilter.attention: 'Needs review',
      _AdsFilter.active: 'Active',
      _AdsFilter.paused: 'Paused',
      _AdsFilter.completed: 'Completed',
      _AdsFilter.all: 'All campaigns',
    };

    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: filters.entries
          .map(
            (entry) => FilterChip(
              label: Text(entry.value),
              selected: filter == entry.key,
              onSelected: (_) => onChanged(entry.key),
            ),
          )
          .toList(),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'We could not load campaign data',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: Colors.red.shade700,
            ),
          ),
          const SizedBox(height: 8),
          Text(message, style: theme.textTheme.bodySmall?.copyWith(color: Colors.red.shade700)),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onRefresh});

  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade50,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.blueGrey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'No campaigns available',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'Once your campaigns sync from the studio you will see spend, performance, and risk signals here.',
            style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade600),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh'),
          ),
        ],
      ),
    );
  }
}

class _InsightsSheet extends StatelessWidget {
  const _InsightsSheet({required this.campaign, required this.insights});

  final AdsCampaignSummary campaign;
  final AdsCampaignInsights insights;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, controller) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 24,
                offset: const Offset(0, -12),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: ListView(
            controller: controller,
            children: [
              Align(
                alignment: Alignment.center,
                child: Container(
                  width: 48,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.blueGrey.shade100,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                '${campaign.name} insights',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                'Summary generated ${_formatTimestamp(insights.fetchedAt)}',
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
              ),
              const SizedBox(height: 24),
              _MetricsGrid(summary: insights.summary, currency: campaign.spend.currency),
              const SizedBox(height: 24),
              Text(
                'Daily performance (last ${insights.daily.length} days)',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              ...insights.daily.take(14).map(
                (metric) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 96,
                        child: Text(
                          _shortDate(metric.date),
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
                        ),
                      ),
                      Expanded(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('${metric.impressions} imp', style: theme.textTheme.bodyMedium),
                            Text('${metric.clicks} clicks', style: theme.textTheme.bodyMedium),
                            Text(_formatPercent(metric.ctr), style: theme.textTheme.bodyMedium),
                            Text(_formatCurrency(metric.spendCents, campaign.spend.currency),
                                style: theme.textTheme.bodyMedium),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid({required this.summary, required this.currency});

  final AdsMetricSnapshot summary;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final metrics = <_MetricValue>[
      _MetricValue(label: 'Impressions', value: summary.impressions.toString()),
      _MetricValue(label: 'Clicks', value: summary.clicks.toString()),
      _MetricValue(label: 'Conversions', value: summary.conversions.toString()),
      _MetricValue(label: 'Spend', value: _formatCurrency(summary.spendCents, currency)),
      _MetricValue(label: 'Revenue', value: _formatCurrency(summary.revenueCents, currency)),
      _MetricValue(label: 'CTR', value: _formatPercent(summary.ctr)),
      _MetricValue(label: 'Conversion rate', value: _formatPercent(summary.conversionRate)),
      _MetricValue(label: 'CPC', value: _formatCurrency(summary.cpcCents, currency)),
      _MetricValue(label: 'CPA', value: _formatCurrency(summary.cpaCents, currency)),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 3.2,
      ),
      itemCount: metrics.length,
      itemBuilder: (context, index) {
        final metric = metrics[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blueGrey.shade50,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                metric.label,
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
              ),
              const SizedBox(height: 6),
              Text(
                metric.value,
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _InsightSummaryInline extends StatelessWidget {
  const _InsightSummaryInline({required this.insights});

  final AdsCampaignInsights insights;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Latest insight snapshot',
            style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'Clicks ${insights.summary.clicks} · Conversions ${insights.summary.conversions} · CTR ${_formatPercent(insights.summary.ctr)}',
            style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade700),
          ),
        ],
      ),
    );
  }
}

class _FraudReportSheet extends StatefulWidget {
  const _FraudReportSheet({required this.campaign});

  final AdsCampaignSummary campaign;

  @override
  State<_FraudReportSheet> createState() => _FraudReportSheetState();
}

class _FraudReportSheetState extends State<_FraudReportSheet> {
  late final TextEditingController _reasonController;
  late final TextEditingController _descriptionController;
  int _riskScore = 60;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _reasonController = TextEditingController();
    _descriptionController = TextEditingController();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 24,
              offset: const Offset(0, -12),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Align(
              alignment: Alignment.center,
              child: Container(
                width: 48,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.blueGrey.shade100,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Flag suspected fraud',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _reasonController,
              maxLength: 180,
              decoration: const InputDecoration(
                labelText: 'Primary concern',
                hintText: 'Describe what looks suspicious',
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descriptionController,
              maxLength: 400,
              minLines: 2,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Additional context',
                hintText: 'Add runbook references, screenshots, or customer reports (optional)',
              ),
            ),
            const SizedBox(height: 12),
            Text('Risk score (${_riskScore})', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
            Slider(
              value: _riskScore.toDouble(),
              min: 0,
              max: 100,
              divisions: 20,
              label: '$_riskScore',
              onChanged: (value) {
                setState(() {
                  _riskScore = value.round();
                });
              },
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _submitting
                  ? null
                  : () {
                      final reason = _reasonController.text.trim();
                      if (reason.length < 6) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Provide enough detail so the trust & safety team can investigate.')),
                        );
                        return;
                      }
                      setState(() {
                        _submitting = true;
                      });
                      Navigator.of(context).pop(
                        _FraudReportResult(
                          reason: reason,
                          description: _descriptionController.text.trim().isEmpty
                              ? null
                              : _descriptionController.text.trim(),
                          riskScore: _riskScore,
                        ),
                      );
                    },
              icon: _submitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.shield_outlined),
              label: const Text('Submit fraud report'),
            ),
          ],
        ),
      ),
    );
  }
}

class _FraudReportResult {
  _FraudReportResult({required this.reason, required this.riskScore, this.description});

  final String reason;
  final int riskScore;
  final String? description;
}

class _MetricValue {
  const _MetricValue({required this.label, required this.value});

  final String label;
  final String value;
}

enum _AdsFilter { attention, active, paused, completed, all }

String _formatCurrency(int cents, String currency) {
  final value = cents / 100;
  return '${currency.toUpperCase()} ${value.toStringAsFixed(2)}';
}

String _formatPercent(double value) {
  if (value.isNaN || value.isInfinite) return '0%';
  return '${(value * 100).toStringAsFixed(1)}%';
}

String _formatTimestamp(DateTime date) {
  final now = DateTime.now();
  final difference = now.difference(date);
  if (difference.inMinutes.abs() < 1) {
    return 'just now';
  }
  if (difference.inMinutes < 60) {
    return '${difference.inMinutes}m ago';
  }
  if (difference.inHours < 24) {
    return '${difference.inHours}h ago';
  }
  return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

String _shortDate(DateTime date) {
  return '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
}
