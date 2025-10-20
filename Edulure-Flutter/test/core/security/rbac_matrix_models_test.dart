import 'package:edulure_mobile/core/security/rbac_matrix_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RbacMatrix models', () {
    final matrixJson = {
      'version': '1.0.0',
      'generatedAt': '2024-01-01T12:00:00.000Z',
      'roles': [
        {
          'key': 'instructor',
          'name': 'Instructor',
          'description': 'Manages provider courses',
          'capabilityGrants': [
            {
              'capability': 'provider.courses.manage',
              'actions': ['create', 'update'],
              'disallowedRegions': <String>[],
            },
          ],
          'regionRestrictions': <String>[],
        },
        {
          'key': 'assistant',
          'name': 'Teaching Assistant',
          'description': 'Supports instructors',
          'capabilityGrants': [
            {
              'capability': 'provider.courses.manage',
              'actions': <String>[],
              'disallowedRegions': ['restricted'],
            },
          ],
          'regionRestrictions': ['restricted'],
        },
      ],
      'capabilities': [
        {
          'capability': 'provider.courses.manage',
          'serviceKey': 'courses',
          'description': 'Manage courses and catalogue',
          'requiresConsent': true,
          'auditLogTemplate': 'User {{user}} managed courses',
        },
      ],
      'guardrails': [
        {
          'capability': 'provider.courses.manage',
          'alertThreshold': 5,
          'requiresTwoPersonRule': true,
          'rolloutStrategy': 'progressive',
        },
      ],
    };

    test('parses RBAC matrix JSON and exposes lookups', () {
      final matrix = RbacMatrix.fromJson(matrixJson);

      expect(matrix.version, '1.0.0');
      expect(matrix.generatedAt.isAtSameMomentAs(DateTime.utc(2024, 1, 1, 12)), isTrue);
      expect(matrix.roles, hasLength(2));
      expect(matrix.capabilities.single.capability, 'provider.courses.manage');

      final instructor = matrix.roleByKey('instructor');
      expect(instructor, isNotNull);
      expect(instructor!.capabilityGrants.single.capability, 'provider.courses.manage');

      final guardrail = matrix.guardrailByCapability('provider.courses.manage');
      expect(guardrail, isNotNull);
      expect(guardrail!.requiresTwoPersonRule, isTrue);

      final policy = matrix.policyByCapability('provider.courses.manage');
      expect(policy, isNotNull);
      expect(policy!.requiresConsent, isTrue);

      final roundTrip = matrix.toJson();
      expect(roundTrip['version'], '1.0.0');
      expect((roundTrip['roles'] as List).length, 2);
      expect((roundTrip['guardrails'] as List).first['rolloutStrategy'], 'progressive');
    });

    test('evaluates permissions across multiple roles', () {
      final matrix = RbacMatrix.fromJson(matrixJson);

      expect(
        matrix.hasPermission(
          roleKeys: const ['instructor'],
          capability: 'provider.courses.manage',
          action: 'create',
        ),
        isTrue,
      );

      expect(
        matrix.hasPermission(
          roleKeys: const ['instructor'],
          capability: 'provider.courses.manage',
          action: 'delete',
        ),
        isFalse,
      );

      expect(
        matrix.hasPermission(
          roleKeys: const ['assistant'],
          capability: 'provider.courses.manage',
          action: 'archive',
        ),
        isTrue,
      );

      expect(
        matrix.hasPermission(
          roleKeys: const ['unknown'],
          capability: 'provider.courses.manage',
        ),
        isFalse,
      );
    });

    test('role definition honours action and region guardrails', () {
      final matrix = RbacMatrix.fromJson(matrixJson);
      final assistant = matrix.roleByKey('assistant');
      expect(assistant, isNotNull);

      expect(
        assistant!.isCapabilityAllowed(
          'provider.courses.manage',
          region: 'emea',
        ),
        isTrue,
      );

      expect(
        assistant.isCapabilityAllowed(
          'provider.courses.manage',
          region: 'restricted',
        ),
        isFalse,
      );

      expect(
        assistant.isCapabilityAllowed(
          'provider.courses.manage',
          action: 'delete',
          region: 'emea',
        ),
        isTrue,
      );
    });
  });
}
