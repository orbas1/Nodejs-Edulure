import 'package:flutter_test/flutter_test.dart';

import 'package:edulure_mobile/provider/runtime/provider_compliance_contracts.dart';

void main() {
  test('ProviderDsrStatus parsing handles known and unknown values', () {
    expect(ProviderDsrStatus.parse('pending'), ProviderDsrStatus.pending);
    expect(ProviderDsrStatus.parse('in_progress'), ProviderDsrStatus.inProgress);
    expect(ProviderDsrStatus.parse('unknown'), ProviderDsrStatus.pending);
  });

  test('ProviderDsrRequest parses metadata and channel actions', () {
    final json = {
      'requestUuid': 'req-1',
      'tenantId': 'tenant-1',
      'userId': 'user-1',
      'requestType': 'deletion',
      'status': 'escalated',
      'submittedAt': '2023-01-01T00:00:00Z',
      'dueAt': '2023-01-05T00:00:00Z',
      'handledBy': 'operator-7',
      'escalated': true,
      'slaDays': 4,
      'requiresDualSignoff': true,
      'metadata': '{"caseId":"CAS-42"}',
      'channels': [
        {
          'system': 'email',
          'completedAt': '2023-01-02T00:00:00Z',
          'operatorId': 'op-1',
          'notes': 'Followed up',
        }
      ],
      'evidence': [
        {
          'type': 'zip',
          'hash': 'abcdef',
          'signedUrl': 'https://cdn/files.zip',
          'expiresAt': '2023-01-06T00:00:00Z',
        }
      ],
    };

    final request = ProviderDsrRequest.fromJson(json);

    expect(request.metadata['caseId'], 'CAS-42');
    expect(request.channels.single.isComplete, isTrue);
    expect(request.evidence.single.isValid, isTrue);
    expect(request.status, ProviderDsrStatus.escalated);
  });

  test('ProviderComplianceEndpoints produce expected paths', () {
    expect(ProviderComplianceEndpoints.listDsrRequests, '/api/v1/provider/compliance/dsr/requests');
    expect(ProviderComplianceEndpoints.acknowledge('id'),
        '/api/v1/provider/compliance/dsr/requests/id/acknowledge');
    expect(ProviderComplianceEndpoints.revokeConsent('uuid'),
        '/api/v1/provider/compliance/consents/uuid/revoke');
  });
}
