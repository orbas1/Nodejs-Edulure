import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import DashboardStateMessage from '../../dashboard/DashboardStateMessage.jsx';
import AdminCrudResource from './AdminCrudResource.jsx';

function formatDate(value) {
  if (!value) return 'Not scheduled';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled';
  }
  return date.toLocaleString();
}

export default function AdminPodcastManager({ token, api }) {
  const [selectedShow, setSelectedShow] = useState(null);

  const handleShowsChange = useCallback(
    (shows) => {
      if (!Array.isArray(shows) || !shows.length) {
        setSelectedShow(null);
        return;
      }
      if (!selectedShow) {
        setSelectedShow(shows[0]);
        return;
      }
      const match = shows.find((show) => show.id === selectedShow.id);
      setSelectedShow(match ?? shows[0]);
    },
    [selectedShow]
  );

  const showConfig = useMemo(() => ({
    title: 'Podcast Shows',
    description: 'Oversee community podcast series, distribution, and publication status.',
    entityName: 'podcast show',
    createLabel: 'New show',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Ops Control Tower' },
      { name: 'slug', label: 'Slug', type: 'text', placeholder: 'ops-control-tower' },
      { name: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'War-room briefings and launch retrospectives' },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        fullWidth: true,
        placeholder: 'Long-form description used for show notes and feeds.'
      },
      { name: 'communityId', label: 'Community ID', type: 'number', helpText: 'Associate show to a community workspace.' },
      { name: 'ownerId', label: 'Owner user ID', type: 'number', helpText: 'User responsible for the show.' },
      { name: 'category', label: 'Category', type: 'text', placeholder: 'operations' },
      {
        name: 'distributionChannels',
        label: 'Distribution channels',
        type: 'tags',
        helpText: 'Comma separated list of destinations (e.g. Spotify, Apple Podcasts).'
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'in_production', label: 'In production' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' }
        ],
        defaultValue: 'draft'
      },
      { name: 'isPublic', label: 'Public', type: 'checkbox', defaultValue: false },
      { name: 'launchAt', label: 'Launch at', type: 'datetime', allowEmpty: true },
      {
        name: 'metadata',
        label: 'Metadata (JSON)',
        type: 'json',
        fullWidth: true,
        rows: 6,
        placeholder: '{"producer":"Ops Enablement"}',
        allowEmpty: true
      }
    ],
    columns: [
      {
        key: 'title',
        label: 'Show',
        render: (item) => (
          <span>
            <span className="font-semibold text-slate-900">{item.title}</span>
            {item.subtitle ? <span className="block text-xs text-slate-500">{item.subtitle}</span> : null}
          </span>
        )
      },
      {
        key: 'status',
        label: 'Status',
        render: (item) => <span className="uppercase tracking-wide text-xs text-slate-500">{item.status}</span>
      },
      {
        key: 'ownerName',
        label: 'Owner',
        render: (item) => item.ownerName ?? item.ownerEmail ?? 'Unassigned'
      }
    ],
    statusOptions: [
      { value: 'draft', label: 'Draft' },
      { value: 'in_production', label: 'In production' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'published', label: 'Published' },
      { value: 'archived', label: 'Archived' }
    ]
  }), []);

  const episodeConfig = useMemo(() => ({
    title: 'Podcast Episodes',
    description: selectedShow
      ? `Manage episodes for ${selectedShow.title}.`
      : 'Select a show to manage its episodes.',
    entityName: 'podcast episode',
    createLabel: 'New episode',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Incident Simulation Playbook' },
      { name: 'slug', label: 'Slug', type: 'text', placeholder: 'incident-simulation-playbook' },
      { name: 'summary', label: 'Summary', type: 'textarea', rows: 3, placeholder: 'Short teaser for the episode.' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4, fullWidth: true },
      { name: 'audioUrl', label: 'Audio URL', type: 'text', placeholder: 'https://...' },
      { name: 'videoUrl', label: 'Video URL', type: 'text', placeholder: 'https://...' },
      { name: 'durationSeconds', label: 'Duration (seconds)', type: 'number', min: 0, step: '1', defaultValue: '' },
      { name: 'seasonNumber', label: 'Season', type: 'number', min: 1, step: '1', defaultValue: 1 },
      { name: 'episodeNumber', label: 'Episode', type: 'number', min: 1, step: '1', defaultValue: 1 },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'editing', label: 'Editing' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' }
        ],
        defaultValue: 'draft'
      },
      { name: 'publishAt', label: 'Publish at', type: 'datetime', allowEmpty: true },
      { name: 'metadata', label: 'Metadata (JSON)', type: 'json', fullWidth: true, rows: 6, allowEmpty: true }
    ],
    columns: [
      {
        key: 'title',
        label: 'Episode',
        render: (item) => (
          <span>
            <span className="font-semibold text-slate-900">
              S{item.seasonNumber ?? 1}E{item.episodeNumber ?? 1} · {item.title}
            </span>
            {item.summary ? <span className="block text-xs text-slate-500">{item.summary}</span> : null}
          </span>
        )
      },
      {
        key: 'status',
        label: 'Status',
        render: (item) => <span className="uppercase tracking-wide text-xs text-slate-500">{item.status}</span>
      },
      {
        key: 'publishAt',
        label: 'Publish',
        render: (item) => formatDate(item.publishAt)
      }
    ],
    statusOptions: [
      { value: 'draft', label: 'Draft' },
      { value: 'editing', label: 'Editing' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'published', label: 'Published' },
      { value: 'archived', label: 'Archived' }
    ]
  }), [selectedShow]);

  const episodesEmptyState = useMemo(() => (
    <DashboardStateMessage
      title="Select a podcast show"
      description="Choose a show from the list to manage its episode slate."
    />
  ), []);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <AdminCrudResource
        token={token}
        title={showConfig.title}
        description={showConfig.description}
        entityName={showConfig.entityName}
        listRequest={({ token: authToken, params, signal }) =>
          api.listPodcastShows({ token: authToken, params, signal })
        }
        createRequest={({ token: authToken, payload }) => api.createPodcastShow({ token: authToken, payload })}
        updateRequest={({ token: authToken, id, payload }) => api.updatePodcastShow(id, { token: authToken, payload })}
        deleteRequest={({ token: authToken, id }) => api.deletePodcastShow(id, { token: authToken })}
        fields={showConfig.fields}
        columns={showConfig.columns}
        statusOptions={showConfig.statusOptions}
        searchPlaceholder="Search shows"
        createLabel={showConfig.createLabel}
        onItemsChange={handleShowsChange}
        onSelectItem={setSelectedShow}
        selectedId={selectedShow?.id}
      />

      <AdminCrudResource
        token={token}
        title={episodeConfig.title}
        description={episodeConfig.description}
        entityName={episodeConfig.entityName}
        listRequest={({ token: authToken, params, signal }) =>
          selectedShow
            ? api.listPodcastEpisodes(selectedShow.id, { token: authToken, params, signal })
            : Promise.resolve({ data: [], meta: {} })
        }
        createRequest={({ token: authToken, payload }) => {
          if (!selectedShow) {
            throw new Error('Select a podcast show before creating episodes.');
          }
          return api.createPodcastEpisode(selectedShow.id, {
            token: authToken,
            payload: { ...payload, showId: selectedShow.id }
          });
        }}
        updateRequest={({ token: authToken, id, payload }) => {
          if (!selectedShow) {
            throw new Error('Select a podcast show before editing episodes.');
          }
          return api.updatePodcastEpisode(selectedShow.id, id, { token: authToken, payload });
        }}
        deleteRequest={({ token: authToken, id }) => {
          if (!selectedShow) {
            throw new Error('Select a podcast show before deleting episodes.');
          }
          return api.deletePodcastEpisode(selectedShow.id, id, { token: authToken });
        }}
        fields={episodeConfig.fields}
        columns={episodeConfig.columns}
        statusOptions={episodeConfig.statusOptions}
        searchPlaceholder="Search episodes"
        createLabel={episodeConfig.createLabel}
        emptyState={episodesEmptyState}
        disabled={!selectedShow}
      />
    </div>
  );
}

AdminPodcastManager.propTypes = {
  token: PropTypes.string,
  api: PropTypes.shape({
    listPodcastShows: PropTypes.func.isRequired,
    createPodcastShow: PropTypes.func.isRequired,
    updatePodcastShow: PropTypes.func.isRequired,
    deletePodcastShow: PropTypes.func.isRequired,
    listPodcastEpisodes: PropTypes.func.isRequired,
    createPodcastEpisode: PropTypes.func.isRequired,
    updatePodcastEpisode: PropTypes.func.isRequired,
    deletePodcastEpisode: PropTypes.func.isRequired
  }).isRequired
};

AdminPodcastManager.defaultProps = {
  token: null
};
