import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AuthForm from '../components/auth/AuthForm.jsx';
import { httpClient } from '../api/httpClient.js';
import useOnboardingForm from '../hooks/useOnboardingForm.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import useMarketingContent from '../hooks/useMarketingContent.js';
import { resolveSocialProofFallback } from '../data/marketing/socialProof.js';
import { buildOnboardingDraftPayload, calculateOnboardingCompletion, validateOnboardingState } from '../utils/validation/onboarding.js';

const AUTO_SAVE_DELAY_MS = 1200;

function buildInstructorMetadata(cleaned, existingMetadata) {
  return {
    ...existingMetadata,
    headline: cleaned.headline || undefined,
    portfolio: cleaned.portfolio || undefined,
    expertise: cleaned.expertise || undefined,
    audience: cleaned.audience || undefined,
    marketingOptIn: cleaned.marketingOptIn,
    marketingSource: cleaned.marketingSource || undefined,
    marketingCampaign: cleaned.marketingCampaign || undefined
  };
}

function resolveAutoSaveMessage(status) {
  switch (status) {
    case 'saving':
      return 'Saving your application draft…';
    case 'saved':
      return 'Application auto-saved. You can return to finish later.';
    case 'error':
      return 'Auto-save failed. We will retry after your next edit.';
    default:
      return 'Auto-save keeps your instructor application synced to your profile.';
  }
}

export default function InstructorRegister() {
  usePageMetadata({
    title: 'Instructor onboarding · Edulure',
    description:
      'Apply to become an Edulure instructor and unlock course publishing, community leadership, and revenue-sharing programmes.',
    canonicalPath: '/instructor/register',
    robots: 'noindex, nofollow',
    keywords: ['instructor onboarding', 'apply to teach', 'edulure instructor'],
    analytics: {
      page_type: 'instructor_register'
    }
  });

  const overrides = useMemo(() => ({ role: 'instructor' }), []);
  const { formState, errors, setErrors, updateField } = useOnboardingForm('instructor', overrides);
  const { data: marketingContent } = useMarketingContent({
    surfaces: ['instructor-register'],
    variants: ['social_proof']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const autoSaveTimer = useRef(null);
  const lastDraftSignature = useRef(null);

  const onboardingProgress = useMemo(
    () => calculateOnboardingCompletion('instructor', formState),
    [formState]
  );

  const socialProofEntries = useMemo(() => {
    const testimonials = Array.isArray(marketingContent?.testimonials)
      ? marketingContent.testimonials.filter((entry) => entry.variant === 'social_proof')
      : [];

    if (testimonials.length > 0) {
      return testimonials.map((entry) => ({
        id: entry.id ?? entry.slug,
        quote: entry.quote,
        attribution:
          entry.attribution ??
          [entry.authorName, entry.authorTitle].filter(Boolean).join(' • ') ??
          'Edulure operator'
      }));
    }

    return resolveSocialProofFallback('instructor-register');
  }, [marketingContent]);

  const clearFieldError = useCallback(
    (field) => {
      setErrors((prev) => {
        if (!prev || !prev[field]) {
          return prev;
        }
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [setErrors]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    updateField(name, value);
    clearFieldError(name);
  };

  const toggleMarketingOptIn = () => {
    updateField('marketingOptIn', !formState.marketingOptIn);
  };

  const handleTermsChange = (event) => {
    updateField('termsAccepted', event.target.checked);
    clearFieldError('termsAccepted');
  };

  useEffect(() => {
    if (isSubmitting) {
      return undefined;
    }
    if (!formState.email || !formState.firstName) {
      return undefined;
    }

    const draftPayload = buildOnboardingDraftPayload('instructor', formState);
    const signature = JSON.stringify(draftPayload);
    if (signature === lastDraftSignature.current) {
      return undefined;
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        await httpClient.post('/dashboard/learner/onboarding/bootstrap', draftPayload);
        lastDraftSignature.current = signature;
        setAutoSaveStatus('saved');
      } catch (_err) {
        setAutoSaveStatus('error');
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formState, isSubmitting]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = validateOnboardingState('instructor', formState);
    setErrors(validation.errors);
    if (!validation.isValid) {
      setError('Please review the highlighted fields.');
      return;
    }

    const { bootstrapPayload, cleaned } = validation;
    const metadata = buildInstructorMetadata(cleaned, bootstrapPayload.metadata);
    const preferences = {
      ...bootstrapPayload.preferences,
      marketingOptIn: cleaned.marketingOptIn,
      ...(cleaned.timeCommitment ? { timeCommitment: cleaned.timeCommitment } : {}),
      ...(cleaned.interests?.length ? { interests: cleaned.interests } : {})
    };

    const payload = {
      ...bootstrapPayload,
      metadata,
      preferences
    };

    if (!payload.invites?.length) {
      delete payload.invites;
    }

    try {
      setIsSubmitting(true);
      await httpClient.post('/dashboard/learner/onboarding/bootstrap', payload);
      setSuccess('Thanks for applying! Our instructor success team will review your submission and reach out within 48 hours.');
    } catch (err) {
      const message =
        err?.original?.response?.data?.message ?? err?.message ?? 'Unable to submit your instructor application right now.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthForm
      title="Become an Edulure instructor"
      subtitle="Join the roster of expert educators shaping the next generation of communities and courses."
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? 'Submitting…' : 'Submit application'}
      busy={isSubmitting}
      error={error}
      success={success}
      socialProof={socialProofEntries}
      progress={{
        progress: onboardingProgress.progress,
        label: `${onboardingProgress.completed} of ${onboardingProgress.total} sections complete`
      }}
      footer={resolveAutoSaveMessage(autoSaveStatus)}
      actions={
        <span>
          Looking for the learner experience?{' '}
          <a href="/register" className="font-semibold text-primary">
            Go back to learner signup
          </a>
        </span>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AuthForm.Field
          label="First name"
          name="firstName"
          placeholder="Jordan"
          value={formState.firstName}
          onChange={handleChange}
          error={errors.firstName}
        />
        <AuthForm.Field
          label="Last name"
          name="lastName"
          placeholder="Rivera"
          value={formState.lastName}
          onChange={handleChange}
          required={false}
        />
      </div>
      <AuthForm.Field
        label="Email address"
        type="email"
        name="email"
        placeholder="you@studio.com"
        value={formState.email}
        onChange={handleChange}
        error={errors.email}
      />
      <AuthForm.Field
        label="Professional headline"
        name="headline"
        placeholder="Growth Strategist & Operator"
        value={formState.headline}
        onChange={handleChange}
        required={false}
      />
      <AuthForm.Field
        label="Portfolio or website"
        name="portfolio"
        placeholder="https://yourportfolio.com"
        value={formState.portfolio}
        onChange={handleChange}
        required={false}
      />
      <AuthForm.Field
        label="Areas of expertise"
        name="expertise"
        placeholder="Community design, Funnel strategy"
        value={formState.expertise}
        onChange={handleChange}
        required={false}
      />
      <AuthForm.Field
        label="Audience size"
        name="audience"
        placeholder="Email list, social reach, membership numbers"
        value={formState.audience}
        onChange={handleChange}
        required={false}
      />
      <AuthForm.Field
        label="Tell us about your learners"
        name="persona"
        placeholder="Creators, operators, community architects"
        value={formState.persona}
        onChange={handleChange}
        required={false}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <AuthForm.Field
          label="Your goals"
          name="goalsInput"
          placeholder="Launch Flow 5 masterclass, grow recurring revenue"
          required={false}
          helper="Separate each goal with a comma or new line."
        >
          <textarea
            name="goalsInput"
            value={formState.goalsInput}
            onChange={handleChange}
            className="form-field__input min-h-[120px] resize-y"
          />
        </AuthForm.Field>
        <AuthForm.Field
          label="Invitation codes"
          name="inviteCodes"
          placeholder="FLOW5-OPS-GUILD"
          required={false}
          helper="Paste any invite codes you've received to automatically connect communities."
        >
          <textarea
            name="inviteCodes"
            value={formState.inviteCodes}
            onChange={handleChange}
            className="form-field__input min-h-[120px] resize-y"
          />
        </AuthForm.Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AuthForm.Field
          label="Estimated weekly time commitment"
          name="timeCommitment"
          placeholder="4h/week"
          value={formState.timeCommitment}
          onChange={handleChange}
          required={false}
        />
        <AuthForm.Field
          label="Preferred onboarding path"
          name="onboardingPath"
          placeholder="Community-first, course-first, etc."
          value={formState.onboardingPath}
          onChange={handleChange}
          required={false}
        />
      </div>
      <AuthForm.Field
        label="Areas of interest"
        name="interestsInput"
        placeholder="Live cohorts, sponsor onboarding, analytics"
        required={false}
        helper="Separate each interest with a comma or new line."
      >
        <textarea
          name="interestsInput"
          value={formState.interestsInput}
          onChange={handleChange}
          className="form-field__input min-h-[120px] resize-y"
        />
      </AuthForm.Field>
      <div className="grid gap-4 md:grid-cols-2">
        <AuthForm.Field
          label="How did you hear about Edulure?"
          name="marketingSource"
          placeholder="Referral, conference, newsletter"
          value={formState.marketingSource}
          onChange={handleChange}
          required={false}
        />
        <AuthForm.Field
          label="Campaign or creator"
          name="marketingCampaign"
          placeholder="Flow 5 beta, Creator Growth Lab"
          value={formState.marketingCampaign}
          onChange={handleChange}
          required={false}
        />
      </div>
      <div className="form-section space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">Marketing updates</p>
            <p className="form-field__helper">
              Opt in to receive onboarding tips, launch playbooks, and instructor monetisation case studies.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={formState.marketingOptIn}
              onClick={toggleMarketingOptIn}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 ${
                formState.marketingOptIn ? 'bg-primary' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition ${
                  formState.marketingOptIn ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-semibold text-slate-600">
              {formState.marketingOptIn ? 'Subscribed' : 'Not now'}
            </span>
          </div>
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          checked={formState.termsAccepted}
          onChange={handleTermsChange}
        />
        <span>
          I agree to the Edulure{' '}
          <a href="/terms" className="font-semibold text-primary" target="_blank" rel="noreferrer">
            terms of use
          </a>{' '}
          and{' '}
          <a href="/privacy" className="font-semibold text-primary" target="_blank" rel="noreferrer">
            privacy policy
          </a>
          .
          {errors.termsAccepted ? (
            <span className="form-field__error ml-2 inline-block align-middle">{errors.termsAccepted}</span>
          ) : null}
        </span>
      </label>
    </AuthForm>
  );
}
