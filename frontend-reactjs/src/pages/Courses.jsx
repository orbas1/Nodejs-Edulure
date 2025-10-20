import { useCallback, useEffect, useMemo, useState } from 'react';
import { AcademicCapIcon, CheckCircleIcon, CreditCardIcon, XMarkIcon } from '@heroicons/react/24/outline';

import ExplorerSearchSection from '../components/search/ExplorerSearchSection.jsx';
import FormStepper from '../components/forms/FormStepper.jsx';
import adminControlApi from '../api/adminControlApi.js';
import { searchExplorer } from '../api/explorerApi.js';
import { listPublicCourses } from '../api/catalogueApi.js';
import { createPaymentIntent } from '../api/paymentsApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import useAutoDismissMessage from '../hooks/useAutoDismissMessage.js';
import { isAbortError } from '../utils/errors.js';

const EXPLORER_CONFIG = {
  entityType: 'courses',
  title: 'Search the course catalogue',
  description:
    'Locate the perfect cohort, live program or self-paced track. Save searches with governance-ready guard rails and analytics.',
  placeholder: 'Search courses by skill, instructor or outcome…',
  defaultSort: 'relevance',
  sortOptions: [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Top rated', value: 'rating' },
    { label: 'Newest', value: 'newest' },
    { label: 'Price: low to high', value: 'priceLow' },
    { label: 'Price: high to low', value: 'priceHigh' }
  ],
  filterDefinitions: [
    {
      key: 'level',
      label: 'Level',
      type: 'multi',
      options: [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Advanced', value: 'advanced' },
        { label: 'Expert', value: 'expert' }
      ]
    },
    {
      key: 'deliveryFormat',
      label: 'Format',
      type: 'multi',
      options: [
        { label: 'Self paced', value: 'self_paced' },
        { label: 'Cohort', value: 'cohort' },
        { label: 'Live', value: 'live' },
        { label: 'Blended', value: 'blended' }
      ]
    },
    {
      key: 'price.amount',
      label: 'Price (USD)',
      type: 'range'
    }
  ]
};

const FORM_STEPS = [
  { id: 'overview', title: 'Overview', description: 'Title, instructor and summary' },
  { id: 'structure', title: 'Structure', description: 'Level, format, pricing and release' },
  { id: 'media', title: 'Media', description: 'Branding, syllabus and metadata' }
];

function createEmptyForm() {
  return {
    instructorId: '',
    title: '',
    slug: '',
    summary: '',
    description: '',
    level: 'beginner',
    category: 'general',
    skills: '',
    tags: '',
    languages: '',
    deliveryFormat: 'self_paced',
    thumbnailUrl: '',
    heroImageUrl: '',
    trailerUrl: '',
    promoVideoUrl: '',
    syllabusUrl: '',
    priceCurrency: 'USD',
    priceAmount: '',
    isPublished: false,
    releaseAt: '',
    status: 'draft',
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

function formatPrice(amount, currency = 'USD') {
  if (amount === null || amount === undefined || amount === '') {
    return 'Free';
  }
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return `${currency} ${amount}`;
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(numeric);
  } catch (_error) {
    return `${currency} ${numeric}`;
  }
}

function CourseHighlightCard({ course, onPurchase }) {
  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            <AcademicCapIcon className="h-4 w-4" /> Course
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">{course.title}</h3>
          {course.subtitle ? <p className="text-sm font-medium text-slate-500">{course.subtitle}</p> : null}
          {course.description ? (
            <p className="text-sm leading-relaxed text-slate-600">{course.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-600">
              {course.level}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              {course.deliveryFormat}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
              {course.price}
            </span>
          </div>
        </div>
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-32 w-32 flex-none rounded-2xl border border-slate-200 object-cover shadow-inner"
          />
        ) : null}
      </div>
      {course.skills?.length ? (
        <div className="flex flex-wrap gap-2">
          {course.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              #{skill}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {course.actions?.map((action) => (
          <a
            key={action.label}
            href={action.href ?? '#'}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            {action.label}
          </a>
        ))}
        {onPurchase ? (
          <button
            type="button"
            onClick={onPurchase}
            className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
          >
            <CreditCardIcon className="h-4 w-4" /> Purchase cohort
          </button>
        ) : null}
      </div>
    </article>
  );
}

function CourseCheckoutDrawer({ course, open, onClose, form, onChange, onSubmit, status, pending }) {
  if (!open || !course) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-900/40 px-4 py-6">
      <div className="relative w-full max-w-xl rounded-4xl border border-slate-200 bg-white/95 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
        >
          <XMarkIcon className="h-5 w-5" />
          <span className="sr-only">Close checkout</span>
        </button>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <CreditCardIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Checkout</p>
            <h3 className="text-xl font-semibold text-slate-900">Secure cohort purchase</h3>
            <p className="text-xs text-slate-500">{course.title}</p>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</span>
            <div className="grid grid-cols-2 gap-2">
              {['stripe', 'paypal'].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => onChange({ ...form, provider })}
                  className={`rounded-3xl border px-4 py-3 text-sm font-semibold capitalize transition ${
                    form.provider === provider
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seats</span>
            <input
              type="number"
              min="1"
              max="500"
              value={form.quantity}
              onChange={(event) => onChange({ ...form, quantity: Number(event.target.value) || 1 })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Receipt email</span>
            <input
              type="email"
              value={form.receiptEmail}
              onChange={(event) => onChange({ ...form, receiptEmail: event.target.value })}
              placeholder="ap@company.com"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coupon code</span>
            <input
              type="text"
              value={form.couponCode}
              onChange={(event) => onChange({ ...form, couponCode: event.target.value.toUpperCase() })}
              placeholder="OPS50"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tax country</span>
              <input
                type="text"
                maxLength={2}
                value={form.taxCountry}
                onChange={(event) => onChange({ ...form, taxCountry: event.target.value.toUpperCase() })}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="US"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Region</span>
              <input
                type="text"
                maxLength={3}
                value={form.taxRegion}
                onChange={(event) => onChange({ ...form, taxRegion: event.target.value.toUpperCase() })}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="NY"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Postal code</span>
              <input
                type="text"
                maxLength={12}
                value={form.taxPostalCode}
                onChange={(event) => onChange({ ...form, taxPostalCode: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="10001"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:opacity-60"
          >
            {pending ? 'Creating payment intent…' : 'Generate payment intent'}
          </button>
        </form>

        {status ? (
          <div
            className={`mt-4 rounded-3xl border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : status.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-primary/30 bg-primary/10 text-primary'
            }`}
          >
            {status.type === 'success' ? <CheckCircleIcon className="mr-2 inline h-4 w-4" /> : null}
            {status.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function mapCatalogueCourse(course) {
  if (!course) {
    return null;
  }
  return {
    id: course.id ?? course.publicId ?? course.slug ?? course.title,
    title: course.title,
    subtitle: course.summary ?? course.category ?? 'Course',
    description: course.description ?? null,
    level: course.level ?? 'beginner',
    deliveryFormat: course.deliveryFormat ?? 'self_paced',
    price: formatPrice(course.priceAmount, course.priceCurrency ?? 'USD'),
    priceCurrency: course.priceCurrency ?? 'USD',
    priceAmountCents: Number(course.priceAmount ?? 0),
    slug: course.slug ?? null,
    thumbnailUrl: course.thumbnailUrl ?? course.heroImageUrl ?? null,
    skills: Array.isArray(course.skills) ? course.skills : [],
    actions: [
      course.syllabusUrl
        ? { label: 'View syllabus', href: course.syllabusUrl }
        : null,
      course.promoVideoUrl
        ? { label: 'Watch trailer', href: course.promoVideoUrl }
        : null
    ].filter(Boolean)
  };
}

function CourseForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  mode,
  currentStep,
  setCurrentStep
}) {
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    onChange({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const disabled = submitting;

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <FormStepper steps={FORM_STEPS} currentStep={currentStep} onSelect={setCurrentStep} />
      {currentStep === 'overview' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Instructor ID</span>
            <input
              type="number"
              name="instructorId"
              value={form.instructorId}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Slug</span>
            <input
              type="text"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              placeholder="automation-blueprint"
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
            <span className="text-sm font-semibold text-slate-700">Summary</span>
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              rows={2}
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
        </div>
      ) : null}

      {currentStep === 'structure' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Level</span>
            <select
              name="level"
              value={form.level}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Category</span>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Skills</span>
            <input
              type="text"
              name="skills"
              value={form.skills}
              onChange={handleChange}
              placeholder="Automation, Playbooks"
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
              placeholder="Growth, Ops"
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
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Format</span>
            <select
              name="deliveryFormat"
              value={form.deliveryFormat}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            >
              <option value="self_paced">Self paced</option>
              <option value="cohort">Cohort</option>
              <option value="live">Live</option>
              <option value="blended">Blended</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Price</span>
            <input
              type="number"
              name="priceAmount"
              min="0"
              step="0.01"
              value={form.priceAmount}
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
              name="isPublished"
              checked={form.isPublished}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              disabled={disabled}
            />
            Published
          </label>
        </div>
      ) : null}

      {currentStep === 'media' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Thumbnail URL</span>
            <input
              type="url"
              name="thumbnailUrl"
              value={form.thumbnailUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Hero image URL</span>
            <input
              type="url"
              name="heroImageUrl"
              value={form.heroImageUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Trailer URL</span>
            <input
              type="url"
              name="trailerUrl"
              value={form.trailerUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Promo video URL</span>
            <input
              type="url"
              name="promoVideoUrl"
              value={form.promoVideoUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Syllabus URL</span>
            <input
              type="url"
              name="syllabusUrl"
              value={form.syllabusUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Metadata (JSON)</span>
            <textarea
              name="metadata"
              value={form.metadata}
              onChange={handleChange}
              rows={4}
              placeholder='{"enrolmentGuardrail": true}'
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
          {mode === 'edit' ? 'Update course' : 'Create course'}
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

export default function Courses() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const role = String(session?.user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';

  const [highlightCourses, setHighlightCourses] = useState([]);
  const [highlightLoading, setHighlightLoading] = useState(false);
  const [highlightError, setHighlightError] = useState(null);
  const [catalogueCourses, setCatalogueCourses] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueError, setCatalogueError] = useState(null);
  const [liveCourses, setLiveCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState(() => createEmptyForm());
  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [currentStep, setCurrentStep] = useState('overview');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutCourse, setCheckoutCourse] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState(() => ({
    provider: 'stripe',
    quantity: 10,
    receiptEmail: session?.user?.email ?? '',
    couponCode: '',
    taxCountry: 'US',
    taxRegion: '',
    taxPostalCode: ''
  }));
  const [checkoutStatus, setCheckoutStatus] = useState(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutHistory, setCheckoutHistory] = useState([]);
  const isAuthenticated = Boolean(token);

  useEffect(() => {
    setCheckoutForm((current) => ({
      ...current,
      receiptEmail: session?.user?.email ?? current.receiptEmail ?? ''
    }));
  }, [session?.user?.email]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadHighlights() {
      setHighlightLoading(true);
      setHighlightError(null);
      try {
        if (token) {
          const payload = {
            query: '',
            entityTypes: ['courses'],
            filters: {},
            globalFilters: {},
            sort: { courses: 'relevance' },
            page: 1,
            perPage: 6
          };

          const response = await searchExplorer(payload, { token, signal: controller.signal });
          if (!active) return;
          if (!response?.success) {
            throw new Error(response?.message ?? 'Search failed');
          }
          const hits = response.data?.results?.courses?.hits ?? [];
          setHighlightCourses(
            hits.map((hit, index) => ({
              id: hit.id ?? hit.slug ?? `course-${index}`,
              title: hit.title ?? hit.name,
              subtitle: hit.subtitle ?? hit.metrics?.subtitle,
              description: hit.description ?? hit.summary,
              level: hit.raw?.level ?? hit.metrics?.level ?? 'beginner',
              deliveryFormat: hit.raw?.deliveryFormat ?? hit.metrics?.deliveryFormat ?? 'self_paced',
              price: hit.price?.formatted ?? hit.metrics?.price ?? '$0',
              thumbnailUrl: hit.thumbnailUrl ?? hit.heroImageUrl ?? null,
              skills: hit.tags ?? hit.raw?.skills ?? [],
              actions: hit.actions ?? []
            }))
          );
          return;
        }
        throw Object.assign(new Error('Authentication required for personalised highlights'), { status: 401 });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!token || err.status === 401 || err.status === 403) {
          try {
            const fallback = await listPublicCourses({ signal: controller.signal, params: { limit: 6 } });
            if (!active) return;
            const items = (fallback?.data ?? []).map(mapCatalogueCourse).filter(Boolean);
            setHighlightCourses(items);
            if (token && (err.status === 401 || err.status === 403)) {
              setHighlightError('Limited results shown. Reauthenticate to view personalised highlights.');
            } else {
              setHighlightError(null);
            }
            return;
          } catch (fallbackError) {
            if (controller.signal.aborted) return;
            setHighlightCourses([]);
            setHighlightError(fallbackError.message ?? 'Unable to load course highlights');
            return;
          }
        }
        setHighlightCourses([]);
        setHighlightError(err.message ?? 'Unable to load course highlights');
      } finally {
        if (active) {
          setHighlightLoading(false);
        }
      }
    }

    loadHighlights();

    return () => {
      active = false;
      controller.abort();
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setCatalogueLoading(true);
    setCatalogueError(null);

    listPublicCourses({ signal: controller.signal, params: { limit: 8 } })
      .then((response) => {
        if (!active) return;
        setCatalogueCourses(response?.data ?? []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setCatalogueCourses([]);
        setCatalogueError(err.message ?? 'Unable to load catalogue courses');
      })
      .finally(() => {
        if (active) {
          setCatalogueLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const loadCourses = useCallback(
    async ({ signal } = {}) => {
      if (!isAdmin || !token || signal?.aborted) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await adminControlApi.listCourses({ token, params: { perPage: 50 }, signal });
        if (signal?.aborted) {
          return;
        }
        setLiveCourses(response?.data ?? []);
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) {
          return;
        }
        setError(err.message ?? 'Unable to load courses');
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
    loadCourses({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [isAdmin, token, loadCourses]);

  useAutoDismissMessage(successMessage, () => setSuccessMessage(''));

  const openCheckout = useCallback(
    (course) => {
      setCheckoutCourse(course);
      setCheckoutForm((current) => ({
        ...current,
        provider: current.provider ?? 'stripe',
        quantity: current.quantity && current.quantity > 0 ? current.quantity : 10,
        couponCode: '',
        taxCountry: current.taxCountry || 'US',
        taxRegion: '',
        taxPostalCode: '',
        receiptEmail: current.receiptEmail || session?.user?.email || ''
      }));
      setCheckoutStatus(null);
      setCheckoutOpen(true);
    },
    [session?.user?.email]
  );

  const closeCheckout = useCallback(() => {
    setCheckoutCourse(null);
    setCheckoutOpen(false);
  }, []);

  const handleCheckoutSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!checkoutCourse) {
        return;
      }
      if (!token) {
        setCheckoutStatus({ type: 'error', message: 'Sign in to generate course payment intents.' });
        return;
      }
      setCheckoutPending(true);
      setCheckoutStatus({ type: 'pending', message: `Creating checkout for ${checkoutCourse.title}…` });
      try {
        const quantity = checkoutForm.quantity || 1;
        const payload = {
          provider: checkoutForm.provider,
          currency: checkoutCourse.priceCurrency ?? 'USD',
          items: [
            {
              id: checkoutCourse.id,
              name: checkoutCourse.title,
              description: checkoutCourse.description ?? checkoutCourse.subtitle ?? undefined,
              unitAmount: checkoutCourse.priceAmountCents ?? 0,
              quantity,
              metadata: {
                courseId: checkoutCourse.id,
                slug: checkoutCourse.slug ?? undefined
              }
            }
          ],
          couponCode: checkoutForm.couponCode?.trim() || undefined,
          receiptEmail: checkoutForm.receiptEmail?.trim() || undefined,
          entity: {
            id: checkoutCourse.id,
            type: 'course',
            name: checkoutCourse.title,
            description: checkoutCourse.subtitle ?? checkoutCourse.description ?? undefined
          }
        };
        if (checkoutForm.taxCountry) {
          payload.tax = {
            country: checkoutForm.taxCountry,
            region: checkoutForm.taxRegion?.trim() || undefined,
            postalCode: checkoutForm.taxPostalCode?.trim() || undefined
          };
        }
        const response = await createPaymentIntent({ token, payload });
        const payment = response ?? {};
        setCheckoutStatus({
          type: 'success',
          message: `Checkout ready. Payment ID ${payment.paymentId ?? 'N/A'}. ${
            payment.approvalUrl
              ? 'Send the approval link to confirm payment.'
              : payment.clientSecret
                ? 'Use the Stripe client secret to capture the payment.'
                : 'Use the payment reference to complete processing.'
          }`
        });
        setCheckoutHistory((history) => [
          {
            id: payment.paymentId ?? `${checkoutCourse.id}-${Date.now()}`,
            title: checkoutCourse.title,
            provider: checkoutForm.provider,
            paymentId: payment.paymentId ?? null,
            approvalUrl: payment.approvalUrl ?? null,
            clientSecret: payment.clientSecret ?? null,
            createdAt: new Date().toISOString(),
            currency: payload.currency,
            amount: (checkoutCourse.priceAmountCents ?? 0) * quantity
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
    [checkoutCourse, checkoutForm, token]
  );

  const resetForm = useCallback(() => {
    setForm(createEmptyForm());
    setMode('create');
    setEditingId(null);
    setCurrentStep('overview');
  }, []);

  const handleEdit = (course) => {
    setMode('edit');
    setEditingId(course.id);
    setCurrentStep('overview');
    setForm({
      instructorId: course.instructorId ?? '',
      title: course.title ?? '',
      slug: course.slug ?? '',
      summary: course.summary ?? '',
      description: course.description ?? '',
      level: course.level ?? 'beginner',
      category: course.category ?? 'general',
      skills: Array.isArray(course.skills) ? course.skills.join(', ') : '',
      tags: Array.isArray(course.tags) ? course.tags.join(', ') : '',
      languages: Array.isArray(course.languages) ? course.languages.join(', ') : '',
      deliveryFormat: course.deliveryFormat ?? 'self_paced',
      thumbnailUrl: course.thumbnailUrl ?? '',
      heroImageUrl: course.heroImageUrl ?? '',
      trailerUrl: course.trailerUrl ?? '',
      promoVideoUrl: course.promoVideoUrl ?? '',
      syllabusUrl: course.syllabusUrl ?? '',
      priceCurrency: course.priceCurrency ?? 'USD',
      priceAmount: course.priceAmount ? Number(course.priceAmount) / 100 : '',
      isPublished: Boolean(course.isPublished),
      releaseAt: toDateInput(course.releaseAt),
      status: course.status ?? 'draft',
      metadata: course.metadata ? JSON.stringify(course.metadata, null, 2) : ''
    });
  };

  const handleDelete = async (courseId) => {
    if (!isAdmin || !token) return;
    if (!window.confirm('Delete this course?')) return;
    try {
      await adminControlApi.deleteCourse({ token, id: courseId });
      setSuccessMessage('Course removed');
      await loadCourses();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to delete course');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        instructorId: Number(form.instructorId),
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        level: form.level,
        category: form.category.trim() || 'general',
        skills: parseListField(form.skills),
        tags: parseListField(form.tags),
        languages: parseListField(form.languages),
        deliveryFormat: form.deliveryFormat,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        heroImageUrl: form.heroImageUrl.trim() || null,
        trailerUrl: form.trailerUrl.trim() || null,
        promoVideoUrl: form.promoVideoUrl.trim() || null,
        syllabusUrl: form.syllabusUrl.trim() || null,
        priceCurrency: form.priceCurrency.trim() || 'USD',
        priceAmount: form.priceAmount !== '' ? Number(form.priceAmount) : 0,
        isPublished: Boolean(form.isPublished),
        releaseAt: form.releaseAt ? new Date(form.releaseAt).toISOString() : null,
        status: form.status,
        metadata: parseMetadata(form.metadata)
      };

      if (mode === 'edit' && editingId) {
        await adminControlApi.updateCourse({ token, id: editingId, payload });
        setSuccessMessage('Course updated');
      } else {
        await adminControlApi.createCourse({ token, payload });
        setSuccessMessage('Course created');
      }
      await loadCourses();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const adminPanel = useMemo(() => {
    if (!isAdmin) {
      return (
        <div className="rounded-4xl border border-slate-200 bg-white/80 p-8 text-sm text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Course operations locked</p>
          <p className="mt-2 text-sm text-slate-600">
            Only administrators can publish catalogue updates. Request access from your organisation owner or send this request to compliance.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-xl">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Course console</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {mode === 'edit' ? 'Update course' : 'Create course'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Deploy new cohorts, update pricing or refresh metadata with a guarded workflow. Every CRUD operation writes to the production database and keeps the learner dashboard in sync.
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
          <CourseForm
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            submitting={submitting}
            mode={mode}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
          />
        </div>
        <div className="mt-10 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Catalogue entries</p>
          {loading ? <p className="text-sm text-slate-500">Loading catalogue…</p> : null}
          {!loading && liveCourses.length === 0 ? (
            <p className="text-sm text-slate-500">No courses published yet.</p>
          ) : null}
          <div className="grid gap-3">
            {liveCourses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{course.title}</p>
                    <p className="text-xs text-slate-500">Status {course.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(course)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(course.id)}
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Format {course.deliveryFormat} · Level {course.level} · Published {course.isPublished ? 'yes' : 'no'}
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
    liveCourses,
    loading,
    handleSubmit,
    resetForm,
    successMessage,
    error
  ]);

  return (
    <div className="bg-slate-100 pb-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-16">
        <header className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Course operations
          </span>
          <h1 className="text-4xl font-semibold text-slate-900">Courses, fully instrumented</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Build, update and scale every cohort from one surface. The course marketplace, explorer search and production-ready CRUD console live together so your team can ship confidently.
          </p>
        </header>

        <section className="space-y-10">
          <ExplorerSearchSection {...EXPLORER_CONFIG} />
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Highlighted programs</h2>
            {highlightLoading ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Refreshing…</span>
            ) : null}
          </div>
          {highlightError ? (
            <p className="text-sm font-semibold text-rose-500">{highlightError}</p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            {highlightCourses.map((course) => (
              <CourseHighlightCard key={course.id} course={course} onPurchase={() => openCheckout(course)} />
            ))}
            {!highlightLoading && highlightCourses.length === 0 ? (
              <p className="text-sm text-slate-500">
                Sign in to load curated course highlights or publish a course using the console below.
              </p>
            ) : null}
            {highlightLoading ? <p className="text-sm text-slate-500">Loading courses…</p> : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Latest catalogue launches</h2>
            {catalogueLoading ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Refreshing…</span>
            ) : null}
          </div>
          {catalogueError ? (
            <p className="text-sm font-semibold text-rose-500">{catalogueError}</p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            {catalogueCourses.map((course) => {
              const mapped = mapCatalogueCourse(course);
              if (!mapped) return null;
              return <CourseHighlightCard key={mapped.id} course={mapped} onPurchase={() => openCheckout(mapped)} />;
            })}
            {!catalogueLoading && catalogueCourses.length === 0 ? (
              <p className="text-sm text-slate-500">No published courses yet. Check back soon.</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Recent cohort payment intents</h2>
            {checkoutPending ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Processing…</span>
            ) : null}
          </div>
          {checkoutHistory.length === 0 ? (
            <p className="text-sm text-slate-500">Generate a payment intent to track financial handoffs and approvals.</p>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Course</th>
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
      <CourseCheckoutDrawer
        course={checkoutCourse}
        open={checkoutOpen}
        onClose={closeCheckout}
        form={checkoutForm}
        onChange={setCheckoutForm}
        onSubmit={handleCheckoutSubmit}
        status={checkoutStatus}
        pending={checkoutPending}
      />
    </div>
  );
}
