enum CapabilityImpactSeverity { outage, degraded }

class CapabilityManifest {
  CapabilityManifest({
    required this.environment,
    required this.generatedAt,
    required this.audience,
    required this.services,
    required this.capabilities,
    required this.summary,
  });

  factory CapabilityManifest.fromJson(Map<String, dynamic> json) {
    final servicesJson = json['services'];
    final capabilitiesJson = json['capabilities'];
    final summaryJson = json['summary'];

    return CapabilityManifest(
      environment: json['environment']?.toString() ?? 'unknown',
      generatedAt: DateTime.tryParse(json['generatedAt']?.toString() ?? '') ?? DateTime.now().toUtc(),
      audience: json['audience']?.toString() ?? 'public',
      services: servicesJson is List
          ? servicesJson
              .whereType<Map>()
              .map((service) => CapabilityServiceStatus.fromJson(Map<String, dynamic>.from(service)))
              .toList()
          : const <CapabilityServiceStatus>[],
      capabilities: capabilitiesJson is List
          ? capabilitiesJson
              .whereType<Map>()
              .map((capability) => ManifestCapability.fromJson(Map<String, dynamic>.from(capability)))
              .toList()
          : const <ManifestCapability>[],
      summary: summaryJson is Map<String, dynamic>
          ? ManifestSummary.fromJson(Map<String, dynamic>.from(summaryJson))
          : ManifestSummary.empty(),
    );
  }

  final String environment;
  final DateTime generatedAt;
  final String audience;
  final List<CapabilityServiceStatus> services;
  final List<ManifestCapability> capabilities;
  final ManifestSummary summary;

  bool get hasOutages =>
      services.any((service) => service.isOutage) || capabilities.any((capability) => capability.isOutage);

  bool get hasDegradation =>
      services.any((service) => service.isDegraded) || capabilities.any((capability) => capability.isDegraded);

  ManifestCapability? capabilityByKey(String capability) {
    for (final item in capabilities) {
      if (item.capability == capability) {
        return item;
      }
    }
    return null;
  }

  bool isCapabilityAccessible(String capability) {
    final entry = capabilityByKey(capability);
    if (entry == null) {
      return false;
    }
    if (!entry.enabled) {
      return false;
    }
    return entry.status == 'operational' || entry.status == 'degraded';
  }

  CapabilityImpactNotice? buildImpactNotice() {
    final impactedServices = services.where((service) => !service.isOperational).toList();
    final impactedCapabilities = capabilities
        .where((capability) => capability.isOutage || capability.isDegraded)
        .toList()
      ..sort((a, b) => a.severityRank.compareTo(b.severityRank));

    if (impactedServices.isEmpty && impactedCapabilities.isEmpty) {
      return null;
    }

    final hasOutage = impactedServices.any((service) => service.isOutage) ||
        impactedCapabilities.any((capability) => capability.isOutage);

    final severity = hasOutage ? CapabilityImpactSeverity.outage : CapabilityImpactSeverity.degraded;

    final serviceLabel = impactedServices.isEmpty
        ? null
        : 'Services: ${impactedServices.map((service) => service.nameWithStatus).join(', ')}';
    final capabilityLabel = impactedCapabilities.isEmpty
        ? null
        : _summariseCapabilities(impactedCapabilities.map((capability) => capability.name).toList());

    final details = [serviceLabel, capabilityLabel].whereType<String>().join(' · ');

    final headline = hasOutage
        ? 'Some services are temporarily unavailable'
        : 'Services are currently experiencing degraded performance';

    return CapabilityImpactNotice(
      severity: severity,
      headline: headline,
      detail: details.isEmpty ? null : details,
      services: impactedServices,
      capabilities: impactedCapabilities,
      generatedAt: generatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'environment': environment,
      'generatedAt': generatedAt.toIso8601String(),
      'audience': audience,
      'services': services.map((service) => service.toJson()).toList(),
      'capabilities': capabilities.map((capability) => capability.toJson()).toList(),
      'summary': summary.toJson(),
    };
  }

  static String _summariseCapabilities(List<String> names) {
    if (names.isEmpty) {
      return '';
    }
    const maxVisible = 3;
    if (names.length <= maxVisible) {
      return 'Capabilities: ${names.join(', ')}';
    }
    final visible = names.take(maxVisible).join(', ');
    final remaining = names.length - maxVisible;
    return 'Capabilities: $visible +$remaining more';
  }

  String get statusSummary {
    final servicesOut = services.where((service) => service.isOutage).length;
    final servicesDegraded = services.where((service) => service.isDegraded).length;
    final capabilitiesOut = capabilities.where((capability) => capability.isOutage).length;
    final capabilitiesDegraded = capabilities.where((capability) => capability.isDegraded).length;

    return 'services(out:$servicesOut, degraded:$servicesDegraded) · capabilities(out:$capabilitiesOut, degraded:$capabilitiesDegraded)';
  }
}

class CapabilityServiceStatus {
  CapabilityServiceStatus({
    required this.key,
    required this.name,
    required this.category,
    required this.type,
    required this.ready,
    required this.status,
    required this.summary,
    required this.checkedAt,
    required this.components,
  });

  factory CapabilityServiceStatus.fromJson(Map<String, dynamic> json) {
    final componentsJson = json['components'];
    return CapabilityServiceStatus(
      key: json['key']?.toString() ?? 'service',
      name: json['name']?.toString() ?? 'Service',
      category: json['category']?.toString() ?? 'core',
      type: json['type']?.toString() ?? 'http',
      ready: json['ready'] == true,
      status: json['status']?.toString() ?? 'unknown',
      summary: json['summary']?.toString() ?? 'Status unknown',
      checkedAt: DateTime.tryParse(json['checkedAt']?.toString() ?? '') ?? DateTime.now().toUtc(),
      components: componentsJson is List
          ? componentsJson
              .whereType<Map>()
              .map((component) => CapabilityComponentStatus.fromJson(Map<String, dynamic>.from(component)))
              .toList()
          : const <CapabilityComponentStatus>[],
    );
  }

  final String key;
  final String name;
  final String category;
  final String type;
  final bool ready;
  final String status;
  final String summary;
  final DateTime checkedAt;
  final List<CapabilityComponentStatus> components;

  bool get isOperational => status == 'operational' && ready;
  bool get isOutage => status == 'outage' || !ready;
  bool get isDegraded => status == 'degraded' || status == 'unknown';

  String get nameWithStatus => '$name (${statusLabel.toLowerCase()})';

  String get statusLabel {
    if (status.isEmpty) {
      return ready ? 'Operational' : 'Outage';
    }
    return '${status[0].toUpperCase()}${status.substring(1)}';
  }

  Map<String, dynamic> toJson() {
    return {
      'key': key,
      'name': name,
      'category': category,
      'type': type,
      'ready': ready,
      'status': status,
      'summary': summary,
      'checkedAt': checkedAt.toIso8601String(),
      'components': components.map((component) => component.toJson()).toList(),
    };
  }
}

class CapabilityComponentStatus {
  CapabilityComponentStatus({
    required this.name,
    required this.status,
    required this.ready,
    required this.message,
    required this.updatedAt,
  });

  factory CapabilityComponentStatus.fromJson(Map<String, dynamic> json) {
    return CapabilityComponentStatus(
      name: json['name']?.toString() ?? 'Component',
      status: json['status']?.toString() ?? 'unknown',
      ready: json['ready'] == true,
      message: json['message']?.toString(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now().toUtc(),
    );
  }

  final String name;
  final String status;
  final bool ready;
  final String? message;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'status': status,
      'ready': ready,
      'message': message,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class ManifestCapability {
  ManifestCapability({
    required this.name,
    required this.capability,
    required this.description,
    required this.basePath,
    required this.flagKey,
    required this.defaultState,
    required this.audience,
    required this.enabled,
    required this.status,
    required this.summary,
    required this.dependencies,
    required this.dependencyStatuses,
    required this.accessible,
    required this.severityRank,
    required this.generatedAt,
  });

  factory ManifestCapability.fromJson(Map<String, dynamic> json) {
    final dependenciesJson = json['dependencies'];
    final dependencyStatusesJson = json['dependencyStatuses'];
    return ManifestCapability(
      name: json['name']?.toString() ?? 'Capability',
      capability: json['capability']?.toString() ?? 'unknown',
      description: json['description']?.toString() ?? '',
      basePath: json['basePath']?.toString() ?? '',
      flagKey: json['flagKey']?.toString() ?? '',
      defaultState: json['defaultState']?.toString() ?? 'disabled',
      audience: json['audience']?.toString() ?? 'public',
      enabled: json['enabled'] == true,
      status: json['status']?.toString() ?? 'unknown',
      summary: json['summary']?.toString() ?? '',
      dependencies: dependenciesJson is List
          ? dependenciesJson.map((dependency) => dependency.toString()).toList()
          : const <String>[],
      dependencyStatuses: dependencyStatusesJson is List
          ? dependencyStatusesJson.map((status) => status.toString()).toList()
          : const <String>[],
      accessible: json['accessible'] == true,
      severityRank: json['severityRank'] is num ? (json['severityRank'] as num).toInt() : 0,
      generatedAt: DateTime.tryParse(json['generatedAt']?.toString() ?? '') ?? DateTime.now().toUtc(),
    );
  }

  final String name;
  final String capability;
  final String description;
  final String basePath;
  final String flagKey;
  final String defaultState;
  final String audience;
  final bool enabled;
  final String status;
  final String summary;
  final List<String> dependencies;
  final List<String> dependencyStatuses;
  final bool accessible;
  final int severityRank;
  final DateTime generatedAt;

  bool get isOperational => status == 'operational' && enabled && accessible;
  bool get isOutage => status == 'outage';
  bool get isDegraded => status == 'degraded' || status == 'unknown';

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'capability': capability,
      'description': description,
      'basePath': basePath,
      'flagKey': flagKey,
      'defaultState': defaultState,
      'audience': audience,
      'enabled': enabled,
      'status': status,
      'summary': summary,
      'dependencies': dependencies,
      'dependencyStatuses': dependencyStatuses,
      'accessible': accessible,
      'severityRank': severityRank,
      'generatedAt': generatedAt.toIso8601String(),
    };
  }
}

class ManifestSummary {
  ManifestSummary({
    required this.services,
    required this.capabilities,
  });

  factory ManifestSummary.fromJson(Map<String, dynamic> json) {
    final servicesJson = json['services'];
    final capabilitiesJson = json['capabilities'];
    return ManifestSummary(
      services: servicesJson is Map<String, dynamic>
          ? SummaryBucket.fromJson(Map<String, dynamic>.from(servicesJson))
          : SummaryBucket.empty(),
      capabilities: capabilitiesJson is Map<String, dynamic>
          ? SummaryBucket.fromJson(Map<String, dynamic>.from(capabilitiesJson))
          : SummaryBucket.empty(),
    );
  }

  factory ManifestSummary.empty() {
    return ManifestSummary(
      services: SummaryBucket.empty(),
      capabilities: SummaryBucket.empty(),
    );
  }

  final SummaryBucket services;
  final SummaryBucket capabilities;

  Map<String, dynamic> toJson() {
    return {
      'services': services.toJson(),
      'capabilities': capabilities.toJson(),
    };
  }
}

class SummaryBucket {
  SummaryBucket({
    required this.operational,
    required this.degraded,
    required this.outage,
    required this.unknown,
    required this.disabled,
  });

  factory SummaryBucket.fromJson(Map<String, dynamic> json) {
    return SummaryBucket(
      operational: json['operational'] is num ? (json['operational'] as num).toInt() : 0,
      degraded: json['degraded'] is num ? (json['degraded'] as num).toInt() : 0,
      outage: json['outage'] is num ? (json['outage'] as num).toInt() : 0,
      unknown: json['unknown'] is num ? (json['unknown'] as num).toInt() : 0,
      disabled: json['disabled'] is num ? (json['disabled'] as num).toInt() : 0,
    );
  }

  factory SummaryBucket.empty() {
    return SummaryBucket(
      operational: 0,
      degraded: 0,
      outage: 0,
      unknown: 0,
      disabled: 0,
    );
  }

  final int operational;
  final int degraded;
  final int outage;
  final int unknown;
  final int disabled;

  Map<String, dynamic> toJson() {
    return {
      'operational': operational,
      'degraded': degraded,
      'outage': outage,
      'unknown': unknown,
      'disabled': disabled,
    };
  }
}

class CapabilityImpactNotice {
  CapabilityImpactNotice({
    required this.severity,
    required this.headline,
    required this.detail,
    required this.services,
    required this.capabilities,
    required this.generatedAt,
  });

  final CapabilityImpactSeverity severity;
  final String headline;
  final String? detail;
  final List<CapabilityServiceStatus> services;
  final List<ManifestCapability> capabilities;
  final DateTime generatedAt;
}
