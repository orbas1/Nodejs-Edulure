import 'content_service.dart';

/// Defines the contract needed by [EbookReaderScreen] to persist reader state.
///
/// This allows the reader to work with multiple backends (remote API driven
/// or fully offline libraries) while keeping the UI layer agnostic.
abstract class EbookReaderBackend {
  ReaderPreferences loadReaderPreferences();
  Future<void> saveReaderPreferences(ReaderPreferences preferences);
  Future<void> cacheEbookProgress(String assetId, EbookProgress progress);
  Future<void> updateProgress(String assetId, double progressPercent);
}
