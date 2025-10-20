import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../runtime/capability_manifest_models.dart';
import 'rbac_matrix_models.dart';

class RbacMatrixLoadResult {
  RbacMatrixLoadResult({
    required this.matrix,
    required this.fetchedAt,
    required this.fromCache,
    this.isStale = false,
  });

  final RbacMatrix matrix;
  final DateTime fetchedAt;
  final bool fromCache;
  final bool isStale;

  RbacMatrixLoadResult copyWith({
    RbacMatrix? matrix,
    DateTime? fetchedAt,
    bool? fromCache,
    bool? isStale,
  }) {
    return RbacMatrixLoadResult(
      matrix: matrix ?? this.matrix,
      fetchedAt: fetchedAt ?? this.fetchedAt,
      fromCache: fromCache ?? this.fromCache,
      isStale: isStale ?? this.isStale,
    );
  }
}

class RbacMatrixRepositoryException implements Exception {
  RbacMatrixRepositoryException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() {
    if (cause == null) {
      return 'RbacMatrixRepositoryException: $message';
    }
    return 'RbacMatrixRepositoryException: $message (cause: $cause)';
  }
}

class RbacMatrixRepository {
  RbacMatrixRepository(this._dio, {this.audience});

  final Dio _dio;
  final String? audience;

  static const _matrixKey = 'matrix';
  static const _timestampKey = 'timestamp';
  static const Duration _cacheTtl = Duration(minutes: 10);

  String get _boxName {
    if (audience == null || audience!.isEmpty) {
      return 'rbac_matrix';
    }
    final normalised = audience!
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'_+$'), '')
        .replaceAll(RegExp(r'^_+'), '');
    if (normalised.isEmpty) {
      return 'rbac_matrix';
    }
    return 'rbac_matrix_$normalised';
  }

  Future<Box> _ensureBox() async {
    if (!Hive.isBoxOpen(_boxName)) {
      await Hive.openBox(_boxName);
    }
    return Hive.box(_boxName);
  }

  Future<RbacMatrixLoadResult?> loadCachedMatrix() async {
    final box = await _ensureBox();
    final rawMatrix = box.get(_matrixKey);
    final timestamp = box.get(_timestampKey);

    if (rawMatrix is Map && timestamp is String) {
      final parsedMatrix = RbacMatrix.fromJson(Map<String, dynamic>.from(rawMatrix));
      final fetchedAt = DateTime.tryParse(timestamp) ?? DateTime.now().toUtc();
      return RbacMatrixLoadResult(matrix: parsedMatrix, fetchedAt: fetchedAt, fromCache: true);
    }

    return null;
  }

  Future<RbacMatrixLoadResult> getMatrix({bool force = false}) async {
    final cached = await loadCachedMatrix();

    if (!force && cached != null) {
      final age = DateTime.now().toUtc().difference(cached.fetchedAt);
      if (age <= _cacheTtl) {
        cacheResult(cached);
        return cached.copyWith(isStale: false);
      }
    }

    try {
      final fresh = await _fetchMatrix();
      await _cacheMatrix(fresh);
      cacheResult(fresh);
      return fresh;
    } catch (error) {
      if (cached != null) {
        cacheResult(cached);
        return cached.copyWith(isStale: true);
      }
      throw RbacMatrixRepositoryException('Unable to fetch RBAC matrix', cause: error);
    }
  }

  Future<RbacMatrixLoadResult> refresh() async {
    return getMatrix(force: true);
  }

  Future<RbacMatrixLoadResult> _fetchMatrix() async {
    final response = await _dio.get(
      '/runtime/rbac-matrix',
      queryParameters: audience == null ? null : {'audience': audience},
      options: Options(
        extra: const {'requiresAuth': true},
      ),
    );

    final payload = response.data;
    final data = payload is Map<String, dynamic> ? payload['data'] : payload;

    if (data is! Map) {
      throw StateError('RBAC matrix response missing data payload');
    }

    final matrix = RbacMatrix.fromJson(Map<String, dynamic>.from(data as Map));
    return RbacMatrixLoadResult(matrix: matrix, fetchedAt: DateTime.now().toUtc(), fromCache: false);
  }

  Future<void> _cacheMatrix(RbacMatrixLoadResult result) async {
    final box = await _ensureBox();
    await box.put(_matrixKey, result.matrix.toJson());
    await box.put(_timestampKey, result.fetchedAt.toIso8601String());
  }

  CapabilityAccessEnvelope evaluateAccess({
    required ProviderRoleContext context,
    required String capability,
    String? action,
    CapabilityManifest? manifest,
  }) {
    final allowed = resultForContext(context, capability: capability, action: action);
    final policy = allowed.matrix.policyByCapability(capability);
    final guardrail = allowed.matrix.guardrailByCapability(capability);

    final requiresConsent = policy?.requiresConsent ?? false;
    final auditContext = policy == null
        ? null
        : policy.auditLogTemplate.replaceAll('{providerId}', context.providerId).replaceAll(
              '{capability}',
              capability,
            );

    final manifestCapability = manifest?.capabilityByKey(capability);
    final manifestAllows = manifestCapability == null
        ? true
        : manifestCapability.enabled && (manifestCapability.accessible || manifestCapability.isOperational);

    return CapabilityAccessEnvelope(
      capability: capability,
      allowed: allowed.allowed && manifestAllows,
      requiresConsent: requiresConsent,
      guardrail: guardrail,
      auditContext: auditContext,
    );
  }

  _AccessComputation resultForContext(ProviderRoleContext context, {required String capability, String? action}) {
    final matrix = _lastMatrix;
    if (matrix == null) {
      throw StateError('RBAC matrix has not been loaded');
    }

    final allowed = matrix.hasPermission(roleKeys: context.roles, capability: capability, action: action);
    return _AccessComputation(matrix: matrix, allowed: allowed);
  }

  RbacMatrix? _lastMatrix;

  void primeMatrix(RbacMatrix matrix) {
    _lastMatrix = matrix;
  }

  void cacheResult(RbacMatrixLoadResult result) {
    _lastMatrix = result.matrix;
  }
}

class _AccessComputation {
  _AccessComputation({required this.matrix, required this.allowed});

  final RbacMatrix matrix;
  final bool allowed;
}
