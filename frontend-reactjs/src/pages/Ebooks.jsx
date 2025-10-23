import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownTrayIcon, BookOpenIcon, BookmarkIcon, CreditCardIcon } from '@heroicons/react/24/outline';

import ExplorerSearchSection from '../components/search/ExplorerSearchSection.jsx';
import FormStepper from '../components/forms/FormStepper.jsx';
import adminControlApi from '../api/adminControlApi.js';
import { createEbookPurchaseIntent, listMarketplaceEbooks } from '../api/ebookApi.js';
import { fetchCoupon } from '../api/paymentsApi.js';
import { requestMediaUpload } from '../api/mediaApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import useAutoDismissMessage from '../hooks/useAutoDismissMessage.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import { isAbortError } from '../utils/errors.js';
import { computeFileChecksum } from '../utils/uploads.js';
import CheckoutDialog from '../components/checkout/CheckoutDialog.jsx';
import { computeCheckoutSummary, normaliseCouponCode, isCouponCodeValid } from '../utils/checkout.js';

const EXPLORER_CONFIG = {
  entityType: 'ebooks',
  title: 'Search the e-book marketplace',
  description:
    'Filter playbooks, annotated decks and research libraries. Saved searches and pins keep your enablement team aligned.',
  placeholder: 'Search e-books by topic, author or keyword…',
  defaultSort: 'relevance',
  sortOptions: [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Newest', value: 'newest' },
    { label: 'Top rated', value: 'rating' },
    { label: 'Shortest read', value: 'readingTime' }
  ],
  filterDefinitions: [
    {
      key: 'categories',
      label: 'Categories',
      type: 'multi',
      options: [
        { label: 'Automation', value: 'automation' },
        { label: 'Enablement', value: 'enablement' },
        { label: 'Operations', value: 'operations' },
        { label: 'Leadership', value: 'leadership' }
      ]
    },
    {
      key: 'languages',
      label: 'Languages',
      type: 'multi',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Spanish', value: 'es' },
        { label: 'French', value: 'fr' }
      ]
    },
    {
      key: 'readingTimeMinutes',
      label: 'Reading time (minutes)',
      type: 'range'
    }
  ]
};

const FORM_STEPS = [
  {
    id: 'manifest',
    title: 'Manifest',
    description: 'Core identifiers, title, authors'
  },
  {
    id: 'pricing',
    title: 'Pricing & release',
    description: 'Currency, status and launch plan'
  },
  {
    id: 'assets',
    title: 'Assets & metadata',
    description: 'Cover art, downloads and JSON metadata'
  }
];

function createEmptyForm() {
  return {
    assetId: '',
    title: '',
    subtitle: '',
    description: '',
    authors: '',
    tags: '',
    categories: '',
    languages: '',
    isbn: '',
    coverImageUrl: '',
    sampleDownloadUrl: '',
    audiobookUrl: '',
    readingTimeMinutes: '',
    priceCurrency: 'USD',
    priceAmount: '',
    status: 'draft',
    isPublic: false,
    releaseAt: '',
    metadata: ''
  };
}

function parseListField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function EbookCard({ ebook, onPurchase }) {
  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            <BookOpenIcon className="h-4 w-4" /> E-book
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">{ebook.title}</h3>
          {ebook.subtitle ? <p className="text-sm font-medium text-slate-500">{ebook.subtitle}</p> : null}
          {ebook.description ? (
            <p className="text-sm leading-relaxed text-slate-600">{ebook.description}</p>
          ) : null}
          {ebook.categories?.length ? (
            <div className="flex flex-wrap gap-2">
              {ebook.categories.map((category) => (
                <span key={category} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  #{category}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-600">
              {ebook.readingTimeMinutes ?? '—'} min
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              {ebook.languages?.join(', ') ?? 'EN'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
              {ebook.price}
            </span>
          </div>
        </div>
        {ebook.coverImageUrl ? (
          <img
            src={ebook.coverImageUrl}
            alt={ebook.title}
            className="h-40 w-32 flex-none rounded-2xl border border-slate-200 object-cover shadow-inner"
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        {ebook.sampleDownloadUrl ? (
          <a
            href={ebook.sampleDownloadUrl}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <ArrowDownTrayIcon className="h-4 w-4" /> Sample
          </a>
        ) : null}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark"
        >
          <BookmarkIcon className="h-4 w-4" /> Add to collection
        </button>
        {onPurchase ? (
          <button
            type="button"
            onClick={onPurchase}
            className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
          >
            <CreditCardIcon className="h-4 w-4" /> Purchase
          </button>
        ) : null}
      </div>
    </article>
  );
}

function EbookForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  mode,
  currentStep,
  setCurrentStep,
  uploadState = {},
  onUploadRequest,
  onRemoveUpload
}) {
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    onChange({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleFileChange = (field, kind) => (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }
    if (typeof onUploadRequest === 'function') {
      onUploadRequest(field, kind, file);
    }
    // Reset the input so the same file can be re-selected if needed.
    event.target.value = '';
  };

  const handleFileRemove = (field) => {
    if (typeof onRemoveUpload === 'function') {
      onRemoveUpload(field);
    }
  };

  const coverUpload = uploadState?.coverImageUrl ?? {};
  const sampleUpload = uploadState?.sampleDownloadUrl ?? {};
  const audioUpload = uploadState?.audiobookUrl ?? {};

  const disabled = submitting;

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <FormStepper steps={FORM_STEPS} currentStep={currentStep} onSelect={setCurrentStep} />
      {currentStep === 'manifest' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Asset ID</span>
            <input
              type="text"
              name="assetId"
              value={form.assetId}
              onChange={handleChange}
              placeholder="Upload reference UUID"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">ISBN</span>
            <input
              type="text"
              name="isbn"
              value={form.isbn}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Title</span>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Subtitle</span>
            <input
              type="text"
              name="subtitle"
              value={form.subtitle}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Authors</span>
            <input
              type="text"
              name="authors"
              value={form.authors}
              onChange={handleChange}
              placeholder="Jane Doe, Lee Wong"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Tags</span>
            <input
              type="text"
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="Automation, GTM"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Categories</span>
            <input
              type="text"
              name="categories"
              value={form.categories}
              onChange={handleChange}
              placeholder="Enablement, Strategy"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Languages</span>
            <input
              type="text"
              name="languages"
              value={form.languages}
              onChange={handleChange}
              placeholder="en, es"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      {currentStep === 'pricing' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Price</span>
            <input
              type="number"
              name="priceAmount"
              value={form.priceAmount}
              min="0"
              step="0.01"
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Currency</span>
            <input
              type="text"
              name="priceCurrency"
              value={form.priceCurrency}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Reading time (minutes)</span>
            <input
              type="number"
              name="readingTimeMinutes"
              min="0"
              value={form.readingTimeMinutes}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Release date</span>
            <input
              type="date"
              name="releaseAt"
              value={form.releaseAt}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Status</span>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            >
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            <input
              type="checkbox"
              name="isPublic"
              checked={form.isPublic}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              disabled={disabled}
            />
            Publicly listed
          </label>
        </div>
      ) : null}

      {currentStep === 'assets' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Cover image</span>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 shadow-sm">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange('coverImageUrl', 'image')}
                className="block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-dark disabled:cursor-not-allowed"
                disabled={disabled}
              />
            </div>
            {coverUpload.status === 'uploading' ? (
              <p className="text-xs font-semibold text-slate-500">Uploading cover image…</p>
            ) : null}
            {coverUpload.error ? (
              <p className="text-xs font-semibold text-rose-600">{coverUpload.error}</p>
            ) : null}
            {form.coverImageUrl ? (
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                <a
                  href={form.coverImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary transition hover:underline"
                >
                  Preview uploaded cover
                </a>
                <button
                  type="button"
                  onClick={() => handleFileRemove('coverImageUrl')}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-400 hover:text-rose-600 disabled:opacity-50"
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400">Upload a 4:5 cover image to showcase your listing.</p>
            )}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Sample download</span>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 shadow-sm">
              <input
                type="file"
                accept="application/pdf,.pdf,.epub,.zip"
                onChange={handleFileChange('sampleDownloadUrl', 'document')}
                className="block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-dark disabled:cursor-not-allowed"
                disabled={disabled}
              />
            </div>
            {sampleUpload.status === 'uploading' ? (
              <p className="text-xs font-semibold text-slate-500">Uploading sample…</p>
            ) : null}
            {sampleUpload.error ? (
              <p className="text-xs font-semibold text-rose-600">{sampleUpload.error}</p>
            ) : null}
            {form.sampleDownloadUrl ? (
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                <a
                  href={form.sampleDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary transition hover:underline"
                >
                  Preview sample asset
                </a>
                <button
                  type="button"
                  onClick={() => handleFileRemove('sampleDownloadUrl')}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-400 hover:text-rose-600 disabled:opacity-50"
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400">Attach a PDF or EPUB preview for learners to download.</p>
            )}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Audiobook file</span>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 shadow-sm">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange('audiobookUrl', 'audio')}
                className="block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-dark disabled:cursor-not-allowed"
                disabled={disabled}
              />
            </div>
            {audioUpload.status === 'uploading' ? (
              <p className="text-xs font-semibold text-slate-500">Uploading audiobook…</p>
            ) : null}
            {audioUpload.error ? (
              <p className="text-xs font-semibold text-rose-600">{audioUpload.error}</p>
            ) : null}
            {form.audiobookUrl ? (
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                <a
                  href={form.audiobookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary transition hover:underline"
                >
                  Preview audiobook file
                </a>
                <button
                  type="button"
                  onClick={() => handleFileRemove('audiobookUrl')}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-400 hover:text-rose-600 disabled:opacity-50"
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400">Upload optional narration to bundle with the e-book.</p>
            )}
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Metadata (JSON)</span>
            <textarea
              name="metadata"
              value={form.metadata}
              onChange={handleChange}
              rows={4}
              placeholder='{"readingGuide": true}'
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:opacity-50"
          disabled={disabled}
        >
          {mode === 'edit' ? 'Update e-book' : 'Create e-book'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          disabled={disabled}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Ebooks() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const role = String(session?.user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';

  const [marketplace, setMarketplace] = useState([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [liveEbooks, setLiveEbooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState(() => createEmptyForm());
  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [currentStep, setCurrentStep] = useState('manifest');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutEbook, setCheckoutEbook] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState(() => ({
    provider: 'stripe',
    quantity: 1,
    receiptEmail: session?.user?.email ?? '',
    couponCode: '',
    taxCountry: 'US',
    taxRegion: '',
    taxPostalCode: ''
  }));
  const [checkoutStatus, setCheckoutStatus] = useState(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutHistory, setCheckoutHistory] = useState([]);
  const [couponInsight, setCouponInsight] = useState({ status: 'idle', coupon: null, message: null });
  const [uploadState, setUploadState] = useState({});

  const activeCoupon = couponInsight.status === 'valid' ? couponInsight.coupon : null;

  const checkoutSummary = useMemo(() => {
    if (!checkoutEbook) {
      return null;
    }
    return computeCheckoutSummary({
      unitAmountCents: checkoutEbook.priceAmountCents ?? 0,
      quantity: checkoutForm.quantity ?? 1,
      coupon: activeCoupon,
      currency: checkoutEbook.priceCurrency ?? 'USD'
    });
  }, [checkoutEbook, checkoutForm.quantity, activeCoupon]);

  const checkoutPriceLabel = useMemo(() => {
    if (!checkoutEbook) {
      return undefined;
    }
    if (checkoutEbook.priceFormatted) {
      return checkoutEbook.priceFormatted;
    }
    if (typeof checkoutEbook.price === 'string') {
      return checkoutEbook.price;
    }
    if (checkoutEbook.priceAmountCents != null) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: checkoutEbook.priceCurrency ?? 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format((checkoutEbook.priceAmountCents ?? 0) / 100);
    }
    if (checkoutEbook.priceAmount != null) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: checkoutEbook.priceCurrency ?? 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Number(checkoutEbook.priceAmount));
    }
    return undefined;
  }, [checkoutEbook]);

  const featuredEbook = useMemo(() => marketplace[0] ?? liveEbooks[0] ?? null, [marketplace, liveEbooks]);
  const ebookKeywords = useMemo(() => {
    if (!featuredEbook) {
      return [];
    }
    const keywords = new Set();
    (featuredEbook.categories ?? []).forEach((category) => {
      if (typeof category === 'string') {
        keywords.add(category);
      } else if (typeof category?.name === 'string') {
        keywords.add(category.name);
      }
    });
    if (typeof featuredEbook.author === 'string') {
      keywords.add(featuredEbook.author);
    }
    if (featuredEbook.readingTimeMinutes) {
      keywords.add(`${featuredEbook.readingTimeMinutes} minute read`);
    }
    return Array.from(keywords);
  }, [featuredEbook]);

  const ebooksMetaDescription = useMemo(() => {
    if (featuredEbook?.description) {
      return featuredEbook.description;
    }
    if (featuredEbook?.title) {
      return `Preview ${featuredEbook.title} and browse premium Edulure e-books packed with operator playbooks, templates, and actionable frameworks.`;
    }
    return 'Unlock Edulure e-books and playbooks covering growth, community, enablement, and monetisation. Filter by reading time, category, and instructor expertise.';
  }, [featuredEbook]);

  usePageMetadata({
    title: featuredEbook?.title ? `${featuredEbook.title} · Edulure e-books` : 'Edulure e-books and playbooks',
    description: ebooksMetaDescription,
    canonicalPath: featuredEbook?.slug ? `/ebooks/${featuredEbook.slug}` : '/ebooks',
    image: featuredEbook?.coverImageUrl ?? undefined,
    keywords: ebookKeywords,
    analytics: {
      page_type: 'ebooks',
      marketplace_count: marketplace.length,
      live_count: liveEbooks.length
    }
  });

  const updateUploadState = useCallback((field, patch) => {
    setUploadState((current) => ({
      ...current,
      [field]: {
        ...(current[field] ?? {}),
        ...patch
      }
    }));
  }, []);

  const handleMediaUpload = useCallback(
    async (field, kind, file) => {
      if (!file) {
        return;
      }
      if (!token) {
        updateUploadState(field, {
          status: 'error',
          error: 'You must be signed in to upload files.'
        });
        return;
      }

      updateUploadState(field, {
        status: 'uploading',
        error: null,
        filename: file.name
      });

      try {
        const checksum = await computeFileChecksum(file);
        const instruction = await requestMediaUpload({
          token,
          payload: {
            kind,
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            checksum
          }
        });

        if (!instruction?.upload?.url) {
          throw new Error('Upload session did not include a destination URL.');
        }

        const uploadHeaders = instruction.upload.headers ?? {
          'Content-Type': file.type || 'application/octet-stream'
        };

        await fetch(instruction.upload.url, {
          method: instruction.upload.method ?? 'PUT',
          headers: uploadHeaders,
          body: file
        });

        const uploadedUrl = instruction.file?.publicUrl ?? null;
        const storageKey = instruction.file?.storageKey ?? null;
        const resolvedValue = uploadedUrl ?? storageKey ?? '';

        setForm((current) => ({
          ...current,
          [field]: resolvedValue
        }));

        updateUploadState(field, {
          status: 'uploaded',
          error: null,
          url: uploadedUrl,
          filename: file.name,
          storageKey,
          visibility: instruction.file?.visibility ?? null
        });
      } catch (uploadError) {
        const message = uploadError?.message ?? 'Failed to upload file.';
        updateUploadState(field, {
          status: 'error',
          error: message
        });
      }
    },
    [token, updateUploadState, setForm]
  );

  const handleRemoveUpload = useCallback(
    (field) => {
      setForm((current) => ({
        ...current,
        [field]: ''
      }));
      updateUploadState(field, {
        status: 'idle',
        error: null,
        url: null,
        filename: null,
        storageKey: null
      });
    },
    [updateUploadState, setForm]
  );

  useEffect(() => {
    setCheckoutForm((current) => ({
      ...current,
      receiptEmail: session?.user?.email ?? current.receiptEmail ?? ''
    }));
  }, [session?.user?.email]);

  useEffect(() => {
    if (!checkoutOpen) {
      setCouponInsight({ status: 'idle', coupon: null, message: null });
      return undefined;
    }

    const code = normaliseCouponCode(checkoutForm.couponCode);
    if (!code) {
      setCouponInsight({ status: 'idle', coupon: null, message: null });
      return undefined;
    }
    if (!token) {
      setCouponInsight({
        status: 'invalid',
        coupon: null,
        message: 'Sign in to redeem coupons.'
      });
      return undefined;
    }
    if (!isCouponCodeValid(code)) {
      setCouponInsight({
        status: 'invalid',
        coupon: null,
        message: 'Coupon code format is invalid.'
      });
      return undefined;
    }

    if (couponInsight.status === 'valid' && couponInsight.coupon?.code === code) {
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    setCouponInsight({ status: 'checking', coupon: null, message: null });

    fetchCoupon({ token, code, signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setCouponInsight({ status: 'valid', coupon: data, message: null });
      })
      .catch((error) => {
        if (!active) return;
        setCouponInsight({
          status: 'invalid',
          coupon: null,
          message: error instanceof Error ? error.message : 'Coupon not available.'
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [checkoutOpen, checkoutForm.couponCode, token, couponInsight.status, couponInsight.coupon?.code]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setMarketplaceLoading(true);
    listMarketplaceEbooks({ signal: controller.signal })
      .then((response) => {
        if (!active) return;
        const items = Array.isArray(response) ? response : response?.data ?? [];
        setMarketplace(
          items.map((item, index) => ({
            id: item.id ?? item.slug ?? `ebook-${index}`,
            title: item.title,
            subtitle: item.subtitle,
            description: item.description,
            categories: item.categories ?? [],
            languages: item.languages ?? [],
            readingTimeMinutes: item.readingTimeMinutes ?? item.metrics?.readingTime,
            priceCurrency: item.price?.currency ?? 'USD',
            priceAmountCents: Number(item.price?.amount ?? item.price?.value ?? 0),
            price: item.price
              ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: item.price.currency ?? 'USD'
                }).format(Number(item.price.amount ?? item.price.value ?? 0) / 100)
              : '$0.00',
            sampleDownloadUrl: item.sampleDownloadUrl ?? item.previewUrl,
            coverImageUrl: item.coverImageUrl ?? item.coverImage
          }))
        );
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message ?? 'Unable to load marketplace e-books');
      })
      .finally(() => {
        if (!active) return;
        setMarketplaceLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const loadEbooks = useCallback(
    async ({ signal } = {}) => {
      if (!isAdmin || !token || signal?.aborted) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await adminControlApi.listEbooks({ token, params: { perPage: 50 }, signal });
        if (signal?.aborted) {
          return;
        }
        setLiveEbooks(response?.data ?? []);
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) {
          return;
        }
        setError(err.message ?? 'Unable to load e-books');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [isAdmin, token]
  );

  useEffect(() => {
    if (!isAdmin || !token) {
      return undefined;
    }
    const controller = new AbortController();
    loadEbooks({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [isAdmin, token, loadEbooks]);

  useAutoDismissMessage(successMessage, () => setSuccessMessage(''));

  const openCheckout = useCallback(
    (ebook) => {
      setCheckoutEbook(ebook);
      setCheckoutForm((current) => ({
        ...current,
        provider: current.provider ?? 'stripe',
        quantity: 1,
        couponCode: '',
        taxCountry: current.taxCountry || 'US',
        taxRegion: '',
        taxPostalCode: '',
        receiptEmail: current.receiptEmail || session?.user?.email || ''
      }));
      setCheckoutStatus(null);
      setCouponInsight({ status: 'idle', coupon: null, message: null });
      setCheckoutOpen(true);
    },
    [session?.user?.email]
  );

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
    setCheckoutEbook(null);
    setCouponInsight({ status: 'idle', coupon: null, message: null });
  }, []);

  const handleCheckoutSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!checkoutEbook) {
        return;
      }
      if (!token) {
        setCheckoutStatus({ type: 'error', message: 'Sign in to purchase marketplace titles.' });
        return;
      }
      setCheckoutPending(true);
      setCheckoutStatus({ type: 'pending', message: `Creating checkout for ${checkoutEbook.title}…` });
      try {
        const payload = {
          provider: checkoutForm.provider,
          couponCode: (() => {
            const code = normaliseCouponCode(checkoutForm.couponCode);
            return code && isCouponCodeValid(code) ? code : undefined;
          })(),
          receiptEmail: checkoutForm.receiptEmail?.trim() || undefined,
          quantity: checkoutForm.quantity || 1
        };
        if (checkoutForm.taxCountry) {
          payload.tax = {
            country: checkoutForm.taxCountry,
            region: checkoutForm.taxRegion?.trim() || undefined,
            postalCode: checkoutForm.taxPostalCode?.trim() || undefined
          };
        }
        const response = await createEbookPurchaseIntent({
          token,
          ebookId: checkoutEbook.id,
          payload
        });
        const payment = response?.payment ?? {};
        setCheckoutStatus({
          type: 'success',
          message: `Checkout ready. Payment ID ${payment.paymentId ?? 'N/A'}. ${
            payment.approvalUrl
              ? 'Follow the approval link to complete the transaction.'
              : payment.clientSecret
                ? 'Use the Stripe client secret to finalise payment.'
                : 'Process payment using the generated reference.'
          }`
        });
        setCheckoutHistory((history) => [
          {
            id: payment.paymentId ?? `${checkoutEbook.id}-${Date.now()}`,
            title: checkoutEbook.title,
            provider: checkoutForm.provider,
            paymentId: payment.paymentId ?? null,
            approvalUrl: payment.approvalUrl ?? null,
            clientSecret: payment.clientSecret ?? null,
            createdAt: new Date().toISOString(),
            currency: payment.currency ?? checkoutEbook.priceCurrency ?? 'USD',
            amount: payment.amount ?? checkoutEbook.priceAmountCents ?? null
          },
          ...history.slice(0, 9)
        ]);
      } catch (err) {
        setCheckoutStatus({
          type: 'error',
          message: err instanceof Error ? err.message : 'Unable to create payment intent.'
        });
      } finally {
        setCheckoutPending(false);
      }
    },
    [checkoutEbook, checkoutForm, token]
  );

  const resetForm = useCallback(() => {
    setForm(createEmptyForm());
    setMode('create');
    setEditingId(null);
    setCurrentStep('manifest');
    setUploadState({});
  }, []);

  const handleEdit = (ebook) => {
    setMode('edit');
    setEditingId(ebook.id);
    setCurrentStep('manifest');
    setForm({
      assetId: ebook.assetId ?? '',
      title: ebook.title ?? '',
      subtitle: ebook.subtitle ?? '',
      description: ebook.description ?? '',
      authors: Array.isArray(ebook.authors) ? ebook.authors.join(', ') : '',
      tags: Array.isArray(ebook.tags) ? ebook.tags.join(', ') : '',
      categories: Array.isArray(ebook.categories) ? ebook.categories.join(', ') : '',
      languages: Array.isArray(ebook.languages) ? ebook.languages.join(', ') : '',
      isbn: ebook.isbn ?? '',
      coverImageUrl: ebook.coverImageUrl ?? '',
      sampleDownloadUrl: ebook.sampleDownloadUrl ?? '',
      audiobookUrl: ebook.audiobookUrl ?? '',
      readingTimeMinutes: ebook.readingTimeMinutes ?? '',
      priceCurrency: ebook.priceCurrency ?? 'USD',
      priceAmount: ebook.priceAmount ? Number(ebook.priceAmount) / 100 : '',
      status: ebook.status ?? 'draft',
      isPublic: Boolean(ebook.isPublic),
      releaseAt: toDateInput(ebook.releaseAt),
      metadata: ebook.metadata ? JSON.stringify(ebook.metadata, null, 2) : ''
    });
    setUploadState({
      coverImageUrl: ebook.coverImageUrl
        ? { status: 'uploaded', url: ebook.coverImageUrl, filename: null }
        : { status: 'idle' },
      sampleDownloadUrl: ebook.sampleDownloadUrl
        ? { status: 'uploaded', url: ebook.sampleDownloadUrl, filename: null }
        : { status: 'idle' },
      audiobookUrl: ebook.audiobookUrl
        ? { status: 'uploaded', url: ebook.audiobookUrl, filename: null }
        : { status: 'idle' }
    });
  };

  const handleDelete = async (ebookId) => {
    if (!isAdmin || !token) return;
    if (!window.confirm('Delete this e-book?')) return;
    try {
      await adminControlApi.deleteEbook({ token, id: ebookId });
      setSuccessMessage('E-book removed');
      await loadEbooks();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to delete e-book');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        assetId: form.assetId.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        description: form.description.trim() || null,
        authors: parseListField(form.authors),
        tags: parseListField(form.tags),
        categories: parseListField(form.categories),
        languages: parseListField(form.languages),
        isbn: form.isbn.trim() || null,
        coverImageUrl: form.coverImageUrl.trim() || null,
        sampleDownloadUrl: form.sampleDownloadUrl.trim() || null,
        audiobookUrl: form.audiobookUrl.trim() || null,
        readingTimeMinutes: form.readingTimeMinutes ? Number(form.readingTimeMinutes) : null,
        priceCurrency: form.priceCurrency.trim() || 'USD',
        priceAmount: form.priceAmount !== '' ? Number(form.priceAmount) : 0,
        status: form.status,
        isPublic: Boolean(form.isPublic),
        releaseAt: form.releaseAt ? new Date(form.releaseAt).toISOString() : null,
        metadata: parseMetadata(form.metadata)
      };

      if (mode === 'edit' && editingId) {
        await adminControlApi.updateEbook({ token, id: editingId, payload });
        setSuccessMessage('E-book updated');
      } else {
        await adminControlApi.createEbook({ token, payload });
        setSuccessMessage('E-book created');
      }
      await loadEbooks();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to save e-book');
    } finally {
      setSubmitting(false);
    }
  };

  const adminPanel = useMemo(() => {
    if (!isAdmin) {
      return (
        <div className="rounded-4xl border border-slate-200 bg-white/80 p-8 text-sm text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Publisher console locked</p>
          <p className="mt-2 text-sm text-slate-600">
            Only administrators can publish or curate marketplace e-books. Request access from an Edulure owner or share this
            briefing with your compliance lead.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-xl">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Publisher console</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {mode === 'edit' ? 'Update e-book' : 'Create e-book'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Launch interactive reading experiences with full CRUD, release guards and metadata controls. Every action is audit
              ready and syncs to the instructor dashboard instantly.
            </p>
            {successMessage ? (
              <p className="mt-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600">
                {successMessage}
              </p>
            ) : null}
            {error ? (
              <p className="mt-2 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">{error}</p>
            ) : null}
          </div>
          <EbookForm
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            submitting={submitting}
            mode={mode}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            uploadState={uploadState}
            onUploadRequest={handleMediaUpload}
            onRemoveUpload={handleRemoveUpload}
          />
        </div>
        <div className="mt-10 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Published catalogue</p>
          {loading ? <p className="text-sm text-slate-500">Loading catalogue…</p> : null}
          {!loading && liveEbooks.length === 0 ? (
            <p className="text-sm text-slate-500">No e-books published yet.</p>
          ) : null}
          <div className="grid gap-3">
            {liveEbooks.map((ebook) => (
              <div
                key={ebook.id}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{ebook.title}</p>
                    <p className="text-xs text-slate-500">Status {ebook.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(ebook)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ebook.id)}
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Price {(ebook.priceAmount ?? 0) / 100} {ebook.priceCurrency} · Public {ebook.isPublic ? 'yes' : 'no'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [
    isAdmin,
    mode,
    form,
    submitting,
    currentStep,
    liveEbooks,
    loading,
    handleSubmit,
    resetForm,
    successMessage,
    error
  ]);

  return (
    <div className="bg-slate-100 pb-24 pt-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6">
        <section className="space-y-10">
          <ExplorerSearchSection {...EXPLORER_CONFIG} />
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Marketplace highlights</h2>
            {marketplaceLoading ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Refreshing…</span>
            ) : null}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {marketplace.map((ebook) => (
              <EbookCard key={ebook.id} ebook={ebook} onPurchase={() => openCheckout(ebook)} />
            ))}
            {!marketplaceLoading && marketplace.length === 0 ? (
              <p className="text-sm text-slate-500">No marketplace titles available right now. Check back after publishing a release.</p>
            ) : null}
            {marketplaceLoading ? <p className="text-sm text-slate-500">Loading marketplace e-books…</p> : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Recent purchase intents</h2>
            {checkoutPending ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Processing…</span>
            ) : null}
          </div>
          {checkoutHistory.length === 0 ? (
            <p className="text-sm text-slate-500">Generate a purchase intent to see audit-ready records.</p>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">E-book</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Secret / Link</th>
                    <th className="px-4 py-3">Captured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {checkoutHistory.map((entry) => (
                    <tr key={entry.id} className="text-slate-600">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{entry.title}</p>
                        <p className="text-xs text-slate-400">
                          {entry.currency}{' '}
                          {entry.amount
                            ? new Intl.NumberFormat().format(Number(entry.amount) / 100)
                            : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 capitalize">{entry.provider}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">
                        {entry.paymentId ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {entry.clientSecret ? (
                          <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-primary">
                            {entry.clientSecret.slice(0, 16)}…
                          </span>
                        ) : entry.approvalUrl ? (
                          <a
                            href={entry.approvalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            Approval link
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>{adminPanel}</section>
      </div>
      <CheckoutDialog
        open={checkoutOpen && Boolean(checkoutEbook)}
        entity={
          checkoutEbook
            ? {
                badge: 'Checkout',
                type: 'Checkout',
                title: checkoutEbook.title,
                subtitle: checkoutPriceLabel
              }
            : { badge: 'Checkout', title: 'Secure checkout' }
        }
        form={checkoutForm}
        onFormChange={setCheckoutForm}
        onSubmit={handleCheckoutSubmit}
        onClose={closeCheckout}
        status={checkoutStatus}
        pending={checkoutPending}
        providerOptions={['stripe', 'paypal']}
        summary={checkoutSummary}
        couponInsight={couponInsight}
      />
    </div>
  );
}
