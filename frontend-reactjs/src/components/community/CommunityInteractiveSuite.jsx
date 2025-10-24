import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  FireIcon,
  MusicalNoteIcon,
  PlayCircleIcon,
  PlusIcon,
  RocketLaunchIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

import usePersistentCollection from '../../hooks/usePersistentCollection.js';
import { computeCommunityEngagementMetrics } from './communityEngagementMetrics.js';

const DEFAULT_FEED_POSTS = [
  {
    id: 'feed-default-1',
    title: 'Launch retrospective: Trust Rituals Lab',
    content:
      'Shared the outcome metrics from our 10-day trust rituals lab with 32 operators. Includes templates and post-lab support workflows.',
    tags: ['#TrustSignals', '#OperatorWins'],
    author: 'Amina Rowe',
    role: 'Community Owner',
    createdAt: '2024-05-10T14:30:00.000Z',
    attachments: [
      {
        type: 'deck',
        label: 'Retrospective slides',
        url: 'https://files.edulure.com/community/trust-rituals-lab-slides.pdf'
      }
    ]
  },
  {
    id: 'feed-default-2',
    title: 'Async AMA: Revenue Architects',
    content:
      'Drop your questions for the architects building modular revenue pods. We will compile recordings, transcripts, and cheatsheets.',
    tags: ['#CommunityAMA'],
    author: 'Leo Okafor',
    role: 'Moderator',
    createdAt: '2024-05-12T09:15:00.000Z',
    attachments: []
  }
];

const DEFAULT_LIVE_CLASSROOMS = [
  {
    id: 'classroom-live-1',
    title: 'Revenue diagnostics lab',
    facilitator: 'Tara Chen',
    startsAt: '2024-05-22T16:00:00.000Z',
    durationMinutes: 75,
    seatsRemaining: 12,
    status: 'scheduled'
  },
  {
    id: 'classroom-live-2',
    title: 'Community monetisation deep dive',
    facilitator: 'Gareth Pruitt',
    startsAt: '2024-05-24T15:00:00.000Z',
    durationMinutes: 60,
    seatsRemaining: 7,
    status: 'scheduled'
  }
];

const DEFAULT_RECORDED_CLASSROOMS = [
  {
    id: 'classroom-recorded-1',
    title: 'Operationalising trust dashboards',
    durationMinutes: 42,
    releasedAt: '2024-04-02T10:00:00.000Z',
    linkUrl: 'https://app.edulure.com/library/trust-dashboards'
  },
  {
    id: 'classroom-recorded-2',
    title: 'Async onboarding rituals',
    durationMinutes: 27,
    releasedAt: '2024-03-16T10:00:00.000Z',
    linkUrl: 'https://app.edulure.com/library/async-onboarding'
  }
];

const DEFAULT_CALENDAR_EVENTS = [
  {
    id: 'calendar-1',
    title: 'Facilitator onboarding',
    category: 'Enablement',
    startsAt: '2024-05-15T17:00:00.000Z',
    endsAt: '2024-05-15T18:30:00.000Z',
    location: 'Virtual stage',
    owner: 'Community Ops',
    description: 'Live enablement for new facilitators covering safety protocols and classroom runbooks.'
  },
  {
    id: 'calendar-2',
    title: 'Revenue pod showcase',
    category: 'Showcase',
    startsAt: '2024-05-19T19:00:00.000Z',
    endsAt: '2024-05-19T20:00:00.000Z',
    location: 'Auditorium',
    owner: 'Programming',
    description: 'Pod squads present experiments and growth metrics for peer review.'
  }
];

const DEFAULT_LIVESTREAMS = [
  {
    id: 'livestream-1',
    title: 'Weekly trust score broadcast',
    host: 'Operations desk',
    startsAt: '2024-05-17T16:00:00.000Z',
    streamUrl: 'https://live.edulure.com/trust-scores',
    status: 'Standby'
  },
  {
    id: 'livestream-2',
    title: 'Operator hot seat',
    host: 'Community admins',
    startsAt: '2024-05-20T18:30:00.000Z',
    streamUrl: 'https://live.edulure.com/operator-hot-seat',
    status: 'Scheduled'
  }
];

const DEFAULT_PODCAST_EPISODES = [
  {
    id: 'podcast-1',
    title: 'Designing revenue rituals',
    host: 'Mira Shah',
    publishedAt: '2024-05-08T12:00:00.000Z',
    durationMinutes: 38,
    audioUrl: 'https://audio.edulure.com/podcasts/designing-revenue-rituals.mp3',
    showNotesUrl: 'https://blog.edulure.com/podcasts/designing-revenue-rituals',
    summary:
      'How Mira coordinates asynchronous rituals with live labs, plus instrumentation for trust metrics.'
  },
  {
    id: 'podcast-2',
    title: 'Scaling community classrooms',
    host: 'Diego Mendès',
    publishedAt: '2024-05-01T15:00:00.000Z',
    durationMinutes: 42,
    audioUrl: 'https://audio.edulure.com/podcasts/scaling-community-classrooms.mp3',
    showNotesUrl: 'https://blog.edulure.com/podcasts/scaling-community-classrooms',
    summary: 'A deep dive into instructor enablement and scenario planning for live learning.'
  }
];

const DEFAULT_LEADERBOARD = [
  { id: 'leaderboard-1', rank: 1, name: 'Amina Rowe', role: 'Owner', points: 980, change: '+28' },
  { id: 'leaderboard-2', rank: 2, name: 'Leo Okafor', role: 'Moderator', points: 945, change: '+14' },
  { id: 'leaderboard-3', rank: 3, name: 'Sofia Martínez', role: 'Member', points: 901, change: '+22' }
];

const DEFAULT_EVENTS = [
  {
    id: 'event-1',
    title: 'Operator summit',
    type: 'Flagship',
    startsAt: '2024-06-01T17:00:00.000Z',
    endsAt: '2024-06-01T22:00:00.000Z',
    description: 'Hybrid summit with live broadcast, breakout pods, and networking lounges.',
    registrationUrl: 'https://events.edulure.com/operator-summit',
    location: 'Hybrid · Edulure HQ + virtual'
  },
  {
    id: 'event-2',
    title: 'Async build weekend',
    type: 'Sprint',
    startsAt: '2024-05-25T12:00:00.000Z',
    endsAt: '2024-05-26T18:00:00.000Z',
    description: '72-hour async build with moderated voice rooms and funding pool.',
    registrationUrl: 'https://events.edulure.com/async-build-weekend',
    location: 'Virtual'
  }
];

const DATE_FORMAT_OPTIONS = {
  dateStyle: 'medium',
  timeStyle: 'short'
};

const numberFormatter = new Intl.NumberFormat('en-US');

function formatDateTime(value) {
  if (!value) return 'TBC';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBC';
  return new Intl.DateTimeFormat('en-US', DATE_FORMAT_OPTIONS).format(date);
}

function SectionContainer({ icon: Icon, title, description, children, actions }) {
  return (
    <section className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Icon className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

SectionContainer.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  actions: PropTypes.node
};

SectionContainer.defaultProps = {
  actions: null
};

function useCommunityCollections(communityId) {
  const storageNamespace = useMemo(() => (communityId ? `community-${communityId}` : 'community-global'), [communityId]);

  const feed = usePersistentCollection(`${storageNamespace}-feed`, DEFAULT_FEED_POSTS);
  const liveClassrooms = usePersistentCollection(`${storageNamespace}-live-classrooms`, DEFAULT_LIVE_CLASSROOMS);
  const recordedClassrooms = usePersistentCollection(
    `${storageNamespace}-recorded-classrooms`,
    DEFAULT_RECORDED_CLASSROOMS
  );
  const calendar = usePersistentCollection(`${storageNamespace}-calendar`, DEFAULT_CALENDAR_EVENTS);
  const livestreams = usePersistentCollection(`${storageNamespace}-livestreams`, DEFAULT_LIVESTREAMS);
  const podcasts = usePersistentCollection(`${storageNamespace}-podcasts`, DEFAULT_PODCAST_EPISODES);
  const leaderboard = usePersistentCollection(`${storageNamespace}-leaderboard`, DEFAULT_LEADERBOARD);
  const events = usePersistentCollection(`${storageNamespace}-events`, DEFAULT_EVENTS);

  return { feed, liveClassrooms, recordedClassrooms, calendar, livestreams, podcasts, leaderboard, events };
}

function EngagementSummary({ insights, communityName }) {
  if (!insights) return null;
  const { totals, liveMinutes, recordedMinutes, upcomingEventsCount, trendingTags, topContributors } = insights;
  return (
    <section className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-xl">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Community pulse</p>
          <h2 className="text-lg font-semibold text-slate-900">Engagement snapshot for {communityName}</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
            <RocketLaunchIcon className="h-4 w-4" /> {totals.liveSessions} live
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            <PlayCircleIcon className="h-4 w-4" /> {totals.recordedSessions} on-demand
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            <FireIcon className="h-4 w-4" /> {totals.feedPosts} feed posts
          </span>
        </div>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live minutes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{liveMinutes}</p>
          <p className="mt-1 text-xs text-slate-500">Minutes of live programming scheduled this week.</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On-demand minutes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{recordedMinutes}</p>
          <p className="mt-1 text-xs text-slate-500">Total runtime of recorded classrooms.</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming events</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{upcomingEventsCount}</p>
          <p className="mt-1 text-xs text-slate-500">Scheduled within the next 7 days.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trending tags</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
            {trendingTags.length ? trendingTags.map((tag) => (
              <li key={tag.tag} className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                {tag.tag} · {tag.count}
              </li>
            )) : <li className="text-slate-500">No tag activity yet.</li>}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top contributors</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {topContributors.length ? topContributors.map((contributor) => (
              <li key={`${contributor.name}-${contributor.points}`} className="flex items-center justify-between">
                <span>{contributor.name}</span>
                <span className="text-xs text-slate-400">{contributor.points} pts</span>
              </li>
            )) : <li className="text-xs text-slate-500">No leaderboard data available.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
function FeedManager({ collection, communityName }) {
  const emptyDraft = useMemo(
    () => ({ id: null, title: '', content: '', tags: '', mediaLabel: '', mediaUrl: '' }),
    []
  );
  const [draft, setDraft] = useState(emptyDraft);
  const [filter, setFilter] = useState('all');

  const sortedItems = useMemo(
    () =>
      [...collection.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [collection.items]
  );

  const filteredItems = useMemo(() => {
    if (filter === 'all') return sortedItems;
    return sortedItems.filter((item) => item.tags?.includes(filter));
  }, [sortedItems, filter]);

  const allTags = useMemo(() => {
    const tags = new Set();
    collection.items.forEach((item) => {
      (item.tags ?? []).forEach((tag) => tags.add(tag));
    });
    return ['all', ...Array.from(tags)];
  }, [collection.items]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.content.trim()) {
      return;
    }

    const payload = {
      title: draft.title.trim(),
      content: draft.content.trim(),
      tags: draft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      author: 'You',
      role: 'Community publisher',
      createdAt: draft.createdAt ?? new Date().toISOString(),
      attachments: draft.mediaUrl
        ? [
            {
              type: 'link',
              label: draft.mediaLabel?.trim() || 'Attached link',
              url: draft.mediaUrl.trim()
            }
          ]
        : []
    };

    if (draft.id) {
      collection.updateItem(draft.id, payload);
    } else {
      collection.addItem(payload);
    }

    setDraft(emptyDraft);
  };

  const handleEdit = (item) => {
    setDraft({
      id: item.id,
      title: item.title,
      content: item.content,
      tags: (item.tags ?? []).join(', '),
      mediaLabel: item.attachments?.[0]?.label ?? '',
      mediaUrl: item.attachments?.[0]?.url ?? '',
      createdAt: item.createdAt
    });
  };

  const handleDelete = (id) => {
    collection.removeItem(id);
    if (draft.id === id) {
      setDraft(emptyDraft);
    }
  };

  return (
    <SectionContainer
      icon={SparklesIcon}
      title="Community feed operations"
      description={`Publish, iterate, and moderate stories for ${communityName}. Every entry is persisted for collaborative reviews.`}
      actions={
        <button
          type="button"
          onClick={() => {
            collection.reset();
            setDraft(emptyDraft);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className="h-4 w-4" /> Reset workspace
        </button>
      }
    >
      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {draft.id ? 'Update story' : 'Compose new story'}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Title
            <input
              type="text"
              name="title"
              value={draft.title}
              onChange={handleChange}
              placeholder="What is shipping next?"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Tags
            <input
              type="text"
              name="tags"
              value={draft.tags}
              onChange={handleChange}
              placeholder="#launch, #ops"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
          Story details
          <textarea
            name="content"
            value={draft.content}
            onChange={handleChange}
            placeholder="Share context, wins, or calls to action"
            className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
        </label>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Attachment label
            <input
              type="text"
              name="mediaLabel"
              value={draft.mediaLabel}
              onChange={handleChange}
              placeholder="Link label"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Attachment URL
            <input
              type="url"
              name="mediaUrl"
              value={draft.mediaUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filter
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            <PlusIcon className="h-4 w-4" /> {draft.id ? 'Save changes' : 'Publish story'}
          </button>
        </div>
      </form>
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <article
            key={item.id}
            className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  {(item.tags ?? []).map((tag) => (
                    <span key={tag} className="rounded-full bg-primary/10 px-3 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600">
                  <UsersIcon className="h-4 w-4" /> {item.author}
                </span>
                <span>{item.role}</span>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
            </div>
            {item.attachments?.length ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {item.attachments.map((attachment) => (
                  <a
                    key={attachment.url}
                    href={attachment.url}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ChevronRightIcon className="h-4 w-4" /> {attachment.label}
                  </a>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleEdit(item)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
          </article>
        ))}
        {filteredItems.length === 0 ? (
          <p className="rounded-3xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-500">
            No stories match this filter yet.
          </p>
        ) : null}
      </div>
    </SectionContainer>
  );
}

FeedManager.propTypes = {
  collection: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    addItem: PropTypes.func.isRequired,
    updateItem: PropTypes.func.isRequired,
    removeItem: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired
  }).isRequired,
  communityName: PropTypes.string.isRequired
};
function ClassroomManager({ liveCollection, recordedCollection }) {
  const liveEmpty = useMemo(
    () => ({ id: null, title: '', facilitator: '', startsAt: '', durationMinutes: 60, seatsRemaining: 20, status: 'scheduled' }),
    []
  );
  const recordedEmpty = useMemo(
    () => ({ id: null, title: '', durationMinutes: 30, releasedAt: '', linkUrl: '' }),
    []
  );

  const [liveDraft, setLiveDraft] = useState(liveEmpty);
  const [recordedDraft, setRecordedDraft] = useState(recordedEmpty);

  const handleLiveChange = (event) => {
    const { name, value } = event.target;
    setLiveDraft((previous) => ({ ...previous, [name]: name === 'durationMinutes' || name === 'seatsRemaining' ? Number(value) : value }));
  };

  const handleRecordedChange = (event) => {
    const { name, value } = event.target;
    setRecordedDraft((previous) => ({ ...previous, [name]: name === 'durationMinutes' ? Number(value) : value }));
  };

  const submitLive = (event) => {
    event.preventDefault();
    if (!liveDraft.title.trim() || !liveDraft.facilitator.trim() || !liveDraft.startsAt) {
      return;
    }

    const payload = {
      title: liveDraft.title.trim(),
      facilitator: liveDraft.facilitator.trim(),
      startsAt: liveDraft.startsAt,
      durationMinutes: Number.isFinite(liveDraft.durationMinutes) ? liveDraft.durationMinutes : 60,
      seatsRemaining: Number.isFinite(liveDraft.seatsRemaining) ? liveDraft.seatsRemaining : 0,
      status: liveDraft.status
    };

    if (liveDraft.id) {
      liveCollection.updateItem(liveDraft.id, payload);
    } else {
      liveCollection.addItem(payload);
    }

    setLiveDraft(liveEmpty);
  };

  const submitRecorded = (event) => {
    event.preventDefault();
    if (!recordedDraft.title.trim() || !recordedDraft.linkUrl.trim()) {
      return;
    }

    const payload = {
      title: recordedDraft.title.trim(),
      durationMinutes: Number.isFinite(recordedDraft.durationMinutes) ? recordedDraft.durationMinutes : 30,
      releasedAt: recordedDraft.releasedAt,
      linkUrl: recordedDraft.linkUrl.trim()
    };

    if (recordedDraft.id) {
      recordedCollection.updateItem(recordedDraft.id, payload);
    } else {
      recordedCollection.addItem(payload);
    }

    setRecordedDraft(recordedEmpty);
  };

  const editLive = (item) => setLiveDraft({ ...item, id: item.id });
  const editRecorded = (item) => setRecordedDraft({ ...item, id: item.id });

  return (
    <SectionContainer
      icon={RocketLaunchIcon}
      title="Community classroom orchestration"
      description="Launch and evolve live programming while keeping the recorded library in sync."
      actions={
        <button
          type="button"
          onClick={() => {
            liveCollection.reset();
            recordedCollection.reset();
            setLiveDraft(liveEmpty);
            setRecordedDraft(recordedEmpty);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className="h-4 w-4" /> Reset inventory
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitLive}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {liveDraft.id ? 'Update live session' : 'Schedule live session'}
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Title
              <input
                type="text"
                name="title"
                value={liveDraft.title}
                onChange={handleLiveChange}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Facilitator
              <input
                type="text"
                name="facilitator"
                value={liveDraft.facilitator}
                onChange={handleLiveChange}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Start time
              <input
                type="datetime-local"
                name="startsAt"
                value={liveDraft.startsAt}
                onChange={handleLiveChange}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Duration (minutes)
                <input
                  type="number"
                  min="15"
                  name="durationMinutes"
                  value={liveDraft.durationMinutes}
                  onChange={handleLiveChange}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Seats remaining
                <input
                  type="number"
                  min="0"
                  name="seatsRemaining"
                  value={liveDraft.seatsRemaining}
                  onChange={handleLiveChange}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Status
              <select
                name="status"
                value={liveDraft.status}
                onChange={handleLiveChange}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
            >
              <PlusIcon className="h-4 w-4" /> {liveDraft.id ? 'Save changes' : 'Add session'}
            </button>
          </div>
        </form>
        <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitRecorded}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {recordedDraft.id ? 'Update recording' : 'Add recorded resource'}
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Title
              <input
                type="text"
                name="title"
                value={recordedDraft.title}
                onChange={handleRecordedChange}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Duration (minutes)
              <input
                type="number"
                min="1"
                name="durationMinutes"
                value={recordedDraft.durationMinutes}
                onChange={handleRecordedChange}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Release date
              <input
                type="date"
                name="releasedAt"
                value={recordedDraft.releasedAt}
                onChange={handleRecordedChange}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Playback URL
              <input
                type="url"
                name="linkUrl"
                value={recordedDraft.linkUrl}
                onChange={handleRecordedChange}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
            >
              <PlusIcon className="h-4 w-4" /> {recordedDraft.id ? 'Save changes' : 'Add recording'}
            </button>
          </div>
        </form>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Live sessions</p>
          {liveCollection.items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-inner">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">Facilitator: {item.facilitator}</p>
                  <p className="mt-1 text-xs text-slate-500">Starts {formatDateTime(item.startsAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.durationMinutes} minutes · {item.seatsRemaining} seats remaining
                  </p>
                  <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {item.status}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => editLive(item)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => liveCollection.removeItem(item.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          {liveCollection.items.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
              No live sessions configured.
            </p>
          ) : null}
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recorded library</p>
          {recordedCollection.items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-inner">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">Duration: {item.durationMinutes} minutes</p>
                  <p className="mt-1 text-xs text-slate-500">Released: {formatDateTime(item.releasedAt)}</p>
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                  >
                    <PlayCircleIcon className="h-4 w-4" /> Watch recording
                  </a>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => editRecorded(item)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => recordedCollection.removeItem(item.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          {recordedCollection.items.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
              No recordings published yet.
            </p>
          ) : null}
        </div>
      </div>
    </SectionContainer>
  );
}

ClassroomManager.propTypes = {
  liveCollection: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    addItem: PropTypes.func.isRequired,
    updateItem: PropTypes.func.isRequired,
    removeItem: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired
  }).isRequired,
  recordedCollection: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    addItem: PropTypes.func.isRequired,
    updateItem: PropTypes.func.isRequired,
    removeItem: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired
  }).isRequired
};
function CalendarManager({ calendarCollection }) {
  const emptyDraft = useMemo(
    () => ({ id: null, title: '', category: 'Programming', startsAt: '', endsAt: '', location: '', owner: '', description: '' }),
    []
  );
  const [draft, setDraft] = useState(emptyDraft);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.startsAt || !draft.endsAt) {
      return;
    }

    const payload = {
      title: draft.title.trim(),
      category: draft.category,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      location: draft.location.trim(),
      owner: draft.owner.trim(),
      description: draft.description.trim()
    };

    if (draft.id) {
      calendarCollection.updateItem(draft.id, payload);
    } else {
      calendarCollection.addItem(payload);
    }

    setDraft(emptyDraft);
  };

  const edit = (item) => setDraft({ ...item, id: item.id });
  const remove = (id) => {
    calendarCollection.removeItem(id);
    if (draft.id === id) {
      setDraft(emptyDraft);
    }
  };

  const sortedItems = useMemo(
    () =>
      [...calendarCollection.items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [calendarCollection.items]
  );

  return (
    <SectionContainer
      icon={CalendarDaysIcon}
      title="Community calendar"
      description="Curate the single source of truth for live programming, sprints, and enablement touch points."
      actions={
        <button
          type="button"
          onClick={() => {
            calendarCollection.reset();
            setDraft(emptyDraft);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className="h-4 w-4" /> Reset calendar
        </button>
      }
    >
      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {draft.id ? 'Update calendar entry' : 'Add new calendar entry'}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Title
            <input
              type="text"
              name="title"
              value={draft.title}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Category
            <select
              name="category"
              value={draft.category}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Programming">Programming</option>
              <option value="Enablement">Enablement</option>
              <option value="Showcase">Showcase</option>
              <option value="Operations">Operations</option>
              <option value="Community">Community</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Starts at
            <input
              type="datetime-local"
              name="startsAt"
              value={draft.startsAt}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Ends at
            <input
              type="datetime-local"
              name="endsAt"
              value={draft.endsAt}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Location
            <input
              type="text"
              name="location"
              value={draft.location}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Owner
            <input
              type="text"
              name="owner"
              value={draft.owner}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
          Description
          <textarea
            name="description"
            value={draft.description}
            onChange={handleChange}
            className="min-h-[80px] rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            <PlusIcon className="h-4 w-4" /> {draft.id ? 'Save changes' : 'Add entry'}
          </button>
        </div>
      </form>
      <div className="space-y-3">
        {sortedItems.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {item.category}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(item.startsAt)} – {formatDateTime(item.endsAt)}
                </p>
                {item.location ? (
                  <p className="mt-1 text-xs text-slate-500">Location: {item.location}</p>
                ) : null}
                {item.owner ? (
                  <p className="mt-1 text-xs text-slate-500">Owner: {item.owner}</p>
                ) : null}
                {item.description ? (
                  <p className="mt-3 text-xs text-slate-500">{item.description}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => edit(item)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {sortedItems.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
            Nothing scheduled yet. Add your first entry above.
          </p>
        ) : null}
      </div>
    </SectionContainer>
  );
}

CalendarManager.propTypes = {
  calendarCollection: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    addItem: PropTypes.func.isRequired,
    updateItem: PropTypes.func.isRequired,
    removeItem: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired
  }).isRequired
};
function LivestreamManager({ livestreamCollection }) {
  const emptyDraft = useMemo(
    () => ({ id: null, title: '', host: '', startsAt: '', streamUrl: '', status: 'Scheduled' }),
    []
  );
  const [draft, setDraft] = useState(emptyDraft);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.streamUrl.trim()) {
      return;
    }

    const payload = {
      title: draft.title.trim(),
      host: draft.host.trim(),
      startsAt: draft.startsAt,
      streamUrl: draft.streamUrl.trim(),
      status: draft.status
    };

    if (draft.id) {
      livestreamCollection.updateItem(draft.id, payload);
    } else {
      livestreamCollection.addItem(payload);
    }

    setDraft(emptyDraft);
  };

  const edit = (item) => setDraft({ ...item, id: item.id });
  const remove = (id) => {
    livestreamCollection.removeItem(id);
    if (draft.id === id) {
      setDraft(emptyDraft);
    }
  };

  return (
    <SectionContainer
      icon={VideoCameraIcon}
      title="Live stream control"
      description="Spin up broadcast stages with full ownership of scheduling, hosting, and stream URLs."
      actions={
        <button
          type="button"
          onClick={() => {
            livestreamCollection.reset();
            setDraft(emptyDraft);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className="h-4 w-4" /> Reset streams
        </button>
      }
    >
      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {draft.id ? 'Update broadcast' : 'Schedule broadcast'}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Title
            <input
              type="text"
              name="title"
              value={draft.title}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Host team
            <input
              type="text"
              name="host"
              value={draft.host}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Start time
            <input
              type="datetime-local"
              name="startsAt"
              value={draft.startsAt}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Status
            <select
              name="status"
              value={draft.status}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Scheduled">Scheduled</option>
              <option value="Standby">Standby</option>
              <option value="Live">Live</option>
              <option value="Ended">Ended</option>
            </select>
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
          Stream URL
          <input
            type="url"
            name="streamUrl"
            value={draft.streamUrl}
            onChange={handleChange}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
        </label>
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            <PlusIcon className="h-4 w-4" /> {draft.id ? 'Save changes' : 'Add broadcast'}
          </button>
        </div>
      </form>
      <div className="space-y-3">
        {livestreamCollection.items.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {item.status}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
                {item.host ? <p className="mt-1 text-xs text-slate-500">Host: {item.host}</p> : null}
                {item.startsAt ? (
                  <p className="mt-1 text-xs text-slate-500">Starts {formatDateTime(item.startsAt)}</p>
                ) : null}
                <a
                  href={item.streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                >
                  <VideoCameraIcon className="h-4 w-4" /> Open stream
                </a>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => edit(item)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {livestreamCollection.items.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
            No broadcasts configured. Schedule one above.
          </p>
        ) : null}
      </div>
    </SectionContainer>
  );
}

LivestreamManager.propTypes = {
  livestreamCollection: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    addItem: PropTypes.func.isRequired,
    updateItem: PropTypes.func.isRequired,
    removeItem: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired
  }).isRequired
};
function PodcastManager({ podcastCollection }) {
  const emptyDraft = useMemo(
    () => ({ id: null, title: '', host: '', publishedAt: '', durationMinutes: 30, audioUrl: '', showNotesUrl: '', summary: '' }),
    []
  );
  const [draft, setDraft] = useState(emptyDraft);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({ ...previous, [name]: name === 'durationMinutes' ? Number(value) : value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.audioUrl.trim()) {
      return;
    }

    const payload = {
      title: draft.title.trim(),
      host: draft.host.trim(),
      publishedAt: draft.publishedAt,
      durationMinutes: Number.isFinite(draft.durationMinutes) ? draft.durationMinutes : 30,
      audioUrl: draft.audioUrl.trim(),
      showNotesUrl: draft.showNotesUrl.trim(),
      summary: draft.summary.trim()
    };

    if (draft.id) {
      podcastCollection.updateItem(draft.id, payload);
    } else {
      podcastCollection.addItem(payload);
    }

    setDraft(emptyDraft);
  };

  const edit = (item) => setDraft({ ...item, id: item.id });
  const remove = (id) => {
    podcastCollection.removeItem(id);
    if (draft.id === id) {
      setDraft(emptyDraft);
    }
  };

  const sortedItems = useMemo(
    () =>
      [...podcastCollection.items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    [podcastCollection.items]
  );

  return (
    <SectionContainer
      icon={MusicalNoteIcon}
      title="Community podcast studio"
      description="Produce and syndicate audio sessions with paired show notes and distribution ready metadata."
      actions={
        <button
          type="button"
          onClick={() => {
            podcastCollection.reset();
            setDraft(emptyDraft);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className="h-4 w-4" /> Reset episodes
        </button>
      }
    >
      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {draft.id ? 'Update episode' : 'Publish new episode'}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Title
            <input
              type="text"
              name="title"
              value={draft.title}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Host
            <input
              type="text"
              name="host"
              value={draft.host}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Publish date
            <input
              type="date"
              name="publishedAt"
              value={draft.publishedAt}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Duration (minutes)
            <input
              type="number"
              min="1"
              name="durationMinutes"
              value={draft.durationMinutes}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Audio URL
            <input
              type="url"
              name="audioUrl"
              value={draft.audioUrl}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Show notes URL
            <input
              type="url"
              name="showNotesUrl"
              value={draft.showNotesUrl}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
          Summary
          <textarea
            name="summary"
            value={draft.summary}
            onChange={handleChange}
            className="min-h-[80px] rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            <PlusIcon className="h-4 w-4" /> {draft.id ? 'Save changes' : 'Publish episode'}
          </button>
        </div>
      </form>
      <div className="space-y-3">
        {sortedItems.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {item.durationMinutes} minutes
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
                {item.host ? <p className="mt-1 text-xs text-slate-500">Host: {item.host}</p> : null}
                {item.publishedAt ? (
                  <p className="mt-1 text-xs text-slate-500">Published {formatDateTime(item.publishedAt)}</p>
                ) : null}
                {item.summary ? <p className="mt-3 text-xs text-slate-500">{item.summary}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={item.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                  >
                    <PlayCircleIcon className="h-4 w-4" /> Play episode
                  </a>
                  {item.showNotesUrl ? (
                    <a
                      href={item.showNotesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
                    >
                      <ChevronRightIcon className="h-4 w-4" /> View notes
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => edit(item)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {sortedItems.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
            No episodes published yet.
          </p>
        ) : null}
      </div>
    </SectionContainer>
  );
}

PodcastManager.propTypes = {
  podcastCollection: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    addItem: PropTypes.func.isRequired,
    updateItem: PropTypes.func.isRequired,
    removeItem: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired
  }).isRequired
};
function LeaderboardManager({ leaderboardCollection }) {
  const emptyDraft = useMemo(
    () => ({ id: null, name: '', role: '', points: 0, change: '+0' }),
    []
  );
  const [draft, setDraft] = useState(emptyDraft);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({ ...previous, [name]: name === 'points' ? Number(value) : value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      return;
    }

    const payload = {
      name: draft.name.trim(),
      role: draft.role.trim(),
      points: Number.isFinite(draft.points) ? draft.points : 0,
      change: draft.change.trim() || '+0'
    };

    if (draft.id) {
      leaderboardCollection.updateItem(draft.id, payload);
    } else {
      const rank = leaderboardCollection.items.length + 1;
      leaderboardCollection.addItem({ ...payload, rank });
    }

    setDraft(emptyDraft);
  };

  const edit = (item) => setDraft({ ...item, id: item.id });
  const remove = (id) => {
    leaderboardCollection.removeItem(id);
    if (draft.id === id) {
      setDraft(emptyDraft);
    }
  };

  const sortedItems = useMemo(
    () =>
      [...leaderboardCollection.items]
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({ ...item, rank: index + 1 })),
    [leaderboardCollection.items]
  );

  return (
    <SectionContainer
      icon={TrophyIcon}
      title="Leaderboard governance"
      description="Reward momentum and surface accountability metrics with manual overrides for special recognitions."
      actions={
        <button
          type="button"
          onClick={() => {
            leaderboardCollection.reset();
            setDraft(emptyDraft);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className="h-4 w-4" /> Reset leaderboard
        </button>
      }
    >
      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {draft.id ? 'Update member score' : 'Add leaderboard member'}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Name
            <input
              type="text"
              name="name"
              value={draft.name}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Role
            <input
              type="text"
              name="role"
              value={draft.role}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Points
            <input
              type="number"
              min="0"
              name="points"
              value={draft.points}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Score change (eg. +12)
            <input
              type="text"
              name="change"
              value={draft.change}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            <PlusIcon className="h-4 w-4" /> {draft.id ? 'Save changes' : 'Add member'}
          </button>
        </div>
      </form>
      <div className="space-y-3">
        {sortedItems.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  #{item.rank}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.role || 'Member'}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-right text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-4 sm:text-left">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {numberFormatter.format(item.points)} pts
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <CheckCircleIcon className="h-4 w-4" /> {item.change}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => edit(item)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {sortedItems.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
            No members tracked yet.
          </p>
        ) : null}
      </div>
    </SectionContainer>
  );
}

LeaderboardManager.propTypes = {
  leaderboardCollection: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    addItem: PropTypes.func.isRequired,
    updateItem: PropTypes.func.isRequired,
    removeItem: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired
  }).isRequired
};
function EventsManager({ eventsCollection }) {
  const emptyDraft = useMemo(
    () => ({ id: null, title: '', type: 'Campaign', startsAt: '', endsAt: '', location: '', registrationUrl: '', description: '' }),
    []
  );
  const [draft, setDraft] = useState(emptyDraft);
  const [viewFilter, setViewFilter] = useState('all');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.startsAt || !draft.endsAt) {
      return;
    }

    const payload = {
      title: draft.title.trim(),
      type: draft.type,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      location: draft.location.trim(),
      registrationUrl: draft.registrationUrl.trim(),
      description: draft.description.trim()
    };

    if (draft.id) {
      eventsCollection.updateItem(draft.id, payload);
    } else {
      eventsCollection.addItem(payload);
    }

    setDraft(emptyDraft);
  };

  const edit = (item) => setDraft({ ...item, id: item.id });
  const remove = (id) => {
    eventsCollection.removeItem(id);
    if (draft.id === id) {
      setDraft(emptyDraft);
    }
  };

  const sortedItems = useMemo(() => {
    const items = [...eventsCollection.items].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
    if (viewFilter === 'all') {
      return items;
    }
    return items.filter((item) => item.type === viewFilter);
  }, [eventsCollection.items, viewFilter]);

  const typeFilters = useMemo(() => {
    const types = new Set(eventsCollection.items.map((item) => item.type));
    return ['all', ...Array.from(types)];
  }, [eventsCollection.items]);

  return (
    <SectionContainer
      icon={FireIcon}
      title="Community events"
      description="Plan cross-channel activations, sprints, and flagship gatherings with fully tracked metadata."
      actions={
        <button
          type="button"
          onClick={() => {
            eventsCollection.reset();
            setDraft(emptyDraft);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className="h-4 w-4" /> Reset events
        </button>
      }
    >
      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {draft.id ? 'Update event' : 'Create new event'}
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filter
            <select
              value={viewFilter}
              onChange={(event) => setViewFilter(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {typeFilters.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Title
            <input
              type="text"
              name="title"
              value={draft.title}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Event type
            <select
              name="type"
              value={draft.type}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Campaign">Campaign</option>
              <option value="Flagship">Flagship</option>
              <option value="Sprint">Sprint</option>
              <option value="Workshop">Workshop</option>
              <option value="Meetup">Meetup</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Starts at
            <input
              type="datetime-local"
              name="startsAt"
              value={draft.startsAt}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Ends at
            <input
              type="datetime-local"
              name="endsAt"
              value={draft.endsAt}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Location
            <input
              type="text"
              name="location"
              value={draft.location}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Registration URL
            <input
              type="url"
              name="registrationUrl"
              value={draft.registrationUrl}
              onChange={handleChange}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
          Description
          <textarea
            name="description"
            value={draft.description}
            onChange={handleChange}
            className="min-h-[80px] rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            <PlusIcon className="h-4 w-4" /> {draft.id ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </form>
      <div className="space-y-3">
        {sortedItems.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {item.type}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(item.startsAt)} – {formatDateTime(item.endsAt)}
                </p>
                {item.location ? <p className="mt-1 text-xs text-slate-500">Location: {item.location}</p> : null}
                {item.description ? <p className="mt-3 text-xs text-slate-500">{item.description}</p> : null}
                {item.registrationUrl ? (
                  <a
                    href={item.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                  >
                    <ChevronRightIcon className="h-4 w-4" /> Registration
                  </a>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => edit(item)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {sortedItems.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
            No events scheduled. Create your first activation above.
          </p>
        ) : null}
      </div>
    </SectionContainer>
  );
}

EventsManager.propTypes = {
  eventsCollection: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    addItem: PropTypes.func.isRequired,
    updateItem: PropTypes.func.isRequired,
    removeItem: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired
  }).isRequired
};
function normaliseFeedItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_FEED_POSTS;
  }

  return items.map((item, index) => ({
    id: item.id ?? `feed-import-${index}`,
    title: item.title ?? item.body ?? 'Untitled story',
    content: item.body ?? item.content ?? '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    author: item.author ?? item.owner ?? 'Community member',
    role: item.role ?? 'Member',
    createdAt: item.createdAt ?? item.publishedAt ?? new Date().toISOString(),
    attachments: Array.isArray(item.attachments)
      ? item.attachments.map((attachment, attachmentIndex) => ({
          type: attachment.type ?? 'link',
          label: attachment.label ?? `Attachment ${attachmentIndex + 1}`,
          url: attachment.url ?? '#'
        }))
      : []
  }));
}

function normaliseLiveSessions(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_LIVE_CLASSROOMS;
  }

  return items.map((item, index) => ({
    id: item.id ?? `live-import-${index}`,
    title: item.title ?? 'Live session',
    facilitator: item.facilitator ?? item.host ?? 'Facilitator pending',
    startsAt: item.startsAt ?? item.startTime ?? '',
    durationMinutes: Number.isFinite(item.durationMinutes) ? item.durationMinutes : 60,
    seatsRemaining: Number.isFinite(item.seatsRemaining) ? item.seatsRemaining : 0,
    status: item.status ?? 'scheduled'
  }));
}

function normaliseRecordedSessions(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_RECORDED_CLASSROOMS;
  }

  return items.map((item, index) => ({
    id: item.id ?? `recorded-import-${index}`,
    title: item.title ?? 'Recorded session',
    durationMinutes: Number.isFinite(item.durationMinutes) ? item.durationMinutes : 30,
    releasedAt: item.releasedAt ?? item.publishedAt ?? '',
    linkUrl: item.linkUrl ?? item.url ?? '#'
  }));
}

function normaliseCalendarEntries(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_CALENDAR_EVENTS;
  }

  return items.map((item, index) => ({
    id: item.id ?? `calendar-import-${index}`,
    title: item.title ?? 'Calendar entry',
    category: item.category ?? 'Programming',
    startsAt: item.startsAt ?? item.start ?? '',
    endsAt: item.endsAt ?? item.end ?? '',
    location: item.location ?? '',
    owner: item.owner ?? item.host ?? '',
    description: item.description ?? ''
  }));
}

function normaliseLivestreams(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_LIVESTREAMS;
  }

  return items.map((item, index) => ({
    id: item.id ?? `livestream-import-${index}`,
    title: item.title ?? 'Community broadcast',
    host: item.host ?? item.owner ?? '',
    startsAt: item.startsAt ?? item.startTime ?? '',
    streamUrl: item.streamUrl ?? item.url ?? '#',
    status: item.status ?? 'Scheduled'
  }));
}

function normalisePodcasts(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_PODCAST_EPISODES;
  }

  return items.map((item, index) => ({
    id: item.id ?? `podcast-import-${index}`,
    title: item.title ?? 'Podcast episode',
    host: item.host ?? item.presenter ?? '',
    publishedAt: item.publishedAt ?? item.releasedAt ?? '',
    durationMinutes: Number.isFinite(item.durationMinutes) ? item.durationMinutes : 30,
    audioUrl: item.audioUrl ?? item.url ?? '#',
    showNotesUrl: item.showNotesUrl ?? item.notesUrl ?? '',
    summary: item.summary ?? item.description ?? ''
  }));
}

function normaliseLeaderboard(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_LEADERBOARD;
  }

  return items.map((item, index) => ({
    id: item.id ?? `leaderboard-import-${index}`,
    rank: item.rank ?? index + 1,
    name: item.name ?? 'Member',
    role: item.role ?? 'Member',
    points: Number.isFinite(item.points) ? item.points : 0,
    change: item.change ?? '+0'
  }));
}

function normaliseEvents(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_EVENTS;
  }

  return items.map((item, index) => ({
    id: item.id ?? `event-import-${index}`,
    title: item.title ?? 'Community event',
    type: item.type ?? 'Campaign',
    startsAt: item.startsAt ?? item.startTime ?? '',
    endsAt: item.endsAt ?? item.endTime ?? '',
    location: item.location ?? '',
    registrationUrl: item.registrationUrl ?? item.url ?? '',
    description: item.description ?? ''
  }));
}

export default function CommunityInteractiveSuite({
  communityId,
  communityName,
  initialFeed,
  initialLiveClassrooms,
  initialRecordedClassrooms,
  initialCalendar,
  initialLivestreams,
  initialPodcasts,
  initialLeaderboard,
  initialEvents
}) {
  const {
    feed,
    liveClassrooms,
    recordedClassrooms,
    calendar,
    livestreams,
    podcasts,
    leaderboard,
    events
  } = useCommunityCollections(communityId);

  const { replaceItems: replaceFeedItems } = feed;
  const { replaceItems: replaceLiveSessions } = liveClassrooms;
  const { replaceItems: replaceRecordedSessions } = recordedClassrooms;
  const { replaceItems: replaceCalendarEntries } = calendar;
  const { replaceItems: replaceLivestreams } = livestreams;
  const { replaceItems: replacePodcasts } = podcasts;
  const { replaceItems: replaceLeaderboardEntries } = leaderboard;
  const { replaceItems: replaceEvents } = events;

  useEffect(() => {
    replaceFeedItems(normaliseFeedItems(initialFeed));
  }, [communityId, initialFeed, replaceFeedItems]);

  useEffect(() => {
    replaceLiveSessions(normaliseLiveSessions(initialLiveClassrooms));
  }, [communityId, initialLiveClassrooms, replaceLiveSessions]);

  useEffect(() => {
    replaceRecordedSessions(normaliseRecordedSessions(initialRecordedClassrooms));
  }, [communityId, initialRecordedClassrooms, replaceRecordedSessions]);

  useEffect(() => {
    replaceCalendarEntries(normaliseCalendarEntries(initialCalendar));
  }, [communityId, initialCalendar, replaceCalendarEntries]);

  useEffect(() => {
    replaceLivestreams(normaliseLivestreams(initialLivestreams));
  }, [communityId, initialLivestreams, replaceLivestreams]);

  useEffect(() => {
    replacePodcasts(normalisePodcasts(initialPodcasts));
  }, [communityId, initialPodcasts, replacePodcasts]);

  useEffect(() => {
    replaceLeaderboardEntries(normaliseLeaderboard(initialLeaderboard));
  }, [communityId, initialLeaderboard, replaceLeaderboardEntries]);

  useEffect(() => {
    replaceEvents(normaliseEvents(initialEvents));
  }, [communityId, initialEvents, replaceEvents]);

  const engagementInsights = useMemo(
    () =>
      computeCommunityEngagementMetrics({
        feed: feed.items,
        liveClassrooms: liveClassrooms.items,
        recordedClassrooms: recordedClassrooms.items,
        calendar: calendar.items,
        events: events.items,
        leaderboard: leaderboard.items
      }),
    [feed.items, liveClassrooms.items, recordedClassrooms.items, calendar.items, events.items, leaderboard.items]
  );

  return (
    <div className="space-y-8">
      <EngagementSummary insights={engagementInsights} communityName={communityName} />
      <FeedManager collection={feed} communityName={communityName} />
      <ClassroomManager liveCollection={liveClassrooms} recordedCollection={recordedClassrooms} />
      <CalendarManager calendarCollection={calendar} />
      <LivestreamManager livestreamCollection={livestreams} />
      <PodcastManager podcastCollection={podcasts} />
      <LeaderboardManager leaderboardCollection={leaderboard} />
      <EventsManager eventsCollection={events} />
    </div>
  );
}

CommunityInteractiveSuite.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  communityName: PropTypes.string,
  initialFeed: PropTypes.arrayOf(PropTypes.object),
  initialLiveClassrooms: PropTypes.arrayOf(PropTypes.object),
  initialRecordedClassrooms: PropTypes.arrayOf(PropTypes.object),
  initialCalendar: PropTypes.arrayOf(PropTypes.object),
  initialLivestreams: PropTypes.arrayOf(PropTypes.object),
  initialPodcasts: PropTypes.arrayOf(PropTypes.object),
  initialLeaderboard: PropTypes.arrayOf(PropTypes.object),
  initialEvents: PropTypes.arrayOf(PropTypes.object)
};

CommunityInteractiveSuite.defaultProps = {
  communityId: null,
  communityName: 'your community',
  initialFeed: DEFAULT_FEED_POSTS,
  initialLiveClassrooms: DEFAULT_LIVE_CLASSROOMS,
  initialRecordedClassrooms: DEFAULT_RECORDED_CLASSROOMS,
  initialCalendar: DEFAULT_CALENDAR_EVENTS,
  initialLivestreams: DEFAULT_LIVESTREAMS,
  initialPodcasts: DEFAULT_PODCAST_EPISODES,
  initialLeaderboard: DEFAULT_LEADERBOARD,
  initialEvents: DEFAULT_EVENTS
};
