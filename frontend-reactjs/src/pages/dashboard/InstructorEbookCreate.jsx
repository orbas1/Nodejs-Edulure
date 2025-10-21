import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { createEbookListing } from '../../api/ebookApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import withInstructorDashboardAccess from './instructor/withInstructorDashboardAccess.jsx';

const initialFormState = {
  assetId: '',
  title: '',
  subtitle: '',
  description: '',
  authors: '',
  tags: '',
  categories: '',
  languages: 'en',
  readingTimeMinutes: '',
  isbn: '',
  priceAmount: '0',
  priceCurrency: 'USD',
  releaseAt: '',
  isPublic: true
};

function InstructorEbookCreate() {
  const { dashboard, refresh } = useOutletContext();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const pipelines = dashboard?.ebooks?.creationPipelines ?? [];

  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const canSubmit = useMemo(() => form.assetId.trim() !== '' && form.title.trim() !== '', [form.assetId, form.title]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token || !canSubmit) return;
    setSubmitting(true);
    setSuccess(null);
    setError(null);
    try {
      const payload = {
        assetId: form.assetId.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        description: form.description.trim() || undefined,
        authors: form.authors,
        tags: form.tags,
        categories: form.categories,
        languages: form.languages,
        isbn: form.isbn.trim() || undefined,
        readingTimeMinutes: form.readingTimeMinutes ? Number(form.readingTimeMinutes) : undefined,
        price: {
          currency: form.priceCurrency.trim().toUpperCase() || 'USD',
          amount: Number.parseFloat(form.priceAmount || '0')
        },
        releaseAt: form.releaseAt ? new Date(form.releaseAt).toISOString() : undefined,
        isPublic: form.isPublic
      };

      const response = await createEbookListing({ token, payload });
      setSuccess(response);
      setForm(initialFormState);
      refresh?.();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unable to create listing'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="dashboard-card border border-slate-200 px-6 py-6">
            <h1 className="text-2xl font-semibold text-slate-900">Launch a new e-book listing</h1>
            <p className="mt-2 text-sm text-slate-600">
              Link a converted asset, define commerce metadata, and instantly surface the title across learner storefronts.
            </p>

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="assetId" className="block text-sm font-medium text-slate-700">
                  Asset identifier
                </label>
                <input
                  id="assetId"
                  name="assetId"
                  value={form.assetId}
                  onChange={handleChange}
                  placeholder="Paste the asset public ID from the content library"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  required
                />
                <p className="mt-2 text-xs text-slate-500">
                  Navigate to Content &gt; Assets to copy the public ID of the converted EPUB file you wish to commercialise.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                    Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="E-book title"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="subtitle" className="block text-sm font-medium text-slate-700">
                    Subtitle
                  </label>
                  <input
                    id="subtitle"
                    name="subtitle"
                    value={form.subtitle}
                    onChange={handleChange}
                    placeholder="Optional supporting headline"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Summarise the promise, modules, and reader outcomes"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="authors" className="block text-sm font-medium text-slate-700">
                    Authors
                  </label>
                  <input
                    id="authors"
                    name="authors"
                    value={form.authors}
                    onChange={handleChange}
                    placeholder="Comma separated list"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label htmlFor="categories" className="block text-sm font-medium text-slate-700">
                    Categories
                  </label>
                  <input
                    id="categories"
                    name="categories"
                    value={form.categories}
                    onChange={handleChange}
                    placeholder="Comma separated taxonomy"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-slate-700">
                    Tags
                  </label>
                  <input
                    id="tags"
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                    placeholder="Comma separated keywords"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label htmlFor="languages" className="block text-sm font-medium text-slate-700">
                    Languages
                  </label>
                  <input
                    id="languages"
                    name="languages"
                    value={form.languages}
                    onChange={handleChange}
                    placeholder="Comma separated ISO codes"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label htmlFor="readingTimeMinutes" className="block text-sm font-medium text-slate-700">
                    Reading time (minutes)
                  </label>
                  <input
                    id="readingTimeMinutes"
                    name="readingTimeMinutes"
                    value={form.readingTimeMinutes}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label htmlFor="priceAmount" className="block text-sm font-medium text-slate-700">
                    Price
                  </label>
                  <input
                    id="priceAmount"
                    name="priceAmount"
                    value={form.priceAmount}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label htmlFor="priceCurrency" className="block text-sm font-medium text-slate-700">
                    Currency
                  </label>
                  <input
                    id="priceCurrency"
                    name="priceCurrency"
                    value={form.priceCurrency}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm uppercase text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label htmlFor="releaseAt" className="block text-sm font-medium text-slate-700">
                    Release schedule
                  </label>
                  <input
                    id="releaseAt"
                    name="releaseAt"
                    value={form.releaseAt}
                    onChange={handleChange}
                    type="datetime-local"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={form.isPublic}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span>Make immediately available to learners</span>
                </label>
                <button type="submit" className="dashboard-primary-pill px-6 py-2 text-sm" disabled={submitting || !canSubmit}>
                  {submitting ? 'Creating listing…' : 'Create listing'}
                </button>
              </div>
            </form>

            {success ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <p className="font-semibold">Listing created successfully.</p>
                <p className="mt-1">{success.title} is now ready for publication workflows.</p>
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <p className="font-semibold">We could not create the listing.</p>
                <p className="mt-1">{error.message}</p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="dashboard-card border border-slate-200 px-5 py-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operational checklist</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>✓ Ensure conversion job status is <span className="font-semibold">ready</span>.</li>
              <li>✓ Populate high fidelity cover art in the asset metadata.</li>
              <li>✓ Configure DRM watermarking if distributing outside Edulure.</li>
              <li>✓ Validate reading experience in both web and mobile previewers.</li>
            </ul>
          </div>

          {pipelines.length === 0 ? (
            <DashboardStateMessage
              title="No production pipelines"
              description="Spin up a new manuscript Learnspace to orchestrate editing, design, and approvals."
              actionLabel="Refresh"
              onAction={() => refresh?.()}
            />
          ) : (
            <div className="space-y-4">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className="dashboard-card space-y-3 border border-slate-200 px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="dashboard-kicker">{pipeline.stage}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{pipeline.title}</p>
                      <p className="mt-1 text-xs text-slate-500">Last updated {pipeline.lastUpdated}</p>
                      {pipeline.reference ? (
                        <p className="mt-1 text-xs text-slate-400">Reference {pipeline.reference}</p>
                      ) : null}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="text-lg font-semibold text-slate-900">{pipeline.progress}%</p>
                      <p className="mt-1">Owner {pipeline.owner}</p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                      style={{ width: `${Math.min(Math.max(Number(pipeline.progress ?? 0), 0), 100)}%` }}
                    />
                  </div>
                  {pipeline.latestActivity ? (
                    <p className="text-xs text-slate-500">Latest activity · {pipeline.latestActivity}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    {pipeline.nextActions?.map((action) => (
                      <span key={action} className="dashboard-pill px-3 py-1">
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default withInstructorDashboardAccess(InstructorEbookCreate);
