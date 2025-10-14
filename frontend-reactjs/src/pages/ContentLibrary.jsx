import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, set } from 'idb-keyval';

import { httpClient } from '../api/httpClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import PowerpointViewer from '../components/content/PowerpointViewer.jsx';
import EbookReader from '../components/content/EbookReader.jsx';
import MaterialMetadataEditor from '../components/content/MaterialMetadataEditor.jsx';

const CACHE_KEY = 'edulure.content.assets';

const MIME_TYPE_TO_KIND = [
  { mime: 'application/vnd.ms-powerpoint', kind: 'powerpoint' },
  { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', kind: 'powerpoint' },
  { mime: 'application/epub+zip', kind: 'ebook' },
  { mime: 'application/pdf', kind: 'pdf' }
];

function determineAssetType(file) {
  const match = MIME_TYPE_TO_KIND.find((entry) => entry.mime === file.type);
  if (match) return match.kind;
  if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) return 'powerpoint';
  if (file.name.endsWith('.epub')) return 'ebook';
  if (file.name.endsWith('.pdf')) return 'pdf';
  return 'document';
}

async function computeChecksum(file) {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function createDefaultMetadataDraft() {
  return {
    title: '',
    description: '',
    categories: [],
    tags: [],
    coverImageUrl: '',
    coverImageAlt: '',
    showcaseVideoUrl: '',
    showcaseVideoPosterUrl: '',
    showcaseHeadline: '',
    showcaseSubheadline: '',
    showcaseBadge: '',
    callToActionLabel: '',
    callToActionUrl: '',
    gallery: [],
    visibility: 'workspace',
    showcasePinned: false
  };
}

function buildDraftFromAsset(asset) {
  if (!asset) return createDefaultMetadataDraft();
  const custom = typeof asset.metadata?.custom === 'object' && asset.metadata?.custom ? asset.metadata.custom : {};
  const media = typeof custom.media === 'object' && custom.media ? custom.media : {};
  const coverImage = typeof media.coverImage === 'object' && media.coverImage ? media.coverImage : {};
  const gallery = Array.isArray(media.gallery)
    ? media.gallery.map((item) => ({
        url: item?.url ?? '',
        caption: item?.caption ?? '',
        kind: item?.kind === 'video' ? 'video' : 'image'
      }))
    : [];
  const showcase = typeof custom.showcase === 'object' && custom.showcase ? custom.showcase : {};
  const callToAction = typeof showcase.callToAction === 'object' && showcase.callToAction ? showcase.callToAction : {};
  const featureFlags = typeof custom.featureFlags === 'object' && custom.featureFlags ? custom.featureFlags : {};

  return {
    title: custom.title ?? '',
    description: custom.description ?? '',
    categories: Array.isArray(custom.categories) ? custom.categories : [],
    tags: Array.isArray(custom.tags) ? custom.tags : [],
    coverImageUrl: coverImage?.url ?? '',
    coverImageAlt: coverImage?.alt ?? '',
    showcaseVideoUrl: showcase?.videoUrl ?? '',
    showcaseVideoPosterUrl: showcase?.videoPosterUrl ?? '',
    showcaseHeadline: showcase?.headline ?? '',
    showcaseSubheadline: showcase?.subheadline ?? '',
    showcaseBadge: showcase?.badge ?? '',
    callToActionLabel: callToAction?.label ?? '',
    callToActionUrl: callToAction?.url ?? '',
    gallery,
    visibility: asset.visibility ?? 'workspace',
    showcasePinned: Boolean(featureFlags?.showcasePinned)
  };
}

function trimOrNull(value, limit) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return typeof limit === 'number' ? trimmed.slice(0, limit) : trimmed;
}

function sanitiseHttpsUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || !/^https:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch (error) {
    return null;
  }
}

function normaliseList(values, { maxItems, maxLength }) {
  const seen = new Set();
  const result = [];
  for (const value of values ?? []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const truncated = typeof maxLength === 'number' ? trimmed.slice(0, maxLength) : trimmed;
    const fingerprint = truncated.toLowerCase();
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push(truncated);
    if (typeof maxItems === 'number' && result.length >= maxItems) break;
  }
  return result;
}

function buildPayloadFromDraft(draft) {
  const categories = normaliseList(draft.categories, { maxItems: 12, maxLength: 40 });
  const tags = normaliseList(draft.tags, { maxItems: 24, maxLength: 32 });
  const coverImageUrl = sanitiseHttpsUrl(draft.coverImageUrl);
  const coverImageAlt = trimOrNull(draft.coverImageAlt, 120);
  const gallery = (draft.gallery ?? [])
    .map((item) => {
      const url = sanitiseHttpsUrl(item?.url);
      if (!url) return null;
      return {
        url,
        caption: trimOrNull(item?.caption, 160),
        kind: item?.kind === 'video' ? 'video' : 'image'
      };
    })
    .filter(Boolean)
    .slice(0, 8);

  return {
    title: trimOrNull(draft.title, 140),
    description: trimOrNull(draft.description, 1500),
    categories,
    tags,
    coverImage: {
      url: coverImageUrl,
      alt: coverImageAlt
    },
    gallery,
    showcase: {
      headline: trimOrNull(draft.showcaseHeadline, 120),
      subheadline: trimOrNull(draft.showcaseSubheadline, 200),
      videoUrl: sanitiseHttpsUrl(draft.showcaseVideoUrl),
      videoPosterUrl: sanitiseHttpsUrl(draft.showcaseVideoPosterUrl),
      callToActionLabel: trimOrNull(draft.callToActionLabel, 40),
      callToActionUrl: sanitiseHttpsUrl(draft.callToActionUrl),
      badge: trimOrNull(draft.showcaseBadge, 32)
    },
    visibility: draft.visibility,
    featureFlags: {
      showcasePinned: Boolean(draft.showcasePinned)
    }
  };
}

export default function ContentLibrary() {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken;
  const role = session?.user?.role;
  const isInstructor = role === 'instructor' || role === 'admin';

  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsAssetId, setAnalyticsAssetId] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [metadataDraft, setMetadataDraft] = useState(createDefaultMetadataDraft);
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [metadataFeedback, setMetadataFeedback] = useState(null);
  const [metadataError, setMetadataError] = useState(null);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.publicId === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  const fetchAssets = useCallback(async () => {
    if (!token || !isInstructor) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await httpClient.get('/content/assets', { token });
      const data = response?.data ?? [];
      setAssets(data);
      await set(CACHE_KEY, data);
    } catch (err) {
      setError(err.message ?? 'Unable to fetch content assets.');
    } finally {
      setIsLoading(false);
    }
  }, [isInstructor, token]);

  useEffect(() => {
    let isMounted = true;
    if (!isInstructor) {
      setAssets([]);
      setSelectedAssetId(null);
      setMetadataDraft(createDefaultMetadataDraft());
      setMetadataFeedback(null);
      setMetadataError(null);
      setViewer(null);
      setAnalytics(null);
      setAnalyticsAssetId(null);
      setError(null);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }
    get(CACHE_KEY).then((cached) => {
      if (isMounted && Array.isArray(cached) && cached.length) {
        setAssets(cached);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isInstructor]);

  useEffect(() => {
    if (token && isInstructor) {
      fetchAssets();
    } else if (!isInstructor) {
      setIsLoading(false);
    }
  }, [fetchAssets, isInstructor, token]);

  useEffect(() => {
    if (!selectedAssetId && assets.length) {
      setSelectedAssetId(assets[0].publicId);
    }
  }, [assets, selectedAssetId]);

  useEffect(() => {
    if (selectedAsset) {
      setMetadataDraft(buildDraftFromAsset(selectedAsset));
      setMetadataFeedback(null);
      setMetadataError(null);
    } else {
      setMetadataDraft(createDefaultMetadataDraft());
    }
  }, [selectedAsset]);

  const scrollToMetadataEditor = useCallback(() => {
    const anchor = document.getElementById('material-metadata-editor');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleSelectAsset = useCallback((asset) => {
    setSelectedAssetId(asset.publicId);
  }, []);

  const handleMetadataFieldChange = useCallback((field, value) => {
    setMetadataDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleGalleryChange = useCallback((index, updates) => {
    setMetadataDraft((prev) => {
      const gallery = prev.gallery.map((item, idx) => (idx === index ? { ...item, ...updates } : item));
      return { ...prev, gallery };
    });
  }, []);

  const handleGalleryRemove = useCallback((index) => {
    setMetadataDraft((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, idx) => idx !== index)
    }));
  }, []);

  const handleGalleryAdd = useCallback(() => {
    setMetadataDraft((prev) => {
      if ((prev.gallery ?? []).length >= 8) return prev;
      return {
        ...prev,
        gallery: [...prev.gallery, { url: '', caption: '', kind: 'image' }]
      };
    });
  }, []);

  const resetMetadataDraft = useCallback(() => {
    if (selectedAsset) {
      setMetadataDraft(buildDraftFromAsset(selectedAsset));
    } else {
      setMetadataDraft(createDefaultMetadataDraft());
    }
    setMetadataFeedback(null);
    setMetadataError(null);
  }, [selectedAsset]);

  const handleSaveMetadata = useCallback(async () => {
    if (!selectedAsset || !token || !isInstructor) {
      if (!isInstructor) {
        setMetadataError('You do not have permission to update material metadata.');
      }
      return;
    }
    setMetadataSaving(true);
    setMetadataError(null);
    setMetadataFeedback(null);
    try {
      const payload = buildPayloadFromDraft(metadataDraft);
      const response = await httpClient.patch(`/content/assets/${selectedAsset.publicId}/metadata`, payload, { token });
      const updated = response?.data;
      if (updated) {
        setAssets((prev) => {
          const next = prev.map((asset) => (asset.publicId === updated.publicId ? { ...asset, ...updated } : asset));
          set(CACHE_KEY, next);
          return next;
        });
        setMetadataDraft(buildDraftFromAsset(updated));
        setMetadataFeedback(response?.message ?? 'Material profile updated successfully.');
      }
    } catch (err) {
      setMetadataError(err.message ?? 'Unable to save material profile.');
    } finally {
      setMetadataSaving(false);
    }
  }, [isInstructor, metadataDraft, selectedAsset, token]);

  const handleFileChange = useCallback(
    async (event) => {
      if (!token || !isInstructor) {
        if (!isInstructor) {
          setError('You do not have permission to upload learning materials.');
        }
        return;
      }
      const file = event.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const checksum = await computeChecksum(file);
        const type = determineAssetType(file);
        const payload = {
          type,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          checksum
        };
        const sessionResponse = await httpClient.post('/content/assets/upload-session', payload, { token });
        const asset = sessionResponse?.data?.asset;
        const upload = sessionResponse?.data?.upload;
        if (!asset || !upload) {
          throw new Error('Upload session could not be initialised.');
        }
        await fetch(upload.url, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream'
          },
          body: file
        });
        await httpClient.post(`/content/assets/${asset.publicId}/ingest`, { checksum }, { token });
        await fetchAssets();
      } catch (err) {
        setError(err.message ?? 'Upload failed. Please try again.');
      } finally {
        setUploading(false);
        event.target.value = '';
      }
    },
    [fetchAssets, isInstructor, token]
  );

  const openViewer = useCallback(
    async (asset) => {
      if (!token) return;
      setError(null);
      try {
        const [tokenResponse, progressResponse] = await Promise.all([
          httpClient.get(`/content/assets/${asset.publicId}/viewer-token`, { token }),
          asset.type === 'ebook'
            ? httpClient.get(`/content/assets/${asset.publicId}/progress`, { token }).catch(() => ({ data: null }))
            : Promise.resolve({ data: null })
        ]);
        const viewerToken = tokenResponse?.data;
        const progress = progressResponse?.data ?? null;
        setViewer({ asset, viewerToken, progress });
      } catch (err) {
        setError(err.message ?? 'Unable to open viewer.');
      }
    },
    [token]
  );

  const fetchAnalytics = useCallback(
    async (asset) => {
      if (!token || !isInstructor) return;
      try {
        const response = await httpClient.get(`/content/assets/${asset.publicId}/analytics`, { token });
        setAnalytics(response?.data ?? null);
        setAnalyticsAssetId(asset.publicId);
      } catch (err) {
        setError(err.message ?? 'Unable to load analytics.');
      }
    },
    [isInstructor, token]
  );

  const handleProgress = useCallback(
    async ({ cfi, percentage, asset }) => {
      if (!token || asset.type !== 'ebook') return;
      try {
        await httpClient.post(
          `/content/assets/${asset.publicId}/progress`,
          {
            progressPercent: Math.min(100, Math.round(percentage ?? 0)),
            lastLocation: cfi,
            timeSpentSeconds: 30
          },
          { token }
        );
      } catch (err) {
        console.warn('Failed to persist progress', err);
      }
    },
    [token]
  );

  const assetAnalytics = useMemo(() => {
    if (!analytics || !analyticsAssetId) return null;
    const eventSummary = analytics.events?.reduce((acc, item) => {
      acc[item.eventType] = Number(item.total);
      return acc;
    }, {});
    return {
      ...analytics,
      eventSummary
    };
  }, [analytics, analyticsAssetId]);

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold text-slate-900">Sign in to access the content library</h1>
        <p className="mt-4 text-base text-slate-600">
          Upload decks, orchestrate ebook experiences, and review analytics once you are authenticated.
        </p>
      </section>
    );
  }

  if (!isInstructor) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="rounded-4xl border border-amber-200 bg-amber-50 px-8 py-12 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Instructor Learnspace required</h1>
          <p className="mt-4 text-sm text-slate-600">
            Switch to an instructor or admin Learnspace to curate materials, manage showcases, and govern media metadata.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Learning content hub</h1>
              <p className="text-sm text-slate-500">
                Manage Cloudflare R2 hosted decks and ebooks with conversion status, DRM controls, and analytics snapshots.
              </p>
            </div>
            {isInstructor ? (
              <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-dashed border-primary px-5 py-3 text-sm font-semibold text-primary shadow-sm hover:border-primary-dark">
                <input type="file" className="hidden" accept=".ppt,.pptx,.pdf,.epub" onChange={handleFileChange} />
                {uploading ? 'Uploading…' : 'Upload content'}
              </label>
            ) : null}
          </header>
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Metadata</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      Loading assets…
                    </td>
                  </tr>
                ) : assets.length ? (
                  assets.map((asset) => {
                    const custom =
                      typeof asset.metadata?.custom === 'object' && asset.metadata?.custom
                        ? asset.metadata.custom
                        : {};
                    const categories = Array.isArray(custom.categories) ? custom.categories : [];
                    const tags = Array.isArray(custom.tags) ? custom.tags : [];
                    const visibility = asset.visibility ?? 'workspace';
                    const isSelected = selectedAssetId === asset.publicId;
                    return (
                      <tr
                        key={asset.publicId}
                        onClick={() => handleSelectAsset(asset)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSelectAsset(asset);
                          }
                        }}
                        tabIndex={0}
                        aria-selected={isSelected}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-primary/5 ring-1 ring-primary/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">{asset.originalFilename}</td>
                        <td className="px-4 py-3 capitalize">{asset.type}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              asset.status === 'ready'
                                ? 'bg-green-50 text-green-700'
                                : asset.status === 'processing'
                                ? 'bg-amber-50 text-amber-700'
                                : asset.status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {categories.length ? (
                              categories.slice(0, 3).map((category) => (
                                <span
                                  key={category}
                                  className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                                >
                                  {category}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">No categories yet</span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wider text-slate-400">
                            <span className="font-semibold text-slate-500">{visibility}</span>
                            {tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary-dark"
                              >
                                #{tag}
                              </span>
                            ))}
                            {tags.length > 4 ? <span>+{tags.length - 4} more</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(asset.updatedAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openViewer(asset);
                              }}
                              className="rounded-full border border-primary/30 px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:text-primary-dark"
                            >
                              View
                            </button>
                            {isInstructor ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    fetchAnalytics(asset);
                                  }}
                                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                                >
                                  Analytics
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleSelectAsset(asset);
                                    scrollToMetadataEditor();
                                  }}
                                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
                                >
                                  Manage
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-slate-500">
                      No assets uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div id="material-metadata-editor">
            <MaterialMetadataEditor
              asset={selectedAsset}
              draft={metadataDraft}
              onFieldChange={handleMetadataFieldChange}
              onGalleryChange={handleGalleryChange}
              onGalleryRemove={handleGalleryRemove}
              onGalleryAdd={handleGalleryAdd}
              onReset={resetMetadataDraft}
              onSave={handleSaveMetadata}
              saving={metadataSaving}
              feedback={metadataFeedback}
              error={metadataError}
            />
          </div>
        </div>
        {assetAnalytics ? (
          <aside className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Analytics summary</h2>
            <p className="mt-1 text-sm text-slate-500">Latest engagement and compliance signals.</p>
            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Event counts</dt>
                <dd className="mt-2 grid grid-cols-2 gap-3 text-sm text-slate-700">
                  {Object.entries(assetAnalytics.eventSummary ?? {}).map(([eventType, total]) => (
                    <span key={eventType} className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <span className="block text-xs uppercase text-slate-500">{eventType}</span>
                      <span className="block text-base font-semibold text-slate-900">{total}</span>
                    </span>
                  ))}
                </dd>
              </div>
              {assetAnalytics.progressSummary ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reading progress</dt>
                  <dd className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {assetAnalytics.progressSummary.readers} active readers · avg completion {Math.round(
                      assetAnalytics.progressSummary.averageProgress ?? 0
                    )}%
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent activity</dt>
                <dd className="mt-2 space-y-2 text-xs text-slate-600">
                  {(assetAnalytics.recentActivity ?? []).slice(0, 5).map((event) => (
                    <div key={event.id} className="rounded-lg border border-slate-100 px-3 py-2">
                      <p className="font-semibold text-slate-800">{event.eventType}</p>
                      <p className="text-[11px] uppercase text-slate-400">{formatDate(event.occurredAt)}</p>
                    </div>
                  ))}
                </dd>
              </div>
            </dl>
          </aside>
        ) : null}
      </div>

      {viewer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-6 py-12">
          <div className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{viewer.asset.originalFilename}</h3>
                <p className="text-xs text-slate-500">Watermark: {viewer.viewerToken.watermark}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </header>
            <div className="flex-1 bg-slate-900/5">
              {viewer.asset.type === 'powerpoint' || viewer.asset.type === 'pdf' ? (
                <PowerpointViewer url={viewer.viewerToken.url} />
              ) : viewer.asset.type === 'ebook' ? (
                <EbookReader
                  url={viewer.viewerToken.url}
                  asset={viewer.asset}
                  initialLocation={viewer.progress?.lastLocation}
                  onProgress={(data) => handleProgress({ ...data, asset: viewer.asset })}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Preview not available for this asset type.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
