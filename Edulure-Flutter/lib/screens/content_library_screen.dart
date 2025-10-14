import 'package:flutter/material.dart';

import '../services/content_service.dart';
import '../services/session_manager.dart';
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

  @override
  void initState() {
    super.initState();
    _initialise();
  }

  Future<void> _initialise() async {
    final cachedAssets = _service.loadCachedAssets();
    final cachedDownloads = _service.loadCachedDownloads();
    setState(() {
      _assets = cachedAssets;
      _downloads = cachedDownloads;
      _ebookProgress = _service.loadCachedEbookProgress();
      _loading = false;
    });
    await _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _purchaseStatus = null;
    });
    try {
      final assets = await _service.fetchAssets();
      setState(() {
        _assets = assets;
        _downloads = _service.loadCachedDownloads();
        _ebookProgress = _service.loadCachedEbookProgress();
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

  @override
  Widget build(BuildContext context) {
    final token = SessionManager.getAccessToken();
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
                    child: _loading && _assets.isEmpty
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
                                      Row(
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
                                          const SizedBox(width: 8),
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
                                          if (asset.type == 'ebook') ...[
                                            const SizedBox(width: 8),
                                            TextButton(
                                              onPressed: () => _markComplete(asset),
                                              style: TextButton.styleFrom(
                                                foregroundColor: _brandPrimaryDark,
                                              ),
                                              child: const Text('Mark complete'),
                                            ),
                                          ],
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
                            : ListView.builder(
                                physics: const BouncingScrollPhysics(),
                                itemCount: _marketplace.length,
                                itemBuilder: (context, index) {
                                  final item = _marketplace[index];
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
                                            onPressed: () async {
                                              if (token == null) {
                                                setState(() {
                                                  _purchaseStatus = 'Sign in to purchase premium titles.';
                                                });
                                                return;
                                              }
                                              try {
                                                final intent = await _service.createEbookPurchaseIntent(item.id);
                                                setState(() {
                                                  _purchaseStatus =
                                                      'Checkout created. Payment ID ${intent.paymentId}';
                                                });
                                              } catch (error) {
                                                setState(() {
                                                  _purchaseStatus = 'Unable to start checkout: $error';
                                                });
                                              }
                                            },
                                            style: FilledButton.styleFrom(
                                              backgroundColor: _brandPrimary,
                                              foregroundColor: Colors.white,
                                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(999),
                                              ),
                                            ),
                                            child: const Text('Purchase'),
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
