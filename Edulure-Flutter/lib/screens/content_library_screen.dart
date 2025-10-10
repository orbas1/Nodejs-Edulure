import 'package:flutter/material.dart';

import '../services/content_service.dart';
import '../services/session_manager.dart';

class ContentLibraryScreen extends StatefulWidget {
  const ContentLibraryScreen({super.key});

  @override
  State<ContentLibraryScreen> createState() => _ContentLibraryScreenState();
}

class _ContentLibraryScreenState extends State<ContentLibraryScreen> {
  final ContentService _service = ContentService();
  List<ContentAsset> _assets = [];
  Map<String, String> _downloads = {};
  bool _loading = true;

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
      _loading = false;
    });
    await _refresh();
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    try {
      final assets = await _service.fetchAssets();
      setState(() {
        _assets = assets;
        _downloads = _service.loadCachedDownloads();
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
      if (existingPath != null) {
        await _service.openAsset(existingPath);
        return;
      }
      final token = await _service.viewerToken(asset.publicId);
      final path = await _service.downloadAsset(asset, token);
      await _service.recordDownload(asset.publicId);
      setState(() {
        _downloads[asset.publicId] = path;
      });
      await _service.openAsset(path);
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Content library'),
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
          : RefreshIndicator(
              onRefresh: _refresh,
              child: _loading && _assets.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _assets.length,
                      itemBuilder: (context, index) {
                        final asset = _assets[index];
                        final downloadedPath = _downloads[asset.publicId];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          elevation: 1,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
                                      label: Text(asset.status),
                                      backgroundColor: asset.status == 'ready'
                                          ? Colors.green.shade50
                                          : Colors.grey.shade200,
                                      labelStyle: TextStyle(
                                        color: asset.status == 'ready'
                                            ? Colors.green.shade800
                                            : Colors.grey.shade700,
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
                                      child: const Text('Open'),
                                    ),
                                    const SizedBox(width: 8),
                                    OutlinedButton.icon(
                                      onPressed: () => _download(asset),
                                      icon: const Icon(Icons.download),
                                      label: Text(downloadedPath != null ? 'Redownload' : 'Download'),
                                    ),
                                    if (asset.type == 'ebook') ...[
                                      const SizedBox(width: 8),
                                      TextButton(
                                        onPressed: () => _markComplete(asset),
                                        child: const Text('Mark complete'),
                                      ),
                                    ],
                                  ],
                                ),
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
    );
  }
}
