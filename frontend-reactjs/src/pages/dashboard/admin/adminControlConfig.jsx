import adminControlApi from '../../../api/adminControlApi.js';

export function formatCurrency(amount, currency = 'USD') {
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

export function formatDate(value) {
  if (!value) return 'Not scheduled';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled';
  }
  return date.toLocaleString();
}

export const ADMIN_CONTROL_TABS = [
  { id: 'communities', label: 'Communities' },
  { id: 'courses', label: 'Courses' },
  { id: 'tutors', label: 'Tutors' },
  { id: 'ebooks', label: 'E-books' },
  { id: 'liveStreams', label: 'Live streams' },
  { id: 'podcasts', label: 'Podcasts' }
];

export function createAdminControlResourceConfigs() {
  return {
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
      ]
    },
    tutors: {
      title: 'Tutor profiles',
      description: 'Vet, activate, and manage tutor supply to meet learner demand.',
      entityName: 'tutor',
      listRequest: adminControlApi.listTutors,
      createRequest: adminControlApi.createTutor,
      updateRequest: adminControlApi.updateTutor,
      deleteRequest: adminControlApi.deleteTutor,
      fields: [
        { name: 'userId', label: 'User ID', type: 'number', required: true },
        { name: 'displayName', label: 'Display name', type: 'text', required: true },
        { name: 'headline', label: 'Headline', type: 'text', placeholder: 'Automation specialist & instructor' },
        { name: 'bio', label: 'Bio', type: 'textarea', rows: 4, fullWidth: true },
        { name: 'skills', label: 'Skills', type: 'tags', placeholder: 'Automation, Strategy' },
        { name: 'languages', label: 'Languages', type: 'tags', placeholder: 'en, es' },
        { name: 'country', label: 'Country code', type: 'text', maxLength: 2, placeholder: 'US' },
        { name: 'timezones', label: 'Preferred timezones', type: 'tags', placeholder: 'Etc/UTC, Europe/London' },
        {
          name: 'availabilityPreferences',
          label: 'Availability preferences (JSON)',
          type: 'json',
          rows: 4,
          fullWidth: true,
          allowEmpty: true,
          placeholder: '{"days":["Mon","Wed"]}'
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
          placeholder: '{"preferredFormats":["coaching"]}'
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
          key: 'hourlyRateAmount',
          label: 'Rate',
          render: (item) => formatCurrency(item.hourlyRateAmount, item.hourlyRateCurrency)
        },
        {
          key: 'isVerified',
          label: 'Verified',
          render: (item) => (item.isVerified ? 'Yes' : 'No')
        }
      ]
    },
    ebooks: {
      title: 'E-book library',
      description: 'Curate catalogue-quality digital books and knowledge packs.',
      entityName: 'ebook',
      listRequest: adminControlApi.listEbooks,
      createRequest: adminControlApi.createEbook,
      updateRequest: adminControlApi.updateEbook,
      deleteRequest: adminControlApi.deleteEbook,
      fields: [
        { name: 'assetId', label: 'Asset ID', type: 'text', required: true, placeholder: 'UUID for storage asset' },
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'subtitle', label: 'Subtitle', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 4, fullWidth: true },
        { name: 'authors', label: 'Authors', type: 'tags', placeholder: 'Casey, Morgan' },
        { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'automation, compliance' },
        { name: 'categories', label: 'Categories', type: 'tags', placeholder: 'ops, leadership' },
        { name: 'languages', label: 'Languages', type: 'tags', placeholder: 'en, fr' },
        { name: 'isbn', label: 'ISBN', type: 'text' },
        { name: 'readingTimeMinutes', label: 'Reading time (minutes)', type: 'number', min: 0 },
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
        { name: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: [
          { value: 'draft', label: 'Draft' },
          { value: 'review', label: 'In review' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' }
        ] },
        { name: 'isPublic', label: 'Public', type: 'checkbox', defaultValue: false },
        { name: 'releaseAt', label: 'Release date', type: 'datetime', allowEmpty: true },
        {
          name: 'metadata',
          label: 'Metadata (JSON)',
          type: 'json',
          rows: 4,
          fullWidth: true,
          allowEmpty: true,
          placeholder: '{"pages":180}'
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
      ]
    },
    liveStreams: {
      title: 'Live experience schedule',
      description: 'Coordinate live programming, webinars, and cohort sessions.',
      entityName: 'live stream',
      listRequest: adminControlApi.listLiveStreams,
      createRequest: adminControlApi.createLiveStream,
      updateRequest: adminControlApi.updateLiveStream,
      deleteRequest: adminControlApi.deleteLiveStream,
      fields: [
        { name: 'communityId', label: 'Community ID', type: 'number', allowEmpty: true },
        { name: 'instructorId', label: 'Instructor ID', type: 'number', allowEmpty: true },
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text' },
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
          label: 'Ticket price',
          type: 'number',
          step: '0.01',
          min: 0,
          toInput: (item) => (item?.priceAmount ? (item.priceAmount / 100).toFixed(2) : ''),
          fromInput: (value) => (value === '' ? undefined : Number(value))
        },
        { name: 'priceCurrency', label: 'Currency', type: 'text', defaultValue: 'USD' },
        { name: 'capacity', label: 'Capacity', type: 'number', min: 0 },
        { name: 'reservedSeats', label: 'Reserved seats', type: 'number', min: 0 },
        { name: 'timezone', label: 'Timezone', type: 'text', defaultValue: 'Etc/UTC' },
        { name: 'startAt', label: 'Start at', type: 'datetime', required: true },
        { name: 'endAt', label: 'End at', type: 'datetime', required: true },
        { name: 'topics', label: 'Topics', type: 'tags', placeholder: 'Automation, Revenue enablement' },
        {
          name: 'metadata',
          label: 'Metadata (JSON)',
          type: 'json',
          rows: 4,
          fullWidth: true,
          allowEmpty: true,
          placeholder: '{"recording":true}'
        }
      ],
      columns: [
        {
          key: 'title',
          label: 'Live session',
          render: (item) => (
            <span>
              <span className="font-semibold text-slate-900">{item.title}</span>
              <span className="block text-xs text-slate-500">{formatDate(item.startAt)}</span>
            </span>
          )
        },
        {
          key: 'status',
          label: 'Status',
          render: (item) => <span className="uppercase tracking-wide text-xs text-slate-500">{item.status}</span>
        },
        {
          key: 'isTicketed',
          label: 'Ticketing',
          render: (item) => (item.isTicketed ? formatCurrency(item.priceAmount, item.priceCurrency) : 'Free')
        }
      ]
    },
    podcasts: {
      title: 'Podcast studio',
      description: 'Manage podcast shows and episodes for community programming.',
      entityName: 'podcast',
      listRequest: adminControlApi.listPodcastShows,
      createRequest: adminControlApi.createPodcastShow,
      updateRequest: adminControlApi.updatePodcastShow,
      deleteRequest: adminControlApi.deletePodcastShow,
      fields: [
        { name: 'communityId', label: 'Community ID', type: 'number', allowEmpty: true },
        { name: 'ownerId', label: 'Owner ID', type: 'number', allowEmpty: true },
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text' },
        { name: 'subtitle', label: 'Subtitle', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 4, fullWidth: true },
        { name: 'coverImageUrl', label: 'Cover image URL', type: 'text', placeholder: 'https://...' },
        { name: 'category', label: 'Category', type: 'text', placeholder: 'ops' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          defaultValue: 'draft',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'in_production', label: 'In production' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' }
          ]
        },
        { name: 'isPublic', label: 'Public', type: 'checkbox', defaultValue: false },
        { name: 'distributionChannels', label: 'Distribution channels', type: 'tags', placeholder: 'Spotify, Apple Podcasts' },
        { name: 'launchAt', label: 'Launch at', type: 'datetime', allowEmpty: true },
        {
          name: 'metadata',
          label: 'Metadata (JSON)',
          type: 'json',
          rows: 4,
          fullWidth: true,
          allowEmpty: true,
          placeholder: '{"season":1}'
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
          key: 'launchAt',
          label: 'Launch',
          render: (item) => formatDate(item.launchAt)
        }
      ]
    }
  };
}

export default createAdminControlResourceConfigs;
