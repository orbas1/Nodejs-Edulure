import 'package:collection/collection.dart';

class RbacMatrix {
  RbacMatrix({
    required this.version,
    required this.generatedAt,
    required this.roles,
    required this.capabilities,
    required this.guardrails,
  });

  factory RbacMatrix.fromJson(Map<String, dynamic> json) {
    final rolesJson = json['roles'];
    final capabilitiesJson = json['capabilities'];
    final guardrailsJson = json['guardrails'];

    return RbacMatrix(
      version: json['version']?.toString() ?? '0.0.0',
      generatedAt: DateTime.tryParse(json['generatedAt']?.toString() ?? '') ?? DateTime.now().toUtc(),
      roles: rolesJson is List
          ? rolesJson
              .whereType<Map>()
              .map((role) => RoleDefinition.fromJson(Map<String, dynamic>.from(role)))
              .toList()
          : const <RoleDefinition>[],
      capabilities: capabilitiesJson is List
          ? capabilitiesJson
              .whereType<Map>()
              .map((capability) => CapabilityPolicy.fromJson(Map<String, dynamic>.from(capability)))
              .toList()
          : const <CapabilityPolicy>[],
      guardrails: guardrailsJson is List
          ? guardrailsJson
              .whereType<Map>()
              .map((guardrail) => CapabilityGuardrail.fromJson(Map<String, dynamic>.from(guardrail)))
              .toList()
          : const <CapabilityGuardrail>[],
    );
  }

  final String version;
  final DateTime generatedAt;
  final List<RoleDefinition> roles;
  final List<CapabilityPolicy> capabilities;
  final List<CapabilityGuardrail> guardrails;

  RoleDefinition? roleByKey(String key) {
    return roles.firstWhereOrNull((role) => role.key == key);
  }

  CapabilityPolicy? policyByCapability(String capability) {
    return capabilities.firstWhereOrNull((item) => item.capability == capability);
  }

  CapabilityGuardrail? guardrailByCapability(String capability) {
    return guardrails.firstWhereOrNull((item) => item.capability == capability);
  }

  bool hasPermission({
    required Iterable<String> roleKeys,
    required String capability,
    String? action,
  }) {
    final policy = policyByCapability(capability);
    if (policy == null) {
      return false;
    }

    final evaluatedRoles = roleKeys.map(roleByKey).whereType<RoleDefinition>();
    if (evaluatedRoles.isEmpty) {
      return false;
    }

    for (final role in evaluatedRoles) {
      if (role.isCapabilityAllowed(capability, action: action)) {
        return true;
      }
    }

    return false;
  }

  Map<String, dynamic> toJson() {
    return {
      'version': version,
      'generatedAt': generatedAt.toIso8601String(),
      'roles': roles.map((role) => role.toJson()).toList(),
      'capabilities': capabilities.map((capability) => capability.toJson()).toList(),
      'guardrails': guardrails.map((guardrail) => guardrail.toJson()).toList(),
    };
  }
}

class RoleDefinition {
  RoleDefinition({
    required this.key,
    required this.name,
    required this.description,
    required this.capabilityGrants,
    required this.regionRestrictions,
  });

  factory RoleDefinition.fromJson(Map<String, dynamic> json) {
    final grantsJson = json['capabilityGrants'];
    final restrictionsJson = json['regionRestrictions'];

    return RoleDefinition(
      key: json['key']?.toString() ?? 'unknown',
      name: json['name']?.toString() ?? 'Unknown role',
      description: json['description']?.toString() ?? 'No description provided',
      capabilityGrants: grantsJson is List
          ? grantsJson
              .whereType<Map>()
              .map((grant) => CapabilityGrant.fromJson(Map<String, dynamic>.from(grant)))
              .toList()
          : const <CapabilityGrant>[],
      regionRestrictions: restrictionsJson is List
          ? restrictionsJson.whereType<String>().toSet()
          : const <String>{},
    );
  }

  final String key;
  final String name;
  final String description;
  final List<CapabilityGrant> capabilityGrants;
  final Set<String> regionRestrictions;

  bool isCapabilityAllowed(String capability, {String? action, String? region}) {
    final grants = capabilityGrants.where((grant) => grant.capability == capability);
    if (grants.isEmpty) {
      return false;
    }

    for (final grant in grants) {
      if (region != null && grant.disallowedRegions.contains(region)) {
        continue;
      }
      if (action == null && grant.actions.isEmpty) {
        return true;
      }
      if (action != null && (grant.actions.isEmpty || grant.actions.contains(action))) {
        return true;
      }
    }

    return false;
  }

  Map<String, dynamic> toJson() {
    return {
      'key': key,
      'name': name,
      'description': description,
      'capabilityGrants': capabilityGrants.map((grant) => grant.toJson()).toList(),
      'regionRestrictions': regionRestrictions.toList(),
    };
  }
}

class CapabilityGrant {
  CapabilityGrant({
    required this.capability,
    required this.actions,
    required this.disallowedRegions,
  });

  factory CapabilityGrant.fromJson(Map<String, dynamic> json) {
    final actionsJson = json['actions'];
    final disallowedRegionsJson = json['disallowedRegions'];

    return CapabilityGrant(
      capability: json['capability']?.toString() ?? 'unknown',
      actions: actionsJson is List ? actionsJson.whereType<String>().toSet() : const <String>{},
      disallowedRegions:
          disallowedRegionsJson is List ? disallowedRegionsJson.whereType<String>().toSet() : const <String>{},
    );
  }

  final String capability;
  final Set<String> actions;
  final Set<String> disallowedRegions;

  Map<String, dynamic> toJson() {
    return {
      'capability': capability,
      'actions': actions.toList(),
      'disallowedRegions': disallowedRegions.toList(),
    };
  }
}

class CapabilityPolicy {
  CapabilityPolicy({
    required this.capability,
    required this.serviceKey,
    required this.description,
    required this.requiresConsent,
    required this.auditLogTemplate,
  });

  factory CapabilityPolicy.fromJson(Map<String, dynamic> json) {
    return CapabilityPolicy(
      capability: json['capability']?.toString() ?? 'unknown',
      serviceKey: json['serviceKey']?.toString() ?? 'unknown',
      description: json['description']?.toString() ?? 'No description provided',
      requiresConsent: json['requiresConsent'] == true,
      auditLogTemplate: json['auditLogTemplate']?.toString() ?? '',
    );
  }

  final String capability;
  final String serviceKey;
  final String description;
  final bool requiresConsent;
  final String auditLogTemplate;

  Map<String, dynamic> toJson() {
    return {
      'capability': capability,
      'serviceKey': serviceKey,
      'description': description,
      'requiresConsent': requiresConsent,
      'auditLogTemplate': auditLogTemplate,
    };
  }
}

class CapabilityGuardrail {
  CapabilityGuardrail({
    required this.capability,
    required this.alertThreshold,
    required this.requiresTwoPersonRule,
    required this.rolloutStrategy,
  });

  factory CapabilityGuardrail.fromJson(Map<String, dynamic> json) {
    return CapabilityGuardrail(
      capability: json['capability']?.toString() ?? 'unknown',
      alertThreshold: json['alertThreshold'] is num ? (json['alertThreshold'] as num).toDouble() : 0,
      requiresTwoPersonRule: json['requiresTwoPersonRule'] == true,
      rolloutStrategy: json['rolloutStrategy']?.toString() ?? 'stable',
    );
  }

  final String capability;
  final double alertThreshold;
  final bool requiresTwoPersonRule;
  final String rolloutStrategy;

  Map<String, dynamic> toJson() {
    return {
      'capability': capability,
      'alertThreshold': alertThreshold,
      'requiresTwoPersonRule': requiresTwoPersonRule,
      'rolloutStrategy': rolloutStrategy,
    };
  }
}

class ProviderRoleContext {
  ProviderRoleContext({
    required this.providerId,
    required this.roles,
    required this.region,
  });

  factory ProviderRoleContext.fromJson(Map<String, dynamic> json) {
    final rolesJson = json['roles'];

    return ProviderRoleContext(
      providerId: json['providerId']?.toString() ?? 'unknown',
      roles: rolesJson is List ? rolesJson.whereType<String>().toSet() : const <String>{},
      region: json['region']?.toString() ?? 'global',
    );
  }

  final String providerId;
  final Set<String> roles;
  final String region;

  Map<String, dynamic> toJson() {
    return {
      'providerId': providerId,
      'roles': roles.toList(),
      'region': region,
    };
  }
}

class CapabilityAccessEnvelope {
  CapabilityAccessEnvelope({
    required this.capability,
    required this.allowed,
    required this.requiresConsent,
    required this.guardrail,
    required this.auditContext,
  });

  final String capability;
  final bool allowed;
  final bool requiresConsent;
  final CapabilityGuardrail? guardrail;
  final String? auditContext;
}
