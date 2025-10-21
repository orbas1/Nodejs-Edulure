import { describe, expect, it } from 'vitest';

import { __testables } from '../../src/repositories/SecurityOperationsRepository.js';

const {
  serializeJson,
  parseJson,
  mapRiskRow,
  mapReviewRow,
  mapEvidenceRow,
  mapContinuityRow,
  mapAssessmentRow,
  normaliseSort
} = __testables;

describe('SecurityOperationsRepository helpers', () => {
  it('serializes json values safely', () => {
    expect(serializeJson(['one', 'two'], '[]')).toEqual('["one","two"]');
    expect(serializeJson(' {"a":1} ', '{}')).toEqual('{"a":1}');
    expect(serializeJson('invalid', '[]')).toEqual('[]');
    expect(serializeJson(null, '[]')).toEqual('[]');
  });

  it('parses json fields with sensible fallbacks', () => {
    expect(parseJson('[1,2,3]', [])).toEqual([1, 2, 3]);
    expect(parseJson('invalid', {})).toEqual({});
    expect(parseJson(undefined, [])).toEqual([]);
  });

  it('maps risk rows to domain objects', () => {
    const row = {
      id: 1,
      risk_uuid: 'risk-1',
      tenant_id: 'tenant',
      title: 'Data exposure',
      description: 'S3 bucket misconfiguration',
      category: 'security',
      status: 'identified',
      severity: 'high',
      likelihood: 'possible',
      residual_severity: 'medium',
      residual_likelihood: 'unlikely',
      inherent_risk_score: 80,
      residual_risk_score: 40,
      mitigation_plan: 'Audit permissions',
      residual_notes: 'Pending remediation',
      regulatory_driver: 'SOC2',
      review_cadence_days: 90,
      identified_at: '2024-01-01',
      accepted_at: null,
      remediated_at: null,
      closed_at: null,
      last_reviewed_at: null,
      next_review_at: '2024-03-01',
      owner_type: 'team',
      owner_id: 'security-team',
      owner_display_name: 'Security Team',
      owner_email: 'security@example.com',
      risk_owner_user_id: 'user-1',
      tags: '["iam","s3"]',
      detection_controls: '["cloudtrail"]',
      mitigation_controls: '["iam-policies"]',
      metadata: '{"jira":"SEC-1"}',
      created_at: '2024-01-01',
      updated_at: '2024-01-02'
    };

    const risk = mapRiskRow(row);
    expect(risk.tags).toEqual(['iam', 's3']);
    expect(risk.metadata).toEqual({ jira: 'SEC-1' });
    expect(risk.owner).toMatchObject({ displayName: 'Security Team', email: 'security@example.com' });
  });

  it('maps nested record types correctly', () => {
    const review = mapReviewRow({
      id: 1,
      review_uuid: 'rev-1',
      risk_id: 1,
      reviewer_id: 'user-1',
      reviewer_name: 'Analyst',
      reviewer_email: 'analyst@example.com',
      status: 'in_review',
      residual_severity: 'medium',
      residual_likelihood: 'unlikely',
      residual_risk_score: 20,
      notes: 'Looks good',
      evidence_references: '["doc-1"]',
      reviewed_at: '2024-02-01',
      next_review_at: '2024-05-01',
      metadata: '{"ticket":"REV-1"}',
      created_at: '2024-02-01',
      updated_at: '2024-02-01'
    });
    expect(review.evidenceReferences).toEqual(['doc-1']);

    const evidence = mapEvidenceRow({
      id: 1,
      evidence_uuid: 'ev-1',
      tenant_id: 'tenant',
      risk_id: 1,
      framework: 'SOC2',
      control_reference: 'CC-1',
      evidence_type: 'document',
      storage_path: '/evidence/doc.pdf',
      checksum: 'abc123',
      sources: '["aws"]',
      captured_at: '2024-01-01',
      expires_at: '2024-06-01',
      status: 'submitted',
      submitted_by: 'user-1',
      submitted_by_email: 'user@example.com',
      description: 'Evidence description',
      metadata: '{"ticket":"EV-1"}',
      created_at: '2024-01-01',
      updated_at: '2024-01-02'
    });
    expect(evidence.sources).toEqual(['aws']);

    const exercise = mapContinuityRow({
      id: 1,
      exercise_uuid: 'ex-1',
      tenant_id: 'tenant',
      scenario_key: 'ransomware',
      scenario_summary: 'Ransomware tabletop',
      exercise_type: 'tabletop',
      started_at: '2024-01-01',
      completed_at: '2024-01-01',
      rto_target_minutes: '60',
      rpo_target_minutes: '30',
      actual_rto_minutes: '55',
      actual_rpo_minutes: '25',
      outcome: 'success',
      lessons_learned: 'Need faster comms',
      follow_up_actions: '["improve-playbooks"]',
      owner_id: 'user-2',
      owner_display_name: 'Ops Lead',
      owner_email: 'ops@example.com',
      metadata: '{"ticket":"BC-1"}',
      created_at: '2024-01-01',
      updated_at: '2024-01-02'
    });
    expect(exercise.followUpActions).toEqual(['improve-playbooks']);

    const assessment = mapAssessmentRow({
      id: 1,
      assessment_uuid: 'as-1',
      tenant_id: 'tenant',
      assessment_type: 'penetration-test',
      status: 'scheduled',
      scheduled_for: '2024-03-01',
      completed_at: null,
      owner_id: 'user-3',
      owner_display_name: 'Security PM',
      owner_email: 'pm@example.com',
      scope: 'External perimeter',
      methodology: 'Black box',
      findings: 'Pending',
      next_steps: 'Prepare assets',
      metadata: '{"ticket":"AS-1"}',
      created_at: '2024-02-01',
      updated_at: '2024-02-01'
    });
    expect(assessment.metadata).toEqual({ ticket: 'AS-1' });
  });

  it('normalises sort keys with sensible defaults', () => {
    expect(normaliseSort()).toBe('risk.residual_risk_score');
    expect(normaliseSort('createdAt')).toBe('risk.created_at');
    expect(normaliseSort('status')).toBe('risk.status');
    expect(normaliseSort('nonexistent')).toBe('risk.residual_risk_score');
  });
});
