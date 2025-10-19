import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../provider/feed/explorer_saved_search_controller.dart';
import '../services/explorer_saved_search_service.dart';
import '../services/explorer_service.dart';
import '../services/session_manager.dart';

const Set<String> _allowedExplorerRoles = {'user', 'instructor', 'admin'};

class ExplorerScreen extends ConsumerStatefulWidget {
  const ExplorerScreen({super.key});

  @override
  ConsumerState<ExplorerScreen> createState() => _ExplorerScreenState();
}

class _ExplorerScreenState extends ConsumerState<ExplorerScreen> {
  final ExplorerService _service = ExplorerService();
  final TextEditingController _searchController =
      TextEditingController(text: 'automation launch');
  final Set<String> _enabledEntities = {
    for (final entity in _entityDefinitions) entity.key,
  };
  final Map<String, String> _sortSelections = {
    for (final entity in _entityDefinitions)
      entity.key: entity.sortOptions.isNotEmpty
          ? entity.sortOptions.first.value
          : 'relevance',
  };
  final Set<String> _languageFilters = <String>{};

  String _activeEntity = _entityDefinitions.first.key;
  ExplorerSearchResponse? _response;
  bool _loading = false;
  bool _initialised = false;
  String? _error;
  String? _roleError;

  @override
  void initState() {
    super.initState();
    _initialise();
  }

  Future<void> _initialise() async {
    final session = SessionManager.getSession();
    final role = SessionManager.getActiveRole() ??
        (session?['user'] is Map ? session?['user']['role']?.toString() : null);
    if (role == null || !_allowedExplorerRoles.contains(role)) {
      setState(() {
        _roleError =
            'Your current Learnspace role does not have explorer permissions. Switch to a learner, instructor, or admin role to continue.';
      });
      return;
    }
    await _performSearch(initial: true);
  }

  Future<void> _performSearch({bool initial = false}) async {
    setState(() {
      _loading = true;
      if (!initial) {
        _error = null;
      }
    });

    try {
      final response = await _service.search(
        query: _searchController.text.trim(),
        entityTypes: _enabledEntities.toList(),
        filters: const <String, dynamic>{},
        globalFilters: _buildGlobalFiltersPayload(),
        sort: _buildSortPayload(),
        page: 1,
        perPage: 10,
      );

      if (!mounted) return;
      setState(() {
        _response = response;
        _loading = false;
        _error = null;
        _initialised = true;
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is DioException
          ? error.response?.data is Map<String, dynamic>
              ? (error.response?.data['message'] as String?) ?? error.message
              : error.message
          : error.toString();
      setState(() {
        _loading = false;
        _error = message;
        _initialised = true;
      });
    }
  }

  Map<String, dynamic> _buildGlobalFiltersPayload() {
    if (_languageFilters.isEmpty) {
      return <String, dynamic>{};
    }
    return {
      'languages': _languageFilters.toList(),
    };
  }

  Map<String, dynamic> _buildSortPayload() {
    final payload = <String, dynamic>{};
    for (final entry in _sortSelections.entries) {
      payload[entry.key] = entry.value;
    }
    return payload;
  }

  Future<void> _refresh() async {
    await _performSearch();
  }

  void _toggleEntity(String key, bool selected) {
    if (selected) {
      if (!_enabledEntities.contains(key)) {
        setState(() {
          _enabledEntities.add(key);
          _activeEntity = key;
        });
        _performSearch();
        return;
      }
      setState(() {
        _activeEntity = key;
      });
      return;
    }

    if (_enabledEntities.length == 1) {
      _showMessage('Keep at least one entity active to continue searching.');
      return;
    }

    setState(() {
      _enabledEntities.remove(key);
      if (_activeEntity == key) {
        _activeEntity = _enabledEntities.first;
      }
    });
    _performSearch();
  }

  void _setActiveEntity(String key) {
    if (_activeEntity == key) return;
    if (!_enabledEntities.contains(key)) return;
    setState(() {
      _activeEntity = key;
    });
  }

  void _toggleLanguage(String value) {
    setState(() {
      if (_languageFilters.contains(value)) {
        _languageFilters.remove(value);
      } else {
        _languageFilters.add(value);
      }
    });
    _performSearch();
  }

  void _updateSort(String entityKey, String value) {
    setState(() {
      _sortSelections[entityKey] = value;
    });
    _performSearch();
  }

  void _onSubmitSearch() {
    FocusScope.of(context).unfocus();
    _performSearch();
  }

  void _clearLanguageFilters() {
    setState(() {
      _languageFilters.clear();
    });
    _performSearch();
  }

  Future<void> _saveCurrentSearch(BuildContext context) async {
    final nameController = TextEditingController(
      text: _searchController.text.trim().isEmpty
          ? 'Explorer search'
          : _searchController.text.trim(),
    );
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Save search'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'Name',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Save')),
        ],
      ),
    );
    if (confirm == true) {
      await ref.read(explorerSavedSearchesProvider.notifier).add(
            name: nameController.text.trim().isEmpty
                ? 'Explorer search'
                : nameController.text.trim(),
            query: _searchController.text.trim(),
            entities: _enabledEntities.toList(),
            sort: Map<String, String>.from(_sortSelections),
            languages: _languageFilters.toList(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Search saved')));
    }
  }

  void _applySavedSearch(ExplorerSavedSearch search) {
    setState(() {
      _searchController.text = search.query;
      _enabledEntities
        ..clear()
        ..addAll(search.entities.where((entity) =>
            _entityDefinitions.any((definition) => definition.key == entity)));
      if (_enabledEntities.isEmpty) {
        _enabledEntities.add(_entityDefinitions.first.key);
      }
      _activeEntity = _enabledEntities.first;
      _sortSelections
        ..clear()
        ..addAll({
          for (final definition in _entityDefinitions)
            definition.key:
                search.sort?[definition.key] ?? definition.sortOptions.first.value,
        });
      _languageFilters
        ..clear()
        ..addAll(search.languages);
    });
    _performSearch();
  }

  Future<void> _handleAction(ExplorerHit hit, ExplorerAction action) async {
    if (action.href.isEmpty) {
      _showMessage('This action is not available right now.');
      return;
    }

    final uri = Uri.tryParse(action.href);
    if (uri == null) {
      _showMessage('Unable to open the selected action.');
      return;
    }

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      _showMessage('We could not open ${action.label}. Please try again.');
    }

    final analytics = _response?.analytics;
    if (analytics != null && analytics.hasEvent) {
      _service
          .recordInteraction(
            searchEventId: analytics.searchEventId,
            entityType: hit.entityType,
            resultId: hit.id,
            interactionType: 'tap',
          )
          .catchError((error) {
        debugPrint('Failed to record explorer interaction: $error');
      });
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  String _formatMetricValue(dynamic value) {
    if (value == null) return '';
    if (value is num) {
      if (value >= 1000000) {
        return '${(value / 1000000).toStringAsFixed(1)}M';
      }
      if (value >= 1000) {
        return '${(value / 1000).toStringAsFixed(1)}K';
      }
      if (value == value.roundToDouble()) {
        return value.toStringAsFixed(0);
      }
      return value.toStringAsFixed(1);
    }
    return value.toString();
  }

  Widget _buildRoleError(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_outline,
                size: 56, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 16),
            Text(
              'Explorer access unavailable',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              _roleError ?? 'Your account does not include explorer access.',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: Colors.grey.shade600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => Navigator.maybePop(context),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Go back'),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildHero(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEEF2FF), Color(0xFFDDE8FF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2D62FF).withOpacity(0.18),
            offset: const Offset(0, 24),
            blurRadius: 48,
            spreadRadius: -24,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.auto_graph_outlined, size: 18, color: Color(0xFF2D62FF)),
                SizedBox(width: 8),
                Text(
                  'Explorer Intelligence',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.3,
                    color: Color(0xFF2D62FF),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Discover cohorts, talent, and assets across the Edulure network.',
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w600, color: const Color(0xFF1F2937)),
          ),
          const SizedBox(height: 12),
          Text(
            'Blend Meilisearch relevance with community, engagement, and monetisation signals to activate the right experiences instantly.',
            style: Theme.of(context)
                .textTheme
                .bodyLarge
                ?.copyWith(color: Colors.blueGrey.shade600, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    final savedSearches = ref.watch(explorerSavedSearchesProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(32),
            border: Border.all(color: Colors.blue.shade100),
            boxShadow: [
              BoxShadow(
                color: Colors.blue.shade50,
                offset: const Offset(0, 12),
                blurRadius: 24,
                spreadRadius: -8,
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  onSubmitted: (_) => _onSubmitSearch(),
                  decoration: InputDecoration(
                    icon: Icon(Icons.search,
                        color: Theme.of(context).colorScheme.primary),
                    border: InputBorder.none,
                    hintText:
                        'Search for automation cohorts, tutors, or campaigns',
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Wrap(
                spacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: _loading ? null : _onSubmitSearch,
                    icon: const Icon(Icons.search),
                    label: const Text('Search'),
                  ),
                  FilledButton.tonal(
                    onPressed: _loading ? null : () => _saveCurrentSearch(context),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.bookmark_add_outlined),
                        SizedBox(width: 6),
                        Text('Save'),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (savedSearches.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text('Saved searches', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: savedSearches
                .map(
                  (search) => InputChip(
                    label: Text(search.name),
                    onPressed: () => _applySavedSearch(search),
                    onDeleted: () => ref
                        .read(explorerSavedSearchesProvider.notifier)
                        .delete(search.id),
                  ),
                )
                .toList(),
          ),
        ],
      ],
    );
  }

  Widget _buildEntityControls(BuildContext context) {
    final theme = Theme.of(context);
    final enabledDefinitions = _entityDefinitions
        .where((definition) => _enabledEntities.contains(definition.key))
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Entity controls',
          style:
              theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: _entityDefinitions.map((definition) {
            final enabled = _enabledEntities.contains(definition.key);
            return FilterChip(
              label: Text(definition.label),
              avatar: Icon(definition.icon, size: 18),
              selected: enabled,
              showCheckmark: enabled,
              onSelected: (value) => _toggleEntity(definition.key, value),
              selectedColor:
                  theme.colorScheme.primary.withOpacity(enabled ? 0.15 : 0.1),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        if (enabledDefinitions.length > 1)
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: enabledDefinitions.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final definition = enabledDefinitions[index];
                final isActive = definition.key == _activeEntity;
                return ChoiceChip(
                  label: Text(definition.label),
                  selected: isActive,
                  onSelected: (selected) {
                    if (selected) {
                      _setActiveEntity(definition.key);
                    }
                  },
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildLanguageFilters(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Languages',
          style:
              theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: _languageOptions.map((option) {
            final selected = _languageFilters.contains(option.value);
            return FilterChip(
              label: Text(option.label),
              selected: selected,
              onSelected: (_) => _toggleLanguage(option.value),
              selectedColor: theme.colorScheme.primary.withOpacity(0.15),
              showCheckmark: selected,
            );
          }).toList(),
        ),
        if (_languageFilters.isNotEmpty) ...[
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: _clearLanguageFilters,
            icon: const Icon(Icons.clear),
            label: const Text('Clear languages'),
          ),
        ]
      ],
    );
  }

  Widget _buildSortDropdown(ExplorerEntityDefinition definition) {
    if (definition.sortOptions.isEmpty) {
      return const SizedBox.shrink();
    }
    final selected =
        _sortSelections[definition.key] ?? definition.sortOptions.first.value;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.blueGrey.shade100),
        borderRadius: BorderRadius.circular(18),
        color: Colors.white,
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: selected,
          borderRadius: BorderRadius.circular(18),
          onChanged: (value) {
            if (value == null) return;
            _updateSort(definition.key, value);
          },
          items: definition.sortOptions
              .map(
                (option) => DropdownMenuItem<String>(
                  value: option.value,
                  child: Text(option.label),
                ),
              )
              .toList(),
        ),
      ),
    );
  }

  Widget _buildSummaryTiles(
    ExplorerEntityDefinition definition,
    ExplorerEntityResults? summary,
    int total,
    ExplorerAnalytics? analytics,
  ) {
    final tiles = <_SummaryTile>[
      _SummaryTile(
        icon: Icons.grid_view_rounded,
        label: 'Results',
        value: _formatMetricValue(total),
      ),
    ];

    if (analytics != null) {
      tiles.add(
        _SummaryTile(
          icon: Icons.visibility_outlined,
          label: 'Displayed',
          value: _formatMetricValue(analytics.totalDisplayed),
        ),
      );
      tiles.add(
        _SummaryTile(
          icon: Icons.warning_amber_outlined,
          label: 'Zero result',
          value: analytics.zeroResult ? 'Yes' : 'No',
          emphasis: analytics.zeroResult,
        ),
      );
    }

    if (summary?.processingTimeMs != null) {
      tiles.add(
        _SummaryTile(
          icon: Icons.speed,
          label: 'Latency',
          value: '${summary!.processingTimeMs!.toStringAsFixed(0)} ms',
        ),
      );
    }

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: tiles.map((tile) => _SummaryTileCard(tile: tile)).toList(),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.blueGrey.shade100),
      ),
      child: Column(
        children: [
          Icon(Icons.search_off,
              size: 48, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 12),
          Text(
            'No results yet',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Adjust filters or broaden your query to pull in more explorer signals.',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          )
        ],
      ),
    );
  }

  Widget _buildErrorCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.error.withOpacity(0.08),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline,
              color: Theme.of(context).colorScheme.error),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _error ?? 'Unable to load explorer results.',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: Theme.of(context).colorScheme.error),
            ),
          ),
          IconButton(
            tooltip: 'Retry search',
            onPressed: _loading ? null : _performSearch,
            icon: const Icon(Icons.refresh),
          )
        ],
      ),
    );
  }

  Widget _buildInitialLoading() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: const [
          CircularProgressIndicator(),
          SizedBox(height: 12),
          Text('Fetching explorer signals…'),
        ],
      ),
    );
  }

  Widget _buildResultsSection(BuildContext context) {
    if (_response == null) {
      return _buildGettingStarted(context);
    }

    final definition =
        _entityDefinitions.firstWhere((item) => item.key == _activeEntity);
    final summary = _response?.results[_activeEntity];
    final hits = summary?.hits ?? <ExplorerHit>[];
    final total = _response?.totals[_activeEntity] ?? 0;
    final analytics = _response?.analytics;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                '${definition.label} signals',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
            _buildSortDropdown(definition),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          definition.description,
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 16),
        _buildSummaryTiles(definition, summary, total, analytics),
        const SizedBox(height: 16),
        if (_loading && hits.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Column(
              children: const [
                CircularProgressIndicator(),
                SizedBox(height: 8),
                Text('Refreshing results…'),
              ],
            ),
          ),
        if (!_loading && hits.isEmpty) _buildEmptyState(context),
        ...hits.map(
          (hit) => _ExplorerResultCard(
            hit: hit,
            definition: definition,
            onAction: _handleAction,
            formatMetric: _formatMetricValue,
          ),
        ),
      ],
    );
  }

  Widget _buildGettingStarted(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.blueGrey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Ready to explore',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Run your first search to surface cohort health, tutor availability, live events, and ads performance in one view.',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildExplorerBody(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          _buildHero(context),
          const SizedBox(height: 24),
          _buildSearchBar(context),
          const SizedBox(height: 24),
          _buildEntityControls(context),
          const SizedBox(height: 24),
          _buildLanguageFilters(context),
          const SizedBox(height: 24),
          if (_error != null) ...[
            _buildErrorCard(context),
            const SizedBox(height: 24),
          ],
          if (_loading && !_initialised)
            _buildInitialLoading()
          else
            _buildResultsSection(context),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Explorer intelligence'),
      ),
      body: _roleError != null
          ? _buildRoleError(context)
          : _buildExplorerBody(context),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}

class _ExplorerResultCard extends StatelessWidget {
  const _ExplorerResultCard({
    required this.hit,
    required this.definition,
    required this.onAction,
    required this.formatMetric,
  });

  final ExplorerHit hit;
  final ExplorerEntityDefinition definition;
  final void Function(ExplorerHit hit, ExplorerAction action) onAction;
  final String Function(dynamic value) formatMetric;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = definition.accentColor ?? theme.colorScheme.primary;
    final tags = hit.tags.take(6).toList();
    final metrics = hit.metrics.entries
        .where((entry) => entry.value != null)
        .take(4)
        .toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 18),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.blueGrey.shade50),
        boxShadow: [
          BoxShadow(
            color: accent.withOpacity(0.08),
            offset: const Offset(0, 20),
            blurRadius: 42,
            spreadRadius: -22,
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: accent.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(definition.icon, size: 16, color: accent),
                    const SizedBox(width: 6),
                    Text(
                      definition.label,
                      style: theme.textTheme.labelMedium
                          ?.copyWith(color: accent, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (hit.geo?['country'] != null)
                Chip(
                  label: Text(hit.geo!['country'].toString()),
                  backgroundColor: Colors.blueGrey.shade50,
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            hit.title,
            style: theme.textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.w600, color: const Color(0xFF111827)),
          ),
          if (hit.subtitle != null && hit.subtitle!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              hit.subtitle!,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: Colors.blueGrey.shade600, fontWeight: FontWeight.w500),
            ),
          ],
          if (hit.description != null && hit.description!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              hit.description!,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: Colors.blueGrey.shade700, height: 1.45),
            ),
          ],
          if (metrics.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: metrics
                  .map(
                    (metric) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.blueGrey.shade50,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            metric.key,
                            style: theme.textTheme.labelSmall
                                ?.copyWith(color: Colors.blueGrey.shade500, letterSpacing: 0.3),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            formatMetric(metric.value),
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w600, color: const Color(0xFF1F2937)),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
          if (tags.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: tags
                  .map(
                    (tag) => Chip(
                      label: Text('#$tag'),
                      backgroundColor: Colors.white,
                      side: BorderSide(color: accent.withOpacity(0.25)),
                    ),
                  )
                  .toList(),
            ),
          ],
          if (hit.actions.isNotEmpty) ...[
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: hit.actions
                  .where((action) => action.href.isNotEmpty)
                  .map(
                    (action) => FilledButton.tonalIcon(
                      onPressed: () => onAction(hit, action),
                      icon: const Icon(Icons.open_in_new),
                      label: Text(action.label),
                    ),
                  )
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }
}

class ExplorerEntityDefinition {
  const ExplorerEntityDefinition({
    required this.key,
    required this.label,
    required this.description,
    required this.icon,
    required this.sortOptions,
    this.accentColor,
  });

  final String key;
  final String label;
  final String description;
  final IconData icon;
  final List<ExplorerSortOption> sortOptions;
  final Color? accentColor;
}

class ExplorerSortOption {
  const ExplorerSortOption({required this.label, required this.value});

  final String label;
  final String value;
}

class _LanguageOption {
  const _LanguageOption({required this.label, required this.value});

  final String label;
  final String value;
}

class _SummaryTile {
  const _SummaryTile({
    required this.icon,
    required this.label,
    required this.value,
    this.emphasis = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool emphasis;
}

class _SummaryTileCard extends StatelessWidget {
  const _SummaryTileCard({required this.tile});

  final _SummaryTile tile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = tile.emphasis
        ? theme.colorScheme.error
        : theme.colorScheme.primary;
    return Container(
      width: 160,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: accent.withOpacity(0.08),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(tile.icon, color: accent),
          const SizedBox(height: 8),
          Text(
            tile.label,
            style: theme.textTheme.labelMedium
                ?.copyWith(color: Colors.blueGrey.shade600),
          ),
          const SizedBox(height: 4),
          Text(
            tile.value,
            style: theme.textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w600, color: accent),
          ),
        ],
      ),
    );
  }
}

const List<ExplorerEntityDefinition> _entityDefinitions = [
  ExplorerEntityDefinition(
    key: 'communities',
    label: 'Communities',
    description:
        'Guilds, cohorts, and resource hubs where members collaborate in real time.',
    icon: Icons.groups_rounded,
    accentColor: Color(0xFF2563EB),
    sortOptions: [
      ExplorerSortOption(label: 'Trending', value: 'trending'),
      ExplorerSortOption(label: 'Most members', value: 'members'),
      ExplorerSortOption(label: 'Newest', value: 'newest'),
    ],
  ),
  ExplorerEntityDefinition(
    key: 'courses',
    label: 'Courses',
    description: 'Cohort and self-paced programmes built for operational excellence.',
    icon: Icons.school_outlined,
    accentColor: Color(0xFF0EA5E9),
    sortOptions: [
      ExplorerSortOption(label: 'Relevance', value: 'relevance'),
      ExplorerSortOption(label: 'Top rated', value: 'rating'),
      ExplorerSortOption(label: 'Newest', value: 'newest'),
      ExplorerSortOption(label: 'Price: low to high', value: 'priceLow'),
      ExplorerSortOption(label: 'Price: high to low', value: 'priceHigh'),
    ],
  ),
  ExplorerEntityDefinition(
    key: 'ebooks',
    label: 'Ebooks',
    description: 'Rights-managed playbooks, decks, and annotated frameworks.',
    icon: Icons.menu_book_outlined,
    accentColor: Color(0xFF6366F1),
    sortOptions: [
      ExplorerSortOption(label: 'Relevance', value: 'relevance'),
      ExplorerSortOption(label: 'Top rated', value: 'rating'),
      ExplorerSortOption(label: 'Newest', value: 'newest'),
      ExplorerSortOption(label: 'Shortest read', value: 'readingTime'),
    ],
  ),
  ExplorerEntityDefinition(
    key: 'tutors',
    label: 'Tutors',
    description: 'Verified experts available for clinics, office hours, and retainers.',
    icon: Icons.support_agent_outlined,
    accentColor: Color(0xFF22C55E),
    sortOptions: [
      ExplorerSortOption(label: 'Relevance', value: 'relevance'),
      ExplorerSortOption(label: 'Top rated', value: 'rating'),
      ExplorerSortOption(label: 'Price: low to high', value: 'priceLow'),
      ExplorerSortOption(label: 'Price: high to low', value: 'priceHigh'),
      ExplorerSortOption(label: 'Fastest response', value: 'responseTime'),
    ],
  ),
  ExplorerEntityDefinition(
    key: 'profiles',
    label: 'Profiles',
    description:
        'Learners, operators, and creators shaping the Edulure network.',
    icon: Icons.person_pin_circle_outlined,
    accentColor: Color(0xFF8B5CF6),
    sortOptions: [
      ExplorerSortOption(label: 'Relevance', value: 'relevance'),
      ExplorerSortOption(label: 'Most followers', value: 'followers'),
      ExplorerSortOption(label: 'Newest', value: 'newest'),
    ],
  ),
  ExplorerEntityDefinition(
    key: 'ads',
    label: 'Campaigns',
    description:
        'Live Edulure Ads campaigns with targeting and performance summaries.',
    icon: Icons.campaign_outlined,
    accentColor: Color(0xFFFF7A59),
    sortOptions: [
      ExplorerSortOption(label: 'Top performing', value: 'performance'),
      ExplorerSortOption(label: 'Highest spend', value: 'spend'),
      ExplorerSortOption(label: 'Newest', value: 'newest'),
    ],
  ),
  ExplorerEntityDefinition(
    key: 'events',
    label: 'Events',
    description:
        'Live workshops, classrooms, and AMAs with capacity and ticketing.',
    icon: Icons.event_available_outlined,
    accentColor: Color(0xFFFB923C),
    sortOptions: [
      ExplorerSortOption(label: 'Next up', value: 'upcoming'),
      ExplorerSortOption(label: 'Newest', value: 'newest'),
    ],
  ),
];

const List<_LanguageOption> _languageOptions = [
  _LanguageOption(label: 'English', value: 'en'),
  _LanguageOption(label: 'Japanese', value: 'ja'),
  _LanguageOption(label: 'Portuguese', value: 'pt'),
];
