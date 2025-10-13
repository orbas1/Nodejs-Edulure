import 'dart:async';
import 'dart:io';

import 'package:epub_view/epub_view.dart';
import 'package:flutter/material.dart';

import '../services/content_service.dart';

class EbookReaderScreen extends StatefulWidget {
  const EbookReaderScreen({
    super.key,
    required this.asset,
    required this.filePath,
    required this.service,
    this.initialProgress,
  });

  final ContentAsset asset;
  final String filePath;
  final ContentService service;
  final EbookProgress? initialProgress;

  @override
  State<EbookReaderScreen> createState() => _EbookReaderScreenState();
}

class _EbookReaderScreenState extends State<EbookReaderScreen> {
  late final EpubController _controller;
  late ReaderPreferences _preferences;
  late bool _darkMode;
  late double _fontScale;
  double _progress = 0;
  String? _currentCfi;
  EbookProgress? _latestProgress;
  Timer? _persistenceTimer;
  bool _bookLoaded = false;

  @override
  void initState() {
    super.initState();
    _preferences = widget.service.loadReaderPreferences();
    _darkMode = _preferences.theme == ReaderThemePreference.dark;
    _fontScale = _preferences.fontScale;
    _progress = widget.initialProgress?.progressPercent ?? 0;
    _currentCfi = widget.initialProgress?.cfi;
    _latestProgress = widget.initialProgress;
    _controller = EpubController(
      document: EpubDocument.openFile(File(widget.filePath)),
      epubCfi: _currentCfi,
    );
    _controller.loadingState.addListener(_handleLoadingStateChanged);
    _controller.currentValueListenable.addListener(_handleLocationChanged);
  }

  @override
  void dispose() {
    _persistenceTimer?.cancel();
    _controller.currentValueListenable.removeListener(_handleLocationChanged);
    _controller.loadingState.removeListener(_handleLoadingStateChanged);
    _controller.dispose();
    super.dispose();
  }

  void _handleLoadingStateChanged() {
    if (!mounted) return;
    final state = _controller.loadingState.value;
    setState(() {
      _bookLoaded = state == EpubViewLoadingState.success;
    });
  }

  void _handleLocationChanged() {
    final value = _controller.currentValueListenable.value;
    if (value == null) {
      return;
    }
    final progress = _calculateProgress(value);
    final generatedCfi = _controller.generateEpubCfi();
    if (!mounted) {
      _progress = progress;
      if (generatedCfi != null) {
        _currentCfi = generatedCfi;
      }
      return;
    }
    setState(() {
      _progress = progress;
      if (generatedCfi != null) {
        _currentCfi = generatedCfi;
      }
    });
    _schedulePersistence();
  }

  double _calculateProgress(EpubChapterViewValue value) {
    final toc = _controller.tableOfContentsListenable.value;
    final totalChapters = toc.where((chapter) => chapter is! EpubViewSubChapter).length;
    final int chapterIndex = totalChapters > 0
        ? (value.chapterNumber - 1).clamp(0, totalChapters - 1)
        : 0;
    final double perChapter = totalChapters > 0 ? 100.0 / totalChapters : 100.0;
    final double chapterProgress = value.progress.isFinite
        ? (value.progress.clamp(0, 100) as num).toDouble() / 100
        : 0;
    final double total = (chapterIndex * perChapter) + (chapterProgress * perChapter);
    return total.clamp(0.0, 100.0).toDouble();
  }

  void _schedulePersistence() {
    _persistenceTimer?.cancel();
    _persistenceTimer = Timer(const Duration(seconds: 2), () async {
      final record = _currentProgressRecord();
      await widget.service.cacheEbookProgress(widget.asset.publicId, record);
      await widget.service.updateProgress(widget.asset.publicId, record.progressPercent);
      _latestProgress = record;
    });
  }

  EbookProgress _currentProgressRecord() {
    final baseline = _latestProgress ?? widget.initialProgress;
    if (baseline != null) {
      return baseline.copyWith(
        progressPercent: _progress,
        cfi: _currentCfi ?? baseline.cfi,
      );
    }
    return EbookProgress(
      progressPercent: _progress,
      cfi: _currentCfi,
    );
  }

  Future<void> _closeReader() async {
    _persistenceTimer?.cancel();
    final record = _currentProgressRecord();
    await widget.service.cacheEbookProgress(widget.asset.publicId, record);
    await widget.service.updateProgress(widget.asset.publicId, record.progressPercent);
    if (!mounted) return;
    Navigator.of(context).pop(record);
  }

  Future<bool> _handleWillPop() async {
    await _closeReader();
    return false;
  }

  void _toggleTheme() {
    final nextTheme = _darkMode ? ReaderThemePreference.light : ReaderThemePreference.dark;
    setState(() {
      _darkMode = !_darkMode;
      _preferences = _preferences.copyWith(theme: nextTheme);
    });
    unawaited(widget.service.saveReaderPreferences(_preferences));
  }

  void _increaseFont() {
    setState(() {
      _fontScale = ((_fontScale + 0.05).clamp(0.8, 1.6) as num).toDouble();
      _preferences = _preferences.copyWith(fontScale: _fontScale);
    });
    unawaited(widget.service.saveReaderPreferences(_preferences));
  }

  void _decreaseFont() {
    setState(() {
      _fontScale = ((_fontScale - 0.05).clamp(0.8, 1.6) as num).toDouble();
      _preferences = _preferences.copyWith(fontScale: _fontScale);
    });
    unawaited(widget.service.saveReaderPreferences(_preferences));
  }

  int? _chapterCount() {
    final metadata = widget.asset.metadata;
    if (metadata is Map) {
      final ebook = metadata['ebook'];
      if (ebook is Map && ebook['chapterCount'] is num) {
        return (ebook['chapterCount'] as num).toInt();
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final backgroundColor = _darkMode ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final surfaceColor = _darkMode ? const Color(0xFF1E293B) : Colors.white;
    final textColor = _darkMode ? Colors.white : const Color(0xFF0F172A);
    final loadingState = _controller.loadingState.value;
    final chapterCount = _chapterCount();
    final builderOptions = EpubViewBuilders<DefaultBuilderOptions>(
      options: DefaultBuilderOptions(
        chapterPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
        paragraphPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        textStyle: TextStyle(
          fontSize: 16 * _fontScale,
          height: 1.6,
          color: textColor.withOpacity(_darkMode ? 0.92 : 0.94),
        ),
      ),
      loaderBuilder: (context) => const Center(child: CircularProgressIndicator()),
      errorBuilder: (context, error) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Unable to render this chapter.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(color: textColor.withOpacity(0.85)),
          ),
        ),
      ),
    );

    return WillPopScope(
      onWillPop: _handleWillPop,
      child: Theme(
        data: theme.copyWith(
          brightness: _darkMode ? Brightness.dark : Brightness.light,
          scaffoldBackgroundColor: backgroundColor,
          colorScheme: theme.colorScheme.copyWith(
            brightness: _darkMode ? Brightness.dark : Brightness.light,
            surface: surfaceColor,
          ),
          appBarTheme: theme.appBarTheme.copyWith(
            backgroundColor: surfaceColor,
            foregroundColor: textColor,
            elevation: 0,
          ),
        ),
        child: Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: _closeReader,
            ),
            title: Text(
              widget.asset.originalFilename,
              overflow: TextOverflow.ellipsis,
            ),
            actions: [
              IconButton(
                tooltip: 'Decrease font size',
                onPressed: _decreaseFont,
                icon: const Icon(Icons.remove),
              ),
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text(
                    '${(_fontScale * 100).round()}%',
                    style: theme.textTheme.labelSmall?.copyWith(color: textColor.withOpacity(0.8)),
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Increase font size',
                onPressed: _increaseFont,
                icon: const Icon(Icons.add),
              ),
              IconButton(
                tooltip: _darkMode ? 'Switch to light mode' : 'Switch to dark mode',
                onPressed: _toggleTheme,
                icon: Icon(_darkMode ? Icons.light_mode : Icons.dark_mode),
              ),
            ],
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(4),
              child: LinearProgressIndicator(
                value: _bookLoaded
                    ? ((_progress / 100).clamp(0.0, 1.0) as num).toDouble()
                    : null,
                minHeight: 4,
                backgroundColor: surfaceColor.withOpacity(0.3),
              ),
            ),
          ),
          body: Container(
            color: backgroundColor,
            child: Builder(
              builder: (context) {
                switch (loadingState) {
                  case EpubViewLoadingState.loading:
                    return const Center(child: CircularProgressIndicator());
                  case EpubViewLoadingState.error:
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'Unable to load this ebook. Please try again later.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(color: textColor.withOpacity(0.85)),
                        ),
                      ),
                    );
                  case EpubViewLoadingState.success:
                    return EpubView(
                      controller: _controller,
                      builders: builderOptions,
                    );
                }
              },
            ),
          ),
          bottomNavigationBar: SafeArea(
            top: false,
            child: Container(
              color: surfaceColor,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Text(
                    '${_progress.toStringAsFixed(0)}% complete',
                    style: theme.textTheme.bodyMedium?.copyWith(color: textColor.withOpacity(0.9)),
                  ),
                  const Spacer(),
                  if (chapterCount != null)
                    Text(
                      '$chapterCount chapters',
                      style: theme.textTheme.bodySmall?.copyWith(color: textColor.withOpacity(0.7)),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
