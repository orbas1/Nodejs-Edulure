import 'package:flutter/material.dart';

import '../services/content_service.dart';
import '../services/session_manager.dart';
import '../widgets/material_metadata_sheet.dart';
import 'ebook_reader_screen.dart';

const Color _brandPrimary = Color(0xFF2D62FF);
const Color _brandPrimaryDark = Color(0xFF1F3BB3);
const Color _brandSurface = Color(0xFFF5F7FF);

class ContentLibraryScreen extends StatefulWidget {
  const ContentLibraryScreen({super.key});

  @override
  State<ContentLibraryScreen> createState() => _ContentLibraryScreenState();
}

class _ContentLibraryScreenState extends State<ContentLibraryScreen> {
  final ContentService _service = ContentService();
  List<ContentAsset> _assets = [];
  Map<String, String> _downloads = {};
  Map<String, EbookProgress> _ebookProgress = {};
  bool _loading = true;
  List<EbookMarketplaceItem> _marketplace = [];
  bool _marketplaceLoading = true;
  String? _marketplaceError;
  String? _purchaseStatus;
  String? _pendingPurchaseId;
  bool _accessDenied = false;
  String? _accessDeniedMessage;

  @override
  void initState() {
    super.initState();
    _initialise();
  }

  Future<void> _initialise() async {
    final cachedAssets = _service.loadCachedAssets();
    final cachedDownloads = _service.loadCachedDownloads();
    final cachedProgress = _service.loadCachedEbookProgress();
    final token = SessionManager.getAccessToken();
    final role = SessionManager.getActiveRole();
    final canManage = role == 'instructor' || role == 'admin';
    setState(() {
      _assets = canManage ? cachedAssets : <ContentAsset>[];
      _downloads = canManage ? cachedDownloads : <String, String>{};
      _ebookProgress = canManage ? cachedProgress : <String, EbookProgress>{};
      _loading = false;
      _accessDenied = token != null && !canManage;
      _accessDeniedMessage = _accessDenied
          ? 'Switch to an instructor or admin Learnspace to manage the content library.'
          : null;
    });
    await _refresh();
  }

  Future<void> _refresh() async {
    final role = SessionManager.getActiveRole();
    final canManage = role == 'instructor' || role == 'admin';
    final token = SessionManager.getAccessToken();

    if (!canManage) {
      if (mounted) {
        setState(() {
          _accessDenied = token != null;
          _accessDeniedMessage = _accessDenied
              ? 'Switch to an instructor or admin Learnspace to manage the content library.'
              : null;
          _assets = <ContentAsset>[];
          _downloads = <String, String>{};
          _ebookProgress = <String, EbookProgress>{};
          _loading = false;
        });
      }
      await _loadMarketplace();
      return;
    }

    if (mounted) {
      setState(() {
        _loading = true;
        _purchaseStatus = null;
        _pendingPurchaseId = null;
        _accessDenied = false;
        _accessDeniedMessage = null;
      });
    }

    try {
      final assets = await _service.fetchAssets();
      if (!mounted) return;
      setState(() {
        _assets = assets;
        _downloads = _service.loadCachedDownloads();
        _ebookProgress = _service.loadCachedEbookProgress();
      });
    } on ContentAccessDeniedException catch (error) {
      if (!mounted) return;
      setState(() {
        _accessDenied = true;
        _accessDeniedMessage = error.message;
        _assets = <ContentAsset>[];
        _downloads = <String, String>{};
        _ebookProgress = <String, EbookProgress>{};
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to refresh assets: $error')),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
    await _loadMarketplace();
  }

  Future<void> _loadMarketplace() async {
    setState(() {
      _marketplaceLoading = true;
      _marketplaceError = null;
    });
    try {
      final items = await _service.fetchMarketplaceEbooks();
      if (!mounted) return;
      setState(() => _marketplace = items);
    } catch (error) {
      if (!mounted) return;
      setState(() => _marketplaceError = error.toString());
    } finally {
      if (mounted) {
        setState(() => _marketplaceLoading = false);
      }
    }
  }

  Future<void> _attemptPurchase(EbookMarketplaceItem item) async {
    final token = SessionManager.getAccessToken();
    if (token == null) {
      if (!mounted) return;
      setState(() {
        _purchaseStatus = 'Sign in to purchase premium titles.';
        _pendingPurchaseId = null;
      });
      return;
    }

    if (mounted) {
      setState(() {
        _pendingPurchaseId = item.id;
        _purchaseStatus = 'Creating secure checkout for ${item.title}…';
      });
    }

    try {
      final intent = await _service.createEbookPurchaseIntent(item.id);
      if (!mounted) return;
      setState(() {
        _purchaseStatus = 'Checkout created. Payment ID ${intent.paymentId}';
        _pendingPurchaseId = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _purchaseStatus = 'Unable to start checkout: $error';
        _pendingPurchaseId = null;
      });
    }
  }

  Widget _buildMarketplaceHighlights(BuildContext context) {
    if (_marketplace.isEmpty) {
      return const SizedBox.shrink();
    }

    final highlights = _marketplace.take(3).toList();
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Featured drops',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: _brandPrimaryDark,
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 210,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: highlights.length,
            separatorBuilder: (_, __) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              final item = highlights[index];
              final pending = _pendingPurchaseId == item.id;
              return Container(
                width: 240,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      _brandPrimary.withOpacity(0.12),
                      Colors.white,
                      _brandPrimary.withOpacity(0.08),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: _brandPrimary.withOpacity(0.18)),
                  boxShadow: [
                    BoxShadow(
                      color: _brandPrimary.withOpacity(0.12),
                      blurRadius: 28,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Featured drop',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: _brandPrimaryDark,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          item.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: _brandPrimaryDark,
                          ),
                        ),
                        if (item.subtitle != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            item.subtitle!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.blueGrey.shade600,
                            ),
                          ),
                        ],
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.price,
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Downloads · ${item.downloads}',
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: pending ? null : () => _attemptPurchase(item),
                          style: FilledButton.styleFrom(
                            backgroundColor: _brandPrimaryDark,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                          child: Text(pending ? 'Preparing…' : 'Secure checkout'),
                        ),
                      ],
                    )
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildMonetizationExplainer(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _brandSurface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: _brandPrimary.withOpacity(0.14)),
        boxShadow: [
          BoxShadow(
            color: _brandPrimary.withOpacity(0.08),
            blurRadius: 24,
            offset: const Offset(0, 12),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: _brandPrimary.withOpacity(0.12),
                child: const Icon(Icons.volunteer_activism_outlined, color: _brandPrimary),
              ),
              const SizedBox(width: 12),
              Text(
                'Creator-first monetisation',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: _brandPrimaryDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Community subscriptions and mentor bookings only retain a 2.5% platform fee. '
            'Live stream donations contribute 10% towards infrastructure while affiliates capture 25% of '
            'that fee. Digital courses and e-books share the same 25% affiliate bonus with a 5% platform '
            'retention so 95% of the sale reaches the publisher.',
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.4, color: Colors.blueGrey.shade700),
          ),
          const SizedBox(height: 10),
          Text(
            'Every checkout is powered by Stripe so learners can tip, donate, or enrol without leaving the app.',
            style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildMarketplaceEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: _brandSurface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: _brandPrimary.withOpacity(0.1)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.menu_book_outlined, size: 40, color: _brandPrimaryDark),
            const SizedBox(height: 12),
            Text(
              'Marketplace is getting ready',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              'We are onboarding new author releases. Pull to refresh for the latest drops.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _download(ContentAsset asset) async {
    try {
      final token = await _service.viewerToken(asset.publicId);
      final path = await _service.downloadAsset(asset, token);
      await _service.recordDownload(asset.publicId);
      setState(() {
        _downloads[asset.publicId] = path;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Saved ${asset.originalFilename} for offline access.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download failed: $error')),
      );
    }
  }

  Future<void> _open(ContentAsset asset) async {
    try {
      final existingPath = _downloads[asset.publicId];
      String? path = existingPath;
      if (path == null) {
        final token = await _service.viewerToken(asset.publicId);
        path = await _service.downloadAsset(asset, token);
        await _service.recordDownload(asset.publicId);
        setState(() {
          _downloads[asset.publicId] = path!;
        });
      }
      if (!mounted) return;
      if (asset.type == 'ebook') {
        final result = await Navigator.of(context).push<EbookProgress>(
          MaterialPageRoute(
            builder: (_) => EbookReaderScreen(
              asset: asset,
              filePath: path!,
              service: _service,
              initialProgress: _ebookProgress[asset.publicId],
            ),
          ),
        );
        if (result != null && mounted) {
          setState(() {
            _ebookProgress[asset.publicId] = result;
          });
        }
      } else {
        await _service.openAsset(path!);
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to open asset: $error')),
      );
    }
  }

  Future<void> _markComplete(ContentAsset asset) async {
    try {
      await _service.updateProgress(asset.publicId, 100);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${asset.originalFilename} marked as complete.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update progress: $error')),
      );
    }
  }

  Future<void> _openMetadataSheet(ContentAsset asset) async {
    final updated = await showModalBottomSheet<ContentAsset>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => MaterialMetadataSheet(asset: asset, service: _service),
    );
    if (updated != null && mounted) {
      setState(() {
        _assets = _assets
            .map((item) => item.publicId == updated.publicId ? updated : item)
            .toList();
      });
      await SessionManager.assetsCache
          .put('items', _assets.map((asset) => asset.toJson()).toList());
    }
  }

  @override
  Widget build(BuildContext context) {
    final token = SessionManager.getAccessToken();
    final role = SessionManager.getActiveRole();
    final canManage = role == 'instructor' || role == 'admin';
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          foregroundColor: _brandPrimaryDark,
          titleSpacing: 0,
          title: const Text(
            'Content library',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          bottom: const TabBar(
            indicatorColor: _brandPrimary,
            indicatorWeight: 3,
            labelColor: _brandPrimaryDark,
            unselectedLabelColor: Colors.blueGrey,
            tabs: [
              Tab(text: 'Library'),
              Tab(text: 'Marketplace'),
            ],
          ),
          actions: [
            IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh))
          ],
        ),
        body: token == null
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Please sign in from the login screen to access your Cloudflare R2 assets.'),
                ),
              )
            : TabBarView(
                children: [
                  RefreshIndicator(
                    color: _brandPrimary,
                    backgroundColor: Colors.white,
                    onRefresh: _refresh,
                    child: _accessDenied
                        ? ListView(
                            padding: const EdgeInsets.all(24),
                            physics: const AlwaysScrollableScrollPhysics(
                              parent: BouncingScrollPhysics(),
                            ),
                            children: [
                              Container(
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: _brandSurface,
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(color: _brandPrimary.withOpacity(0.1)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Instructor Learnspace required',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(fontWeight: FontWeight.w700, color: _brandPrimaryDark),
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      _accessDeniedMessage ??
                                          'Switch to an instructor or admin Learnspace to manage metadata, galleries, and showcase settings.',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(color: Colors.blueGrey.shade600),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : _loading && _assets.isEmpty
                            ? const Center(child: CircularProgressIndicator(color: _brandPrimary))
                            : ListView.builder(
                                padding: const EdgeInsets.all(16),
                                physics: const AlwaysScrollableScrollPhysics(
                                  parent: BouncingScrollPhysics(),
                                ),
                                itemCount: _assets.length,
                                itemBuilder: (context, index) {
                                  final asset = _assets[index];
                              final downloadedPath = _downloads[asset.publicId];
                              final ebookProgress = _ebookProgress[asset.publicId];
                              final description = asset.customMetadata['description'] as String?;
                              final showcase = asset.customMetadata['showcase'];
                              final badge = showcase is Map<String, dynamic> ? showcase['badge'] as String? : null;
                              return Card(
                                margin: const EdgeInsets.only(bottom: 16),
                                elevation: 2,
                                shadowColor: _brandPrimary.withOpacity(0.08),
                                color: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(20),
                                  side: BorderSide(color: _brandPrimary.withOpacity(0.08)),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              asset.originalFilename,
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleMedium
                                                  ?.copyWith(fontWeight: FontWeight.w600),
                                            ),
                                          ),
                                          Chip(
                                            label: Text(asset.status.toUpperCase()),
                                            backgroundColor: asset.status == 'ready'
                                                ? _brandPrimary.withOpacity(0.12)
                                                : Colors.blueGrey.shade100,
                                            labelStyle: TextStyle(
                                              color: asset.status == 'ready'
                                                  ? _brandPrimaryDark
                                                  : Colors.blueGrey.shade700,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        asset.type.toUpperCase(),
                                        style: Theme.of(context)
                                            .textTheme
                                            .labelSmall
                                            ?.copyWith(letterSpacing: 1.2, color: Colors.blueGrey),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        asset.updatedAt != null
                                            ? 'Updated ${DateTime.tryParse(asset.updatedAt!)?.toLocal().toString()}'
                                            : 'Awaiting processing',
                                        style: Theme.of(context).textTheme.bodySmall,
                                      ),
                                      const SizedBox(height: 16),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          Chip(
                                            label: Text((asset.visibility ?? 'workspace') == 'workspace'
                                                ? 'LEARNSPACE'
                                                : (asset.visibility ?? 'workspace').toUpperCase()),
                                            backgroundColor: _brandPrimary.withOpacity(0.12),
                                            labelStyle: const TextStyle(
                                              color: _brandPrimaryDark,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          ...asset.categories.map(
                                            (category) => Chip(
                                              label: Text(category),
                                              backgroundColor: Colors.blueGrey.shade50,
                                              labelStyle: TextStyle(
                                                color: Colors.blueGrey.shade700,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (asset.coverImageUrl != null && asset.coverImageUrl!.isNotEmpty) ...[
                                        const SizedBox(height: 12),
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(16),
                                          child: Image.network(
                                            asset.coverImageUrl!,
                                            height: 140,
                                            width: double.infinity,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => Container(
                                              height: 140,
                                              width: double.infinity,
                                              decoration: BoxDecoration(
                                                color: Colors.blueGrey.shade50,
                                                borderRadius: BorderRadius.circular(16),
                                              ),
                                              child: const Center(
                                                child: Icon(Icons.image_not_supported_outlined, color: Colors.blueGrey),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                      if (badge != null && badge.isNotEmpty) ...[
                                        const SizedBox(height: 12),
                                        Chip(
                                          label: Text(badge.toUpperCase()),
                                          backgroundColor: Colors.orange.shade50,
                                          labelStyle: const TextStyle(color: Colors.orange, fontWeight: FontWeight.w700),
                                        ),
                                      ],
                                      if (description != null && description.isNotEmpty) ...[
                                        const SizedBox(height: 12),
                                        Text(
                                          description,
                                          maxLines: 3,
                                          overflow: TextOverflow.ellipsis,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodyMedium
                                              ?.copyWith(color: Colors.blueGrey.shade600),
                                        ),
                                      ],
                                      if (asset.tags.isNotEmpty) ...[
                                        const SizedBox(height: 12),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 6,
                                          children: asset.tags
                                              .map(
                                                (tag) => Chip(
                                                  label: Text('#$tag'),
                                                  backgroundColor: _brandPrimary.withOpacity(0.08),
                                                  labelStyle: const TextStyle(
                                                    color: _brandPrimaryDark,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              )
                                              .toList(),
                                        ),
                                      ],
                                      const SizedBox(height: 16),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          FilledButton.tonal(
                                            onPressed: () => _open(asset),
                                            style: FilledButton.styleFrom(
                                              backgroundColor: _brandPrimary.withOpacity(0.12),
                                              foregroundColor: _brandPrimaryDark,
                                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(999),
                                              ),
                                            ),
                                            child: const Text('Open'),
                                          ),
                                          OutlinedButton.icon(
                                            onPressed: () => _download(asset),
                                            icon: const Icon(Icons.download),
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: _brandPrimaryDark,
                                              side: BorderSide(color: _brandPrimary.withOpacity(0.3)),
                                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(999),
                                              ),
                                            ),
                                            label: Text(downloadedPath != null ? 'Redownload' : 'Download'),
                                          ),
                                          if (asset.type == 'ebook')
                                            TextButton(
                                              onPressed: () => _markComplete(asset),
                                              style: TextButton.styleFrom(
                                                foregroundColor: _brandPrimaryDark,
                                              ),
                                              child: const Text('Mark complete'),
                                            ),
                                          if (canManage)
                                            FilledButton(
                                              onPressed: () => _openMetadataSheet(asset),
                                              style: FilledButton.styleFrom(
                                                backgroundColor: _brandPrimary,
                                                foregroundColor: Colors.white,
                                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                                shape: RoundedRectangleBorder(
                                                  borderRadius: BorderRadius.circular(999),
                                                ),
                                              ),
                                              child: const Text('Manage'),
                                            ),
                                        ],
                                      ),
                                      if (asset.type == 'ebook') ...[
                                        const SizedBox(height: 12),
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(8),
                                          child: LinearProgressIndicator(
                                            value: (ebookProgress?.progressPercent ?? 0) / 100,
                                            minHeight: 6,
                                            backgroundColor: _brandPrimary.withOpacity(0.1),
                                            valueColor: const AlwaysStoppedAnimation<Color>(_brandPrimary),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          ebookProgress != null
                                              ? 'Progress ${ebookProgress.progressPercent.toStringAsFixed(0)}%'
                                              : 'No reading progress yet',
                                          style: Theme.of(context).textTheme.bodySmall,
                                        ),
                                      ],
                                      if (downloadedPath != null)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 8),
                                          child: Text(
                                            'Offline copy: $downloadedPath',
                                            style: Theme.of(context).textTheme.bodySmall,
                                          ),
                                        )
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: _marketplaceLoading
                        ? const Center(child: CircularProgressIndicator(color: _brandPrimary))
                        : _marketplaceError != null
                            ? Center(
                                child: Text(
                                  _marketplaceError!,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(color: Colors.redAccent, fontWeight: FontWeight.w600),
                                  textAlign: TextAlign.center,
                                ),
                              )
                            : _marketplace.isEmpty
                                ? _buildMarketplaceEmptyState(context)
                                : ListView(
                                    physics: const BouncingScrollPhysics(),
                                    children: [
                                      _buildMonetizationExplainer(context),
                                      _buildMarketplaceHighlights(context),
                                      ..._marketplace.map((item) {
                                        final pending = _pendingPurchaseId == item.id;
                                        return Card(
                                          margin: const EdgeInsets.only(bottom: 16),
                                          color: Colors.white,
                                          elevation: 2,
                                          shadowColor: _brandPrimary.withOpacity(0.06),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(20),
                                            side: BorderSide(color: _brandPrimary.withOpacity(0.08)),
                                          ),
                                          child: ListTile(
                                            contentPadding: const EdgeInsets.all(20),
                                            tileColor: Colors.white,
                                            title: Text(item.title,
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .titleMedium
                                                    ?.copyWith(fontWeight: FontWeight.w600)),
                                            subtitle: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                if (item.subtitle != null)
                                                  Padding(
                                                    padding: const EdgeInsets.only(top: 4),
                                                    child: Text(item.subtitle!,
                                                        style: Theme.of(context)
                                                            .textTheme
                                                            .bodySmall
                                                            ?.copyWith(color: Colors.blueGrey)),
                                                  ),
                                                Padding(
                                                  padding: const EdgeInsets.only(top: 8),
                                                  child: Text('Downloads · ${item.downloads.toString()}',
                                                      style: Theme.of(context)
                                                          .textTheme
                                                          .bodySmall
                                                          ?.copyWith(color: Colors.blueGrey)),
                                                ),
                                              ],
                                            ),
                                            trailing: Column(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              crossAxisAlignment: CrossAxisAlignment.end,
                                              children: [
                                                Text(item.price,
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .titleSmall
                                                        ?.copyWith(fontWeight: FontWeight.bold)),
                                                const SizedBox(height: 8),
                                                FilledButton(
                                                  onPressed:
                                                      pending ? null : () => _attemptPurchase(item),
                                                  style: FilledButton.styleFrom(
                                                    backgroundColor: _brandPrimary,
                                                    foregroundColor: Colors.white,
                                                    padding: const EdgeInsets.symmetric(
                                                        horizontal: 20, vertical: 12),
                                                    shape: RoundedRectangleBorder(
                                                      borderRadius: BorderRadius.circular(999),
                                                    ),
                                                  ),
                                                  child: Text(pending ? 'Preparing…' : 'Secure checkout'),
                                                )
                                              ],
                                            ),
                                          ),
                                        );
                                      }).toList(),
                                      const SizedBox(height: 12),
                                    ],
                                  ),
                  ),
                ],
              ),
      ),
      bottomNavigationBar: _purchaseStatus == null
          ? null
          : Container(
              decoration: BoxDecoration(
                color: _brandSurface,
                border: Border(top: BorderSide(color: _brandPrimary.withOpacity(0.1))),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              child: Row(
                children: [
                  Icon(Icons.lock_outline, color: _brandPrimaryDark),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _purchaseStatus!,
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: _brandPrimaryDark, fontWeight: FontWeight.w600),
                    ),
                  )
                ],
              ),
            ),
    );
  }
}
