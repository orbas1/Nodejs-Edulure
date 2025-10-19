import 'package:hive_flutter/hive_flutter.dart';

class ExplorerSavedSearchRepository {
  ExplorerSavedSearchRepository({this.boxName = 'explorer.savedSearches'});

  final String boxName;

  Future<Box> _openBox() async {
    if (!Hive.isBoxOpen(boxName)) {
      await Hive.openBox(boxName);
    }
    return Hive.box(boxName);
  }

  Future<List<ExplorerSavedSearch>> loadAll() async {
    final box = await _openBox();
    return box.values
        .whereType<Map>()
        .map((entry) => ExplorerSavedSearch.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();
  }

  Future<void> save(ExplorerSavedSearch search) async {
    final box = await _openBox();
    await box.put(search.id, search.toJson());
  }

  Future<void> delete(String id) async {
    final box = await _openBox();
    await box.delete(id);
  }

  Future<void> rename(String id, String name) async {
    final box = await _openBox();
    final existing = box.get(id);
    if (existing is Map) {
      final data = Map<String, dynamic>.from(existing as Map);
      data['name'] = name;
      await box.put(id, data);
    }
  }
}

class ExplorerSavedSearch {
  ExplorerSavedSearch({
    required this.id,
    required this.name,
    required this.query,
    required this.entities,
    this.sort,
    this.languages = const <String>[],
  });

  final String id;
  final String name;
  final String query;
  final List<String> entities;
  final Map<String, String>? sort;
  final List<String> languages;

  factory ExplorerSavedSearch.fromJson(Map<String, dynamic> json) {
    return ExplorerSavedSearch(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      name: json['name']?.toString() ?? 'Saved search',
      query: json['query']?.toString() ?? '',
      entities: (json['entities'] is List)
          ? (json['entities'] as List).map((entry) => entry.toString()).toList()
          : const <String>[],
      sort: json['sort'] is Map<String, dynamic>
          ? Map<String, String>.from(json['sort'] as Map<String, dynamic>)
          : null,
      languages: (json['languages'] is List)
          ? (json['languages'] as List).map((entry) => entry.toString()).toList()
          : const <String>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'query': query,
      'entities': entities,
      'sort': sort,
      'languages': languages,
    }..removeWhere((key, value) => value == null);
  }
}
