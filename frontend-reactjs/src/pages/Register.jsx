import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AuthForm from '../components/auth/AuthForm.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import { API_BASE_URL, httpClient } from '../api/httpClient.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import useOnboardingForm from '../hooks/useOnboardingForm.js';
import useMarketingContent from '../hooks/useMarketingContent.js';
import { fetchPasswordPolicy } from '../api/authApi.js';
import { resolveSocialProofFallback } from '../data/marketing/socialProof.js';
import {
  DEFAULT_PASSWORD_POLICY,
  evaluatePasswordStrength,
  normalisePasswordPolicy
} from '../utils/validation/auth.js';
import {
  buildOnboardingDraftPayload,
  calculateOnboardingCompletion,
  validateOnboardingState
} from '../utils/validation/onboarding.js';
import {
  trackAuthAttempt,
  trackAuthAutoSave,
  trackAuthInteraction,
  trackAuthView,
  trackNavigationSelect
} from '../lib/analytics.js';

const SOCIAL_ROUTES = {
  google: '/auth/oauth/google',
  apple: '/auth/oauth/apple',
  facebook: '/auth/oauth/facebook',
  linkedin: '/auth/oauth/linkedin'
};

const ROLE_OPTIONS = [
  { value: 'instructor', label: 'Instructor' },
  { value: 'user', label: 'Learner' }
];

const ENFORCED_TWO_FACTOR_ROLES = new Set();
const ADMIN_REQUEST_NOTE =
  "Need administrator access? Contact your organisation's Edulure operations representative to provision it securely.";
const AUTO_SAVE_DELAY_MS = 1200;

function pruneAddress(address) {
  if (!address || typeof address !== 'object') {
    return undefined;
  }
  const cleaned = Object.entries(address).reduce((acc, [key, value]) => {
    if (typeof value !== 'string') {
      return acc;
    }
    const trimmed = value.trim();
    if (trimmed) {
      acc[key] = trimmed;
    }
    return acc;
  }, {});
  return Object.keys(cleaned).length ? cleaned : undefined;
}

function getPersonaInsight(persona) {
  if (!persona) {
    return 'Share your role so we can tailor resources and invitations to your day-to-day goals.';
  }
  const value = persona.toLowerCase();
  if (value.includes('community')) {
    return 'Community builders unlock curated launch playbooks and warm introductions to sponsor collectives.';
  }
  if (value.includes('operations') || value.includes('ops')) {
    return 'Operations leaders get workflow automations, finance dashboards, and quick-start governance checklists.';
  }
  if (value.includes('instructor') || value.includes('coach')) {
    return 'Instructors see best-practice curriculum templates and fast-tracked tutor collaboration invites.';
  }
  return 'We will use this to recommend cohorts, monetisation tactics, and partner programmes that match your focus area.';
}

function resolveAutoSaveMessage(status) {
  switch (status) {
    case 'saving':
      return 'Saving your onboarding responses…';
    case 'saved':
      return 'Responses auto-saved. You can close this window and resume later.';
    case 'error':
      return 'Auto-save ran into a problem. We will retry after your next edit.';
    default:
      return 'Auto-save keeps your onboarding answers synced to your profile.';
  }
}

export default function Register() {
  const navigate = useNavigate();
  const defaultRole = ROLE_OPTIONS[0]?.value ?? 'instructor';
  const onboardingOverrides = useMemo(() => ({ role: defaultRole }), [defaultRole]);
  const { formState, errors, setErrors, updateField, updateAddressField } = useOnboardingForm(
    'learner',
    onboardingOverrides
  );
  const { data: marketingContent } = useMarketingContent({
    surfaces: ['learner-register'],
    variants: ['social_proof']
  });

  const [passwordPolicy, setPasswordPolicy] = useState(DEFAULT_PASSWORD_POLICY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(ENFORCED_TWO_FACTOR_ROLES.has(defaultRole));
  const [twoFactorLocked, setTwoFactorLocked] = useState(ENFORCED_TWO_FACTOR_ROLES.has(defaultRole));
  const [twoFactorEnrollment, setTwoFactorEnrollment] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');

  const autoSaveTimer = useRef(null);
  const lastDraftSignature = useRef(null);

  usePageMetadata({
    title: 'Create your Edulure account',
    description:
      'Register to access Edulure courses, communities, live classrooms, and analytics dashboards with built-in security controls.',
    canonicalPath: '/register',
    robots: 'noindex, nofollow',
    analytics: {
      page_type: 'register',
      enforced_two_factor_roles: ENFORCED_TWO_FACTOR_ROLES.size
    }
  });

  useEffect(() => {
    trackAuthView('register', {
      default_role: defaultRole,
      enforced_two_factor_roles: ENFORCED_TWO_FACTOR_ROLES.size,
      social_providers: Object.keys(SOCIAL_ROUTES).length
    });
  }, [defaultRole]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchPasswordPolicy();
        if (!active) return;
        const resolved = normalisePasswordPolicy(data?.policy ?? data);
        setPasswordPolicy(resolved);
      } catch (_err) {
        // keep default policy
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const oauthBase = useMemo(() => {
    if (!API_BASE_URL) return '';
    return API_BASE_URL.replace(/\/$/, '').replace(/\/?api$/, '');
  }, []);

  const passwordAssessment = useMemo(
    () => evaluatePasswordStrength(formState.password, passwordPolicy),
    [formState.password, passwordPolicy]
  );

  const onboardingProgress = useMemo(
    () => calculateOnboardingCompletion('learner', formState, { passwordPolicy }),
    [formState, passwordPolicy]
  );

  const personaInsight = useMemo(() => getPersonaInsight(formState.persona), [formState.persona]);

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

    return resolveSocialProofFallback('learner-register');
  }, [marketingContent]);

  useEffect(() => {
    if (autoSaveStatus === 'idle') return;
    trackAuthAutoSave('register', autoSaveStatus, {
      has_email: Boolean(formState.email),
      progress: onboardingProgress.progress
    });
  }, [autoSaveStatus, formState.email, onboardingProgress.progress]);

  const handleNavigateToLogin = useCallback(() => {
    trackNavigationSelect('auth:login', { from: 'register' });
  }, []);

  useEffect(() => {
    if (!twoFactorEnrollment?.enabled) return;
    trackAuthInteraction('register', 'two_factor_enrolled', {
      enforced: Boolean(twoFactorEnrollment.enforced)
    });
  }, [twoFactorEnrollment]);

  const handleSocialSignOn = useCallback(
    (provider) => {
      const route = SOCIAL_ROUTES[provider];
      if (!route) return;
      const destination = `${oauthBase}${route}`;
      trackAuthAttempt('register', 'social_redirect', {
        provider,
        destination: route
      });
      if (typeof window !== 'undefined') {
        window.location.assign(destination);
      }
    },
    [oauthBase]
  );

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
    if (name === 'role') {
      const enforced = ENFORCED_TWO_FACTOR_ROLES.has(value);
      setTwoFactorLocked(enforced);
      setTwoFactorEnabled((prev) => (enforced ? true : prev));
      setTwoFactorEnrollment(null);
      trackAuthInteraction('register', 'role_change', {
        role: value,
        enforced
      });
    }
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    updateAddressField(name, value);
  };

  const toggleMarketingOptIn = () => {
    const nextValue = !formState.marketingOptIn;
    updateField('marketingOptIn', nextValue);
    trackAuthInteraction('register', 'marketing_opt_in_toggle', { enabled: nextValue });
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

    const draftPayload = buildOnboardingDraftPayload('learner', formState, { passwordPolicy });
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
  }, [formState, passwordPolicy, isSubmitting]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setTwoFactorEnrollment(null);

    const validation = validateOnboardingState('learner', formState, { passwordPolicy });
    setErrors(validation.errors);
    if (!validation.isValid) {
      setError('Please review the highlighted fields.');
      trackAuthAttempt('register', 'validation_error', {
        error_count: Object.keys(validation.errors ?? {}).length,
        role: formState.role
      });
      return;
    }

    const { bootstrapPayload, registerPayload, cleaned } = validation;
    const address = pruneAddress(cleaned.address);
    const metadata = {
      ...bootstrapPayload.metadata,
      ...(cleaned.age ? { age: cleaned.age } : {}),
      ...(address ? { address } : {}),
      persona: cleaned.persona || undefined,
      marketingOptIn: cleaned.marketingOptIn
    };
    const preferences = {
      ...bootstrapPayload.preferences,
      marketingOptIn: cleaned.marketingOptIn,
      ...(cleaned.timeCommitment ? { timeCommitment: cleaned.timeCommitment } : {}),
      ...(cleaned.onboardingPath ? { onboardingPath: cleaned.onboardingPath } : {}),
      ...(cleaned.interests?.length ? { interests: cleaned.interests } : {})
    };

    const onboardingPayload = {
      ...bootstrapPayload,
      metadata,
      preferences
    };

    if (!onboardingPayload.invites?.length) {
      delete onboardingPayload.invites;
    }

    trackAuthAttempt('register', 'submit', {
      role: cleaned.role,
      marketing_opt_in: cleaned.marketingOptIn,
      has_invites: Boolean(onboardingPayload.invites?.length),
      two_factor_locked: twoFactorLocked,
      two_factor_enabled: twoFactorLocked ? true : twoFactorEnabled
    });

    try {
      setIsSubmitting(true);
      await httpClient.post('/dashboard/learner/onboarding/bootstrap', onboardingPayload);

      const finalRegisterPayload = {
        ...registerPayload,
        role: cleaned.role,
        twoFactor: { enabled: twoFactorLocked ? true : twoFactorEnabled }
      };

      if (cleaned.age) {
        finalRegisterPayload.age = cleaned.age;
      }
      if (address) {
        finalRegisterPayload.address = address;
      }
      if ('marketingOptIn' in finalRegisterPayload) {
        delete finalRegisterPayload.marketingOptIn;
      }

      const response = await httpClient.post('/auth/register', finalRegisterPayload);
      const result = response?.data ?? {};
      setTwoFactorEnrollment(result.twoFactor ?? null);
      if (result.twoFactor?.enabled) {
        setTwoFactorEnabled(true);
        setTwoFactorLocked(Boolean(result.twoFactor.enforced));
      }
      const verificationStatus = result.verification?.status ?? null;
      const baseMessage =
        verificationStatus === 'pending'
          ? 'Account created. Check your inbox to verify your email before signing in.'
          : 'Account created successfully.';
      const securityMessage = result.twoFactor?.enabled
        ? ' Email one-time codes are now active and will be sent whenever you sign in.'
        : '';
      trackAuthAttempt('register', 'success', {
        role: cleaned.role,
        verification_status: verificationStatus ?? 'unknown',
        two_factor_enabled: Boolean(result.twoFactor?.enabled)
      });
      setSuccess(`${baseMessage}${securityMessage}`.trim());
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      const message =
        err?.original?.response?.data?.message ?? err?.message ?? 'Unable to create your account right now.';
      setError(message);
      trackAuthAttempt('register', 'failure', {
        role: formState.role,
        code: err?.original?.response?.data?.code ?? err?.code ?? 'unknown'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthForm
      title="Create your Edulure Learnspace"
      subtitle="Tell us about yourself so we can tailor onboarding for your communities, instructors, and learners."
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? 'Creating account…' : 'Launch Learnspace'}
      busy={isSubmitting}
      error={error}
      success={success}
      passwordChecklist={{
        requirements: passwordAssessment.requirements,
        description: passwordAssessment.description
      }}
      progress={{
        progress: onboardingProgress.progress,
        label: `${onboardingProgress.completed} of ${onboardingProgress.total} onboarding steps complete`
      }}
      socialProof={socialProofEntries}
      footer={resolveAutoSaveMessage(autoSaveStatus)}
      actions={
        <span>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary"
            onClick={handleNavigateToLogin}
          >
            Sign in
          </Link>
        </span>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AuthForm.Field
          label="First name"
          name="firstName"
          placeholder="Alex"
          value={formState.firstName}
          onChange={handleChange}
          error={errors.firstName}
          required
        />
        <AuthForm.Field
          label="Last name"
          name="lastName"
          placeholder="Morgan"
          value={formState.lastName}
          onChange={handleChange}
          required={false}
        />
      </div>
      <AuthForm.Field
        label="Email address"
        type="email"
        name="email"
        placeholder="you@company.com"
        value={formState.email}
        onChange={handleChange}
        error={errors.email}
        required
      />
      <AuthForm.Field
        label="What best describes you?"
        name="persona"
        placeholder="Community architect, Learning ops lead, etc."
        value={formState.persona}
        onChange={handleChange}
        required={false}
        helper={personaInsight}
      />
      <AuthForm.Field label="Role" name="role" error={errors.role}>
        <select name="role" value={formState.role} onChange={handleChange} className="form-field__input">
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="form-field__helper">{ADMIN_REQUEST_NOTE}</p>
      </AuthForm.Field>
      <AuthForm.Field
        label="Age"
        name="age"
        type="number"
        placeholder="Optional"
        value={formState.age}
        onChange={handleChange}
        min="16"
        required={false}
        error={errors.age}
      />
      <div className="form-section space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Address (optional)</p>
          <p className="form-field__helper">Provide as much detail as possible to help us tailor regional onboarding.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <AuthForm.Field
            label="Street address"
            name="streetAddress"
            placeholder="123 Example Street"
            value={formState.address.streetAddress}
            onChange={handleAddressChange}
            required={false}
          />
          <AuthForm.Field
            label="Address line 2"
            name="addressLine2"
            placeholder="Apartment, suite, etc."
            value={formState.address.addressLine2}
            onChange={handleAddressChange}
            required={false}
          />
          <AuthForm.Field
            label="Town"
            name="town"
            placeholder="Town"
            value={formState.address.town}
            onChange={handleAddressChange}
            required={false}
          />
          <AuthForm.Field
            label="City"
            name="city"
            placeholder="City"
            value={formState.address.city}
            onChange={handleAddressChange}
            required={false}
          />
          <AuthForm.Field
            label="Country"
            name="country"
            placeholder="Country"
            value={formState.address.country}
            onChange={handleAddressChange}
            required={false}
          />
          <AuthForm.Field
            label="Postcode"
            name="postcode"
            placeholder="Postal code"
            value={formState.address.postcode}
            onChange={handleAddressChange}
            required={false}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AuthForm.Field
          label="Your goals"
          name="goalsInput"
          placeholder="Launch Flow 5, grow community revenue, etc."
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
              Opt in to receive onboarding tips, Flow 5 experiments, and community launch playbooks by email.
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
      <AuthForm.Field
        label="Password"
        type="password"
        name="password"
        value={formState.password}
        onChange={handleChange}
        placeholder="Create a secure password"
        required
        error={errors.password}
      />
      <AuthForm.Field
        label="Confirm password"
        type="password"
        name="confirmPassword"
        value={formState.confirmPassword}
        onChange={handleChange}
        placeholder="Re-enter your password"
        required
        error={errors.confirmPassword}
      />
      <div className="form-section space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">Multi-factor authentication</p>
            <p className="form-field__helper">
              Secure your account with email-delivered one-time passcodes.
              {twoFactorLocked
                ? ' This role requires multi-factor authentication on every sign in.'
                : ' Opt in now to receive sign-in codes by email whenever you log in.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={twoFactorLocked ? true : twoFactorEnabled}
              aria-disabled={twoFactorLocked}
              onClick={() => {
                if (twoFactorLocked) return;
                setTwoFactorEnabled((prev) => {
                  const next = !prev;
                  trackAuthInteraction('register', 'two_factor_toggle', { next, locked: false });
                  return next;
                });
              }}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 ${
                (twoFactorLocked ? true : twoFactorEnabled) ? 'bg-primary' : 'bg-slate-300'
              } ${twoFactorLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition ${
                  (twoFactorLocked ? true : twoFactorEnabled) ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-semibold text-slate-600">
              {twoFactorLocked ? 'Required' : twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
        {!twoFactorLocked && !twoFactorEnabled ? (
          <p className="form-field__helper">Turn this on to have email one-time codes enabled right after registration.</p>
        ) : null}
      </div>
      {twoFactorEnrollment?.enabled ? (
        <div className="form-section space-y-4 border border-primary/30 ring-1 ring-primary/15">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">Email codes are ready</p>
            <p className="form-field__helper">
              We will send a six-digit security code to {formState.email || 'your email'} on every sign in. Check your inbox
              (and spam folder) when prompted.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/login')} className="cta-button cta-button--primary w-full">
            Proceed to secure login
          </button>
        </div>
      ) : null}
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
      <div className="space-y-4">
        <div className="relative flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            or try an alternative login
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <SocialSignOn onSelect={handleSocialSignOn} />
      </div>
    </AuthForm>
  );
}
