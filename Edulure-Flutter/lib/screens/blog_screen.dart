import 'package:flutter/material.dart';

import '../services/blog_service.dart';
import '../services/dashboard_service.dart';

class BlogScreen extends StatefulWidget {
  const BlogScreen({super.key});

  @override
  State<BlogScreen> createState() => _BlogScreenState();
}

class _BlogScreenState extends State<BlogScreen> {
  final BlogService _service = BlogService();
  final ScrollController _scrollController = ScrollController();

  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  List<BlogArticle> _posts = const [];
  int _page = 1;
  int _totalPages = 1;

  @override
  void initState() {
    super.initState();
    _load();
    _scrollController.addListener(_handleScroll);
  }

  void _handleScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 120 &&
        !_loading &&
        !_loadingMore &&
        _page < _totalPages) {
      _loadMore();
    }
  }

  Future<void> _load({int page = 1}) async {
    setState(() {
      if (page == 1) {
        _loading = true;
        _posts = const [];
      } else {
        _loadingMore = true;
      }
      _error = null;
    });
    try {
      final result = await _service.fetchPosts(page: page);
      setState(() {
        _posts = page == 1 ? result.posts : [..._posts, ...result.posts];
        _page = result.page;
        _totalPages = result.totalPages;
      });
    } catch (error) {
      setState(() {
        _error = error.toString();
      });
    } finally {
      setState(() {
        _loading = false;
        _loadingMore = false;
      });
    }
  }

  Future<void> _loadMore() => _load(page: _page + 1);

  Future<void> _refresh() async {
    await _load(page: 1);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edulure Blog'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : () => _load(page: 1),
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF1F2),
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(color: const Color(0xFFFFC9D1)),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Unable to load articles',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(color: const Color(0xFFB91C1C), fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _error ?? 'Try pulling to refresh.',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: const Color(0xFF9F1239)),
                            ),
                            const SizedBox(height: 16),
                            OutlinedButton(
                              onPressed: () => _load(page: 1),
                              child: const Text('Retry'),
                            )
                          ],
                        ),
                      )
                    ],
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(24),
                    itemCount: _posts.length + (_loadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index >= _posts.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }
                      final post = _posts[index];
                      return _BlogCard(article: post);
                    },
                  ),
      ),
    );
  }
}

class _BlogCard extends StatelessWidget {
  const _BlogCard({required this.article});

  final BlogArticle article;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 16, offset: Offset(0, 10)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (article.heroImageUrl != null && article.heroImageUrl!.isNotEmpty)
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(28),
                topRight: Radius.circular(28),
              ),
              child: Image.network(
                article.heroImageUrl!,
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  article.category,
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: const Color(0xFF2563EB), fontWeight: FontWeight.w600, letterSpacing: 0.6),
                ),
                const SizedBox(height: 6),
                Text(
                  article.title,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                ),
                const SizedBox(height: 8),
                Text(
                  article.excerpt.isNotEmpty ? article.excerpt : 'Read more on the Edulure blog.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade700),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    Chip(
                      label: Text('${article.readingTimeMinutes} min read'),
                      backgroundColor: const Color(0xFFEFF6FF),
                      labelStyle: const TextStyle(color: Color(0xFF1D4ED8), fontWeight: FontWeight.w600),
                    ),
                    if (article.publishedAt != null)
                      Chip(
                        label: Text(article.publishedAt!),
                        backgroundColor: const Color(0xFFF1F5F9),
                      ),
                    if (article.isFeatured)
                      const Chip(
                        label: Text('Featured'),
                        backgroundColor: Color(0xFFFFF7E6),
                        labelStyle: TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
