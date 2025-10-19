import { useMemo, useState } from 'react';
import clsx from 'clsx';

import adminControlApi from '../../api/adminControlApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import AdminCrudResource from '../../components/dashboard/admin/AdminCrudResource.jsx';
import AdminPodcastManager from '../../components/dashboard/admin/AdminPodcastManager.jsx';

function formatCurrency(amount, currency = 'USD') {
  const numeric = typeof amount === 'number' ? amount / 100 : Number(amount ?? 0) / 100;
  if (!Number.isFinite(numeric)) {
    return `${currency} 0.00`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(numeric);
}

function formatDate(value) {
  if (!value) return 'Not scheduled';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled';
  }
  return date.toLocaleString();
}

const TABS = [
  { id: 'communities', label: 'Communities' },
  { id: 'courses', label: 'Courses' },
  { id: 'tutors', label: 'Tutors' },
  { id: 'ebooks', label: 'E-books' },
  { id: 'liveStreams', label: 'Live streams' },
  { id: 'podcasts', label: 'Podcasts' }
];

export default function AdminControl() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [activeTab, setActiveTab] = useState('communities');

  const resourceConfigs = useMemo(
    () => ({
      communities: {
        title: 'Communities management',
        description: 'Create, update, and retire community workspaces across the platform.',
        entityName: 'community',
        listRequest: adminControlApi.listCommunities,
        createRequest: adminControlApi.createCommunity,
        updateRequest: adminControlApi.updateCommunity,
        deleteRequest: adminControlApi.deleteCommunity,
        fields: [
          { name: 'name', label: 'Community name', type: 'text', required: true, placeholder: 'Learning Ops Guild' },
          { name: 'slug', label: 'Slug', type: 'text', placeholder: 'learning-ops-guild' },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            rows: 4,
            fullWidth: true,
            placeholder: 'Operations leaders share classroom launch playbooks and automation recipes.'
          },
          { name: 'ownerId', label: 'Owner user ID', type: 'number', required: true },
          {
            name: 'visibility',
            label: 'Visibility',
            type: 'select',
            defaultValue: 'public',
            options: [
              { value: 'public', label: 'Public' },
              { value: 'private', label: 'Private' }
            ]
          },
          { name: 'coverImageUrl', label: 'Cover image URL', type: 'text', placeholder: 'https://...' },
          {
            name: 'metadata',
            label: 'Metadata (JSON)',
            type: 'json',
            fullWidth: true,
            rows: 6,
            allowEmpty: true,
            placeholder: '{"focus":["operations"]}'
          }
        ],
        columns: [
          {
            key: 'name',
            label: 'Community',
            render: (item) => (
              <span>
                <span className="font-semibold text-slate-900">{item.name}</span>
                {item.slug ? <span className="block text-xs text-slate-500">/{item.slug}</span> : null}
              </span>
            )
          },
          {
            key: 'visibility',
            label: 'Visibility',
            render: (item) => <span className="uppercase tracking-wide text-xs text-slate-500">{item.visibility}</span>
          },
          {
            key: 'ownerName',
            label: 'Owner',
            render: (item) => item.ownerName ?? item.ownerEmail ?? `User #${item.ownerId}`
          }
        ]
      },
      courses: {
        title: 'Courses management',
        description: 'Launch, iterate, and retire course catalog entries for instructors and learning teams.',
        entityName: 'course',
        listRequest: adminControlApi.listCourses,
        createRequest: adminControlApi.createCourse,
        updateRequest: adminControlApi.updateCourse,
        deleteRequest: adminControlApi.deleteCourse,
        fields: [
          { name: 'instructorId', label: 'Instructor user ID', type: 'number', required: true },
          { name: 'title', label: 'Course title', type: 'text', required: true },
          { name: 'slug', label: 'Slug', type: 'text', placeholder: 'automation-command-simulation' },
          { name: 'summary', label: 'Summary', type: 'textarea', rows: 3 },
          { name: 'description', label: 'Description', type: 'textarea', rows: 4, fullWidth: true },
          {
            name: 'level',
            label: 'Level',
            type: 'select',
            defaultValue: 'beginner',
            options: [
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
              { value: 'expert', label: 'Expert' }
            ]
          },
          { name: 'category', label: 'Category', type: 'text', placeholder: 'operations' },
          {
            name: 'skills',
            label: 'Skills',
            type: 'tags',
            placeholder: 'Automation, Incident response',
            helpText: 'Comma separated list.'
          },
          { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'playbooks, telemetry' },
          { name: 'languages', label: 'Languages', type: 'tags', placeholder: 'en, es' },
          {
            name: 'deliveryFormat',
            label: 'Delivery format',
            type: 'select',
            defaultValue: 'self_paced',
            options: [
              { value: 'self_paced', label: 'Self-paced' },
              { value: 'cohort', label: 'Cohort' },
              { value: 'live', label: 'Live' },
              { value: 'blended', label: 'Blended' }
            ]
          },
          { name: 'thumbnailUrl', label: 'Thumbnail URL', type: 'text', placeholder: 'https://...' },
          {
            name: 'priceAmount',
            label: 'Price',
            type: 'number',
            step: '0.01',
            min: 0,
            toInput: (item) => (item?.priceAmount ? (item.priceAmount / 100).toFixed(2) : ''),
            fromInput: (value) => (value === '' ? undefined : Number(value))
          },
          { name: 'priceCurrency', label: 'Currency', type: 'text', defaultValue: 'USD' },
          { name: 'isPublished', label: 'Published', type: 'checkbox', defaultValue: false },
          { name: 'releaseAt', label: 'Release at', type: 'datetime', allowEmpty: true },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            defaultValue: 'draft',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'review', label: 'In review' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' }
            ]
          },
          {
            name: 'metadata',
            label: 'Metadata (JSON)',
            type: 'json',
            fullWidth: true,
            rows: 6,
            allowEmpty: true,
            placeholder: '{"durationWeeks":6}'
          }
        ],
        columns: [
          {
            key: 'title',
            label: 'Course',
            render: (item) => (
              <span>
                <span className="font-semibold text-slate-900">{item.title}</span>
                {item.slug ? <span className="block text-xs text-slate-500">/{item.slug}</span> : null}
              </span>
            )
          },
          {
            key: 'status',
            label: 'Status',
            render: (item) => <span className="uppercase tracking-wide text-xs text-slate-500">{item.status}</span>
          },
          {
            key: 'priceAmount',
            label: 'Price',
            render: (item) => formatCurrency(item.priceAmount, item.priceCurrency)
          }
        ],
        statusOptions: [
          { value: 'draft', label: 'Draft' },
          { value: 'review', label: 'In review' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' }
        ]
      },
      tutors: {
        title: 'Tutor management',
        description: 'Curate and verify tutor profiles, availability preferences, and rates.',
        entityName: 'tutor profile',
        listRequest: adminControlApi.listTutors,
        createRequest: adminControlApi.createTutor,
        updateRequest: adminControlApi.updateTutor,
        deleteRequest: adminControlApi.deleteTutor,
        fields: [
          { name: 'userId', label: 'User ID', type: 'number', required: true },
          { name: 'displayName', label: 'Display name', type: 'text', required: true },
          { name: 'headline', label: 'Headline', type: 'text', placeholder: 'Automation strategist & tutor' },
          { name: 'bio', label: 'Bio', type: 'textarea', rows: 4, fullWidth: true },
          { name: 'skills', label: 'Skills', type: 'tags', placeholder: 'Automation, Telemetry' },
          { name: 'languages', label: 'Languages', type: 'tags', placeholder: 'en, fr' },
          { name: 'country', label: 'Country', type: 'text', placeholder: 'US' },
          { name: 'timezones', label: 'Preferred timezones', type: 'tags', placeholder: 'America/New_York, Europe/London' },
          {
            name: 'availabilityPreferences',
            label: 'Availability preferences (JSON)',
            type: 'json',
            rows: 4,
            allowEmpty: true,
            placeholder: '{"weeklyHours":10}'
          },
          {
            name: 'hourlyRateAmount',
            label: 'Hourly rate',
            type: 'number',
            step: '0.01',
            min: 0,
            toInput: (item) => (item?.hourlyRateAmount ? (item.hourlyRateAmount / 100).toFixed(2) : ''),
            fromInput: (value) => (value === '' ? undefined : Number(value))
          },
          { name: 'hourlyRateCurrency', label: 'Currency', type: 'text', defaultValue: 'USD' },
          { name: 'isVerified', label: 'Verified', type: 'checkbox', defaultValue: false },
          {
            name: 'metadata',
            label: 'Metadata (JSON)',
            type: 'json',
            rows: 4,
            fullWidth: true,
            allowEmpty: true,
            placeholder: '{"specialties":["Automation"]}'
          }
        ],
        columns: [
          {
            key: 'displayName',
            label: 'Tutor',
            render: (item) => (
              <span>
                <span className="font-semibold text-slate-900">{item.displayName}</span>
                {item.headline ? <span className="block text-xs text-slate-500">{item.headline}</span> : null}
              </span>
            )
          },
          {
            key: 'country',
            label: 'Location',
            render: (item) => item.country ?? '—'
          },
          {
            key: 'hourlyRateAmount',
            label: 'Rate',
            render: (item) => formatCurrency(item.hourlyRateAmount, item.hourlyRateCurrency)
          }
        ]
      },
      ebooks: {
        title: 'E-book management',
        description: 'Manage digital publications, distribution status, and pricing.',
        entityName: 'e-book',
        listRequest: adminControlApi.listEbooks,
        createRequest: adminControlApi.createEbook,
        updateRequest: adminControlApi.updateEbook,
        deleteRequest: adminControlApi.deleteEbook,
        fields: [
          { name: 'assetId', label: 'Asset ID', type: 'text', required: true, placeholder: 'UUID for the source asset' },
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'subtitle', label: 'Subtitle', type: 'text' },
          { name: 'description', label: 'Description', type: 'textarea', rows: 4, fullWidth: true },
          { name: 'authors', label: 'Authors', type: 'tags', placeholder: 'Kai Watanabe' },
          { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'Automation, Launch' },
          { name: 'categories', label: 'Categories', type: 'tags', placeholder: 'operations' },
          { name: 'languages', label: 'Languages', type: 'tags', placeholder: 'en, es' },
          { name: 'isbn', label: 'ISBN', type: 'text' },
          { name: 'readingTimeMinutes', label: 'Reading time (minutes)', type: 'number', min: 0, step: '1' },
          {
            name: 'priceAmount',
            label: 'Price',
            type: 'number',
            step: '0.01',
            min: 0,
            toInput: (item) => (item?.priceAmount ? (item.priceAmount / 100).toFixed(2) : ''),
            fromInput: (value) => (value === '' ? undefined : Number(value))
          },
          { name: 'priceCurrency', label: 'Currency', type: 'text', defaultValue: 'USD' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            defaultValue: 'draft',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'review', label: 'In review' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' }
            ]
          },
          { name: 'isPublic', label: 'Publicly listed', type: 'checkbox', defaultValue: false },
          { name: 'releaseAt', label: 'Release at', type: 'datetime', allowEmpty: true },
          {
            name: 'metadata',
            label: 'Metadata (JSON)',
            type: 'json',
            fullWidth: true,
            rows: 6,
            allowEmpty: true,
            placeholder: '{"format":"pdf"}'
          }
        ],
        columns: [
          {
            key: 'title',
            label: 'E-book',
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
            key: 'priceAmount',
            label: 'Price',
            render: (item) => formatCurrency(item.priceAmount, item.priceCurrency)
          }
        ],
        statusOptions: [
          { value: 'draft', label: 'Draft' },
          { value: 'review', label: 'In review' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' }
        ]
      },
      liveStreams: {
        title: 'Live stream management',
        description: 'Coordinate live classroom experiences, ticketing, and scheduling.',
        entityName: 'live stream',
        listRequest: adminControlApi.listLiveStreams,
        createRequest: adminControlApi.createLiveStream,
        updateRequest: adminControlApi.updateLiveStream,
        deleteRequest: adminControlApi.deleteLiveStream,
        fields: [
          { name: 'communityId', label: 'Community ID', type: 'number', allowEmpty: true },
          { name: 'instructorId', label: 'Instructor user ID', type: 'number', allowEmpty: true },
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'slug', label: 'Slug', type: 'text', placeholder: 'automation-command-simulation' },
          { name: 'summary', label: 'Summary', type: 'textarea', rows: 3 },
          { name: 'description', label: 'Description', type: 'textarea', rows: 4, fullWidth: true },
          {
            name: 'type',
            label: 'Type',
            type: 'select',
            defaultValue: 'workshop',
            options: [
              { value: 'workshop', label: 'Workshop' },
              { value: 'webinar', label: 'Webinar' },
              { value: 'coaching', label: 'Coaching' },
              { value: 'office_hours', label: 'Office hours' }
            ]
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            defaultValue: 'draft',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'live', label: 'Live' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]
          },
          { name: 'isTicketed', label: 'Ticketed', type: 'checkbox', defaultValue: false },
          {
            name: 'priceAmount',
            label: 'Price',
            type: 'number',
            step: '0.01',
            min: 0,
            toInput: (item) => (item?.priceAmount ? (item.priceAmount / 100).toFixed(2) : ''),
            fromInput: (value) => (value === '' ? undefined : Number(value))
          },
          { name: 'priceCurrency', label: 'Currency', type: 'text', defaultValue: 'USD' },
          { name: 'capacity', label: 'Capacity', type: 'number', min: 0, step: '1' },
          { name: 'reservedSeats', label: 'Reserved seats', type: 'number', min: 0, step: '1' },
          { name: 'timezone', label: 'Timezone', type: 'text', defaultValue: 'Etc/UTC' },
          { name: 'startAt', label: 'Start time', type: 'datetime', required: true },
          { name: 'endAt', label: 'End time', type: 'datetime', required: true },
          { name: 'topics', label: 'Topics', type: 'tags', placeholder: 'Automation, Incident response' },
          {
            name: 'metadata',
            label: 'Metadata (JSON)',
            type: 'json',
            rows: 4,
            fullWidth: true,
            allowEmpty: true,
            placeholder: '{"broadcastPlatform":"Agora"}'
          }
        ],
        columns: [
          {
            key: 'title',
            label: 'Live stream',
            render: (item) => (
              <span>
                <span className="font-semibold text-slate-900">{item.title}</span>
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
            key: 'startAt',
            label: 'Schedule',
            render: (item) => formatDate(item.startAt)
          }
        ],
        statusOptions: [
          { value: 'draft', label: 'Draft' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'live', label: 'Live' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' }
        ]
      }
    }),
    []
  );

  if (!token) {
    return (
      <DashboardStateMessage
        title="Admin authentication required"
        description="Sign in with an administrator account to access the operational control centre."
      />
    );
  }

  const config = resourceConfigs[activeTab];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Operational control centre</h1>
          <p className="mt-2 text-sm text-slate-600">
            Activate, iterate, and retire platform programmes across communities, courses, tutors, live experiences, and media.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'rounded-full border px-4 py-2 text-xs font-semibold transition',
                activeTab === tab.id
                  ? 'border-primary bg-primary text-white shadow'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'podcasts' ? (
        <AdminPodcastManager token={token} api={adminControlApi} />
      ) : (
        <AdminCrudResource
          token={token}
          title={config.title}
          description={config.description}
          entityName={config.entityName}
          listRequest={({ token: authToken, params, signal, context }) =>
            config.listRequest({ token: authToken, params, signal, context })
          }
          createRequest={({ token: authToken, payload, context }) =>
            config.createRequest({ token: authToken, payload, context })
          }
          updateRequest={({ token: authToken, id, payload, context }) =>
            config.updateRequest(id, { token: authToken, payload, context })
          }
          deleteRequest={({ token: authToken, id, context }) =>
            config.deleteRequest(id, { token: authToken, context })
          }
          fields={config.fields}
          columns={config.columns}
          statusOptions={config.statusOptions}
          searchPlaceholder={`Search ${config.entityName}s`}
        />
      )}
    </div>
  );
}
