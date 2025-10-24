import { useMemo } from 'react';
import PropTypes from 'prop-types';

import AvatarCropper from '../media/AvatarCropper.jsx';

function SocialLinkFields({ index, link, onChange, onRemove, disableRemove }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <label className="flex-1 text-sm font-medium text-slate-700">
          Label
          <input
            type="text"
            value={link.label ?? ''}
            onChange={(event) => onChange(index, { ...link, label: event.target.value })}
            placeholder="Website, LinkedIn, Portfolio"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="flex-1 text-sm font-medium text-slate-700">
          URL
          <input
            type="url"
            required
            value={link.url ?? ''}
            onChange={(event) => onChange(index, { ...link, url: event.target.value })}
            placeholder="https://"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <label className="flex-1 text-sm font-medium text-slate-700">
          Handle (optional)
          <input
            type="text"
            value={link.handle ?? ''}
            onChange={(event) => onChange(index, { ...link, handle: event.target.value })}
            placeholder="@edulure"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={disableRemove}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

SocialLinkFields.propTypes = {
  index: PropTypes.number.isRequired,
  link: PropTypes.shape({
    label: PropTypes.string,
    url: PropTypes.string,
    handle: PropTypes.string
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  disableRemove: PropTypes.bool
};

SocialLinkFields.defaultProps = {
  disableRemove: false
};

export default function ProfileIdentityEditor({
  form,
  onFieldChange,
  onAddressChange,
  onSocialLinkChange,
  onAddSocialLink,
  onRemoveSocialLink,
  onSubmit,
  isSaving,
  canSubmit,
  error,
  success,
  errors
}) {
  const socialLinks = Array.isArray(form.socialLinks) && form.socialLinks.length > 0 ? form.socialLinks : [{ label: '', url: '' }];
  const validationErrors = errors ?? {};

  const completionSummary = useMemo(() => {
    const checks = [
      Boolean(form.displayName?.trim()),
      Boolean(form.tagline?.trim()),
      Boolean(form.location?.trim()),
      Boolean(form.bio?.trim()),
      Boolean(form.avatarUrl?.trim()),
      Boolean(form.bannerUrl?.trim()),
      Boolean(form.address?.city?.trim()),
      Boolean(form.address?.country?.trim()),
      Boolean(Array.isArray(form.socialLinks) && form.socialLinks.some((link) => Boolean(link?.url?.trim())))
    ];
    const total = checks.length;
    const completed = checks.filter(Boolean).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    let tone = 'border-slate-200 bg-slate-100 text-slate-600';
    if (percentage === 100) {
      tone = 'border-emerald-200 bg-emerald-50 text-emerald-700';
    } else if (percentage >= 60) {
      tone = 'border-primary/30 bg-primary/10 text-primary';
    } else {
      tone = 'border-amber-200 bg-amber-50 text-amber-700';
    }
    return {
      percentage,
      badgeClassName: `inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone}`,
      label: percentage === 100 ? 'Ready for publishing' : `${percentage}% complete`
    };
  }, [form.address, form.avatarUrl, form.bannerUrl, form.bio, form.displayName, form.location, form.socialLinks, form.tagline]);

  const taglineLength = form.tagline?.trim().length ?? 0;
  const bioLength = form.bio?.trim().length ?? 0;
  const TAGLINE_MAX = 80;
  const BIO_MAX = 240;

  const inputClassName = (hasError) =>
    `mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 ${
      hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200/70' : 'border-slate-200 focus:border-primary focus:ring-primary/40'
    }`;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isSaving && canSubmit) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Profile identity &amp; branding</h2>
            <p className="mt-1 text-sm text-slate-600">
              Update the details surfaced across your profile, live feed, and community experiences.
            </p>
          </div>
          <div className={completionSummary.badgeClassName} aria-live="polite">
            {completionSummary.label}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Display name
            <input
              type="text"
              value={form.displayName ?? ''}
              onChange={(event) => onFieldChange('displayName', event.target.value)}
              placeholder="Public name"
              className={inputClassName(Boolean(validationErrors.displayName))}
              aria-invalid={Boolean(validationErrors.displayName)}
            />
            {validationErrors.displayName ? (
              <p className="mt-1 text-xs text-rose-600">{validationErrors.displayName}</p>
            ) : null}
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Tagline
            <input
              type="text"
              value={form.tagline ?? ''}
              onChange={(event) => onFieldChange('tagline', event.target.value)}
              placeholder="Your positioning in a sentence"
              maxLength={TAGLINE_MAX}
              aria-describedby="profile-tagline-helper"
              className={inputClassName(Boolean(validationErrors.tagline))}
              aria-invalid={Boolean(validationErrors.tagline)}
            />
            {validationErrors.tagline ? (
              <p className="mt-1 text-xs text-rose-600">{validationErrors.tagline}</p>
            ) : (
              <p id="profile-tagline-helper" className="mt-1 text-xs text-slate-500">
                {taglineLength}/{TAGLINE_MAX} characters
              </p>
            )}
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Location headline
            <input
              type="text"
              value={form.location ?? ''}
              onChange={(event) => onFieldChange('location', event.target.value)}
              placeholder="City, Country"
              className={inputClassName(Boolean(validationErrors.location))}
              aria-invalid={Boolean(validationErrors.location)}
            />
            {validationErrors.location ? (
              <p className="mt-1 text-xs text-rose-600">{validationErrors.location}</p>
            ) : null}
          </label>
          <div className="hidden md:block" />
          <label className="flex flex-col text-sm font-medium text-slate-700">
            First name
            <input
              type="text"
              value={form.firstName ?? ''}
              onChange={(event) => onFieldChange('firstName', event.target.value)}
              className={inputClassName(Boolean(validationErrors.firstName))}
              aria-invalid={Boolean(validationErrors.firstName)}
            />
            {validationErrors.firstName ? (
              <p className="mt-1 text-xs text-rose-600">{validationErrors.firstName}</p>
            ) : null}
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Last name
            <input
              type="text"
              value={form.lastName ?? ''}
              onChange={(event) => onFieldChange('lastName', event.target.value)}
              className={inputClassName(Boolean(validationErrors.lastName))}
              aria-invalid={Boolean(validationErrors.lastName)}
            />
            {validationErrors.lastName ? (
              <p className="mt-1 text-xs text-rose-600">{validationErrors.lastName}</p>
            ) : null}
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700 md:col-span-2">
            Headline bio
            <textarea
              value={form.bio ?? ''}
              onChange={(event) => onFieldChange('bio', event.target.value)}
              rows={4}
              placeholder="Share what you teach, build, or mentor."
              maxLength={BIO_MAX}
              aria-describedby="profile-bio-helper"
              className={inputClassName(Boolean(validationErrors.bio))}
              aria-invalid={Boolean(validationErrors.bio)}
            />
            {validationErrors.bio ? (
              <p className="mt-1 text-xs text-rose-600">{validationErrors.bio}</p>
            ) : (
              <p id="profile-bio-helper" className="mt-1 text-xs text-slate-500">
                {bioLength}/{BIO_MAX} characters
              </p>
            )}
          </label>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <AvatarCropper
              label="Avatar image"
              helperText="Upload a square image or paste a URL and adjust the crop to keep your face centred. The cropped version powers your profile, feed posts, and community badges."
              value={form.avatarUrl ?? ''}
              onChange={(nextValue) => onFieldChange('avatarUrl', nextValue)}
              onReset={() => onFieldChange('avatarUrl', '')}
            />
          </div>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Banner image URL
            <input
              type="url"
              value={form.bannerUrl ?? ''}
              onChange={(event) => onFieldChange('bannerUrl', event.target.value)}
              placeholder="https://"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            City
            <input
              type="text"
              value={form.address?.city ?? ''}
              onChange={(event) => onAddressChange('city', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Region / State
            <input
              type="text"
              value={form.address?.region ?? ''}
              onChange={(event) => onAddressChange('region', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Country
            <input
              type="text"
              value={form.address?.country ?? ''}
              onChange={(event) => onAddressChange('country', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Postal code
            <input
              type="text"
              value={form.address?.postalCode ?? ''}
              onChange={(event) => onAddressChange('postalCode', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Social links</h3>
          <button
            type="button"
            onClick={onAddSocialLink}
            className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            Add link
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {socialLinks.map((link, index) => (
            <SocialLinkFields
              key={`${link.url ?? 'empty'}-${index}`}
              index={index}
              link={link}
              onChange={onSocialLinkChange}
              onRemove={onRemoveSocialLink}
              disableRemove={socialLinks.length === 1}
            />
          ))}
        </div>
      </div>

      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          role={error ? 'alert' : 'status'}
          aria-live={error ? 'assertive' : 'polite'}
        >
          {error ?? success}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Changes update your public profile instantly across the web and in communities.
        </p>
        <button
          type="submit"
          disabled={!canSubmit || isSaving}
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}

ProfileIdentityEditor.propTypes = {
  form: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    displayName: PropTypes.string,
    tagline: PropTypes.string,
    location: PropTypes.string,
    bio: PropTypes.string,
    avatarUrl: PropTypes.string,
    bannerUrl: PropTypes.string,
    socialLinks: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        url: PropTypes.string,
        handle: PropTypes.string
      })
    ),
    address: PropTypes.shape({
      city: PropTypes.string,
      region: PropTypes.string,
      country: PropTypes.string,
      postalCode: PropTypes.string
    })
  }).isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onAddressChange: PropTypes.func.isRequired,
  onSocialLinkChange: PropTypes.func.isRequired,
  onAddSocialLink: PropTypes.func.isRequired,
  onRemoveSocialLink: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
  canSubmit: PropTypes.bool,
  error: PropTypes.string,
  success: PropTypes.string,
  errors: PropTypes.shape({
    displayName: PropTypes.string,
    tagline: PropTypes.string,
    location: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    bio: PropTypes.string
  })
};

ProfileIdentityEditor.defaultProps = {
  isSaving: false,
  canSubmit: true,
  error: null,
  success: null,
  errors: {}
};
