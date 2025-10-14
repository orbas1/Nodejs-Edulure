import { useMemo, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

const profileData = {
  name: 'Alex Morgan',
  handle: '@alexmorgan',
  avatar: 'https://i.pravatar.cc/160?img=28',
  banner:
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80',
  tagline: 'Revenue architect, data-backed instructor, and community operator.',
  bio:
    'I help B2B education companies design revenue engines powered by community, data, and trust. Previously led global revenue ops at RevStars and built three 7-figure advisory programmes.',
  location: 'London, United Kingdom',
  expertise: ['Revenue operations', 'Community-led growth', 'GT-M strategy', 'Leadership enablement'],
  qualifications: [
    'MBA, London Business School',
    'HubSpot Revenue Operations Certified',
    'ICF Accredited Coach',
    'Author of the Revenue Operator Playbook'
  ],
  followers: 18420,
  following: 312,
  trustScores: {
    learner: 96,
    instructor: 98,
    reviewGrade: 4.9
  },
  trustBadges: ['KYC verified', 'Top Mentor 2023', 'Community Builder of the Year'],
  affiliate: {
    status: 'Elite partner · Active',
    referralCode: 'GROW-ALEX-24',
    shareUrl: 'https://edulure.com/r/GROW-ALEX-24',
    summary: {
      lifetime: '$182,400.00',
      trailing30: '$18,240.00',
      pending: '$4,320.00',
      conversion: '4.8% conversion',
      avgOrder: '$760 avg. order',
      activeProgrammes: 5
    },
    tiers: [
      { label: 'Base tier', threshold: '$0 – $999', rate: '10% commission' },
      { label: 'Growth tier', threshold: '$1,000 – $4,999', rate: '12.5% commission' },
      { label: 'Scale tier', threshold: '$5,000+', rate: '15% commission' }
    ],
    payouts: [
      {
        id: 'pay-001',
        amount: '$2,160.00',
        status: 'Scheduled',
        scheduled: 'June 30, 2024',
        programme: 'Growth Operator Studio'
      },
      {
        id: 'pay-000',
        amount: '$1,480.00',
        status: 'Completed',
        scheduled: 'April 30, 2024',
        processed: 'April 30, 2024',
        programme: 'Community Monetisation Sprint'
      }
    ],
    actions: [
      'Approve 2 pending partner applications',
      'Send Q3 enablement pack to top performers',
      'Sync payout ledger with finance Learnspace'
    ],
    highlights: [
      'Top 2% click-to-enrol conversion',
      'Average referral CAC recovered in 2.4 days'
    ],
    compliance: {
      requireTwoFactor: true,
      taxComplete: true,
      selfReferralBlocked: true,
      payoutSchedule: 'Net 30 cadence'
    },
    recentReferrals: [
      { organisation: 'LoopOps Collective', amount: '$820.00', date: 'May 12, 2024' },
      { organisation: 'Northbeam RevOps', amount: '$1,040.00', date: 'May 8, 2024' },
      { organisation: 'Everpath Academy', amount: '$640.00', date: 'May 4, 2024' }
    ]
  },
  social: [
    { label: 'Website', url: 'https://growthoperator.co', handle: 'growthoperator.co' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/alexmorgan', handle: 'linkedin.com/in/alexmorgan' },
    { label: 'YouTube', url: 'https://youtube.com/@growthoperator', handle: '@growthoperator' },
    { label: 'Twitter', url: 'https://twitter.com/alexgrowthops', handle: '@alexgrowthops' }
  ],
  communities: {
    member: ['RevOps Guild', 'Customer Education Collective', 'CMO Alliance', 'Community-Led Leaders'],
    owner: ['Growth Operator Studio'],
    moderator: ['Modern GTM Architects'],
    admin: ['RevOps Guild']
  },
  courses: [
    {
      title: 'Revenue Operations Intensive',
      learners: 328,
      satisfaction: '4.9/5 satisfaction',
      status: 'Live cohort',
      nextCohort: 'June 2024'
    },
    {
      title: 'Community Monetisation Sprint',
      learners: 187,
      satisfaction: '4.8/5 satisfaction',
      status: 'Applications open',
      nextCohort: 'July 2024'
    },
    {
      title: 'Leadership Systems Lab',
      learners: 96,
      satisfaction: '4.95/5 satisfaction',
      status: 'Beta cohort',
      nextCohort: 'September 2024'
    }
  ],
  reviews: [
    {
      learner: 'Priya Patel',
      rating: 5,
      highlight: 'Transformed how we run forecasting and empowered our CS team. Alex brought frameworks and accountability.',
      context: 'Enterprise RevOps cohort',
      date: 'March 2024'
    },
    {
      learner: 'Diego Martínez',
      rating: 5,
      highlight: 'The community labs created so many high-signal connections. The playbooks shipped every week were gold.',
      context: 'Community Monetisation Sprint',
      date: 'February 2024'
    }
  ],
  liveFeed: [
    {
      title: 'Hosted “Designing Revenue Rituals” session',
      timestamp: '2 hours ago',
      summary: '124 founders joined the live teardown of their revenue cadences. 97% stayed for the full workshop.',
      metrics: ['124 live attendees', '97% retention', '4.9/5 real-time score']
    },
    {
      title: 'Published a trust score dashboard template',
      timestamp: 'Yesterday',
      summary: 'Shared a Notion + Looker Studio template to help instructors operationalise feedback loops.',
      metrics: ['3.2k views', '860 saves', '32 remix requests']
    }
  ],
  followersList: [
    { name: 'Priya Patel', role: 'Head of Growth @ Maven', tagline: 'Scaling community-led revenue programmes', trust: 94 },
    { name: 'Kwame Mensah', role: 'CEO @ FutureSkill', tagline: 'Credentialing emerging talent in Africa', trust: 91 },
    { name: 'Sofia Gruber', role: 'Founder @ FlowOps', tagline: 'Workflow automation for hybrid teams', trust: 89 },
    { name: 'Yu Chen', role: 'VP Product @ LearnLoop', tagline: 'Building adaptive learning experiences', trust: 92 }
  ],
  verification: {
    status: 'Action needed',
    lastReviewed: 'March 12, 2024',
    nextStep: 'Submit a fresh selfie holding your passport.',
    supported: ['passport', 'drivers-licence', 'national-id', 'residence-permit'],
    note: 'We approve new documents within 24 business hours once all three images are uploaded.'
  }
};

const idTypeCopy = {
  passport: 'International passports must be valid for at least 6 months.',
  'drivers-licence': 'Provide both sides if your licence is two-sided.',
  'national-id': 'National identity cards must show your full legal name.',
  'residence-permit': 'Residence permits must display the country seal and validity.'
};

function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export default function Profile() {
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedIdType, setSelectedIdType] = useState(profileData.verification.supported[0]);
  const [verificationUploads, setVerificationUploads] = useState({ front: null, back: null, selfie: null });
  const [verificationStatus, setVerificationStatus] = useState(profileData.verification.status);
  const affiliate = profileData.affiliate;
  const affiliateSummary = affiliate.summary;
  const affiliatePayouts = affiliate.payouts;
  const affiliateActions = affiliate.actions;
  const affiliateHighlights = affiliate.highlights;
  const affiliateComplianceSettings = affiliate.compliance;
  const affiliateRecentReferrals = affiliate.recentReferrals;
  const [affiliateLinkCopied, setAffiliateLinkCopied] = useState(false);

  const displayedFollowerCount = useMemo(
    () => profileData.followers + (isFollowing ? 1 : 0),
    [isFollowing]
  );
  const verificationProgress = useMemo(() => {
    const completed = Object.values(verificationUploads).filter(Boolean).length;
    return Math.round((completed / 3) * 100);
  }, [verificationUploads]);
  const canSubmitVerification = useMemo(
    () => Object.values(verificationUploads).filter(Boolean).length === 3,
    [verificationUploads]
  );
  const affiliateMetrics = useMemo(
    () => [
      {
        id: 'lifetime',
        label: 'Lifetime earnings',
        value: affiliateSummary.lifetime,
        helper: `Pending ${affiliateSummary.pending}`
      },
      {
        id: 'trailing30',
        label: 'Trailing 30 days',
        value: affiliateSummary.trailing30,
        helper: affiliateSummary.conversion
      },
      {
        id: 'avg-order',
        label: 'Average order value',
        value: affiliateSummary.avgOrder,
        helper: `${affiliateSummary.activeProgrammes} active programmes`
      },
      {
        id: 'referral-code',
        label: 'Referral code',
        value: affiliate.referralCode,
        helper: 'Share with trusted operators'
      }
    ],
    [
      affiliate.referralCode,
      affiliateSummary.activeProgrammes,
      affiliateSummary.avgOrder,
      affiliateSummary.conversion,
      affiliateSummary.lifetime,
      affiliateSummary.pending,
      affiliateSummary.trailing30
    ]
  );
  const affiliateCompliance = useMemo(
    () => [
      {
        id: 'two-factor',
        label: 'Two-factor required for payouts',
        enabled: Boolean(affiliateComplianceSettings.requireTwoFactor)
      },
      {
        id: 'tax',
        label: 'Tax profile verified',
        enabled: Boolean(affiliateComplianceSettings.taxComplete)
      },
      {
        id: 'self-referral',
        label: 'Self-referrals blocked',
        enabled: Boolean(affiliateComplianceSettings.selfReferralBlocked)
      },
      {
        id: 'schedule',
        label: affiliateComplianceSettings.payoutSchedule,
        enabled: true
      }
    ],
    [
      affiliateComplianceSettings.payoutSchedule,
      affiliateComplianceSettings.requireTwoFactor,
      affiliateComplianceSettings.selfReferralBlocked,
      affiliateComplianceSettings.taxComplete
    ]
  );
  const upcomingAffiliatePayout = useMemo(
    () => affiliatePayouts.find((payout) => payout.status === 'Scheduled') ?? null,
    [affiliatePayouts]
  );
  const lastAffiliatePayout = useMemo(
    () => affiliatePayouts.find((payout) => payout.status === 'Completed') ?? null,
    [affiliatePayouts]
  );

  const handleFollowToggle = () => {
    setIsFollowing((prev) => !prev);
  };

  const handleVerificationUpload = (slot) => (event) => {
    const file = event.target.files?.[0];
    setVerificationUploads((prev) => ({
      ...prev,
      [slot]: file
        ? { name: file.name, uploadedAt: new Date().toISOString() }
        : null
    }));
  };

  const handleVerificationSubmit = (event) => {
    event.preventDefault();
    if (!canSubmitVerification) return;
    setVerificationStatus('Submitted for review');
  };

  const handleAffiliateLinkCopy = async () => {
    if (!affiliate.shareUrl) {
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(affiliate.shareUrl);
        setAffiliateLinkCopied(true);
        setTimeout(() => setAffiliateLinkCopied(false), 2000);
      }
    } catch (error) {
      console.warn('Failed to copy affiliate link', error);
    }
  };

  const statusColour = verificationStatus === 'Submitted for review' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-600 bg-amber-50 border-amber-200';

  return (
    <section className="bg-slate-50/70 py-16">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-card">
          <div
            className="h-48 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${profileData.banner})` }}
            aria-hidden="true"
          />
          <div className="grid gap-8 p-8 md:grid-cols-[auto_1fr_auto]">
            <div className="-mt-20 flex flex-col items-center gap-4 md:items-start">
              <img
                src={profileData.avatar}
                alt="Profile avatar"
                className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl"
              />
              <button
                type="button"
                onClick={handleFollowToggle}
                className={`w-full rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isFollowing
                    ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'border-primary bg-primary text-white shadow-lg hover:bg-primary-dark'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-slate-900">{profileData.name}</h1>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Trust score {profileData.trustScores.instructor}%</span>
              </div>
              <p className="text-sm text-slate-500">{profileData.handle} • {profileData.location}</p>
              <p className="text-base text-slate-600">{profileData.tagline}</p>
              <p className="text-sm text-slate-600">{profileData.bio}</p>
              <div className="flex flex-wrap gap-2">
                {profileData.trustBadges.map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="m10 1.5 6.5 3v5.31c0 4.03-2.5 7.73-6.24 9.12a.75.75 0 0 1-.52 0C5.5 17.54 3 13.84 3 9.81V4.5L10 1.5Zm1.72 6.53-2.47 2.47-1.0-1.0a.75.75 0 0 0-1.06 1.06l1.53 1.53a.75.75 0 0 0 1.06 0l3-3a.75.75 0 1 0-1.06-1.06Z" />
                    </svg>
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4 text-right text-sm text-slate-600">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Followers</p>
                <p className="text-2xl font-semibold text-slate-900">{formatCompactNumber(displayedFollowerCount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Following</p>
                <p className="text-2xl font-semibold text-slate-900">{formatCompactNumber(profileData.following)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trust metrics</p>
                <p className="mt-2 text-sm text-slate-600">Learner trust {profileData.trustScores.learner}%</p>
                <p className="text-sm text-slate-600">Instructor trust {profileData.trustScores.instructor}%</p>
                <p className="text-sm text-slate-600">Review grade {profileData.trustScores.reviewGrade}/5</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-emerald-50" aria-hidden="true" />
              <div className="relative space-y-6 p-6 lg:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Affiliate revenue hub</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Real-time visibility into partner earnings, payout cadence, and referral performance.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                        <CheckCircleIcon className="h-4 w-4" />
                        {affiliate.status}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                        <BanknotesIcon className="h-4 w-4" />
                        {affiliateSummary.pending} pending
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-3 text-sm lg:items-end">
                    <button
                      type="button"
                      onClick={handleAffiliateLinkCopy}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      {affiliateLinkCopied ? 'Copied share link' : 'Copy share link'}
                    </button>
                    <span className="sr-only" aria-live="polite">
                      {affiliateLinkCopied ? 'Affiliate share link copied to clipboard' : 'Copy affiliate share link'}
                    </span>
                    <a
                      href="/dashboard/learner/affiliate"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-primary transition hover:text-primary-dark"
                    >
                      Launch affiliate control center
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {affiliateMetrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{metric.label}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{metric.value}</p>
                      <p className="text-xs text-slate-500">{metric.helper}</p>
                    </div>
                  ))}
                </div>
                {affiliateHighlights.length ? (
                  <div className="flex flex-wrap gap-2">
                    {affiliateHighlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Payout timeline</p>
                        <p className="text-xs text-slate-500">{affiliateComplianceSettings.payoutSchedule}</p>
                      </div>
                      {upcomingAffiliatePayout ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Next {upcomingAffiliatePayout.status.toLowerCase()}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 space-y-3">
                      {affiliatePayouts.map((payout) => {
                        const tone =
                          payout.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : payout.status === 'Scheduled'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-slate-100 text-slate-600';
                        return (
                          <div
                            key={payout.id}
                            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">{payout.programme}</span>
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
                                {payout.status}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">{payout.amount}</p>
                            <p className="text-xs text-slate-500">
                              Scheduled {payout.scheduled}
                              {payout.processed ? ` • Processed ${payout.processed}` : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {lastAffiliatePayout ? (
                      <p className="mt-4 text-xs text-slate-500">
                        Last release {lastAffiliatePayout.processed ?? lastAffiliatePayout.scheduled} for {lastAffiliatePayout.amount}.
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Commission tiers</p>
                    <p className="text-xs text-slate-500">Aligned with admin defaults for transparent earning thresholds.</p>
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-2 text-left">Tier</th>
                            <th className="px-4 py-2 text-left">Threshold</th>
                            <th className="px-4 py-2 text-left">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {affiliate.tiers.map((tier) => (
                            <tr key={tier.label} className="bg-white">
                              <td className="px-4 py-2 font-semibold text-slate-900">{tier.label}</td>
                              <td className="px-4 py-2 text-slate-600">{tier.threshold}</td>
                              <td className="px-4 py-2 text-slate-600">{tier.rate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                      Tier multipliers update automatically when admin settings evolve, ensuring parity with payout policies.
                    </p>
                  </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Action queue</p>
                    <p className="text-xs text-slate-500">Prioritised workflows to keep partners supported and compliant.</p>
                    <ul className="mt-4 space-y-3 text-sm text-slate-700">
                      {affiliateActions.map((action) => (
                        <li
                          key={action}
                          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <CheckCircleIcon className="mt-0.5 h-5 w-5 text-primary" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Recent referrals</p>
                    <p className="text-xs text-slate-500">High-signal partner wins over the last sprint.</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      {affiliateRecentReferrals.map((referral) => (
                        <div
                          key={referral.organisation}
                          className="flex flex-col rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <span className="font-semibold text-slate-900">{referral.organisation}</span>
                          <span className="text-slate-600">{referral.amount}</span>
                          <span className="text-xs text-slate-500">{referral.date}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Compliance guardrails</p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {affiliateCompliance.map((item) => (
                          <li key={item.id} className="flex items-center gap-3">
                            <CheckCircleIcon
                              className={`h-5 w-5 ${item.enabled ? 'text-emerald-500' : 'text-slate-400'}`}
                            />
                            <span>{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Qualifications & expertise</h2>
              <p className="mt-2 text-sm text-slate-600">{profileData.expertise.join(' • ')}</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {profileData.qualifications.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">✔</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Featured courses</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {profileData.courses.map((course) => (
                  <div key={course.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{course.status} • Next cohort {course.nextCohort}</p>
                    <p className="mt-2 text-sm text-slate-600">{course.learners} learners enrolled</p>
                    <p className="text-sm text-primary">{course.satisfaction}</p>
                    <button className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/5">
                      View curriculum
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Tutor session reviews</h2>
              <div className="mt-4 space-y-5">
                {profileData.reviews.map((review) => (
                  <div key={review.learner} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-slate-900">{review.learner}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{review.rating.toFixed(1)}</span>
                      <span className="text-xs text-slate-500">{review.context}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{review.highlight}</p>
                    <p className="mt-3 text-xs text-slate-500">Reviewed {review.date}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Live feed</h2>
              <div className="mt-4 space-y-4">
                {profileData.liveFeed.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <span className="text-xs text-slate-500">{item.timestamp}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {item.metrics.map((metric) => (
                        <span key={metric} className="rounded-full bg-slate-100 px-3 py-1">{metric}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Identity verification</h2>
                  <p className="mt-1 text-sm text-slate-500">Complete KYC to unlock payouts, live tutoring, and marketplace visibility.</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColour}`}>{verificationStatus}</span>
              </div>
              <div className="mt-4">
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${verificationProgress}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{verificationProgress}% complete • Last reviewed {profileData.verification.lastReviewed}</p>
              </div>
              <form className="mt-5 space-y-4" onSubmit={handleVerificationSubmit}>
                <label className="block text-sm font-semibold text-slate-600">
                  ID type
                  <select
                    value={selectedIdType}
                    onChange={(event) => setSelectedIdType(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {profileData.verification.supported.map((type) => (
                      <option key={type} value={type}>
                        {type.replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-slate-500">{idTypeCopy[selectedIdType]}</p>
                <div className="space-y-3 text-xs text-slate-600">
                  <label className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                    <span className="font-semibold text-slate-700">Front of ID</span>
                    <input type="file" accept="image/*" onChange={handleVerificationUpload('front')} className="text-xs" />
                    {verificationUploads.front ? (
                      <span className="text-emerald-600">Uploaded {verificationUploads.front.name}</span>
                    ) : (
                      <span>Upload a clear colour photo</span>
                    )}
                  </label>
                  <label className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                    <span className="font-semibold text-slate-700">Back of ID</span>
                    <input type="file" accept="image/*" onChange={handleVerificationUpload('back')} className="text-xs" />
                    {verificationUploads.back ? (
                      <span className="text-emerald-600">Uploaded {verificationUploads.back.name}</span>
                    ) : (
                      <span>Ensure holograms or security features are visible</span>
                    )}
                  </label>
                  <label className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                    <span className="font-semibold text-slate-700">Selfie with ID</span>
                    <input type="file" accept="image/*" onChange={handleVerificationUpload('selfie')} className="text-xs" />
                    {verificationUploads.selfie ? (
                      <span className="text-emerald-600">Uploaded {verificationUploads.selfie.name}</span>
                    ) : (
                      <span>Hold the ID next to your face in good lighting</span>
                    )}
                  </label>
                </div>
                <p className="text-xs text-slate-500">{profileData.verification.note}</p>
                <button
                  type="submit"
                  disabled={!canSubmitVerification}
                  className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-card disabled:cursor-not-allowed disabled:bg-primary/40"
                >
                  Submit for review
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Communities</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Member of</p>
                  <ul className="mt-2 space-y-1">
                    {profileData.communities.member.map((community) => (
                      <li key={community} className="flex items-center justify-between">
                        <span>{community}</span>
                        <a href="/communities" className="text-xs font-semibold text-primary">View</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Communities owned</p>
                  <ul className="mt-2 space-y-1">
                    {profileData.communities.owner.map((community) => (
                      <li key={community} className="flex items-center justify-between">
                        <span>{community}</span>
                        <a href="/communities/manage" className="text-xs font-semibold text-primary">Manage</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Moderator in</p>
                  <ul className="mt-2 space-y-1">
                    {profileData.communities.moderator.map((community) => (
                      <li key={community} className="flex items-center justify-between">
                        <span>{community}</span>
                        <a href="/communities" className="text-xs font-semibold text-primary">Toolkit</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin roles</p>
                  <ul className="mt-2 space-y-1">
                    {profileData.communities.admin.map((community) => (
                      <li key={community} className="flex items-center justify-between">
                        <span>{community}</span>
                        <a href="/communities" className="text-xs font-semibold text-primary">Insights</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Followers</h2>
              <p className="mt-1 text-sm text-slate-500">High-trust operators already inside Alex’s orbit.</p>
              <ul className="mt-4 space-y-3">
                {profileData.followersList.map((follower) => (
                  <li key={follower.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{follower.name}</p>
                        <p className="text-xs text-slate-500">{follower.role}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Trust {follower.trust}%</span>
                    </div>
                    <p className="mt-2 text-sm">{follower.tagline}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Social presence</h2>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                {profileData.social.map((socialLink) => (
                  <li key={socialLink.label} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{socialLink.label}</p>
                      <p className="text-xs text-slate-500">{socialLink.handle}</p>
                    </div>
                    <a href={socialLink.url} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Visit
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M5.75 4a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-1.5 0V6.56l-9.22 9.22a.75.75 0 1 1-1.06-1.06l9.22-9.22H5.75A.75.75 0 0 1 5 4.75.75.75 0 0 1 5.75 4Z" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
