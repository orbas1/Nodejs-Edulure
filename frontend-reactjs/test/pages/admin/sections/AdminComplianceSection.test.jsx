import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import AdminComplianceSection from '../../../../src/pages/admin/sections/AdminComplianceSection.jsx';

const baseQueue = [
  {
    id: 1,
    reference: 'KYC-1',
    status: 'pending_review',
    documentsSubmitted: 2,
    documentsRequired: 3,
    waitingHours: 12,
    riskScore: 15,
    user: { name: 'Kai Instructor', email: 'kai@example.com' },
    verification: { documents: [], policyReferences: ['AML-2024'] }
  }
];

const audits = {
  totals: { events: 3, investigations: 1, controlsTested: 2, policyUpdates: 1 },
  countsBySeverity: { critical: 1, error: 1, warning: 1 },
  latestEvents: [
    {
      eventUuid: 'evt-1',
      eventType: 'policy.updated',
      severity: 'warning',
      entityType: 'consent_record',
      entityId: '10',
      occurredAt: '2025-02-03T09:00:00Z',
      actor: { role: 'admin' }
    }
  ]
};

const attestations = {
  totals: { required: 10, granted: 9, outstanding: 1, coverage: 90 },
  policies: [
    {
      consentType: 'marketing.email',
      policy: { title: 'Marketing email communications' },
      audience: ['user'],
      required: 10,
      outstanding: 1,
      coverage: 90,
      lastGrantedAt: '2025-02-01T10:00:00Z'
    }
  ]
};

const frameworks = [
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    status: 'passing',
    owner: 'Security & Compliance Lead',
    renewalDue: '2025-06-01',
    outstandingActions: 0,
    controlsTested: 12,
    description: 'Trust service criteria coverage.'
  }
];

const risk = {
  heatmap: [
    {
      category: 'scam',
      label: 'Marketplace scams',
      total: 2,
      severities: [
        { severity: 'critical', count: 1 },
        { severity: 'high', count: 1 },
        { severity: 'medium', count: 0 },
        { severity: 'low', count: 0 }
      ]
    }
  ],
  severityTotals: { critical: 1, high: 1, medium: 0, low: 0 },
  exposures: [{ category: 'scam', label: 'Marketplace scams', total: 2, dominantSeverity: 'critical', watchers: 4 }]
};

const incidentResponse = {
  queueSummary: { medianAckMinutes: 10, ackBreaches: 1, resolutionBreaches: 0, watchers: 5, oldestOpenAt: '2025-02-03T08:00:00Z' },
  flows: [
    {
      incidentUuid: 'inc-1',
      reference: 'OPS-2045',
      severity: 'critical',
      status: 'mitigating',
      reportedAt: '2025-02-03T08:45:00Z',
      watchers: 5,
      recommendedActions: ['Lock payouts'],
      timeline: [{ id: 'evt-2', type: 'incident.runbook_launched', occurredAt: '2025-02-03T09:00:00Z', severity: 'warning', actor: { role: 'admin' } }]
    }
  ],
  recentResolved: [
    {
      incidentUuid: 'inc-2',
      reference: 'OPS-2044',
      severity: 'high',
      resolvedAt: '2025-02-02T12:00:00Z',
      resolutionMinutes: 45,
      followUp: 'Notify trust & safety.'
    }
  ]
};

const evidence = {
  exports: [
    {
      id: 1,
      tableName: 'audit_events',
      partitionName: 'p202502',
      rowCount: 120,
      sizeLabel: '2.5 MB',
      archivedAt: '2025-02-01T00:00:00Z',
      downloadUrl: 'https://example.com/download'
    }
  ],
  permissions: { roles: ['admin', 'legal'], requestChannel: '#security-compliance' },
  storage: { bucket: 'archives', prefix: 'compliance' }
};

function setup(overrides = {}) {
  const utils = render(
    <AdminComplianceSection
      sectionId="compliance"
      metrics={[{ id: 'kyc', label: 'Pending KYC reviews', value: '5' }]}
      queue={baseQueue}
      slaBreaches={1}
      manualReviewQueue={2}
      gdprProfile={{ dsar: { open: 2, overdue: 1, averageCompletionHours: 72 }, registers: [], controls: {}, ico: {} }}
      audits={audits}
      attestations={attestations}
      frameworks={frameworks}
      risk={risk}
      incidentResponse={incidentResponse}
      evidence={evidence}
      {...overrides}
    />
  );
  return { ...utils, user: userEvent.setup() };
}

describe('AdminComplianceSection', () => {
  it('renders queue metrics and tabs', () => {
    setup();
    expect(screen.getByText('Pending KYC reviews')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Audit & attestations' })).toBeInTheDocument();
  });

  it('shows audit summary when selecting audits tab', async () => {
    const { user } = setup();
    const auditsTab = await screen.findByRole('button', { name: 'Audit & attestations' });
    await act(async () => {
      await user.click(auditsTab);
    });
    expect(await screen.findByText('Recent audit trail')).toBeInTheDocument();
    expect(screen.getByText('Policy · Updated')).toBeInTheDocument();
    expect(screen.getByText('Marketing email communications')).toBeInTheDocument();
  });

  it('renders evidence export entries', async () => {
    const { user } = setup();
    const evidenceTab = await screen.findByRole('button', { name: 'Evidence exports' });
    await act(async () => {
      await user.click(evidenceTab);
    });
    expect(await screen.findByText('Access controls')).toBeInTheDocument();
    expect(screen.getByText('audit_events')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', 'https://example.com/download');
  });

  it('requires detailed rationale before rejecting a verification case', async () => {
    const onReview = vi.fn().mockResolvedValue();
    const { user } = setup({ onReview });

    const rejectButton = screen.getByRole('button', { name: /Reject/i });
    await user.click(rejectButton);

    expect(onReview).not.toHaveBeenCalled();
    expect(await screen.findByText(/Provide a clear reason/i)).toBeInTheDocument();
  });

  it('submits approval decisions with risk overrides applied', async () => {
    const onReview = vi.fn().mockResolvedValue();
    const { user } = setup({ onReview });

    const riskInput = screen.getByDisplayValue('15.0');
    await act(async () => {
      await user.clear(riskInput);
      await user.type(riskInput, '45.5');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Approve/i }));
    });

    await waitFor(() => expect(onReview).toHaveBeenCalledTimes(1));
    expect(onReview.mock.calls[0][1]).toMatchObject({ status: 'approved', riskScore: 45.5 });
    expect(await screen.findByText(/Case KYC-1 updated/i)).toBeInTheDocument();
  });
});

