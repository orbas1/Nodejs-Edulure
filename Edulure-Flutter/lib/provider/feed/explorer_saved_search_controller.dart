import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../services/explorer_saved_search_service.dart';

final explorerSavedSearchRepositoryProvider = Provider<ExplorerSavedSearchRepository>((ref) {
  return ExplorerSavedSearchRepository();
});

final explorerSavedSearchesProvider =
    StateNotifierProvider<ExplorerSavedSearchController, List<ExplorerSavedSearch>>((ref) {
  final repository = ref.watch(explorerSavedSearchRepositoryProvider);
  return ExplorerSavedSearchController(repository: repository)..load();
});

class ExplorerSavedSearchController extends StateNotifier<List<ExplorerSavedSearch>> {
  ExplorerSavedSearchController({required ExplorerSavedSearchRepository repository})
      : _repository = repository,
        super(const <ExplorerSavedSearch>[]);

  final ExplorerSavedSearchRepository _repository;
  final Uuid _uuid = const Uuid();

  Future<void> load() async {
    final saved = await _repository.loadAll();
    state = saved;
  }

  Future<void> add({
    required String name,
    required String query,
    required List<String> entities,
    Map<String, String>? sort,
    List<String>? languages,
  }) async {
    final search = ExplorerSavedSearch(
      id: _uuid.v4(),
      name: name,
      query: query,
      entities: entities,
      sort: sort,
      languages: languages ?? const <String>[],
    );
    await _repository.save(search);
    await load();
  }

  Future<void> delete(String id) async {
    await _repository.delete(id);
    await load();
  }

  Future<void> rename(String id, String name) async {
    await _repository.rename(id, name);
    await load();
  }
}
