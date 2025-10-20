import adminControlApi from '../../../api/adminControlApi.js';

function extractPathIdentifier(pathname) {
  if (!pathname) {
    return null;
  }
  return pathname.replace(/^\//, '').split(/[/?#]/)[0] ?? null;
}

function normaliseVideoEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes('youtu.be')) {
      const identifier = extractPathIdentifier(url.pathname);
      return identifier ? `https://www.youtube.com/embed/${identifier}` : null;
    }

    if (hostname.includes('youtube.com')) {
      const videoId = url.searchParams.get('v') || extractPathIdentifier(url.pathname.replace('/embed', ''));
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname.includes('vimeo.com')) {
      const identifier = extractPathIdentifier(url.pathname);
      return identifier ? `https://player.vimeo.com/video/${identifier}` : null;
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function createImagePreviewRenderer({ alt, fallbackText = 'Add an image URL to preview.' } = {}) {
  const baseClass = 'overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm';
  return ({ value }) => {
    if (!value) {
      return <p className="text-xs text-slate-400">{fallbackText}</p>;
    }

    return (
      <figure className={baseClass}>
        <img src={value} alt={alt ?? 'Media preview'} className="h-36 w-full object-cover" loading="lazy" />
      </figure>
    );
  };
}

function createVideoPreviewRenderer({ fallbackText = 'Paste a video URL to preview.', rounded = true } = {}) {
  const containerClass = `${rounded ? 'overflow-hidden rounded-xl ' : ''}border border-slate-200 bg-slate-900/70 shadow-sm`;
  return ({ value }) => {
    if (!value) {
      return <p className="text-xs text-slate-400">{fallbackText}</p>;
    }

    const embedUrl = normaliseVideoEmbedUrl(value);

    if (embedUrl) {
      return (
        <div className={`${containerClass} aspect-video w-full`}>
          <iframe
            title="Video preview"
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <video className={`${containerClass} w-full`} controls>
        <source src={value} />
        Your browser does not support embedded video previews.
      </video>
    );
  };
}

function createExternalLinkPreviewRenderer({ label = 'Open link in new tab', icon = '↗', tone = 'primary' } = {}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 hover:text-emerald-700'
      : tone === 'indigo'
        ? 'text-indigo-600 hover:text-indigo-700'
        : 'text-primary hover:text-primary/80';

  return ({ value }) => {
    if (!value) {
      return <p className="text-xs text-slate-400">Provide a URL to enable quick testing.</p>;
    }

    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-xs font-semibold ${toneClass}`}
      >
        {label}
        <span aria-hidden>{icon}</span>
      </a>
    );
  };
}

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
        {
          name: 'thumbnailUrl',
          label: 'Thumbnail URL',
          type: 'url',
          placeholder: 'https://assets.edulure.com/course-thumbnail.jpg',
          renderPreview: createImagePreviewRenderer({ alt: 'Course thumbnail preview' })
        },
        {
          name: 'heroImageUrl',
          label: 'Hero image URL',
          type: 'url',
          allowEmpty: true,
          placeholder: 'https://assets.edulure.com/course-hero.jpg',
          renderPreview: createImagePreviewRenderer({ alt: 'Course hero image preview' })
        },
        {
          name: 'promoVideoUrl',
          label: 'Promo video URL',
          type: 'url',
          allowEmpty: true,
          placeholder: 'https://video.edulure.com/promo.mp4',
          renderPreview: createVideoPreviewRenderer({
            fallbackText: 'Paste an MP4, Vimeo, or YouTube link for the promo reel.'
          })
        },
        {
          name: 'trailerUrl',
          label: 'Trailer URL',
          type: 'url',
          allowEmpty: true,
          placeholder: 'https://www.youtube.com/watch?v=...',
          renderPreview: createVideoPreviewRenderer({
            fallbackText: 'Paste a YouTube or Vimeo trailer to preview the embed.'
          })
        },
        {
          name: 'syllabusUrl',
          label: 'Syllabus URL',
          type: 'url',
          allowEmpty: true,
          placeholder: 'https://cdn.edulure.com/syllabus.pdf',
          renderPreview: createExternalLinkPreviewRenderer({ label: 'Preview syllabus PDF', tone: 'indigo' })
        },
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
        },
        {
          key: 'mediaAssets',
          label: 'Media',
          render: (item) => {
            const badges = [];
            if (item.thumbnailUrl || item.heroImageUrl) {
              badges.push('Images');
            }
            if (item.promoVideoUrl || item.trailerUrl) {
              badges.push('Video');
            }
            if (item.syllabusUrl) {
              badges.push('Syllabus');
            }

            if (!badges.length) {
              return <span className="text-xs text-slate-400">No media attached</span>;
            }

            return (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            );
          }
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
        {
          name: 'coverImageUrl',
          label: 'Cover image URL',
          type: 'url',
          allowEmpty: true,
          placeholder: 'https://assets.edulure.com/ebooks/cover.jpg',
          renderPreview: createImagePreviewRenderer({ alt: 'E-book cover preview' })
        },
        { name: 'readingTimeMinutes', label: 'Reading time (minutes)', type: 'number', min: 0 },
        {
          name: 'sampleDownloadUrl',
          label: 'Sample download URL',
          type: 'url',
          allowEmpty: true,
          placeholder: 'https://cdn.edulure.com/ebooks/sample.pdf',
          renderPreview: createExternalLinkPreviewRenderer({ label: 'Open sample PDF', tone: 'emerald' })
        },
        {
          name: 'audiobookUrl',
          label: 'Audiobook URL',
          type: 'url',
          allowEmpty: true,
          placeholder: 'https://audio.edulure.com/ebooks/audio.mp3',
          renderPreview: createExternalLinkPreviewRenderer({ label: 'Listen to audio edition', tone: 'indigo' })
        },
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
        },
        {
          key: 'media',
          label: 'Media',
          render: (item) => {
            const badges = [];
            if (item.coverImageUrl) {
              badges.push('Cover');
            }
            if (item.sampleDownloadUrl) {
              badges.push('Sample');
            }
            if (item.audiobookUrl) {
              badges.push('Audio');
            }

            if (!badges.length) {
              return <span className="text-xs text-slate-400">No media linked</span>;
            }

            return (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            );
          }
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
