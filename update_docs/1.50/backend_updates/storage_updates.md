# Storage Updates – Version 1.50

- Partition archives now stream monthly slices to R2 as NDJSON using the storage service, attaching governance metadata and checksums so compliance teams can validate evidence prior to partition drops.【F:backend-nodejs/src/services/DataPartitionService.js†L198-L313】【F:backend-nodejs/scripts/manage-data-partitions.js†L1-L67】
