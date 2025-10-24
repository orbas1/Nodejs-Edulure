import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'api_config.dart';
import 'commerce_models.dart';
import 'commerce_persistence_service.dart';
import 'session_manager.dart';

class BillingSyncException implements Exception {
  const BillingSyncException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => 'BillingSyncException: $message';
}

class BillingSyncService {
  BillingSyncService({
    required CommercePersistence persistence,
    Dio? client,
    String? Function()? tokenProvider,
    Duration catalogTtl = const Duration(hours: 12),
    Duration receiptBackoff = const Duration(minutes: 5),
  })  : _persistence = persistence,
        _dio = client ?? ApiConfig.createHttpClient(requiresAuth: true),
        _tokenProvider = tokenProvider ?? SessionManager.getAccessToken,
        _catalogTtl = catalogTtl,
        _receiptBackoff = receiptBackoff;

  final CommercePersistence _persistence;
  final Dio _dio;
  final String? Function() _tokenProvider;
  final Duration _catalogTtl;
  final Duration _receiptBackoff;

  Future<List<PendingReceipt>>? _flushInFlight;

  Options _authOptions() {
    final token = _tokenProvider();
    if (token == null || token.isEmpty) {
      throw const BillingSyncException('Authentication required for billing operations.');
    }
    return Options(
      headers: {
        ..._dio.options.headers,
        'Authorization': 'Bearer $token',
      },
      extra: {
        ...?_dio.options.extra,
        'requiresAuth': true,
      },
    );
  }

  Map<String, dynamic> _ensureMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return const <String, dynamic>{};
  }

  Future<BillingCatalogSnapshot> loadCatalog({bool forceRefresh = false}) async {
    BillingCatalogSnapshot? cached;
    try {
      cached = await _persistence.loadBillingCatalog();
    } catch (error, stackTrace) {
      debugPrint('Failed to read cached billing catalog: $error');
      debugPrint('$stackTrace');
    }

    final isCachedFresh = cached != null && !cached.isExpired &&
        DateTime.now().difference(cached.fetchedAt) < _catalogTtl;
    if (!forceRefresh && isCachedFresh) {
      return cached!;
    }

    try {
      final response = await _dio.get('/billing/catalog', options: _authOptions());
      final body = _ensureMap(response.data);
      final payload = body['data'] is Map ? _ensureMap(body['data']) : body;
      final snapshot = BillingCatalogSnapshot.fromApi(
        payload,
        fetchedAt: DateTime.now(),
        ttl: _catalogTtl,
      );
      await _persistence.saveBillingCatalog(snapshot);
      return snapshot;
    } on BillingSyncException {
      rethrow;
    } on DioException catch (error) {
      debugPrint('Billing catalog refresh failed: ${error.message}');
      if (cached != null) {
        return cached.copyWith(source: 'cache');
      }
      throw BillingSyncException('Unable to refresh billing catalog.', cause: error);
    } catch (error, stackTrace) {
      debugPrint('Billing catalog refresh error: $error');
      debugPrint('$stackTrace');
      if (cached != null) {
        return cached.copyWith(source: 'cache');
      }
      throw BillingSyncException('Unable to refresh billing catalog.', cause: error);
    }
  }

  Future<List<PendingReceipt>> getPendingReceipts() {
    return _persistence.loadPendingReceipts();
  }

  Future<void> queueReceipt(PendingReceipt receipt) async {
    final receipts = await _persistence.loadPendingReceipts();
    final existingIndex = receipts.indexWhere((item) => item.id == receipt.id);
    if (existingIndex >= 0) {
      receipts[existingIndex] = receipt;
    } else {
      receipts.add(receipt);
    }
    await _persistence.savePendingReceipts(receipts);
  }

  Future<List<PendingReceipt>> flushPendingReceipts({bool force = false}) {
    if (_flushInFlight != null && !force) {
      return _flushInFlight!;
    }

    final completer = Completer<List<PendingReceipt>>();
    _flushInFlight = completer.future;

    () async {
      final receipts = await _persistence.loadPendingReceipts();
      if (receipts.isEmpty) {
        completer.complete(const <PendingReceipt>[]);
        _flushInFlight = null;
        return;
      }

      final successes = <PendingReceipt>[];
      final remaining = <PendingReceipt>[];
      for (final receipt in receipts) {
        final now = DateTime.now();
        final throttle = !force &&
            receipt.lastAttemptAt != null &&
            now.difference(receipt.lastAttemptAt!) < _receiptBackoff;
        if (throttle) {
          remaining.add(receipt);
          continue;
        }

        try {
          await _dio.post(
            '/billing/receipts/validate',
            data: receipt.toApiPayload(),
            options: _authOptions(),
          );
          successes.add(receipt);
        } on BillingSyncException {
          rethrow;
        } on DioException catch (error) {
          debugPrint('Receipt ${receipt.id} validation failed: ${error.message}');
          final metadata = Map<String, dynamic>.from(receipt.metadata);
          metadata['lastError'] = error.message ?? 'Unknown error';
          remaining.add(
            receipt.copyWith(
              retryCount: receipt.retryCount + 1,
              lastAttemptAt: now,
              metadata: metadata,
            ),
          );
        } catch (error) {
          debugPrint('Receipt ${receipt.id} validation threw: $error');
          final metadata = Map<String, dynamic>.from(receipt.metadata);
          metadata['lastError'] = error.toString();
          remaining.add(
            receipt.copyWith(
              retryCount: receipt.retryCount + 1,
              lastAttemptAt: now,
              metadata: metadata,
            ),
          );
        }
      }

      await _persistence.savePendingReceipts(remaining);
      completer.complete(successes);
      _flushInFlight = null;
    }().catchError((Object error, StackTrace stackTrace) async {
      completer.completeError(error, stackTrace);
      _flushInFlight = null;
    });

    return _flushInFlight!;
  }
}
