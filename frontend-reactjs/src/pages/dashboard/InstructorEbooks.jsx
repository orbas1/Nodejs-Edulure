import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowPathIcon, LockClosedIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

import { listInstructorCatalogue, updateEbookState } from '../../api/ebookApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import withInstructorDashboardAccess from './instructor/withInstructorDashboardAccess.jsx';

function buildFallbackCatalogue(rawCatalogue = []) {
  return rawCatalogue.map((entry) => ({
    id: entry.id ?? `fallback-${entry.title}`,
    title: entry.title,
    slug: entry.slug ?? '',
    subtitle: entry.subtitle ?? null,
    price: {
      formatted: entry.price ?? '—',
      currency: entry.price?.replace(/[^A-Z]/gi, '') || 'USD',
      amountCents: 0
    },
    status: entry.status ?? 'draft',
    isPublic: true,
    analytics: {
      downloads: Number(entry.downloads ?? 0),
      readers: 0,
      purchases: 0,
      revenueCents: 0,
      revenueFormatted: '—'
    },
    rating: { average: 0, count: 0 },
    metadata: {},
    createdAt: null,
    updatedAt: null,
    _readonly: true
  }));
}

function MetricCard({ label, value, helper }) {
  return (
    <div className="dashboard-section shadow-none ring-1 ring-slate-100">
      <p className="dashboard-kicker text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  helper: PropTypes.node
};

function InstructorEbooks() {
  const { dashboard, refresh: refreshDashboard } = useOutletContext();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const fallbackCatalogue = useMemo(
    () => buildFallbackCatalogue(dashboard?.ebooks?.catalogue ?? []),
    [dashboard?.ebooks?.catalogue]
  );

  const [catalogue, setCatalogue] = useState(fallbackCatalogue);
  const [metrics, setMetrics] = useState(null);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const requestParams = useMemo(() => {
    const params = {};
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    return params;
  }, [statusFilter, debouncedSearch]);

  const loadCatalogue = useCallback(
    async (signal) => {
      if (!token) {
        setCatalogue(fallbackCatalogue);
        setMetrics(null);
        setRecentPurchases([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const payload = await listInstructorCatalogue({ token, params: requestParams, signal });
        setCatalogue(payload.catalogue ?? []);
        setMetrics(payload.metrics ?? null);
        setRecentPurchases(payload.recentPurchases ?? []);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err : new Error('Unable to load e-book catalogue'));
        setCatalogue(fallbackCatalogue);
        setMetrics(null);
        setRecentPurchases([]);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [token, requestParams, fallbackCatalogue]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadCatalogue(controller.signal);
    return () => controller.abort();
  }, [loadCatalogue]);

  const handleRefresh = useCallback(() => {
    loadCatalogue();
    refreshDashboard?.();
  }, [loadCatalogue, refreshDashboard]);

  const handleToggleVisibility = useCallback(
    async (ebook) => {
      if (!token || ebook._readonly) return;
      setUpdatingId(ebook.id);
      try {
        const updated = await updateEbookState({
          token,
          ebookId: ebook.id,
          payload: { isPublic: !ebook.isPublic }
        });
        setCatalogue((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unable to update visibility'));
      } finally {
        setUpdatingId(null);
      }
    },
    [token]
  );

  const handleTogglePublication = useCallback(
    async (ebook) => {
      if (!token || ebook._readonly) return;
      setUpdatingId(ebook.id);
      try {
        const nextStatus = ebook.status === 'published' ? 'draft' : 'published';
        const updated = await updateEbookState({
          token,
          ebookId: ebook.id,
          payload: { status: nextStatus, isPublic: nextStatus === 'published' ? true : ebook.isPublic }
        });
        setCatalogue((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unable to update status'));
      } finally {
        setUpdatingId(null);
      }
    },
    [token]
  );

  const hasCatalogue = catalogue.length > 0;

  if (!hasCatalogue && !loading && !metrics && !error) {
    return (
      <DashboardStateMessage
        title="No published titles"
        description="Publish a guide or sync from your distribution channels to monitor catalogue performance."
        actionLabel="Create listing"
        onAction={handleRefresh}
        footer={
          <Link className="dashboard-primary-pill" to="../ebooks/create">
            Launch e-book builder
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">E-book commerce control centre</h1>
          <p className="mt-2 text-sm text-slate-600">
            Monitor monetisation, control distribution, and orchestrate launch operations for your digital publications.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleRefresh()}
            className="dashboard-pill flex items-center gap-2 px-4 py-2"
            disabled={loading}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-slate-400'}`} />
            Refresh data
          </button>
          <Link to="../ebooks/create" className="dashboard-primary-pill px-5 py-2 text-sm">
            Create new listing
          </Link>
        </div>
      </div>

      {metrics ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active catalogue" value={`${metrics.publishedTitles}/${metrics.totalTitles}`} helper="Published vs total listings" />
          <MetricCard
            label="Draft pipeline"
            value={metrics.draftTitles}
            helper="Listings awaiting review or launch"
          />
          <MetricCard
            label="Lifetime downloads"
            value={metrics.totalDownloads.toLocaleString()}
            helper="Captured across Edulure distribution"
          />
          <MetricCard
            label="Lifetime revenue"
            value={
              metrics.revenueByCurrency.length > 0
                ? metrics.revenueByCurrency.map((entry) => entry.formatted).join(' · ')
                : '—'
            }
            helper="Net of refunds in recorded currency"
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
          <p className="font-semibold">We could not sync the latest analytics.</p>
          <p className="mt-1 text-rose-600">{error.message}</p>
          <p className="mt-2 text-xs text-rose-500">
            Displaying cached metrics. Retry to pull fresh commerce telemetry.
          </p>
        </div>
      ) : null}

      <div className="dashboard-card overflow-hidden border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/60 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <label htmlFor="ebook-search" className="sr-only">
              Search catalogue
            </label>
            <input
              id="ebook-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search titles, tags, or descriptions"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 sm:max-w-sm"
            />
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
              >
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="review">In review</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {loading ? 'Syncing catalogue…' : `Showing ${catalogue.length.toLocaleString()} listing${catalogue.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-white">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-6 py-3">
                  Title
                </th>
                <th scope="col" className="px-6 py-3">
                  Performance
                </th>
                <th scope="col" className="px-6 py-3">
                  Price
                </th>
                <th scope="col" className="px-6 py-3">
                  Visibility
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-600">
              {catalogue.map((ebook) => {
                const isUpdating = updatingId === ebook.id;
                return (
                  <tr key={ebook.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col">
                        <p className="font-semibold text-slate-900">{ebook.title}</p>
                        {ebook.subtitle ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{ebook.subtitle}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                            {ebook.status === 'published' ? 'Ready for purchase' : ebook.status}
                          </span>
                          {ebook.rating?.count ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                              ★ {Number(ebook.rating.average ?? 0).toFixed(1)} ({ebook.rating.count})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1 text-xs">
                        <p>Downloads · {ebook.analytics.downloads.toLocaleString()}</p>
                        <p>Active readers · {ebook.analytics.readers.toLocaleString()}</p>
                        <p>Purchases · {ebook.analytics.purchases.toLocaleString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-sm font-semibold text-slate-900">
                      {ebook.price?.formatted ?? '—'}
                      <p className="mt-1 text-xs font-normal text-slate-500">{ebook.analytics.revenueFormatted}</p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        {ebook.isPublic ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                            <GlobeAltIcon className="h-3.5 w-3.5" /> Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                            <LockClosedIcon className="h-3.5 w-3.5" /> Private
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="dashboard-pill px-3 py-1 text-xs"
                          onClick={() => handleToggleVisibility(ebook)}
                          disabled={ebook._readonly || isUpdating}
                        >
                          {ebook.isPublic ? 'Make private' : 'Publish to catalogue'}
                        </button>
                        <button
                          type="button"
                          className="dashboard-primary-pill px-3 py-1 text-xs"
                          onClick={() => handleTogglePublication(ebook)}
                          disabled={ebook._readonly || isUpdating}
                        >
                          {ebook.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {recentPurchases.length > 0 ? (
        <div className="dashboard-card border border-slate-200 bg-white px-6 py-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Latest purchases</h2>
          <ul className="mt-4 space-y-3">
            {recentPurchases.map((purchase) => (
              <li key={`${purchase.ebookPublicId}-${purchase.capturedAt ?? purchase.formatted}`} className="flex items-center justify-between text-sm text-slate-600">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800">{purchase.formatted}</span>
                  <span className="text-xs text-slate-500">Captured {purchase.capturedAt ? new Date(purchase.capturedAt).toLocaleString() : 'recently'}</span>
                </div>
                <span className="text-xs uppercase tracking-wide text-slate-400">{purchase.currency}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default withInstructorDashboardAccess(InstructorEbooks);
