import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  BookmarkIcon,
  BookmarkSlashIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  MegaphoneIcon,
  UsersIcon,
  AcademicCapIcon,
  BookOpenIcon,
  UserGroupIcon,
  UserCircleIcon,
  MapPinIcon,
  SparklesIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import {
  searchExplorer,
  listSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch
} from '../api/explorerApi.js';
import { recordExplorerInteraction } from '../api/analyticsApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import worldMap from '../data/world-110m.json';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const ENTITY_META = [
  {
    key: 'communities',
    label: 'Communities',
    description: 'Guilds, cohorts, and resource hubs where members collaborate in real time.',
    icon: UsersIcon,
    sortOptions: [
      { label: 'Trending', value: 'trending' },
      { label: 'Most members', value: 'members' },
      { label: 'Newest', value: 'newest' }
    ]
  },
  {
    key: 'courses',
    label: 'Courses',
    description: 'Cohort and self-paced programmes built for operational excellence.',
    icon: AcademicCapIcon,
    sortOptions: [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Top rated', value: 'rating' },
      { label: 'Newest', value: 'newest' },
      { label: 'Price: low to high', value: 'priceLow' },
      { label: 'Price: high to low', value: 'priceHigh' }
    ]
  },
  {
    key: 'ebooks',
    label: 'Ebooks',
    description: 'Rights-managed playbooks, decks, and annotated frameworks.',
    icon: BookOpenIcon,
    sortOptions: [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Top rated', value: 'rating' },
      { label: 'Newest', value: 'newest' },
      { label: 'Shortest read', value: 'readingTime' }
    ]
  },
  {
    key: 'tutors',
    label: 'Tutors',
    description: 'Verified experts available for clinics, office hours, and retainers.',
    icon: UserGroupIcon,
    sortOptions: [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Top rated', value: 'rating' },
      { label: 'Price: low to high', value: 'priceLow' },
      { label: 'Price: high to low', value: 'priceHigh' },
      { label: 'Fastest response', value: 'responseTime' }
    ]
  },
  {
    key: 'profiles',
    label: 'Profiles',
    description: 'Learners, operators, and creators shaping the Edulure network.',
    icon: UserCircleIcon,
    sortOptions: [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Most followers', value: 'followers' },
      { label: 'Newest', value: 'newest' }
    ]
  },
  {
    key: 'ads',
    label: 'Campaigns',
    description: 'Live Edulure Ads campaigns with targeting and performance summaries.',
    icon: MegaphoneIcon,
    sortOptions: [
      { label: 'Top performing', value: 'performance' },
      { label: 'Highest spend', value: 'spend' },
      { label: 'Newest', value: 'newest' }
    ]
  },
  {
    key: 'events',
    label: 'Events',
    description: 'Live workshops, classrooms, and AMAs with capacity and ticketing.',
    icon: CalendarDaysIcon,
    sortOptions: [
      { label: 'Next up', value: 'upcoming' },
      { label: 'Newest', value: 'newest' }
    ]
  }
];

const ENTITY_KEYS = ENTITY_META.map((entity) => entity.key);

const DEFAULT_FILTERS = {};

const DEFAULT_GLOBAL_FILTERS = {};

const DEFAULT_SORT = ENTITY_META.reduce((acc, entity) => {
  const fallback = entity.sortOptions?.[0]?.value ?? null;
  if (fallback) {
    acc[entity.key] = fallback;
  }
  return acc;
}, {});

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Portuguese', value: 'pt' }
];

const FILTER_DEFINITIONS = {
  communities: [
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
        { label: 'Operations', value: 'operations' }
      ]
    }
  ],
  courses: [
    {
      key: 'level',
      label: 'Course level',
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
    }
  ],
  ebooks: [
    {
      key: 'categories',
      label: 'Category',
      type: 'multi',
      options: [
        { label: 'Playbooks', value: 'playbook' },
        { label: 'Operations', value: 'operations' },
        { label: 'Growth', value: 'growth' }
      ]
    }
  ],
  tutors: [
    {
      key: 'isVerified',
      label: 'Verified tutors only',
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
    }
  ],
  profiles: [
    {
      key: 'role',
      label: 'Role',
      type: 'multi',
      options: [
        { label: 'Learner', value: 'user' },
        { label: 'Instructor', value: 'instructor' },
        { label: 'Admin', value: 'admin' }
      ]
    }
  ],
  ads: [
    {
      key: 'status',
      label: 'Status',
      type: 'multi',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' }
      ]
    }
  ],
  events: [
    {
      key: 'isTicketed',
      label: 'Ticketed events only',
      type: 'boolean'
    }
  ]
};

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatNumber(value) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('en-US').format(value);
}

function ExplorerMap({ markers, bounds }) {
  if (!markers?.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        <MapPinIcon className="mx-auto mb-3 h-6 w-6 text-slate-400" />
        Map previews appear once results include geographic metadata.
      </div>
    );
  }

  const projectionConfig = bounds
    ? {
        scale: 120,
        center: [
          (bounds.minLng + bounds.maxLng) / 2,
          (bounds.minLat + bounds.maxLat) / 2
        ]
      }
    : { scale: 120 };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <ComposableMap projectionConfig={projectionConfig} style={{ width: '100%', height: '320px' }}>
        <Geographies geography={worldMap}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                stroke="#CBD5F5"
                strokeWidth={0.3}
                fill="#F8FAFC"
              />
            ))
          }
        </Geographies>
        {markers.map((marker, index) => (
          <Marker key={`${marker.context}-${marker.label}-${index}`} coordinates={[marker.longitude, marker.latitude]}>
            <circle r={4} fill="#6366f1" stroke="#fff" strokeWidth={1} />
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}

ExplorerMap.propTypes = {
  markers: PropTypes.arrayOf(
    PropTypes.shape({
      longitude: PropTypes.number.isRequired,
      latitude: PropTypes.number.isRequired,
      label: PropTypes.string,
      context: PropTypes.string
    })
  ),
  bounds: PropTypes.shape({
    minLng: PropTypes.number.isRequired,
    maxLng: PropTypes.number.isRequired,
    minLat: PropTypes.number.isRequired,
    maxLat: PropTypes.number.isRequired
  })
};

ExplorerMap.defaultProps = {
  markers: [],
  bounds: null
};

function SponsoredAdCard({ placement }) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
        <span className="text-amber-500">Sponsored</span>
        <span className="text-amber-300">Slot #{placement.position}</span>
      </div>
      <h4 className="mt-2 text-base font-semibold text-slate-900">{placement.headline}</h4>
      {placement.description && <p className="mt-2 text-sm text-slate-600">{placement.description}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <span>{placement.disclosure ?? 'Edulure Ads placement'}</span>
        {placement.ctaUrl && (
          <a
            href={placement.ctaUrl}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit campaign
          </a>
        )}
      </div>
    </div>
  );
}

SponsoredAdCard.propTypes = {
  placement: PropTypes.shape({
    placementId: PropTypes.string.isRequired,
    headline: PropTypes.string.isRequired,
    description: PropTypes.string,
    ctaUrl: PropTypes.string,
    disclosure: PropTypes.string,
    position: PropTypes.number
  }).isRequired
};

function ResultCard({ hit, onTrackInteraction }) {
  const handleInteraction = () => {
    if (typeof onTrackInteraction === 'function') {
      onTrackInteraction(hit.entityType, hit.id);
    }
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Squares2X2Icon className="h-3.5 w-3.5" />
              {hit.entityType}
            </span>
            {hit.geo?.country && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                <GlobeAltIcon className="h-3 w-3" />
                {hit.geo.country}
              </span>
            )}
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">{hit.title}</h3>
          {hit.subtitle && <p className="text-sm font-medium text-slate-500">{hit.subtitle}</p>}
          {hit.description && <p className="mt-2 text-sm text-slate-600">{hit.description}</p>}
          {hit.tags?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {hit.tags.slice(0, 6).map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {hit.metrics && Object.keys(hit.metrics).length > 0 && (
          <dl className="grid grid-cols-2 gap-3 text-right text-xs text-slate-500 sm:grid-cols-3">
            {Object.entries(hit.metrics)
              .filter(([, value]) => value !== null && value !== undefined)
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">{key}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {typeof value === 'number' ? formatNumber(value) : String(value)}
                  </dd>
                </div>
              ))}
          </dl>
        )}
      </div>
      {hit.actions?.length ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {hit.actions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              onClick={handleInteraction}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
            >
              <SparklesIcon className="h-4 w-4" />
              {action.label}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

ResultCard.propTypes = {
  hit: PropTypes.shape({
    entityType: PropTypes.string.isRequired,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    description: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    geo: PropTypes.shape({
      country: PropTypes.string
    }),
    metrics: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
    actions: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        href: PropTypes.string.isRequired
      })
    )
  }).isRequired,
  onTrackInteraction: PropTypes.func
};

ResultCard.defaultProps = {
  onTrackInteraction: undefined
};

export default function Explorer() {
  const { isAuthenticated, session } = useAuth();
  const authToken = session?.tokens?.accessToken;

  const [queryDraft, setQueryDraft] = useState('automation launch');
  const [searchParams, setSearchParams] = useState({
    query: 'automation launch',
    entityTypes: ENTITY_KEYS,
    filters: DEFAULT_FILTERS,
    globalFilters: DEFAULT_GLOBAL_FILTERS,
    sort: { ...DEFAULT_SORT },
    page: 1
  });
  const [results, setResults] = useState(null);
  const [analyticsContext, setAnalyticsContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeEntity, setActiveEntity] = useState(ENTITY_KEYS[0]);

  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchError, setSavedSearchError] = useState(null);
  const [savedSearchLoading, setSavedSearchLoading] = useState(false);

  const [isSaveModalOpen, setSaveModalOpen] = useState(false);
  const [newSavedSearchName, setNewSavedSearchName] = useState('');
  const [pinSavedSearch, setPinSavedSearch] = useState(true);
  const [saveInFlight, setSaveInFlight] = useState(false);

  const abortRef = useRef(null);

  const executeSearch = useCallback(
    async (params) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const response = await searchExplorer(
          {
            query: params.query,
            entityTypes: params.entityTypes,
            filters: params.filters,
            globalFilters: params.globalFilters,
            sort: params.sort,
            page: params.page ?? 1,
            perPage: 12
          },
          { token: authToken, signal: controller.signal }
        );
        if (!response?.success) {
          throw new Error(response?.message ?? 'Search failed');
        }
        setResults(response.data);
        setAnalyticsContext(response.data?.analytics ?? null);
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to fetch explorer results');
        setAnalyticsContext(null);
      } finally {
        setLoading(false);
      }
    },
    [authToken]
  );

  const handleResultInteraction = useCallback(
    (entityType, resultId) => {
      if (!analyticsContext?.searchEventId || !entityType || !resultId) {
        return;
      }

      recordExplorerInteraction(
        {
          searchEventId: analyticsContext.searchEventId,
          entityType,
          resultId,
          interactionType: 'click'
        },
        { token: authToken }
      ).catch((interactionError) => {
        console.warn('Failed to record explorer interaction', interactionError);
      });
    },
    [analyticsContext, authToken]
  );

  useEffect(() => {
    executeSearch(searchParams);
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [searchParams, executeSearch]);

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      setSavedSearches([]);
      return;
    }
    const controller = new AbortController();
    setSavedSearchLoading(true);
    setSavedSearchError(null);
    listSavedSearches({ token: authToken, signal: controller.signal })
      .then((response) => {
        setSavedSearches(response?.data ?? []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setSavedSearchError(err.message ?? 'Unable to load saved searches');
      })
      .finally(() => setSavedSearchLoading(false));

    return () => controller.abort();
  }, [isAuthenticated, authToken]);

  useEffect(() => {
    if (!searchParams.entityTypes.includes(activeEntity)) {
      setActiveEntity(searchParams.entityTypes[0] ?? ENTITY_KEYS[0]);
    }
  }, [searchParams.entityTypes, activeEntity]);

  const updateFilters = useCallback((entity, key, updater) => {
    setSearchParams((prev) => {
      const nextFilters = { ...prev.filters };
      const entityFilters = { ...(nextFilters[entity] ?? {}) };
      const nextValue = updater(entityFilters[key]);

      if (nextValue === undefined || nextValue === null || (Array.isArray(nextValue) && nextValue.length === 0) || nextValue === false) {
        delete entityFilters[key];
      } else {
        entityFilters[key] = nextValue;
      }

      if (Object.keys(entityFilters).length === 0) {
        delete nextFilters[entity];
      } else {
        nextFilters[entity] = entityFilters;
      }

      return { ...prev, filters: nextFilters, page: 1 };
    });
  }, []);

  const toggleEntityFilterValue = useCallback((entity, key, value) => {
    updateFilters(entity, key, (current = []) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return Array.from(next);
    });
  }, [updateFilters]);

  const toggleEntityBooleanFilter = useCallback(
    (entity, key) => {
      updateFilters(entity, key, (current = false) => !current);
    },
    [updateFilters]
  );

  const updateGlobalFilter = useCallback((key, updater) => {
    setSearchParams((prev) => {
      const nextGlobal = { ...prev.globalFilters };
      const nextValue = updater(nextGlobal[key]);
      if (nextValue === undefined || nextValue === null || (Array.isArray(nextValue) && nextValue.length === 0)) {
        delete nextGlobal[key];
      } else {
        nextGlobal[key] = nextValue;
      }
      return { ...prev, globalFilters: nextGlobal, page: 1 };
    });
  }, []);

  const toggleLanguageFilter = useCallback(
    (language) => {
      updateGlobalFilter('languages', (current = []) => {
        const next = new Set(current);
        if (next.has(language)) {
          next.delete(language);
        } else {
          next.add(language);
        }
        return Array.from(next);
      });
    },
    [updateGlobalFilter]
  );

  const toggleEntityVisibility = useCallback((entity) => {
    setSearchParams((prev) => {
      const nextSet = new Set(prev.entityTypes);
      if (nextSet.has(entity)) {
        if (nextSet.size === 1) {
          return prev; // Prevent empty entity set
        }
        nextSet.delete(entity);
      } else {
        nextSet.add(entity);
      }
      return { ...prev, entityTypes: Array.from(nextSet), page: 1 };
    });
  }, []);

  const updateSortForEntity = useCallback((entity, value) => {
    setSearchParams((prev) => ({
      ...prev,
      sort: { ...prev.sort, [entity]: value },
      page: 1
    }));
  }, []);

  const handleSearchSubmit = useCallback(
    (event) => {
      const submittedValue = event?.target?.elements?.search?.value ?? queryDraft;
      setSearchParams((prev) => ({ ...prev, query: submittedValue, page: 1 }));
    },
    [queryDraft]
  );

  const currentEntityMeta = useMemo(() => ENTITY_META.find((meta) => meta.key === activeEntity), [activeEntity]);
  const activeEntityResult = results?.results?.[activeEntity];
  const totalForEntity = results?.totals?.[activeEntity] ?? 0;
  const sponsoredPlacements = results?.adsPlacements ?? [];

  const canSaveSearch = isAuthenticated && Boolean(authToken);

  const handleSaveSearch = async () => {
    if (!newSavedSearchName.trim()) {
      setSavedSearchError('Provide a name for the saved search.');
      return;
    }
    setSaveInFlight(true);
    setSavedSearchError(null);
    try {
      const payload = {
        name: newSavedSearchName.trim(),
        query: searchParams.query,
        entityTypes: searchParams.entityTypes,
        filters: searchParams.filters,
        globalFilters: searchParams.globalFilters,
        sort: searchParams.sort,
        isPinned: pinSavedSearch
      };
      const response = await createSavedSearch(payload, { token: authToken });
      if (!response?.success) {
        throw new Error(response?.message ?? 'Failed to save search');
      }
      const created = response.data;
      setSavedSearches((prev) => [created, ...prev.filter((search) => search.id !== created.id)]);
      setSaveModalOpen(false);
      setNewSavedSearchName('');
    } catch (err) {
      setSavedSearchError(err.message ?? 'Unable to save search');
    } finally {
      setSaveInFlight(false);
    }
  };

  const applySavedSearch = async (savedSearch) => {
    setQueryDraft(savedSearch.query ?? '');
    setSearchParams({
      query: savedSearch.query ?? '',
      entityTypes: savedSearch.entityTypes?.length ? [...savedSearch.entityTypes] : ENTITY_KEYS,
      filters: savedSearch.filters ? JSON.parse(JSON.stringify(savedSearch.filters)) : {},
      globalFilters: savedSearch.globalFilters ? { ...savedSearch.globalFilters } : {},
      sort: savedSearch.sortPreferences ? { ...savedSearch.sortPreferences } : { ...DEFAULT_SORT },
      page: 1
    });
    if (isAuthenticated && savedSearch.id) {
      try {
        await updateSavedSearch(savedSearch.id, { lastUsedAt: new Date().toISOString() }, { token: authToken });
      } catch (err) {
        console.warn('Failed to update saved search last used timestamp', err);
      }
    }
  };

  const togglePinSavedSearch = async (savedSearch) => {
    try {
      const response = await updateSavedSearch(savedSearch.id, { isPinned: !savedSearch.isPinned }, { token: authToken });
      if (response?.success) {
        const updated = response.data;
        setSavedSearches((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      }
    } catch (err) {
      setSavedSearchError(err.message ?? 'Unable to update saved search');
    }
  };

  const removeSavedSearch = async (savedSearch) => {
    try {
      await deleteSavedSearch(savedSearch.id, { token: authToken });
      setSavedSearches((prev) => prev.filter((entry) => entry.id !== savedSearch.id));
    } catch (err) {
      setSavedSearchError(err.message ?? 'Unable to delete saved search');
    }
  };

  return (
    <section className="bg-slate-50/70 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-4xl border border-slate-200 bg-white px-8 py-10 shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <SparklesIcon className="h-4 w-4" />
                Explorer Intelligence
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">
                Discover cohorts, talent, and assets across the Edulure network
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                The explorer blends Meilisearch relevance with follow graph, engagement, and monetisation signals so revenue teams
                can activate the right communities, instructors, and experiences instantly.
              </p>
            </div>
            <div className="w-full max-w-md">
              <SearchBar
                value={queryDraft}
                onChange={(value) => setQueryDraft(value)}
                onSubmit={handleSearchSubmit}
                loading={loading}
                placeholder="Search for automation cohorts, tutors, or campaigns"
                ariaLabel="Search explorer"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              Global filters
            </div>
            {LANGUAGE_OPTIONS.map((option) => {
              const isActive = searchParams.globalFilters?.languages?.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleLanguageFilter(option.value)}
                  className={classNames(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition',
                    isActive ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() =>
                setSearchParams((prev) => ({ ...prev, globalFilters: {}, filters: {}, sort: { ...DEFAULT_SORT }, page: 1 }))
              }
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary"
            >
              <ArrowPathIcon className="h-4 w-4" /> Reset filters
            </button>
            {canSaveSearch && (
              <button
                type="button"
                onClick={() => {
                  setSavedSearchError(null);
                  setSaveModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                <BookmarkIcon className="h-4 w-4" /> Save this search
              </button>
            )}
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[300px,1fr]">
          <aside className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Entity visibility</h2>
                <Squares2X2Icon className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Toggle which explorer indexes participate in every query. At least one entity must remain active.
              </p>
              <div className="mt-4 space-y-2">
                {ENTITY_META.map((entity) => {
                  const enabled = searchParams.entityTypes.includes(entity.key);
                  return (
                    <label
                      key={entity.key}
                      className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary"
                    >
                      <span className="flex items-center gap-2">
                        <entity.icon className="h-4 w-4 text-primary" />
                        {entity.label}
                      </span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={enabled}
                        onChange={() => toggleEntityVisibility(entity.key)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Filters</h2>
                <AdjustmentsHorizontalIcon className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-2 text-xs text-slate-500">Filters adapt to the entity you are viewing.</p>
              <div className="mt-4 space-y-6">
                {(FILTER_DEFINITIONS[activeEntity] ?? []).map((definition) => {
                  if (definition.type === 'multi') {
                    const currentValues = searchParams.filters?.[activeEntity]?.[definition.key] ?? [];
                    return (
                      <div key={definition.key}>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{definition.label}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {definition.options.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleEntityFilterValue(activeEntity, definition.key, option.value)}
                              className={classNames(
                                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition',
                                currentValues.includes(option.value)
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (definition.type === 'boolean') {
                    const currentValue = searchParams.filters?.[activeEntity]?.[definition.key] ?? false;
                    return (
                      <label key={definition.key} className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-primary">
                        {definition.label}
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          checked={Boolean(currentValue)}
                          onChange={() => toggleEntityBooleanFilter(activeEntity, definition.key)}
                        />
                      </label>
                    );
                  }

                  return null;
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Saved searches</h2>
                <BookmarkIcon className="h-5 w-5 text-slate-400" />
              </div>
              {!canSaveSearch ? (
                <p className="mt-3 text-xs text-slate-500">
                  Sign in to bookmark explorer queries, pin launch playbooks, and share discovery packs with your team.
                </p>
              ) : (
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  {savedSearchLoading && <p className="text-xs text-slate-400">Loading saved searches…</p>}
                  {savedSearchError && (
                    <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600" role="alert">
                      {savedSearchError}
                    </p>
                  )}
                  {!savedSearchLoading && !savedSearches.length && (
                    <p className="text-xs text-slate-500">No saved searches yet. Capture your favourite queries to reuse later.</p>
                  )}
                  {savedSearches.map((savedSearch) => (
                    <div
                      key={savedSearch.id}
                      className="rounded-2xl border border-slate-200 bg-white/60 px-3 py-3 shadow-sm transition hover:border-primary"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => applySavedSearch(savedSearch)}
                            className="text-left text-sm font-semibold text-slate-800 hover:text-primary"
                          >
                            {savedSearch.name}
                          </button>
                          <p className="mt-1 text-xs text-slate-500">
                            {savedSearch.entityTypes?.length ?? 0} entities ·{' '}
                            {savedSearch.query ? `“${savedSearch.query}”` : 'All content'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => togglePinSavedSearch(savedSearch)}
                            className={classNames(
                              'inline-flex h-7 w-7 items-center justify-center rounded-full border text-slate-400 transition',
                              savedSearch.isPinned
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-slate-200 hover:border-primary hover:text-primary'
                            )}
                            aria-label={savedSearch.isPinned ? 'Unpin saved search' : 'Pin saved search'}
                          >
                            {savedSearch.isPinned ? <BookmarkSlashIcon className="h-4 w-4" /> : <BookmarkIcon className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSavedSearch(savedSearch)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-red-500 hover:text-red-500"
                            aria-label="Delete saved search"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <div className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <nav className="flex flex-wrap gap-3" aria-label="Explorer entity tabs">
                {ENTITY_META.map((entity) => {
                  const total = results?.totals?.[entity.key] ?? 0;
                  const isActive = activeEntity === entity.key;
                  const enabled = searchParams.entityTypes.includes(entity.key);
                  return (
                    <button
                      key={entity.key}
                      type="button"
                      disabled={!enabled}
                      onClick={() => setActiveEntity(entity.key)}
                      className={classNames(
                        'group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                        isActive
                          ? 'border-primary bg-primary text-white shadow-md'
                          : enabled
                          ? 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                          : 'border-slate-100 text-slate-300'
                      )}
                    >
                      <entity.icon className={classNames('h-4 w-4', isActive ? 'text-white' : enabled ? 'text-primary' : 'text-slate-300')} />
                      {entity.label}
                      <span
                        className={classNames(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {formatNumber(total)}
                      </span>
                    </button>
                  );
                })}
              </nav>
              {currentEntityMeta && (
                <p className="mt-4 text-sm text-slate-500">{currentEntityMeta.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {loading ? 'Refreshing results…' : `${formatNumber(totalForEntity)} results`}
                </p>
                {currentEntityMeta?.sortOptions?.length ? (
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    Sort by
                    <select
                      value={searchParams.sort?.[activeEntity] ?? currentEntityMeta.sortOptions[0].value}
                      onChange={(event) => updateSortForEntity(activeEntity, event.target.value)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 focus:border-primary focus:outline-none"
                    >
                      {currentEntityMeta.sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>

            {sponsoredPlacements.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Sponsored spotlights</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Campaigns aligned with “{searchParams.query || 'All content'}”.
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                    {sponsoredPlacements.length} active
                  </span>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {sponsoredPlacements.map((placement) => (
                    <SponsoredAdCard key={placement.placementId} placement={placement} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600" role="alert">
                {error}
              </div>
            )}

            {loading && !activeEntityResult && (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="animate-pulse rounded-3xl border border-slate-100 bg-white p-6">
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="mt-3 h-5 w-64 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            )}

            {!loading && activeEntityResult?.hits?.length === 0 && !error && (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
                <h3 className="text-lg font-semibold text-slate-800">No results yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Adjust filters or broaden your query to pull in more explorer signals. Saved searches make it easy to revisit
                  successful discovery packs.
                </p>
              </div>
            )}

            {activeEntityResult?.hits?.length ? (
              <div className="space-y-4">
                {activeEntityResult.hits.map((hit) => (
                  <ResultCard
                    key={`${hit.entityType}-${hit.id}`}
                    hit={hit}
                    onTrackInteraction={handleResultInteraction}
                  />
                ))}
              </div>
            ) : null}

            <ExplorerMap markers={results?.markers?.items ?? []} bounds={results?.markers?.bounds ?? null} />
          </div>
        </div>
      </div>

      <Transition appear show={isSaveModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSaveModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-slate-900">
                    Save explorer search
                  </Dialog.Title>
                  <p className="mt-2 text-sm text-slate-500">
                    Pin the current query, filters, and sort order for fast recall across product, marketing, and operations teams.
                  </p>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-semibold text-slate-700">
                      Name
                      <input
                        type="text"
                        value={newSavedSearchName}
                        onChange={(event) => setNewSavedSearchName(event.target.value)}
                        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Automation launch discovery"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={pinSavedSearch}
                        onChange={(event) => setPinSavedSearch(event.target.checked)}
                      />
                      Pin to favourites
                    </label>
                    {savedSearchError && (
                      <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600" role="alert">
                        {savedSearchError}
                      </p>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-primary hover:text-primary"
                      onClick={() => setSaveModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSearch}
                      disabled={saveInFlight}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {saveInFlight && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                      Save search
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </section>
  );
}
