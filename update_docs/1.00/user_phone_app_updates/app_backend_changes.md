# Backend Integration Updates for Mobile

- Session manager initialisation now distinguishes critical from optional caches and tolerates Hive failures for non-essential boxes while introducing a dedicated provider transition cache that can be lazily re-opened; this prevents hard crashes on storage permission issues and unlocks offline announcement persistence.
- Added a provider transition repository that consumes the new REST endpoints, normalises announcement/timeline/resource payloads, merges acknowledgement defaults, and persists data with TTL-based invalidation so mobile clients stay synchronised with the operator backend even across reconnects.
- Wired acknowledgement and status update submissions through the repository with optimistic refresh logic, ensuring the UI refreshes cached collections after successful API calls and falls back to cached detail bundles when the network is unavailable.
