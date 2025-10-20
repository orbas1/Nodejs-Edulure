import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

class PrivacySettings {
  const PrivacySettings({
    this.analyticsOptIn = true,
    this.marketingOptIn = false,
    this.betaOptIn = false,
  });

  final bool analyticsOptIn;
  final bool marketingOptIn;
  final bool betaOptIn;

  PrivacySettings copyWith({
    bool? analyticsOptIn,
    bool? marketingOptIn,
    bool? betaOptIn,
  }) {
    return PrivacySettings(
      analyticsOptIn: analyticsOptIn ?? this.analyticsOptIn,
      marketingOptIn: marketingOptIn ?? this.marketingOptIn,
      betaOptIn: betaOptIn ?? this.betaOptIn,
    );
  }

  Map<String, dynamic> toJson() => {
        'analyticsOptIn': analyticsOptIn,
        'marketingOptIn': marketingOptIn,
        'betaOptIn': betaOptIn,
      };

  factory PrivacySettings.fromJson(Map<String, dynamic> json) {
    return PrivacySettings(
      analyticsOptIn: json['analyticsOptIn'] as bool? ?? true,
      marketingOptIn: json['marketingOptIn'] as bool? ?? false,
      betaOptIn: json['betaOptIn'] as bool? ?? false,
    );
  }
}

enum PrivacyRequestType {
  access('Data export (access)'),
  erasure('Right to be forgotten'),
  rectification('Rectify incorrect data'),
  consent('Withdraw consent'),
  portability('Data portability'),
  other('Other privacy inquiry');

  const PrivacyRequestType(this.label);
  final String label;
}

enum PrivacyRequestStatus {
  pending('Pending'),
  inProgress('In review'),
  completed('Completed');

  const PrivacyRequestStatus(this.label);
  final String label;
}

class PrivacyRequest {
  const PrivacyRequest({
    required this.id,
    required this.type,
    required this.details,
    required this.preferredContact,
    required this.submittedAt,
    this.status = PrivacyRequestStatus.pending,
    this.resolvedAt,
    this.attachments = const <String>[],
  });

  final String id;
  final PrivacyRequestType type;
  final String details;
  final String preferredContact;
  final DateTime submittedAt;
  final PrivacyRequestStatus status;
  final DateTime? resolvedAt;
  final List<String> attachments;

  PrivacyRequest copyWith({
    PrivacyRequestType? type,
    String? details,
    String? preferredContact,
    DateTime? submittedAt,
    PrivacyRequestStatus? status,
    DateTime? resolvedAt,
    List<String>? attachments,
  }) {
    return PrivacyRequest(
      id: id,
      type: type ?? this.type,
      details: details ?? this.details,
      preferredContact: preferredContact ?? this.preferredContact,
      submittedAt: submittedAt ?? this.submittedAt,
      status: status ?? this.status,
      resolvedAt: resolvedAt ?? this.resolvedAt,
      attachments: attachments ?? this.attachments,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'details': details,
        'preferredContact': preferredContact,
        'submittedAt': submittedAt.toIso8601String(),
        'status': status.name,
        'resolvedAt': resolvedAt?.toIso8601String(),
        'attachments': attachments,
      };

  factory PrivacyRequest.fromJson(Map<String, dynamic> json) {
    final typeName = json['type'] as String?;
    final statusName = json['status'] as String?;
    return PrivacyRequest(
      id: json['id'] as String,
      type: PrivacyRequestType.values.firstWhere(
        (value) => value.name == typeName,
        orElse: () => PrivacyRequestType.other,
      ),
      details: json['details'] as String? ?? '',
      preferredContact: json['preferredContact'] as String? ?? '',
      submittedAt: DateTime.tryParse(json['submittedAt'] as String? ?? '') ?? DateTime.now(),
      status: PrivacyRequestStatus.values.firstWhere(
        (value) => value.name == statusName,
        orElse: () => PrivacyRequestStatus.pending,
      ),
      resolvedAt: (json['resolvedAt'] as String?)?.let(DateTime.tryParse),
      attachments: (json['attachments'] as List?)
              ?.whereType<String>()
              .toList(growable: false) ??
          const <String>[],
    );
  }
}

extension NullableLet<T> on T? {
  R? let<R>(R? Function(T value) transform) {
    final self = this;
    if (self == null) {
      return null;
    }
    return transform(self);
  }
}

class PrivacyService {
  PrivacyService({String boxName = _defaultBox, Uuid? uuid})
      : _boxName = boxName,
        _uuid = uuid ?? const Uuid();

  static const _defaultBox = 'privacy.preferences';
  static const _settingsKey = 'settings';
  static const _requestsKey = 'requests';

  final String _boxName;
  final Uuid _uuid;
  Box<dynamic>? _box;

  Future<void> ensureReady() async {
    _box ??= await Hive.openBox<dynamic>(_boxName);
  }

  Future<PrivacySettings> loadSettings() async {
    await ensureReady();
    final raw = _box!.get(_settingsKey);
    if (raw is Map) {
      return PrivacySettings.fromJson(Map<String, dynamic>.from(raw));
    }
    return const PrivacySettings();
  }

  Future<void> saveSettings(PrivacySettings settings) async {
    await ensureReady();
    await _box!.put(_settingsKey, settings.toJson());
  }

  Future<List<PrivacyRequest>> loadRequests() async {
    await ensureReady();
    final raw = _box!.get(_requestsKey);
    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((item) => PrivacyRequest.fromJson(Map<String, dynamic>.from(item)))
          .toList(growable: false);
    }
    return const <PrivacyRequest>[];
  }

  Future<void> _persistRequests(List<PrivacyRequest> requests) async {
    await ensureReady();
    await _box!.put(_requestsKey, requests.map((request) => request.toJson()).toList(growable: false));
  }

  PrivacyRequest buildRequest({
    required PrivacyRequestType type,
    required String details,
    required String preferredContact,
    List<String> attachments = const <String>[],
  }) {
    return PrivacyRequest(
      id: _uuid.v4(),
      type: type,
      details: details,
      preferredContact: preferredContact,
      submittedAt: DateTime.now(),
      attachments: List<String>.from(attachments),
    );
  }

  Future<void> logRequest(PrivacyRequest request) async {
    final existing = await loadRequests();
    final filtered = existing.where((item) => item.id != request.id).toList();
    filtered.add(request);
    filtered.sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
    await _persistRequests(filtered);
  }

  Future<void> updateRequest(PrivacyRequest request) async {
    final existing = await loadRequests();
    final index = existing.indexWhere((item) => item.id == request.id);
    if (index == -1) {
      existing.add(request);
    } else {
      existing[index] = request;
    }
    existing.sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
    await _persistRequests(existing);
  }

  Future<void> updateRequestStatus(String id, PrivacyRequestStatus status) async {
    final existing = await loadRequests();
    final index = existing.indexWhere((item) => item.id == id);
    if (index == -1) {
      return;
    }
    final current = existing[index];
    existing[index] = current.copyWith(
      status: status,
      resolvedAt: status == PrivacyRequestStatus.completed ? DateTime.now() : current.resolvedAt,
    );
    await _persistRequests(existing);
  }
}
