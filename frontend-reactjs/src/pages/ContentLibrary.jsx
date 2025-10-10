import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, set } from 'idb-keyval';

import { httpClient } from '../api/httpClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import PowerpointViewer from '../components/content/PowerpointViewer.jsx';
import EbookReader from '../components/content/EbookReader.jsx';

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

  const fetchAssets = useCallback(async () => {
    if (!token) return;
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
  }, [token]);

  useEffect(() => {
    get(CACHE_KEY).then((cached) => {
      if (cached?.length) {
        setAssets(cached);
      }
    });
  }, []);

  useEffect(() => {
    if (token) {
      fetchAssets();
    }
  }, [fetchAssets, token]);

  const handleFileChange = useCallback(
    async (event) => {
      if (!token) return;
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
    [fetchAssets, token]
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
      if (!token) return;
      try {
        const response = await httpClient.get(`/content/assets/${asset.publicId}/analytics`, { token });
        setAnalytics(response?.data ?? null);
        setAnalyticsAssetId(asset.publicId);
      } catch (err) {
        setError(err.message ?? 'Unable to load analytics.');
      }
    },
    [token]
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      Loading assets…
                    </td>
                  </tr>
                ) : assets.length ? (
                  assets.map((asset) => (
                    <tr key={asset.publicId} className="hover:bg-slate-50">
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
                      <td className="px-4 py-3 text-slate-500">{formatDate(asset.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openViewer(asset)}
                            className="rounded-full border border-primary/30 px-4 py-2 text-xs font-semibold text-primary hover:border-primary hover:text-primary-dark"
                          >
                            View
                          </button>
                          {isInstructor ? (
                            <button
                              type="button"
                              onClick={() => fetchAnalytics(asset)}
                              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary"
                            >
                              Analytics
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-slate-500">
                      No assets uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
