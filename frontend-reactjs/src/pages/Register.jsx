import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AuthForm from '../components/auth/AuthForm.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import { API_BASE_URL, httpClient } from '../api/httpClient.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import useOnboardingForm from '../hooks/useOnboardingForm.js';
import { fetchPasswordPolicy } from '../api/authApi.js';
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
  const [passwordPolicy, setPasswordPolicy] = useState(DEFAULT_PASSWORD_POLICY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
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
      page_type: 'register'
    }
  });

  useEffect(() => {
    trackAuthView('register', {
      default_role: defaultRole,
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
      has_date_of_birth: Boolean(cleaned.dateOfBirth)
    });

    try {
      setIsSubmitting(true);
      await httpClient.post('/dashboard/learner/onboarding/bootstrap', onboardingPayload);

      const finalRegisterPayload = {
        ...registerPayload,
        role: cleaned.role
      };

      const response = await httpClient.post('/auth/register', finalRegisterPayload);
      const result = response?.data ?? {};
      const verificationStatus = result.verification?.status ?? null;
      const baseMessage =
        verificationStatus === 'pending'
          ? 'Account created. Check your inbox to verify your email before signing in.'
          : 'Account created successfully.';
      const followUpMessage =
        ' Once you have access, visit Settings → Security to enable multi-factor authentication for extra protection.';
      trackAuthAttempt('register', 'success', {
        role: cleaned.role,
        verification_status: verificationStatus ?? 'unknown'
      });
      setSuccess(`${baseMessage}${followUpMessage}`.trim());
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
