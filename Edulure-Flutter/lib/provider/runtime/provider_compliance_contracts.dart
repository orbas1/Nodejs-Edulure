import 'dart:convert';

/// API endpoints exposed by the compliance service for provider operators.
class ProviderComplianceEndpoints {
  const ProviderComplianceEndpoints._();

  static const listDsrRequests = '/api/v1/provider/compliance/dsr/requests';
  static String acknowledge(String requestUuid) =>
      '/api/v1/provider/compliance/dsr/requests/$requestUuid/acknowledge';
  static String escalate(String requestUuid) =>
      '/api/v1/provider/compliance/dsr/requests/$requestUuid/escalate';
  static String fulfil(String requestUuid) =>
      '/api/v1/provider/compliance/dsr/requests/$requestUuid/fulfil';
  static String evidence(String requestUuid) =>
      '/api/v1/provider/compliance/dsr/requests/$requestUuid/evidence';
  static String complete(String requestUuid) =>
      '/api/v1/provider/compliance/dsr/requests/$requestUuid/complete';
  static String consents(String userId) =>
      '/api/v1/provider/compliance/consents/$userId';
  static String revokeConsent(String consentUuid) =>
      '/api/v1/provider/compliance/consents/$consentUuid/revoke';
  static const policies = '/api/v1/provider/compliance/policies';
}

enum ProviderDsrStatus {
  pending,
  inProgress,
  escalated,
  completed,
  overdue;

  static ProviderDsrStatus parse(String? value) {
    switch ((value ?? '').toLowerCase()) {
      case 'pending':
        return ProviderDsrStatus.pending;
      case 'in_progress':
        return ProviderDsrStatus.inProgress;
      case 'escalated':
        return ProviderDsrStatus.escalated;
      case 'completed':
        return ProviderDsrStatus.completed;
      case 'overdue':
        return ProviderDsrStatus.overdue;
      default:
        return ProviderDsrStatus.pending;
    }
  }
}

enum ProviderDsrSlaSeverity { healthy, approaching, critical, overdue }

enum ProviderConsentStatus { granted, revoked, expired }

DateTime? dateTimeFromString(String? value) {
  if (value == null) return null;
  try {
    return DateTime.parse(value).toUtc();
  } catch (_) {
    return null;
  }
}

class ProviderDsrEvidence {
  const ProviderDsrEvidence({
    required this.type,
    required this.hash,
    required this.signedUrl,
    required this.expiresAt,
  });

  final String type;
  final String hash;
  final Uri signedUrl;
  final DateTime? expiresAt;

  factory ProviderDsrEvidence.fromJson(Map<String, dynamic> json) {
    return ProviderDsrEvidence(
      type: json['type'] as String? ?? 'unknown',
      hash: json['hash'] as String? ?? '',
      signedUrl: Uri.parse(json['signedUrl'] as String? ?? ''),
      expiresAt: dateTimeFromString(json['expiresAt'] as String?),
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'hash': hash,
        'signedUrl': signedUrl.toString(),
        'expiresAt': expiresAt?.toIso8601String(),
      };

  bool get isValid => hash.isNotEmpty && signedUrl.scheme.isNotEmpty;
}

class ProviderDsrChannelAction {
  const ProviderDsrChannelAction({
    required this.system,
    required this.completedAt,
    required this.operatorId,
    this.notes,
  });

  final String system;
  final DateTime? completedAt;
  final String? operatorId;
  final String? notes;

  factory ProviderDsrChannelAction.fromJson(Map<String, dynamic> json) {
    return ProviderDsrChannelAction(
      system: json['system'] as String? ?? 'unknown',
      completedAt: dateTimeFromString(json['completedAt'] as String?),
      operatorId: json['operatorId'] as String?,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'system': system,
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
        if (operatorId != null) 'operatorId': operatorId,
        if (notes != null && notes!.isNotEmpty) 'notes': notes,
      };

  bool get isComplete => completedAt != null && operatorId != null;
}

class ProviderDsrRequest {
  ProviderDsrRequest({
    required this.requestUuid,
    required this.tenantId,
    required this.userId,
    required this.requestType,
    required this.status,
    required this.submittedAt,
    required this.dueAt,
    this.handledBy,
    required this.escalated,
    required this.slaDays,
    required this.requiresDualSignoff,
    required this.metadata,
    required this.channels,
    required this.evidence,
  });

  final String requestUuid;
  final String tenantId;
  final String userId;
  final String requestType;
  final ProviderDsrStatus status;
  final DateTime? submittedAt;
  final DateTime? dueAt;
  final String? handledBy;
  final bool escalated;
  final int slaDays;
  final bool requiresDualSignoff;
  final Map<String, dynamic> metadata;
  final List<ProviderDsrChannelAction> channels;
  final List<ProviderDsrEvidence> evidence;

  factory ProviderDsrRequest.fromJson(Map<String, dynamic> json) {
    final metadataRaw = json['metadata'];
    Map<String, dynamic> resolvedMetadata;
    if (metadataRaw is Map<String, dynamic>) {
      resolvedMetadata = metadataRaw;
    } else if (metadataRaw is String) {
      try {
        resolvedMetadata = jsonDecode(metadataRaw) as Map<String, dynamic>;
      } catch (_) {
        resolvedMetadata = <String, dynamic>{};
      }
    } else {
      resolvedMetadata = <String, dynamic>{};
    }

    return ProviderDsrRequest(
      requestUuid: json['requestUuid'] as String? ?? '',
      tenantId: json['tenantId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      requestType: json['requestType'] as String? ?? 'deletion',
      status: ProviderDsrStatus.parse(json['status'] as String?),
      submittedAt: dateTimeFromString(json['submittedAt'] as String?),
      dueAt: dateTimeFromString(json['dueAt'] as String?),
      handledBy: json['handledBy'] as String?,
      escalated: json['escalated'] == true,
      slaDays: (json['slaDays'] as num?)?.toInt() ?? 0,
      requiresDualSignoff: json['requiresDualSignoff'] == true,
      metadata: resolvedMetadata,
      channels: (json['channels'] as List<dynamic>? ?? [])
          .map((item) => ProviderDsrChannelAction.fromJson(
              item as Map<String, dynamic>))
          .toList(),
      evidence: (json['evidence'] as List<dynamic>? ?? [])
          .map((item) =>
              ProviderDsrEvidence.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'requestUuid': requestUuid,
        'tenantId': tenantId,
        'userId': userId,
        'requestType': requestType,
        'status': status.name,
        'submittedAt': submittedAt?.toIso8601String(),
        'dueAt': dueAt?.toIso8601String(),
        'handledBy': handledBy,
        'escalated': escalated,
        'slaDays': slaDays,
        'requiresDualSignoff': requiresDualSignoff,
        'metadata': metadata,
        'channels': channels.map((channel) => channel.toJson()).toList(),
        'evidence': evidence.map((item) => item.toJson()).toList(),
      };

  Duration? get timeRemaining {
    if (dueAt == null) return null;
    return dueAt!.difference(DateTime.now().toUtc());
  }

  bool get isOverdue {
    if (status == ProviderDsrStatus.overdue || status == ProviderDsrStatus.completed) {
      return status == ProviderDsrStatus.overdue;
    }
    final remaining = timeRemaining;
    return remaining != null && remaining.isNegative;
  }

  ProviderDsrSlaSeverity get slaStatus {
    if (status == ProviderDsrStatus.completed) {
      return ProviderDsrSlaSeverity.healthy;
    }
    if (isOverdue) {
      return ProviderDsrSlaSeverity.overdue;
    }
    final remaining = timeRemaining;
    if (remaining == null) {
      return ProviderDsrSlaSeverity.healthy;
    }
    if (remaining.inHours <= 4) {
      return ProviderDsrSlaSeverity.critical;
    }
    if (remaining.inHours <= 24) {
      return ProviderDsrSlaSeverity.approaching;
    }
    return ProviderDsrSlaSeverity.healthy;
  }

  bool get isClaimed => handledBy != null && handledBy!.isNotEmpty;

  bool get hasRetentionHold =>
      (metadata['retentionHolds'] as List<dynamic>? ?? []).isNotEmpty;

  bool get requiresDualSignOff => requiresDualSignoff;
}

class ProviderConsentRecord {
  const ProviderConsentRecord({
    required this.consentUuid,
    required this.policyVersion,
    required this.status,
    required this.channel,
    required this.grantedAt,
    required this.revokedAt,
    required this.metadata,
  });

  final String consentUuid;
  final String policyVersion;
  final ProviderConsentStatus status;
  final String channel;
  final DateTime? grantedAt;
  final DateTime? revokedAt;
  final Map<String, dynamic> metadata;

  factory ProviderConsentRecord.fromJson(Map<String, dynamic> json) {
    final metadataRaw = json['metadata'];
    Map<String, dynamic> resolvedMetadata;
    if (metadataRaw is Map<String, dynamic>) {
      resolvedMetadata = metadataRaw;
    } else if (metadataRaw is String) {
      try {
        resolvedMetadata = jsonDecode(metadataRaw) as Map<String, dynamic>;
      } catch (_) {
        resolvedMetadata = <String, dynamic>{};
      }
    } else {
      resolvedMetadata = <String, dynamic>{};
    }

    return ProviderConsentRecord(
      consentUuid: json['consentUuid'] as String? ?? '',
      policyVersion: json['policyVersion'] as String? ?? 'v1',
      status: _parseConsentStatus(json['status'] as String?),
      channel: json['channel'] as String? ?? 'unknown',
      grantedAt: dateTimeFromString(json['grantedAt'] as String?),
      revokedAt: dateTimeFromString(json['revokedAt'] as String?),
      metadata: resolvedMetadata,
    );
  }

  static ProviderConsentStatus _parseConsentStatus(String? value) {
    switch ((value ?? '').toLowerCase()) {
      case 'revoked':
        return ProviderConsentStatus.revoked;
      case 'expired':
        return ProviderConsentStatus.expired;
      case 'granted':
      default:
        return ProviderConsentStatus.granted;
    }
  }

  bool get isActive => status == ProviderConsentStatus.granted;

  bool get hasRedactionScope =>
      (metadata['redactionScope'] as List<dynamic>? ?? []).isNotEmpty;
}

class ProviderRetentionChecklist {
  const ProviderRetentionChecklist({
    required this.requireEvidenceHash,
    required this.requireDualSignoff,
  });

  final bool requireEvidenceHash;
  final bool requireDualSignoff;

  List<String> missingCompletionRequirements(ProviderDsrRequest request) {
    final issues = <String>[];
    if (requireDualSignoff && request.requiresDualSignOff &&
        !_hasDualSignoffProof(request)) {
      issues.add('Dual sign-off confirmation is missing.');
    }
    if (requireEvidenceHash &&
        request.evidence.every((item) => !item.isValid)) {
      issues.add('At least one signed evidence artefact with a hash must be uploaded.');
    }
    if (request.channels.every((action) => !action.isComplete)) {
      issues.add('No subsystem purge has been recorded. Complete at least one channel action.');
    }
    return issues;
  }

  bool canComplete(ProviderDsrRequest request) =>
      missingCompletionRequirements(request).isEmpty;

  bool _hasDualSignoffProof(ProviderDsrRequest request) {
    final approvals = request.metadata['approvals'];
    if (approvals is List) {
      final uniqueApprovers = approvals
          .map((entry) => (entry as Map<String, dynamic>)['approverId'])
          .whereType<String>()
          .toSet();
      return uniqueApprovers.length >= 2;
    }
    return false;
  }
}
