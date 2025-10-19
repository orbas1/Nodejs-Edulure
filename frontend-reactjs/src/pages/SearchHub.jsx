import ExplorerSearchSection from '../components/search/ExplorerSearchSection.jsx';
import SubscriptionPlanner from '../components/search/SubscriptionPlanner.jsx';
import BlogSearchSection from '../components/search/BlogSearchSection.jsx';

const SECTION_CONFIG = [
  {
    entityType: 'communities',
    title: 'Community search',
    description:
      'Surface revenue-ready communities with clear charters, moderation maturity and timezone coverage. Use filters to line up the next partnership.',
    placeholder: 'Search communities by niche, leadership or tags…',
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
      'Find the exact cohort or self-paced experience that fits your operators. Filter by level, delivery format and price bands to accelerate onboarding decisions.',
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
      'Unlock decks, playbooks and frameworks to support go-to-market and retention workstreams. Filter by categories and reading time to build the perfect library.',
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

export default function SearchHub() {
  return (
    <div className="bg-slate-100 pb-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Discovery Ops
          </span>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Search orchestration hub</h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm text-slate-600">
            A single control surface to manage subscription architecture and power-search across every Edulure entity. Compare, curate and ship discovery experiences that feel production ready.
          </p>
        </header>

        <SubscriptionPlanner />

        <div className="space-y-12">
          {SECTION_CONFIG.map((section) => (
            <ExplorerSearchSection key={section.entityType} {...section} />
          ))}
        </div>

        <BlogSearchSection />
      </div>
    </div>
  );
}
