import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const HTTPS_PATTERN = /^https:\/\//i;

function sanitiseHttpsUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || !HTTPS_PATTERN.test(trimmed)) return '';
  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch (error) {
    return '';
  }
}

function ChipInput({ label, helper, placeholder, values, onChange, max = 12 }) {
  const [draft, setDraft] = useState('');

  const addChip = useCallback(() => {
    const raw = draft.trim();
    if (!raw) return;
    const fingerprint = raw.toLowerCase();
    const existing = new Set(values.map((item) => item.toLowerCase()));
    if (existing.has(fingerprint)) {
      setDraft('');
      return;
    }
    if (values.length >= max) {
      setDraft('');
      return;
    }
    onChange([...values, raw]);
    setDraft('');
  }, [draft, max, onChange, values]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
        event.preventDefault();
        addChip();
      }
    },
    [addChip]
  );

  const removeChip = useCallback(
    (chip) => {
      onChange(values.filter((value) => value !== chip));
    },
    [onChange, values]
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="group inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary-dark"
            >
              {value}
              <button
                type="button"
                onClick={() => removeChip(value)}
                className="rounded-full bg-primary-dark/10 px-1.5 text-xs font-bold text-primary-dark transition hover:bg-primary-dark/20"
                aria-label={`Remove ${value}`}
              >
                ×
              </button>
            </span>
          ))}
          {values.length < max ? (
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={addChip}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 min-w-[120px] border-none bg-transparent text-sm text-slate-700 focus:outline-none"
            />
          ) : null}
        </div>
      </div>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function GalleryEditor({ items, onChange, onRemove, onAdd }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Resource URL</label>
              <input
                type="url"
                value={item.url}
                onChange={(event) => onChange(index, { url: event.target.value })}
                placeholder="https://example.com/media.jpg"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
              <p className="text-xs text-slate-500">HTTPS URLs only. Optimised imagery delivers faster showcases.</p>
            </div>
            <div className="lg:w-48">
              <label className="text-sm font-semibold text-slate-700">Asset type</label>
              <select
                value={item.kind}
                onChange={(event) => onChange(index, { kind: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold text-slate-700">Caption</label>
            <input
              type="text"
              value={item.caption ?? ''}
              onChange={(event) => onChange(index, { caption: event.target.value })}
              placeholder="Add a concise caption"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="text-sm font-semibold text-rose-600 hover:text-rose-700"
            >
              Remove item
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-primary px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary-dark hover:text-primary-dark"
      >
        + Add gallery item
      </button>
    </div>
  );
}

ChipInput.propTypes = {
  label: PropTypes.string.isRequired,
  helper: PropTypes.string,
  placeholder: PropTypes.string,
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  max: PropTypes.number
};

ChipInput.defaultProps = {
  helper: undefined,
  placeholder: undefined,
  max: 12
};

GalleryEditor.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string,
      caption: PropTypes.string,
      kind: PropTypes.oneOf(['image', 'video'])
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired
};

export default function MaterialMetadataEditor({
  asset,
  draft,
  onFieldChange,
  onGalleryChange,
  onGalleryRemove,
  onGalleryAdd,
  onReset,
  onSave,
  saving,
  feedback,
  error
}) {
  const previewCoverImage = useMemo(() => sanitiseHttpsUrl(draft.coverImageUrl), [draft.coverImageUrl]);
  const previewVideo = useMemo(() => sanitiseHttpsUrl(draft.showcaseVideoUrl), [draft.showcaseVideoUrl]);
  const previewPoster = useMemo(() => sanitiseHttpsUrl(draft.showcaseVideoPosterUrl), [draft.showcaseVideoPosterUrl]);

  if (!asset) {
    return (
      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Select a material to manage</h2>
        <p className="mt-2 text-sm text-slate-500">
          Choose a content asset from the table to edit descriptions, tags, showcase media, and visibility.
        </p>
      </div>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
  };

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Material management</p>
            <h2 className="text-2xl font-semibold text-slate-900">{asset.originalFilename}</h2>
            <p className="text-sm text-slate-500">
              Curate the storytelling metadata that powers discovery, commerce, and learner experiences.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={draft.visibility}
              onChange={(event) => onFieldChange('visibility', event.target.value)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="workspace">Workspace</option>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            >
              Reset changes
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Title</label>
              <input
                type="text"
                value={draft.title}
                onChange={(event) => onFieldChange('title', event.target.value)}
                maxLength={140}
                placeholder="Immersive data storytelling for climate impact"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Executive summary</label>
              <textarea
                value={draft.description}
                onChange={(event) => onFieldChange('description', event.target.value)}
                maxLength={1500}
                rows={6}
                placeholder="Summarise the learner outcomes, differentiators, and companion resources for this material."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-500">Maximum 1,500 characters. This powers search, share links, and storefront copy.</p>
            </div>
            <ChipInput
              label="Categories"
              helper="Group the material into strategic catalog clusters. Max 12 categories."
              placeholder="Add category and press enter"
              values={draft.categories}
              onChange={(values) => onFieldChange('categories', values)}
              max={12}
            />
            <ChipInput
              label="Tags"
              helper="Add long-tail tags for marketplace discovery, instructor dashboards, and analytics segmentation."
              placeholder="Add tag"
              values={draft.tags}
              onChange={(values) => onFieldChange('tags', values)}
              max={24}
            />
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Cover image URL</label>
              <input
                type="url"
                value={draft.coverImageUrl}
                onChange={(event) => onFieldChange('coverImageUrl', event.target.value)}
                placeholder="https://cdn.example.com/materials/cover.jpg"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-500">Use 1600×900 imagery on HTTPS for crisp hero presentations across devices.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Cover image alt text</label>
              <input
                type="text"
                value={draft.coverImageAlt}
                onChange={(event) => onFieldChange('coverImageAlt', event.target.value)}
                maxLength={120}
                placeholder="Women presenting carbon insights dashboard"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Showcase video</label>
              <input
                type="url"
                value={draft.showcaseVideoUrl}
                onChange={(event) => onFieldChange('showcaseVideoUrl', event.target.value)}
                placeholder="https://cdn.example.com/materials/showcase.mp4"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="url"
                value={draft.showcaseVideoPosterUrl}
                onChange={(event) => onFieldChange('showcaseVideoPosterUrl', event.target.value)}
                placeholder="https://cdn.example.com/materials/showcase-poster.jpg"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-500">Optional HD video trailer with poster fallback. Supports MP4, HLS, or WebM on HTTPS.</p>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Showcase messaging</label>
              <input
                type="text"
                value={draft.showcaseHeadline}
                onChange={(event) => onFieldChange('showcaseHeadline', event.target.value)}
                maxLength={120}
                placeholder="Reimagine ESG storytelling"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                value={draft.showcaseSubheadline}
                onChange={(event) => onFieldChange('showcaseSubheadline', event.target.value)}
                maxLength={200}
                placeholder="Trusted templates, video walkthroughs, and analytics instrumentation ready to deploy."
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                value={draft.showcaseBadge}
                onChange={(event) => onFieldChange('showcaseBadge', event.target.value)}
                maxLength={32}
                placeholder="Featured"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={draft.callToActionLabel}
                  onChange={(event) => onFieldChange('callToActionLabel', event.target.value)}
                  maxLength={40}
                  placeholder="Book a walkthrough"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="url"
                  value={draft.callToActionUrl}
                  onChange={(event) => onFieldChange('callToActionUrl', event.target.value)}
                  placeholder="https://cal.com/edulure/material-demo"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Gallery</h3>
              <p className="text-sm text-slate-500">Curate supporting visuals or trailers. Limit of 8 showcase assets.</p>
            </div>
            <button
              type="button"
              onClick={() => onFieldChange('showcasePinned', !draft.showcasePinned)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                draft.showcasePinned
                  ? 'bg-primary text-white shadow-primary/30 shadow'
                  : 'border border-slate-200 text-slate-600'
              }`}
            >
              {draft.showcasePinned ? 'Pinned to highlights' : 'Pin to highlights'}
            </button>
          </div>
          <GalleryEditor
            items={draft.gallery}
            onChange={onGalleryChange}
            onRemove={onGalleryRemove}
            onAdd={onGalleryAdd}
          />
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}
        {feedback ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {feedback}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? 'Saving…' : 'Save material profile'}
          </button>
        </div>
      </form>

      <aside className="rounded-4xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Showcase preview</h3>
        <p className="mt-1 text-sm text-slate-500">How this material appears across marketplace cards and dashboards.</p>
        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {previewCoverImage ? (
            <img src={previewCoverImage} alt={draft.coverImageAlt || 'Material cover'} className="h-44 w-full object-cover" />
          ) : (
            <div className="flex h-44 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
              Upload a cover image to elevate the hero section
            </div>
          )}
          <div className="space-y-3 px-5 py-4">
            {draft.showcaseBadge ? (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {draft.showcaseBadge}
              </span>
            ) : null}
            <div>
              <h4 className="text-lg font-semibold text-slate-900">{draft.showcaseHeadline || 'Add a compelling headline'}</h4>
              <p className="mt-1 text-sm text-slate-500">
                {draft.showcaseSubheadline || 'Use this space to convey differentiation, outcomes, and premium signals.'}
              </p>
            </div>
            {draft.callToActionLabel ? (
              <a
                href={sanitiseHttpsUrl(draft.callToActionUrl) || '#'}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                {draft.callToActionLabel}
              </a>
            ) : null}
          </div>
          {previewVideo ? (
            <div className="px-5 pb-5">
              <video
                controls
                poster={previewPoster || undefined}
                className="w-full rounded-2xl border border-slate-200"
              >
                <source src={previewVideo} />
                Your browser does not support the preview video.
              </video>
            </div>
          ) : null}
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Categories</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.categories.length ? (
                draft.categories.map((category) => (
                  <span key={category} className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-700">
                    {category}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Add categories for better targeting.</span>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Tags</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.tags.length ? (
                draft.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-dark">
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Add tags to power personalisation.</span>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Gallery</h4>
            {draft.gallery.length ? (
              <ul className="mt-2 space-y-2 text-xs text-slate-500">
                {draft.gallery.map((item, index) => (
                  <li key={`${item.url}-${index}`} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <span className="truncate font-semibold text-slate-700">{item.kind === 'video' ? 'Video' : 'Image'} · {item.caption || item.url}</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">HTTPS</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Add gallery assets to enrich the learner journey.</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Visibility</h4>
            <p className="mt-1 text-xs font-semibold text-slate-600">{draft.visibility === 'public' ? 'Public – discoverable across the marketplace' : draft.visibility === 'private' ? 'Private – restricted to your team' : 'Workspace – available to authenticated workspace members'}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

MaterialMetadataEditor.propTypes = {
  asset: PropTypes.shape({
    originalFilename: PropTypes.string.isRequired
  }),
  draft: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    categories: PropTypes.arrayOf(PropTypes.string),
    tags: PropTypes.arrayOf(PropTypes.string),
    coverImageUrl: PropTypes.string,
    coverImageAlt: PropTypes.string,
    showcaseVideoUrl: PropTypes.string,
    showcaseVideoPosterUrl: PropTypes.string,
    showcaseHeadline: PropTypes.string,
    showcaseSubheadline: PropTypes.string,
    showcaseBadge: PropTypes.string,
    callToActionLabel: PropTypes.string,
    callToActionUrl: PropTypes.string,
    gallery: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        caption: PropTypes.string,
        kind: PropTypes.oneOf(['image', 'video'])
      })
    ),
    visibility: PropTypes.string,
    showcasePinned: PropTypes.bool
  }).isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onGalleryChange: PropTypes.func.isRequired,
  onGalleryRemove: PropTypes.func.isRequired,
  onGalleryAdd: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  feedback: PropTypes.string,
  error: PropTypes.string
};

MaterialMetadataEditor.defaultProps = {
  asset: null,
  saving: false,
  feedback: null,
  error: null
};
