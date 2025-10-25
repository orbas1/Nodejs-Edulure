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

function resolveAutoSaveMessage(status) {
  switch (status) {
    case 'saving':
      return 'Saving your account setup details…';
    case 'saved':
      return 'Details saved. You can return later without losing progress.';
    case 'error':
      return 'Auto-save ran into a problem. We will retry after your next edit.';
    default:
      return 'Auto-save keeps your registration details synced to your profile.';
  }
}

export default function Register() {
  const navigate = useNavigate();
  const defaultRole = ROLE_OPTIONS[0]?.value ?? 'instructor';
  const onboardingOverrides = useMemo(() => ({ role: defaultRole }), [defaultRole]);
  const { formState, errors, setErrors, updateField } = useOnboardingForm(
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
    const onboardingPayload = {
      ...bootstrapPayload,
      submittedAt: new Date().toISOString()
    };

    trackAuthAttempt('register', 'submit', {
      role: cleaned.role,
      has_date_of_birth: Boolean(cleaned.dateOfBirth),
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
      subtitle="Share just the essentials to activate your secure learning workspace."
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? 'Creating account…' : 'Launch Learnspace'}
      busy={isSubmitting}
      error={error}
      success={success}
      passwordChecklist={{
        requirements: passwordAssessment.requirements,
        description: passwordAssessment.description
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
        label="Email"
        type="email"
        name="email"
        placeholder="you@company.com"
        value={formState.email}
        onChange={handleChange}
        error={errors.email}
        required
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
        label="Date of birth"
        name="dateOfBirth"
        type="date"
        value={formState.dateOfBirth}
        onChange={handleChange}
        error={errors.dateOfBirth}
        required={false}
        helper="Used only to confirm you meet our minimum age requirements."
      />
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
