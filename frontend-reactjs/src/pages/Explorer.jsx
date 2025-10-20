import { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  LifebuoyIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import ExplorerSearchSection from '../components/search/ExplorerSearchSection.jsx';
import SubscriptionPlanner from '../components/search/SubscriptionPlanner.jsx';
import BlogSearchSection from '../components/search/BlogSearchSection.jsx';

const SECTION_CONFIG = [
  {
    entityType: 'communities',
    title: 'Community search',
    description:
      'Discover thriving guilds, cohorts and resource hubs with clarity on leadership, moderation maturity and collaboration cadences.',
    placeholder: 'Search communities by niche, charter or tags…',
    defaultSort: 'trending',
    sortOptions: [
      { label: 'Trending', value: 'trending' },
      { label: 'Most members', value: 'members' },
      { label: 'Newest', value: 'newest' }
    ],
    filterDefinitions: [
      {
        key: 'visibility',
        label: 'Visibility',
        type: 'multi',
        options: [
          { label: 'Public', value: 'public' },
          { label: 'Private', value: 'private' }
        ]
      },
      {
        key: 'category',
        label: 'Category',
        type: 'multi',
        options: [
          { label: 'Automation', value: 'automation' },
          { label: 'Growth', value: 'growth' },
          { label: 'Operations', value: 'operations' },
          { label: 'Design', value: 'design' }
        ]
      },
      {
        key: 'languages',
        label: 'Languages',
        type: 'multi',
        options: [
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'Portuguese', value: 'pt' }
        ]
      }
    ]
  },
  {
    entityType: 'courses',
    title: 'Course search',
    description:
      'Locate the exact cohort or self-paced experience your operators need. Filter by level, delivery format and price to accelerate onboarding decisions.',
    placeholder: 'Search courses by skill, instructor or outcome…',
    defaultSort: 'relevance',
    sortOptions: [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Top rated', value: 'rating' },
      { label: 'Newest', value: 'newest' },
      { label: 'Price: low to high', value: 'priceLow' },
      { label: 'Price: high to low', value: 'priceHigh' }
    ],
    filterDefinitions: [
      {
        key: 'level',
        label: 'Level',
        type: 'multi',
        options: [
          { label: 'Beginner', value: 'beginner' },
          { label: 'Intermediate', value: 'intermediate' },
          { label: 'Advanced', value: 'advanced' }
        ]
      },
      {
        key: 'deliveryFormat',
        label: 'Format',
        type: 'multi',
        options: [
          { label: 'Cohort', value: 'cohort' },
          { label: 'Self-paced', value: 'self-paced' },
          { label: 'Hybrid', value: 'hybrid' }
        ]
      },
      {
        key: 'price.amount',
        label: 'Price (USD)',
        type: 'range'
      }
    ]
  },
  {
    entityType: 'ebooks',
    title: 'E-book search',
    description:
      'Unlock playbooks, decks and annotated frameworks to support go-to-market and retention workstreams. Filter by categories and reading time to build the perfect library.',
    placeholder: 'Search e-books by topic, author or keyword…',
    defaultSort: 'relevance',
    sortOptions: [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Top rated', value: 'rating' },
      { label: 'Newest', value: 'newest' },
      { label: 'Shortest read', value: 'readingTime' }
    ],
    filterDefinitions: [
      {
        key: 'categories',
        label: 'Categories',
        type: 'multi',
        options: [
          { label: 'Playbooks', value: 'playbook' },
          { label: 'Operations', value: 'operations' },
          { label: 'Growth', value: 'growth' },
          { label: 'Leadership', value: 'leadership' }
        ]
      },
      {
        key: 'readingTimeMinutes',
        label: 'Reading time (minutes)',
        type: 'range'
      }
    ]
  },
  {
    entityType: 'tutors',
    title: 'Tutor search',
    description:
      'Identify verified subject matter experts with the right response times, availability and hourly rates to support learners in real time.',
    placeholder: 'Search tutors by expertise, language or timezone…',
    defaultSort: 'relevance',
    sortOptions: [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Top rated', value: 'rating' },
      { label: 'Price: low to high', value: 'priceLow' },
      { label: 'Price: high to low', value: 'priceHigh' },
      { label: 'Fastest response', value: 'responseTime' }
    ],
    filterDefinitions: [
      {
        key: 'isVerified',
        label: 'Verified only',
        type: 'boolean'
      },
      {
        key: 'languages',
        label: 'Languages',
        type: 'multi',
        options: [
          { label: 'English', value: 'en' },
          { label: 'Japanese', value: 'ja' },
          { label: 'Spanish', value: 'es' }
        ]
      },
      {
        key: 'skills',
        label: 'Skills',
        type: 'multi',
        options: [
          { label: 'AI automation', value: 'ai' },
          { label: 'Curriculum design', value: 'curriculum' },
          { label: 'Growth marketing', value: 'growth' }
        ]
      }
    ]
  },
  {
    entityType: 'profiles',
    title: 'Profile search',
    description:
      'Scout operators, learners and creators with the exact signals you need for your next cohort or community activation.',
    placeholder: 'Search profiles by role, achievements or badges…',
    defaultSort: 'relevance',
    sortOptions: [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Most followers', value: 'followers' },
      { label: 'Newest', value: 'newest' }
    ],
    filterDefinitions: [
      {
        key: 'role',
        label: 'Role',
        type: 'multi',
        options: [
          { label: 'Learner', value: 'user' },
          { label: 'Instructor', value: 'instructor' },
          { label: 'Operator', value: 'operator' }
        ]
      },
      {
        key: 'languages',
        label: 'Languages',
        type: 'multi',
        options: [
          { label: 'English', value: 'en' },
          { label: 'French', value: 'fr' },
          { label: 'Hindi', value: 'hi' }
        ]
      }
    ]
  },
  {
    entityType: 'events',
    title: 'Live classroom search',
    description:
      'Browse upcoming workshops, AMAs and live classrooms. Filter by format and ticketing rules to plan your live programming calendar.',
    placeholder: 'Search live classrooms by host, topic or timezone…',
    defaultSort: 'upcoming',
    sortOptions: [
      { label: 'Next up', value: 'upcoming' },
      { label: 'Newest', value: 'newest' }
    ],
    filterDefinitions: [
      {
        key: 'type',
        label: 'Format',
        type: 'multi',
        options: [
          { label: 'Workshop', value: 'workshop' },
          { label: 'AMA', value: 'ama' },
          { label: 'Cohort session', value: 'cohort' }
        ]
      },
      {
        key: 'isTicketed',
        label: 'Ticketed',
        type: 'boolean'
      }
    ]
  }
];

const HIGHLIGHTS = [
  {
    title: 'Real-time discovery ops',
    body: 'Stream live analytics on how communities, classes and tutors are trending inside your funnel.',
    icon: ArrowTrendingUpIcon
  },
  {
    title: 'Production-ready CRUD',
    body: 'Create, update and curate saved searches with guard-railed workflows and audit-ready logging.',
    icon: ChartBarIcon
  },
  {
    title: 'Global coverage',
    body: 'Localise discovery with multilingual filters and timezone-aware inventory across every surface.',
    icon: GlobeAltIcon
  },
  {
    title: 'Human support on standby',
    body: 'Escalate to our discovery specialists for co-piloting complex rollouts and migration projects.',
    icon: LifebuoyIcon
  }
];

const PLAN_VARIANTS = [
  {
    id: 'free',
    name: 'Free tier',
    price: '$0',
    cadence: 'per seat',
    description: 'Bootstrap your discovery workflows with curated previews and automated weekly digests.',
    features: [
      '3 saved searches with analytics snapshots',
      'Email digests for community + course trends',
      'Lightweight explorer filters and map previews',
      'Access to public communities and blog content'
    ],
    icon: ShieldCheckIcon
  },
  {
    id: 'pro',
    name: 'Pro subscription',
    price: '$39',
    cadence: 'per seat / month',
    description: 'Unlock full-fidelity search, unlimited CRUD and production SLAs across the Edulure graph.',
    features: [
      'Unlimited saved searches with pinning',
      'Advanced filters, response-time analytics and velocity charts',
      'Role-based access control and workspace collaboration',
      'Priority live classroom and tutor availability windows'
    ],
    icon: SparklesIcon
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Let’s talk',
    cadence: 'annual partnerships',
    description: 'Hardening for scale with compliance, private inventory feeds and integration accelerators.',
    features: [
      'Private inventory ingestion + SSO (SAML/OIDC)',
      'Premium onboarding with dedicated solutions architect',
      'Custom SLAs with 24/7 pager coverage',
      'Sandbox + production environments for integrations'
    ],
    icon: BoltIcon
  }
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function HighlightCard({ title, body, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Icon className="h-8 w-8 text-primary" />
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function PlanSwitcher({ activePlanId, onSelect }) {
  return (
    <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-3 shadow-inner sm:grid-cols-3">
      {PLAN_VARIANTS.map((plan) => {
        const isActive = plan.id === activePlanId;
        const Icon = plan.icon;
        return (
          <button
            type="button"
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            className={classNames(
              'flex flex-col items-start gap-3 rounded-2xl border px-5 py-4 text-left transition',
              isActive
                ? 'border-primary bg-primary/5 shadow-card'
                : 'border-transparent hover:border-primary/40 hover:bg-primary/5'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className={classNames('h-6 w-6', isActive ? 'text-primary' : 'text-slate-400')} />
              <div>
                <p className="text-sm font-semibold text-slate-500">{plan.name}</p>
                <p className="text-base font-semibold text-slate-900">
                  {plan.price}{' '}
                  <span className="text-xs font-medium text-slate-400">{plan.cadence}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">{plan.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function PlanDetail({ plan }) {
  return (
    <div className="rounded-4xl border border-slate-100 bg-gradient-to-br from-white via-white to-slate-50 p-10 shadow-xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {plan.name}
          </span>
          <h3 className="mt-4 text-3xl font-semibold text-slate-900">{plan.description}</h3>
        </div>
        <div className="flex items-baseline gap-2 text-3xl font-bold text-primary">
          {plan.price}
          <span className="text-xs font-semibold uppercase tracking-wide text-primary/60">{plan.cadence}</span>
        </div>
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-white/70 p-4 text-sm text-slate-700">
            <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-none text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary/70">
        <ShieldCheckIcon className="h-5 w-5" />
        SOC2-ready infrastructure · Continuous compliance · Production-grade monitoring
      </div>
    </div>
  );
}

export default function Explorer() {
  const [activePlanId, setActivePlanId] = useState('pro');

  const activePlan = useMemo(() => PLAN_VARIANTS.find((plan) => plan.id === activePlanId) ?? PLAN_VARIANTS[0], [activePlanId]);

  return (
    <div className="bg-slate-100 pb-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-6 py-16">
        <header className="space-y-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Explorer
          </span>
          <h1 className="text-4xl font-semibold text-slate-900">Operational discovery, production ready</h1>
          <p className="mx-auto max-w-3xl text-sm text-slate-600">
            Orchestrate community scouting, course procurement, live classroom scheduling and content sourcing from one interactive surface. Every search ships with full CRUD, analytics, and subscription-aware guardrails.
          </p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <HighlightCard key={item.title} {...item} />
            ))}
          </div>
        </header>

        <section className="space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Subscription and free tier</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Model how each plan unlocks the explorer for your team. Toggle through tiers to align procurement, then design the exact subscription ladder with the planner.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
              <SparklesIcon className="h-5 w-5" />
              Billing ready · Seats aware · CRUD safe
            </div>
          </div>
          <PlanSwitcher activePlanId={activePlanId} onSelect={setActivePlanId} />
          <PlanDetail plan={activePlan} />
        </section>

        <SubscriptionPlanner />

        <div className="space-y-12">
          {SECTION_CONFIG.map((section) => (
            <ExplorerSearchSection key={section.entityType} {...section} />
          ))}
        </div>

        <section className="rounded-4xl border border-slate-200 bg-white/80 p-10 shadow-xl">
          <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Content intelligence
              </span>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">Blog search</h2>
              <p className="mt-3 text-sm text-slate-600">
                Deploy newsroom-grade search across thought leadership, tactical breakdowns and launch recaps. Collaborate with marketing and enablement teams directly from saved search workspaces.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <AcademicCapIcon className="h-4 w-4" /> Editorial briefs
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Export curated stories to power newsletters and onboarding sequences.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <UserCircleIcon className="h-4 w-4" /> Team handoffs
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Attach stakeholders, annotate drafts and keep distribution aligned.</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <BlogSearchSection />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
