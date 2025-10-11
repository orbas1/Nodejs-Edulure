# Observer Changes

- Domain event logging lays the groundwork for asynchronous observers; events are stored with payload metadata for future processing.
- `AssetIngestionService` acts as a polling observer, reserving pending ingestion jobs and dispatching CloudConvert/EPUB processing with success/failure callbacks.
- Antivirus scan outcomes emit `content_asset_events` entries (`antivirus_clean`, `antivirus_detected`) and audit logs so downstream observers can trigger notifications or compliance reviews when malware is detected or cleared.
