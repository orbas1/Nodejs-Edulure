import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminCoursesSection from '../AdminCoursesSection.jsx';
import AdminEbooksSection from '../AdminEbooksSection.jsx';
import AdminCalendarSection from '../AdminCalendarSection.jsx';
import AdminBookingsSection from '../AdminBookingsSection.jsx';
import AdminGrowthSection from '../AdminGrowthSection.jsx';
import AdminRevenueManagementSection from '../AdminRevenueManagementSection.jsx';
import AdminAdsManagementSection from '../AdminAdsManagementSection.jsx';
import AdminTopCommunitiesSection from '../AdminTopCommunitiesSection.jsx';
import AdminUpcomingLaunchesSection from '../AdminUpcomingLaunchesSection.jsx';
import AdminToolsSection from '../AdminToolsSection.jsx';
import adminGrowthApi from '../../../../api/adminGrowthApi.js';
import adminRevenueApi from '../../../../api/adminRevenueApi.js';
import adminAdsApi from '../../../../api/adminAdsApi.js';

vi.mock('../../../../components/dashboard/admin/AdminCrudResource.jsx', async () => {
  const React = await import('react');
  const { useEffect } = React;

  const sampleData = {
    course: [
      {
        id: 1,
        title: 'Ops Playbooks 101',
        status: 'published',
        priceAmount: 15000,
        releaseAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        thumbnailUrl: 'https://cdn.edulure.com/course-thumb.jpg'
      },
      {
        id: 2,
        title: 'Automation Crash Course',
        status: 'draft',
        priceAmount: 0,
        promoVideoUrl: 'https://cdn.edulure.com/promo.mp4'
      },
      {
        id: 3,
        title: 'Enterprise Ops Mastery',
        status: 'published',
        priceAmount: 9000,
        releaseAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
      }
    ],
    ebook: [
      { id: 1, status: 'published', isPublic: true, readingTimeMinutes: 45, coverImageUrl: 'https://cdn.edulure.com/ebooks/cover.jpg' },
      {
        id: 2,
        status: 'draft',
        isPublic: false,
        readingTimeMinutes: 30,
        sampleDownloadUrl: 'https://cdn.edulure.com/ebooks/sample.pdf'
      },
      { id: 3, status: 'published', isPublic: true, readingTimeMinutes: 60 }
    ],
    'live stream': [
      {
        id: 1,
        title: 'Launch Readiness Webinar',
        status: 'scheduled',
        startAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        capacity: 100,
        reservedSeats: 70
      },
      {
        id: 2,
        title: 'Community AMA',
        status: 'completed',
        startAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        capacity: 50,
        reservedSeats: 30
      },
      {
        id: 3,
        title: 'Cancelled Ops Clinic',
        status: 'cancelled',
        startAt: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
        capacity: 25,
        reservedSeats: 5
      }
    ],
    booking: [
      {
        id: 1,
        status: 'confirmed',
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
        hourlyRateAmount: 10000
      },
      {
        id: 2,
        status: 'completed',
        scheduledStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
        hourlyRateAmount: 8000
      },
      {
        id: 3,
        status: 'cancelled',
        scheduledStart: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 45,
        hourlyRateAmount: 0
      }
    ],
    experiment: [{ id: 1, name: 'Lifecycle Nurture', status: 'running' }],
    adjustment: [{ id: 1, reference: 'REV-1', status: 'scheduled', amountCents: 1200 }],
    campaign: [{ id: 1, name: 'Brand Lift', status: 'draft', spendTotalCents: 2500 }]
  };

  function AdminCrudResourceStub({ entityName, onItemsChange }) {
    useEffect(() => {
      if (typeof onItemsChange === 'function' && sampleData[entityName]) {
        onItemsChange(sampleData[entityName]);
      }
    }, [entityName, onItemsChange]);

    return <div data-testid={`crud-${entityName}`} />;
  }

  return {
    __esModule: true,
    default: AdminCrudResourceStub
  };
});

vi.mock('../../../../api/adminGrowthApi.js', () => ({
  __esModule: true,
  default: {
    getGrowthMetrics: vi.fn(),
    listExperiments: vi.fn(),
    createExperiment: vi.fn(),
    updateExperiment: vi.fn(),
    deleteExperiment: vi.fn()
  }
}));

vi.mock('../../../../api/adminRevenueApi.js', () => ({
  __esModule: true,
  default: {
    getRevenueSummary: vi.fn(),
    listAdjustments: vi.fn(),
    createAdjustment: vi.fn(),
    updateAdjustment: vi.fn(),
    deleteAdjustment: vi.fn()
  }
}));

vi.mock('../../../../api/adminAdsApi.js', () => ({
  __esModule: true,
  default: {
    getAdsSummary: vi.fn(),
    listCampaigns: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    deleteCampaign: vi.fn()
  }
}));

const sampleGrowthMetrics = {
  totalExperiments: 4,
  activeExperiments: 2,
  experimentsByStatus: { running: 2, draft: 1, completed: 1 },
  learningVelocity: { enrollmentsCurrent: 200, enrollmentsPrevious: 150, growthRate: 33.33 },
  ebookEngagement: { averageProgress: 68.5, activeReaders: 42, completions: 18 },
  bookings: { total: 12, confirmed: 8, completed: 6 },
  newUsersLast30d: 55,
  retentionRate: 82.5,
  conversionRate: 45.1
};

const sampleRevenueSummary = {
  payments: {
    capturedCents: 125000,
    pendingCents: 18000,
    refundedCents: 2000,
    averageOrderCents: 25000
  },
  adjustments: { totalAdjustments: 2, netCents: -1500 },
  revenueSchedules: {
    scheduledCents: 88000,
    recognisedCents: 62000,
    inFlightCents: 12000,
    totalSchedules: 9
  },
  revenueTrend: [
    { date: '2024-11-01', grossCents: 4500, recognisedCents: 2400 },
    { date: '2024-11-02', grossCents: 5100, recognisedCents: 2800 }
  ]
};

const sampleAdsSummary = {
  totalCampaigns: 5,
  activeCampaigns: 3,
  metrics30d: {
    impressions: 12500,
    clicks: 1800,
    conversions: 220,
    spendCents: 675000,
    revenueCents: 1580000
  },
  topCampaigns: [
    {
      id: 41,
      name: 'Lifecycle Automations',
      status: 'active',
      impressions: 4000,
      clicks: 700,
      conversions: 90,
      spendCents: 210000,
      revenueCents: 720000,
      roas: 3.43
    }
  ],
  performanceTrend: [
    {
      date: '2024-11-01',
      impressions: 900,
      clicks: 120,
      conversions: 14,
      spendCents: 45000,
      revenueCents: 110000
    }
  ]
};

beforeEach(() => {
  vi.clearAllMocks();
  adminGrowthApi.getGrowthMetrics.mockResolvedValue(sampleGrowthMetrics);
  adminRevenueApi.getRevenueSummary.mockResolvedValue(sampleRevenueSummary);
  adminAdsApi.getAdsSummary.mockResolvedValue(sampleAdsSummary);
});

describe('Admin operational sections', () => {
  it('summarises course inventory using CRUD dataset insights', async () => {
    render(<AdminCoursesSection token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('Total courses').parentElement).toHaveTextContent('3');
    });
    expect(screen.getByText('Published').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Average price').parentElement).toHaveTextContent('$80.00');
    expect(screen.getByText('In pipeline').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Media ready').parentElement).toHaveTextContent('2');
  });

  it('calculates ebook distribution metrics', async () => {
    render(<AdminEbooksSection token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('Total titles').parentElement).toHaveTextContent('3');
    });
    expect(screen.getByText('Published').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Public distribution').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Avg. reading time').parentElement).toHaveTextContent('45 mins');
    expect(screen.getByText('Media ready').parentElement).toHaveTextContent('2');
  });

  it('highlights calendar capacity and next session details', async () => {
    render(<AdminCalendarSection token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('Upcoming sessions').parentElement).toHaveTextContent('1');
    });
    expect(screen.getByText('Completed').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Total capacity').parentElement).toHaveTextContent('175');
    expect(screen.getByText('Occupancy').parentElement).toHaveTextContent('60%');
    expect(screen.getByText('Next session')).toBeInTheDocument();
  });

  it('summarises tutor bookings revenue pipeline', async () => {
    render(<AdminBookingsSection token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('Total bookings').parentElement).toHaveTextContent('3');
    });
    expect(screen.getByText('Confirmed').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Upcoming').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Projected revenue').parentElement).toHaveTextContent('$180.00');
  });

  it('fetches growth metrics and supports manual refresh', async () => {
    const user = userEvent.setup();
    render(<AdminGrowthSection token="test-token" />);

    await waitFor(() => {
      expect(adminGrowthApi.getGrowthMetrics).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Active experiments').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Enrolments (30d)').parentElement).toHaveTextContent('200');
    expect(screen.getByText('Conversion rate').parentElement).toHaveTextContent('45.1%');

    await user.click(screen.getByRole('button', { name: /refresh metrics/i }));
    await waitFor(() => {
      expect(adminGrowthApi.getGrowthMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('displays revenue summary with trend insight and refresh control', async () => {
    const user = userEvent.setup();
    render(<AdminRevenueManagementSection token="test-token" />);

    await waitFor(() => {
      expect(adminRevenueApi.getRevenueSummary).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Captured revenue').parentElement).toHaveTextContent('$1,250.00');
    expect(screen.getByText('Pending settlements').parentElement).toHaveTextContent('$180.00');
    expect(screen.getByText('Recognised').parentElement).toHaveTextContent('$620.00');
    expect(screen.getByText('14-day revenue trend')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /refresh summary/i }));
    await waitFor(() => {
      expect(adminRevenueApi.getRevenueSummary).toHaveBeenCalledTimes(2);
    });
  });

  it('presents advertising portfolio metrics with refresh support', async () => {
    const user = userEvent.setup();
    render(<AdminAdsManagementSection token="test-token" />);

    await waitFor(() => {
      expect(adminAdsApi.getAdsSummary).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Active campaigns').parentElement).toHaveTextContent('3');
    expect(screen.getByText('Impressions (30d)').parentElement).toHaveTextContent('12,500');
    expect(screen.getByText('Spend (30d)').parentElement).toHaveTextContent('$6,750.00');
    expect(screen.getByText('Daily performance (14d)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /refresh summary/i }));
    await waitFor(() => {
      expect(adminAdsApi.getAdsSummary).toHaveBeenCalledTimes(2);
    });
  });

  it('normalises top communities table values and fallbacks', () => {
    const communities = [
      { id: 'ops', name: 'Ops Guild', revenue: 125000, currency: 'USD', subscribers: 1234, share: 45.25 },
      { id: 'growth', name: null, revenue: null, subscribers: null, share: null }
    ];

    render(<AdminTopCommunitiesSection sectionId="communities" communities={communities} />);

    const opsRow = screen.getByRole('row', { name: /Ops Guild/i });
    expect(within(opsRow).getByText('$125,000')).toBeInTheDocument();
    expect(within(opsRow).getByText('1,234')).toBeInTheDocument();
    expect(within(opsRow).getByText('45.3%')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Untitled community/i })).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
  });

  it('formats upcoming launches with derived schedule metadata', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-11-01T12:00:00Z'));

    const launches = [
      {
        id: 'launch-1',
        title: 'Instructor Kickoff',
        community: 'Growth Ops',
        startAt: '2024-11-03T12:00:00Z'
      },
      { id: 'launch-2', title: 'Monetisation Briefing', community: null }
    ];

    render(<AdminUpcomingLaunchesSection sectionId="launches" launches={launches} />);

    expect(screen.getByText('Instructor Kickoff')).toBeInTheDocument();
    expect(screen.getByText(/in 48 hours/i)).toBeInTheDocument();
    expect(screen.getByText('Monetisation Briefing')).toBeInTheDocument();
    expect(screen.getByText('Date TBC')).toBeInTheDocument();
    expect(screen.getByText('Schedule pending')).toBeInTheDocument();
    expect(screen.getByText(/total/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('groups launches into today, upcoming, and overdue buckets with summary chips', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-11-05T09:00:00Z'));

    const launches = [
      {
        id: 'today',
        title: 'Ops Standup',
        community: 'Operations Guild',
        startAt: '2024-11-05T15:00:00Z'
      },
      {
        id: 'future',
        title: 'Product Enablement',
        community: 'Product Academy',
        startAt: '2024-11-08T17:30:00Z'
      },
      {
        id: 'overdue',
        title: 'Compliance Retrospective',
        community: 'Compliance Desk',
        startAt: '2024-11-03T10:00:00Z'
      },
      {
        id: 'unscheduled',
        title: 'Instructor Recruitment',
        community: 'Talent Lab'
      }
    ];

    render(<AdminUpcomingLaunchesSection sectionId="launches" launches={launches} />);

    const todayGroup = screen.getByText('Launching today').closest('section');
    expect(todayGroup).not.toBeNull();
    expect(within(todayGroup).getByText('Ops Standup')).toBeInTheDocument();

    const upcomingGroup = screen.getByText('Upcoming').closest('section');
    expect(upcomingGroup).not.toBeNull();
    expect(within(upcomingGroup).getByText('Product Enablement')).toBeInTheDocument();
    expect(within(upcomingGroup).getByText('Instructor Recruitment')).toBeInTheDocument();

    const overdueGroup = screen.getByText('Requires reschedule').closest('section');
    expect(overdueGroup).not.toBeNull();
    expect(within(overdueGroup).getByText('Compliance Retrospective')).toBeInTheDocument();

    const chipFinder = (label) =>
      screen.getByText((content, element) => element?.tagName === 'SPAN' && content.trim().startsWith(label)).parentElement;

    const totalChip = chipFinder('Total');
    const todayChip = chipFinder('Today');
    const upcomingChip = chipFinder('Upcoming');
    const overdueChip = chipFinder('Overdue');

    expect(totalChip).toHaveTextContent('Total · 4');
    expect(todayChip).toHaveTextContent('Today · 1');
    expect(upcomingChip).toHaveTextContent('Upcoming · 2');
    expect(overdueChip).toHaveTextContent('Overdue · 1');

    vi.useRealTimers();
  });

  it('renders tooling lifecycle telemetry with resilient fallbacks', () => {
    const toolsPayload = {
      summary: {
        cards: [
          { id: 'occupancy', label: 'Occupancy', value: null, helper: 'Across active rentals' }
        ],
        meta: { occupancy: '74%', pipelineValue: '$12k', lastAudit: '3 days ago' }
      },
      listing: [
        {
          id: 'tool-1',
          name: null,
          status: null,
          lifecycleStage: null,
          category: null,
          owner: null,
          availableUnits: null,
          totalCapacity: null,
          adoptionVelocity: null,
          demandLevel: null,
          healthScore: null,
          rentalContracts: null,
          value: null,
          lastAudit: null
        }
      ],
      sales: {
        metrics: { pipelineValue: '$12k', winRate: '42%' },
        pipeline: [{ id: 'stage-1', stage: null, deals: null, velocity: null, value: null, conversion: null }],
        forecast: { committed: '$8k' }
      },
      rental: {
        metrics: {},
        active: [
          {
            id: 'rent-1',
            tool: null,
            lessee: null,
            value: null,
            utilisation: null,
            startAt: null,
            endAt: null,
            status: null,
            remaining: null
          }
        ],
        utilisation: { topPerformers: [{ id: 'top-1', tool: null, utilisation: null }] },
        expiring: [{ id: 'exp-1', tool: null, owner: null, expiresAt: null, remaining: null }]
      },
      management: {
        maintenance: [{ id: 'maint-1', tool: null, owner: null, severity: null, status: null, updated: null }],
        audits: [{ id: 'audit-1', title: null, owner: null, status: null, dueAt: null }],
        governance: {}
      },
      finalisation: {
        readinessScore: null,
        checklist: [{ id: 'check-1', label: null, owner: null, status: null }],
        communications: [{ id: 'comm-1', channel: null, audience: null, status: null }],
        pipeline: [{ id: 'pipe-1', tool: null, owner: null, stage: null, eta: null }]
      }
    };

    render(<AdminToolsSection sectionId="tools" tools={toolsPayload} />);

    expect(screen.getByText('Untitled tool')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText(/No active deals/i)).toBeInTheDocument();
    expect(screen.getByText(/ETA TBC/i)).toBeInTheDocument();
  });

  it('supports filtering tooling listings by status, lifecycle stage, and search', async () => {
    const user = userEvent.setup();
    const tooling = {
      summary: { cards: [] },
      listing: [
        {
          id: 'tool-1',
          name: 'Active Control',
          status: 'Active',
          lifecycleStage: 'Scale',
          category: 'Operations',
          owner: 'Ops Team',
          availableUnits: 5,
          totalCapacity: 10
        },
        {
          id: 'tool-2',
          name: 'Pilot Flow',
          status: 'Planned',
          lifecycleStage: 'Pilot',
          category: 'Labs',
          owner: 'Labs Guild',
          availableUnits: 2,
          totalCapacity: 5
        }
      ]
    };

    render(<AdminToolsSection sectionId="tools" tools={tooling} />);

    expect(screen.getByText('Active Control')).toBeInTheDocument();
    expect(screen.getByText('Pilot Flow')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by status/i), 'planned');
    expect(screen.queryByText('Active Control')).not.toBeInTheDocument();
    expect(screen.getByText('Pilot Flow')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by status/i), 'all');
    await user.clear(screen.getByLabelText(/search tooling suites/i));
    await user.type(screen.getByLabelText(/search tooling suites/i), 'control');
    expect(screen.getByText('Active Control')).toBeInTheDocument();
    expect(screen.queryByText('Pilot Flow')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/search tooling suites/i));
    await user.type(screen.getByLabelText(/search tooling suites/i), 'unknown');
    expect(screen.getByText(/No tooling suites match/i)).toBeInTheDocument();
  });

  it('applies combined status and lifecycle filters before searching', async () => {
    const user = userEvent.setup();
    const tooling = {
      summary: { cards: [] },
      listing: [
        {
          id: 'tool-1',
          name: 'Active Control',
          status: 'Active',
          lifecycleStage: 'Scale',
          category: 'Operations',
          owner: 'Ops Team',
          availableUnits: 5,
          totalCapacity: 10
        },
        {
          id: 'tool-2',
          name: 'Pilot Flow',
          status: 'Planned',
          lifecycleStage: 'Pilot',
          category: 'Labs',
          owner: 'Labs Guild',
          availableUnits: 2,
          totalCapacity: 5
        }
      ]
    };

    render(<AdminToolsSection sectionId="tools" tools={tooling} />);

    await user.selectOptions(screen.getByLabelText(/filter by status/i), 'active');
    await user.selectOptions(screen.getByLabelText(/filter by lifecycle stage/i), 'scale');

    expect(screen.getByText('Active Control')).toBeInTheDocument();
    expect(screen.queryByText('Pilot Flow')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by status/i), 'all');
    await user.selectOptions(screen.getByLabelText(/filter by lifecycle stage/i), 'pilot');
    expect(screen.getByText('Pilot Flow')).toBeInTheDocument();
    expect(screen.queryByText('Active Control')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by lifecycle stage/i), 'all');
    await user.clear(screen.getByLabelText(/search tooling suites/i));
    await user.type(screen.getByLabelText(/search tooling suites/i), 'control');
    expect(screen.getByText('Active Control')).toBeInTheDocument();
    expect(screen.queryByText('Pilot Flow')).not.toBeInTheDocument();
  });
});
