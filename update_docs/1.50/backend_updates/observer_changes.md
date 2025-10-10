# Observer Changes

- Domain event logging lays the groundwork for asynchronous observers; events are stored with payload metadata for future processing.
- `AssetIngestionService` acts as a polling observer, reserving pending ingestion jobs and dispatching CloudConvert/EPUB processing with success/failure callbacks.
