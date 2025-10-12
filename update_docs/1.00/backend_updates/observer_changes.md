# Observer Changes

- Domain event logging lays the groundwork for asynchronous observers; events are stored with payload metadata for future processing.
- `AssetIngestionService` acts as a polling observer, reserving pending ingestion jobs and dispatching CloudConvert/EPUB processing with success/failure callbacks.
- Antivirus scan outcomes emit `content_asset_events` entries (`antivirus_clean`, `antivirus_detected`) and audit logs so downstream observers can trigger notifications or compliance reviews when malware is detected or cleared.
- Search ingestion metrics (`edulure_search_ingestion_documents_total`, `edulure_search_ingestion_failures_total`, `edulure_search_ingestion_last_run_seconds`) now surface through the Prometheus registry to feed explorer operations dashboards, providing batch sizing, duration, and error telemetry for SRE runbooks.
