import { useMemo } from 'react';
import {
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  LifebuoyIcon,
  SparklesIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import ExplorerSearchSection from '../components/search/ExplorerSearchSection.jsx';
import BlogSearchSection from '../components/search/BlogSearchSection.jsx';
import usePageMetadata from '../hooks/usePageMetadata.js';

const CATEGORY_OPTIONS = [
  { label: 'Automation', value: 'automation' },
  { label: 'Growth', value: 'growth' },
  { label: 'Operations', value: 'operations' },
  { label: 'Design', value: 'design' },
  { label: 'Revenue', value: 'revenue' },
  { label: 'Enablement', value: 'enablement' }
];

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'French', value: 'fr' },
  { label: 'Japanese', value: 'ja' }
];

const COUNTRY_OPTIONS = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Brazil', value: 'BR' },
  { label: 'Portugal', value: 'PT' },
  { label: 'Japan', value: 'JP' },
  { label: 'India', value: 'IN' }
];

const TAG_OPTIONS = [
  { label: 'Automation', value: 'automation' },
  { label: 'Retention', value: 'retention' },
  { label: 'Monetisation', value: 'monetisation' },
  { label: 'Analytics', value: 'analytics' },
  { label: 'Trust & Safety', value: 'trust' },
  { label: 'Playbooks', value: 'playbooks' }
];

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
        options: CATEGORY_OPTIONS
      },
      {
        key: 'languages',
        label: 'Languages',
        type: 'multi',
        options: LANGUAGE_OPTIONS
      },
      {
        key: 'country',
        label: 'Country',
        type: 'multi',
        options: COUNTRY_OPTIONS
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'multi',
        options: TAG_OPTIONS
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
        key: 'category',
        label: 'Category',
        type: 'multi',
        options: CATEGORY_OPTIONS
      },
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
      },
      {
        key: 'languages',
        label: 'Languages',
        type: 'multi',
        options: LANGUAGE_OPTIONS
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'multi',
        options: TAG_OPTIONS
      },
      {
        key: 'country',
        label: 'Country',
        type: 'multi',
        options: COUNTRY_OPTIONS
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
        options: CATEGORY_OPTIONS
      },
      {
        key: 'readingTimeMinutes',
        label: 'Reading time (minutes)',
        type: 'range'
      },
      {
        key: 'languages',
        label: 'Languages',
        type: 'multi',
        options: LANGUAGE_OPTIONS
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'multi',
        options: TAG_OPTIONS
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
        options: LANGUAGE_OPTIONS
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
      },
      {
        key: 'country',
        label: 'Country',
        type: 'multi',
        options: COUNTRY_OPTIONS
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
        options: LANGUAGE_OPTIONS
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'multi',
        options: TAG_OPTIONS
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
      },
      {
        key: 'timezone',
        label: 'Timezone',
        type: 'multi',
        options: [
          { label: 'UTC', value: 'UTC' },
          { label: 'ET', value: 'America/New_York' },
          { label: 'PT', value: 'America/Los_Angeles' },
          { label: 'BST', value: 'Europe/London' }
        ]
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

function HighlightCard({ title, body, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Icon className="h-8 w-8 text-primary" />
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function CommunityAccessPanel() {
  return (
    <section className="rounded-4xl border border-slate-200 bg-white/80 p-10 shadow-xl">
      <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr] lg:items-center">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Community-gated access
          </span>
          <h2 className="text-3xl font-semibold text-slate-900">Subscriptions live inside community workspaces</h2>
          <p className="text-sm text-slate-600">
            Join a community from the directory to unlock the right explorer capabilities for your role. Upgrades, seat assignments and add-ons are handled by community leads so the explorer stays aligned with membership policies.
          </p>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <CheckCircleIcon className="h-5 w-5 flex-none text-primary" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Choose a community workspace</p>
                <p className="text-sm text-slate-600">
                  Browse the community directory, review governance details and request access directly from the Explorer.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <CheckCircleIcon className="h-5 w-5 flex-none text-primary" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Coordinate subscription upgrades</p>
                <p className="text-sm text-slate-600">
                  Owners and moderators manage billing, add-ons and seat assignments from the Community Monetisation console.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <CheckCircleIcon className="h-5 w-5 flex-none text-primary" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Launch with membership guardrails</p>
                <p className="text-sm text-slate-600">
                  Every saved search inherits the community’s safety settings, audit logging and moderation workflows.
                </p>
              </div>
            </li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/communities"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90"
            >
              Explore communities
            </Link>
            <Link
              to="/dashboard/community/monetisation"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
            >
              Open monetisation console
            </Link>
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
            <SparklesIcon className="h-4 w-4" />
            Live handoff
          </div>
          <p className="text-sm text-slate-600">
            Need help mapping memberships to explorer permissions? Our community success pod will join your workspace to set up the billing ladder, review compliance requirements and prepare reporting for finance teams.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Community leads · Finance partners · Explorer admins
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Explorer() {
  const keywords = useMemo(() => {
    const result = new Set();
    SECTION_CONFIG.forEach((section) => {
      result.add(section.entityType);
      section.filterDefinitions?.forEach((filter) => {
        if (Array.isArray(filter.options)) {
          filter.options.forEach((option) => {
            if (typeof option.label === 'string') {
              result.add(option.label);
            }
          });
        }
      });
    });
    return Array.from(result);
  }, []);

  usePageMetadata({
    title: 'Explorer · Unified search across Edulure',
    description:
      'Search communities, courses, e-books, tutors, and profiles in a single interface. Combine filters, saved views, and analytics to steer high-signal discovery.',
    canonicalPath: '/explorer',
    keywords,
    analytics: {
      page_type: 'explorer',
      section_count: SECTION_CONFIG.length
    }
  });

  return (
    <div className="bg-slate-100 pb-24 pt-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-6">
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {HIGHLIGHTS.map((item) => (
            <HighlightCard key={item.title} {...item} />
          ))}
        </section>

        <CommunityAccessPanel />

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
