class ProviderTransitionAnnouncement {
  ProviderTransitionAnnouncement({
    required this.id,
    required this.slug,
    required this.title,
    required this.summary,
    required this.bodyMarkdown,
    required this.status,
    required this.effectiveFrom,
    this.effectiveTo,
    required this.ackRequired,
    this.ackDeadline,
    this.ownerEmail,
    this.tenantScope,
    this.metadata = const <String, dynamic>{},
  });

  final int id;
  final String slug;
  final String title;
  final String summary;
  final String bodyMarkdown;
  final String status;
  final DateTime effectiveFrom;
  final DateTime? effectiveTo;
  final bool ackRequired;
  final DateTime? ackDeadline;
  final String? ownerEmail;
  final String? tenantScope;
  final Map<String, dynamic> metadata;

  ProviderTransitionAnnouncement copyWith({
    int? id,
    String? slug,
    String? title,
    String? summary,
    String? bodyMarkdown,
    String? status,
    DateTime? effectiveFrom,
    DateTime? effectiveTo,
    bool? ackRequired,
    DateTime? ackDeadline,
    String? ownerEmail,
    String? tenantScope,
    Map<String, dynamic>? metadata,
  }) {
    return ProviderTransitionAnnouncement(
      id: id ?? this.id,
      slug: slug ?? this.slug,
      title: title ?? this.title,
      summary: summary ?? this.summary,
      bodyMarkdown: bodyMarkdown ?? this.bodyMarkdown,
      status: status ?? this.status,
      effectiveFrom: effectiveFrom ?? this.effectiveFrom,
      effectiveTo: effectiveTo ?? this.effectiveTo,
      ackRequired: ackRequired ?? this.ackRequired,
      ackDeadline: ackDeadline ?? this.ackDeadline,
      ownerEmail: ownerEmail ?? this.ownerEmail,
      tenantScope: tenantScope ?? this.tenantScope,
      metadata: metadata ?? this.metadata,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'slug': slug,
      'title': title,
      'summary': summary,
      'bodyMarkdown': bodyMarkdown,
      'status': status,
      'effectiveFrom': effectiveFrom.toIso8601String(),
      if (effectiveTo != null) 'effectiveTo': effectiveTo!.toIso8601String(),
      'ackRequired': ackRequired,
      if (ackDeadline != null) 'ackDeadline': ackDeadline!.toIso8601String(),
      if (ownerEmail != null) 'ownerEmail': ownerEmail,
      if (tenantScope != null) 'tenantScope': tenantScope,
      'metadata': metadata,
    };
  }

  static ProviderTransitionAnnouncement fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic value) {
      if (value is DateTime) return value;
      if (value is String) {
        final parsed = DateTime.tryParse(value);
        return parsed;
      }
      return null;
    }

    return ProviderTransitionAnnouncement(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      slug: json['slug']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      summary: json['summary']?.toString() ?? '',
      bodyMarkdown: json['bodyMarkdown']?.toString() ?? '',
      status: json['status']?.toString() ?? 'draft',
      effectiveFrom: parseDate(json['effectiveFrom']) ?? DateTime.now(),
      effectiveTo: parseDate(json['effectiveTo']),
      ackRequired: json['ackRequired'] != false,
      ackDeadline: parseDate(json['ackDeadline']),
      ownerEmail: json['ownerEmail']?.toString(),
      tenantScope: json['tenantScope']?.toString(),
      metadata: json['metadata'] is Map
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : const <String, dynamic>{},
    );
  }
}

class ProviderTransitionTimelineEntry {
  ProviderTransitionTimelineEntry({
    required this.id,
    required this.occursOn,
    required this.headline,
    this.owner,
    this.ctaLabel,
    this.ctaUrl,
    required this.detailsMarkdown,
  });

  final int id;
  final DateTime occursOn;
  final String headline;
  final String? owner;
  final String? ctaLabel;
  final String? ctaUrl;
  final String detailsMarkdown;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'occursOn': occursOn.toIso8601String(),
      'headline': headline,
      if (owner != null) 'owner': owner,
      if (ctaLabel != null) 'ctaLabel': ctaLabel,
      if (ctaUrl != null) 'ctaUrl': ctaUrl,
      'detailsMarkdown': detailsMarkdown,
    };
  }

  static ProviderTransitionTimelineEntry fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic value) {
      if (value is DateTime) return value;
      if (value is String) {
        final parsed = DateTime.tryParse(value);
        if (parsed != null) return parsed;
      }
      return DateTime.now();
    }

    return ProviderTransitionTimelineEntry(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      occursOn: parseDate(json['occursOn']),
      headline: json['headline']?.toString() ?? '',
      owner: json['owner']?.toString(),
      ctaLabel: json['ctaLabel']?.toString(),
      ctaUrl: json['ctaUrl']?.toString(),
      detailsMarkdown: json['detailsMarkdown']?.toString() ?? '',
    );
  }
}

class ProviderTransitionResource {
  ProviderTransitionResource({
    required this.id,
    required this.label,
    required this.url,
    required this.type,
    required this.locale,
    this.description,
    required this.sortOrder,
  });

  final int id;
  final String label;
  final String url;
  final String type;
  final String locale;
  final String? description;
  final int sortOrder;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'url': url,
      'type': type,
      'locale': locale,
      'description': description,
      'sortOrder': sortOrder,
    };
  }

  static ProviderTransitionResource fromJson(Map<String, dynamic> json) {
    return ProviderTransitionResource(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      label: json['label']?.toString() ?? '',
      url: json['url']?.toString() ?? '',
      type: json['type']?.toString() ?? 'guide',
      locale: json['locale']?.toString() ?? 'en',
      description: json['description']?.toString(),
      sortOrder: json['sortOrder'] is int ? json['sortOrder'] as int : int.tryParse('${json['sortOrder']}') ?? 0,
    );
  }
}

class ProviderTransitionStatus {
  ProviderTransitionStatus({
    required this.id,
    required this.statusCode,
    this.providerReference,
    this.notes,
    required this.recordedAt,
  });

  final int id;
  final String statusCode;
  final String? providerReference;
  final String? notes;
  final DateTime recordedAt;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'statusCode': statusCode,
      if (providerReference != null) 'providerReference': providerReference,
      if (notes != null) 'notes': notes,
      'recordedAt': recordedAt.toIso8601String(),
    };
  }

  static ProviderTransitionStatus fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic value) {
      if (value is DateTime) return value;
      if (value is String) {
        final parsed = DateTime.tryParse(value);
        if (parsed != null) return parsed;
      }
      return DateTime.now();
    }

    return ProviderTransitionStatus(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      statusCode: json['statusCode']?.toString() ?? 'not-started',
      providerReference: json['providerReference']?.toString(),
      notes: json['notes']?.toString(),
      recordedAt: parseDate(json['recordedAt']),
    );
  }
}

class ProviderTransitionAnnouncementBundle {
  ProviderTransitionAnnouncementBundle({
    required this.announcement,
    required this.timeline,
    required this.resources,
    required this.acknowledgementTotal,
    this.latestStatus,
    this.recentStatusUpdates = const <ProviderTransitionStatus>[],
    required this.fetchedAt,
    this.offlineSource = false,
  });

  final ProviderTransitionAnnouncement announcement;
  final List<ProviderTransitionTimelineEntry> timeline;
  final List<ProviderTransitionResource> resources;
  final int acknowledgementTotal;
  final ProviderTransitionStatus? latestStatus;
  final List<ProviderTransitionStatus> recentStatusUpdates;
  final DateTime fetchedAt;
  final bool offlineSource;

  ProviderTransitionAnnouncementBundle copyWith({
    ProviderTransitionAnnouncement? announcement,
    List<ProviderTransitionTimelineEntry>? timeline,
    List<ProviderTransitionResource>? resources,
    int? acknowledgementTotal,
    ProviderTransitionStatus? latestStatus,
    List<ProviderTransitionStatus>? recentStatusUpdates,
    DateTime? fetchedAt,
    bool? offlineSource,
  }) {
    return ProviderTransitionAnnouncementBundle(
      announcement: announcement ?? this.announcement,
      timeline: timeline ?? this.timeline,
      resources: resources ?? this.resources,
      acknowledgementTotal: acknowledgementTotal ?? this.acknowledgementTotal,
      latestStatus: latestStatus ?? this.latestStatus,
      recentStatusUpdates: recentStatusUpdates ?? this.recentStatusUpdates,
      fetchedAt: fetchedAt ?? this.fetchedAt,
      offlineSource: offlineSource ?? this.offlineSource,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'announcement': announcement.toJson(),
      'timeline': timeline.map((e) => e.toJson()).toList(),
      'resources': resources.map((e) => e.toJson()).toList(),
      'acknowledgementTotal': acknowledgementTotal,
      if (latestStatus != null) 'latestStatus': latestStatus!.toJson(),
      'recentStatusUpdates': recentStatusUpdates.map((e) => e.toJson()).toList(),
      'fetchedAt': fetchedAt.toIso8601String(),
      'offlineSource': offlineSource,
    };
  }

  static ProviderTransitionAnnouncementBundle fromJson(Map<String, dynamic> json) {
    final announcement = ProviderTransitionAnnouncement.fromJson(
      Map<String, dynamic>.from(json['announcement'] as Map),
    );
    final timeline = (json['timeline'] as List? ?? const [])
        .map((entry) => ProviderTransitionTimelineEntry.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();
    final resources = (json['resources'] as List? ?? const [])
        .map((entry) => ProviderTransitionResource.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();
    final recentStatusUpdates = (json['recentStatusUpdates'] as List? ?? const [])
        .map((entry) => ProviderTransitionStatus.fromJson(Map<String, dynamic>.from(entry as Map)))
        .toList();
    final latestStatus = json['latestStatus'] is Map
        ? ProviderTransitionStatus.fromJson(Map<String, dynamic>.from(json['latestStatus'] as Map))
        : null;

    final fetchedAtRaw = json['fetchedAt'];
    final fetchedAt = fetchedAtRaw is String ? DateTime.tryParse(fetchedAtRaw) : null;

    return ProviderTransitionAnnouncementBundle(
      announcement: announcement,
      timeline: timeline,
      resources: resources,
      acknowledgementTotal: json['acknowledgementTotal'] is int
          ? json['acknowledgementTotal'] as int
          : int.tryParse('${json['acknowledgementTotal']}') ?? 0,
      latestStatus: latestStatus,
      recentStatusUpdates: recentStatusUpdates,
      fetchedAt: fetchedAt ?? DateTime.now(),
      offlineSource: json['offlineSource'] == true,
    );
  }
}

class ProviderTransitionAnnouncementsState {
  ProviderTransitionAnnouncementsState({
    required this.announcements,
    required this.fetchedAt,
    this.offlineFallback = false,
    this.permissions = const ProviderTransitionPermissions.restricted(),
  });

  final List<ProviderTransitionAnnouncementBundle> announcements;
  final DateTime fetchedAt;
  final bool offlineFallback;
  final ProviderTransitionPermissions permissions;

  ProviderTransitionAnnouncementsState copyWith({
    List<ProviderTransitionAnnouncementBundle>? announcements,
    DateTime? fetchedAt,
    bool? offlineFallback,
    ProviderTransitionPermissions? permissions,
  }) {
    return ProviderTransitionAnnouncementsState(
      announcements: announcements ?? this.announcements,
      fetchedAt: fetchedAt ?? this.fetchedAt,
      offlineFallback: offlineFallback ?? this.offlineFallback,
      permissions: permissions ?? this.permissions,
    );
  }
}

enum ProviderTransitionAction { acknowledge, recordStatus }

class ProviderTransitionPermissions {
  const ProviderTransitionPermissions({
    required this.canAcknowledge,
    required this.canRecordStatus,
    this.acknowledgeDeniedReason,
    this.recordStatusDeniedReason,
  });

  const ProviderTransitionPermissions.fullAccess()
      : canAcknowledge = true,
        canRecordStatus = true,
        acknowledgeDeniedReason = null,
        recordStatusDeniedReason = null;

  const ProviderTransitionPermissions.restricted({
    String? acknowledgeReason,
    String? recordStatusReason,
  })  : canAcknowledge = false,
        canRecordStatus = false,
        acknowledgeDeniedReason = acknowledgeReason,
        recordStatusDeniedReason = recordStatusReason;

  final bool canAcknowledge;
  final bool canRecordStatus;
  final String? acknowledgeDeniedReason;
  final String? recordStatusDeniedReason;

  bool allows(ProviderTransitionAction action) {
    switch (action) {
      case ProviderTransitionAction.acknowledge:
        return canAcknowledge;
      case ProviderTransitionAction.recordStatus:
        return canRecordStatus;
    }
  }

  String? denialReasonFor(ProviderTransitionAction action) {
    switch (action) {
      case ProviderTransitionAction.acknowledge:
        return acknowledgeDeniedReason;
      case ProviderTransitionAction.recordStatus:
        return recordStatusDeniedReason;
    }
  }

  ProviderTransitionPermissions restrictForOffline() {
    if (!canAcknowledge && !canRecordStatus) {
      return this;
    }
    const message = 'Offline snapshot – actions temporarily unavailable';
    return ProviderTransitionPermissions(
      canAcknowledge: false,
      canRecordStatus: false,
      acknowledgeDeniedReason: message,
      recordStatusDeniedReason: message,
    );
  }

  ProviderTransitionPermissions copyWith({
    bool? canAcknowledge,
    bool? canRecordStatus,
    String? acknowledgeDeniedReason,
    String? recordStatusDeniedReason,
  }) {
    return ProviderTransitionPermissions(
      canAcknowledge: canAcknowledge ?? this.canAcknowledge,
      canRecordStatus: canRecordStatus ?? this.canRecordStatus,
      acknowledgeDeniedReason: acknowledgeDeniedReason ?? this.acknowledgeDeniedReason,
      recordStatusDeniedReason: recordStatusDeniedReason ?? this.recordStatusDeniedReason,
    );
  }

  factory ProviderTransitionPermissions.fromSession({
    Map<String, dynamic>? session,
    String? activeRole,
  }) {
    final roles = <String>{};
    if (activeRole != null && activeRole.isNotEmpty) {
      roles.add(activeRole.toLowerCase());
    }
    final user = session?['user'];
    if (user is Map) {
      final primaryRole = user['role'];
      if (primaryRole is String && primaryRole.isNotEmpty) {
        roles.add(primaryRole.toLowerCase());
      }
      final declaredRoles = user['roles'];
      if (declaredRoles is Iterable) {
        for (final role in declaredRoles) {
          if (role is String && role.isNotEmpty) {
            roles.add(role.toLowerCase());
          }
        }
      }
    }

    if (roles.isEmpty) {
      return const ProviderTransitionPermissions.restricted(
        acknowledgeReason: 'Provider role required',
        recordStatusReason: 'Provider role required',
      );
    }

    const acknowledgeRoles = {'admin', 'provider', 'operations', 'community'};
    const statusRoles = {'admin', 'provider'};

    final canAck = roles.any(acknowledgeRoles.contains);
    final canStatus = roles.any(statusRoles.contains);

    return ProviderTransitionPermissions(
      canAcknowledge: canAck,
      canRecordStatus: canStatus,
      acknowledgeDeniedReason:
          canAck ? null : 'Only administrator or provider operators may acknowledge transitions.',
      recordStatusDeniedReason:
          canStatus ? null : 'Status updates require administrator or provider operator access.',
    );
  }
}

class ProviderTransitionAccessDeniedException implements Exception {
  ProviderTransitionAccessDeniedException(this.action, {this.reason});

  final ProviderTransitionAction action;
  final String? reason;

  @override
  String toString() {
    final base = 'Access denied for provider transition ${action.name}';
    if (reason == null) {
      return base;
    }
    return '$base: $reason';
  }
}

class ProviderTransitionAcknowledgementRequest {
  ProviderTransitionAcknowledgementRequest({
    required this.organisationName,
    required this.contactName,
    required this.contactEmail,
    this.ackMethod = 'portal',
    this.providerReference,
    this.followUpRequired = false,
    this.followUpNotes,
    this.metadata = const <String, dynamic>{},
  });

  final String organisationName;
  final String contactName;
  final String contactEmail;
  final String ackMethod;
  final String? providerReference;
  final bool followUpRequired;
  final String? followUpNotes;
  final Map<String, dynamic> metadata;

  Map<String, dynamic> toJson() {
    return {
      'organisationName': organisationName,
      'contactName': contactName,
      'contactEmail': contactEmail,
      'ackMethod': ackMethod,
      if (providerReference != null) 'providerReference': providerReference,
      'followUpRequired': followUpRequired,
      if (followUpNotes != null) 'followUpNotes': followUpNotes,
      'metadata': metadata,
    };
  }
}
