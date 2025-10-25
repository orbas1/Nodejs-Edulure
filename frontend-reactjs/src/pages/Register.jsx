import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AuthForm from '../components/auth/AuthForm.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import usePageMetadata from '../hooks/usePageMetadata.js';
import { fetchPasswordPolicy } from '../api/authApi.js';
import { API_BASE_URL, httpClient } from '../api/httpClient.js';
import {
  DEFAULT_PASSWORD_POLICY,
  EMAIL_PATTERN,
  evaluatePasswordStrength,
  normalisePasswordPolicy
} from '../utils/validation/auth.js';
import {
  trackAuthAttempt,
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
  { value: 'learner', label: "I'm learning" },
  { value: 'instructor', label: "I'm teaching" }
];

function calculateAge(dateString) {
  if (!dateString) {
    return null;
  }
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
}

export default function Register() {
  const navigate = useNavigate();
  usePageMetadata({
    title: 'Create your Edulure account',
    description:
      'Register in minutes to access Edulure courses, communities, live classrooms, and analytics dashboards with built-in security controls.',
    canonicalPath: '/register',
    robots: 'noindex, nofollow',
    analytics: {
      page_type: 'register'
    }
  });

  const [passwordPolicy, setPasswordPolicy] = useState(DEFAULT_PASSWORD_POLICY);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: ROLE_OPTIONS[0].value,
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    wantsTwoFactor: true,
    termsAccepted: false
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackAuthView('register', {
      simplified: true,
      social_providers: Object.keys(SOCIAL_ROUTES).length
    });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetchPasswordPolicy();
        if (!active) return;
        setPasswordPolicy(normalisePasswordPolicy(response?.policy ?? response));
      } catch (_err) {
        // keep fallback policy
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const passwordAssessment = useMemo(
    () => evaluatePasswordStrength(form.password, passwordPolicy),
    [form.password, passwordPolicy]
  );

  const oauthBase = useMemo(() => {
    if (!API_BASE_URL) return '';
    return API_BASE_URL.replace(/\/$/, '').replace(/\/?api$/, '');
  }, []);

  const maxBirthDate = useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleRoleChange = (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, role: value }));
    setErrors((prev) => ({ ...prev, role: undefined }));
    trackAuthInteraction('register', 'role_change', { role: value });
  };

  const toggleTwoFactor = () => {
    setForm((prev) => {
      const next = !prev.wantsTwoFactor;
      trackAuthInteraction('register', 'two_factor_toggle', { next });
      return { ...prev, wantsTwoFactor: next };
    });
  };

  const handleTermsChange = (event) => {
    const { checked } = event.target;
    setForm((prev) => ({ ...prev, termsAccepted: checked }));
    setErrors((prev) => ({ ...prev, termsAccepted: undefined }));
  };

  const handleNavigateToLogin = useCallback(() => {
    trackNavigationSelect('auth:login', { from: 'register' });
  }, []);

  const handleSocialSignOn = useCallback(
    (provider) => {
      const route = SOCIAL_ROUTES[provider];
      if (!route) return;
      trackAuthAttempt('register', 'social_redirect', {
        provider,
        destination: route
      });
      if (typeof window !== 'undefined') {
        window.location.assign(`${oauthBase}${route}`);
      }
    },
    [oauthBase]
  );

  const validateForm = useCallback(() => {
    const nextErrors = {};
    const trimmedFirstName = form.firstName.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!trimmedFirstName) {
      nextErrors.firstName = 'Enter your first name so we can personalise onboarding.';
    }
    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!passwordAssessment.isCompliant) {
      nextErrors.password = passwordAssessment.description;
    }
    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords must match.';
    }
    if (!form.termsAccepted) {
      nextErrors.termsAccepted = 'You must accept the terms to continue.';
    }
    let derivedAge = null;
    if (form.dateOfBirth) {
      derivedAge = calculateAge(form.dateOfBirth);
      if (derivedAge === null) {
        nextErrors.dateOfBirth = 'Enter a valid date of birth.';
      } else if (derivedAge < 16) {
        nextErrors.dateOfBirth = 'You must be at least 16 years old to create an account.';
      }
    }
    if (!['learner', 'instructor'].includes(form.role)) {
      nextErrors.role = 'Select the option that best describes how you will use Edulure.';
    }
    setErrors(nextErrors);
    return { isValid: Object.keys(nextErrors).length === 0, derivedAge, errorCount: Object.keys(nextErrors).length };
  }, [form, passwordAssessment]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const { isValid, derivedAge, errorCount } = validateForm();
    if (!isValid) {
      trackAuthAttempt('register', 'validation_error', {
        error_count: errorCount || 1,
        role: form.role
      });
      setError('Please review the highlighted fields.');
      return;
    }

    trackAuthAttempt('register', 'submit', {
      role: form.role,
      two_factor_enabled: form.wantsTwoFactor
    });

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      role: form.role === 'instructor' ? 'instructor' : 'user',
      twoFactor: { enabled: Boolean(form.wantsTwoFactor) }
    };

    if (typeof derivedAge === 'number') {
      payload.age = derivedAge;
    }

    try {
      setIsSubmitting(true);
      const response = await httpClient.post('/auth/register', payload);
      const result = response?.data ?? {};
      const verificationStatus = result.verification?.status ?? 'pending';
      setSuccess(
        verificationStatus === 'pending'
          ? 'Account created. Check your email to verify your address before signing in.'
          : 'Account created successfully.'
      );
      trackAuthAttempt('register', 'success', {
        role: form.role,
        verification_status: verificationStatus,
        two_factor_enabled: Boolean(result.twoFactor?.enabled ?? form.wantsTwoFactor)
      });
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      const message =
        err?.original?.response?.data?.message ?? err?.message ?? 'Unable to create your account right now.';
      setError(message);
      trackAuthAttempt('register', 'failure', {
        role: form.role,
        code: err?.original?.response?.data?.code ?? err?.code ?? 'unknown'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthForm
      title="Create your Edulure account"
      subtitle="Kick off in minutes with one streamlined form—no endless onboarding wizard."
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? 'Creating account…' : 'Create account'}
      busy={isSubmitting}
      error={error}
      success={success}
      passwordChecklist={{
        requirements: passwordAssessment.requirements,
        description: passwordAssessment.description
      }}
      actions={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary" onClick={handleNavigateToLogin}>
            Sign in
          </Link>
          .
        </span>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AuthForm.Field
          label="First name"
          name="firstName"
          placeholder="Alex"
          value={form.firstName}
          onChange={handleInputChange}
          error={errors.firstName}
          required
        />
        <AuthForm.Field
          label="Last name"
          name="lastName"
          placeholder="Morgan"
          value={form.lastName}
          onChange={handleInputChange}
          required={false}
        />
      </div>
      <AuthForm.Field
        label="Email address"
        type="email"
        name="email"
        placeholder="you@company.com"
        value={form.email}
        onChange={handleInputChange}
        error={errors.email}
        required
      />
      <AuthForm.Field
        label="Date of birth"
        type="date"
        name="dateOfBirth"
        value={form.dateOfBirth}
        onChange={handleInputChange}
        error={errors.dateOfBirth}
        required={false}
        helper="Used to confirm you meet our minimum age requirement."
        max={maxBirthDate}
      />
      <AuthForm.Field label="Role" name="role" error={errors.role} required>
        <select name="role" value={form.role} onChange={handleRoleChange} className="form-field__input">
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </AuthForm.Field>
      <AuthForm.Field
        label="Password"
        type="password"
        name="password"
        value={form.password}
        onChange={handleInputChange}
        placeholder="Create a secure password"
        required
        error={errors.password}
      />
      <AuthForm.Field
        label="Confirm password"
        type="password"
        name="confirmPassword"
        value={form.confirmPassword}
        onChange={handleInputChange}
        placeholder="Re-enter your password"
        required
        error={errors.confirmPassword}
      />
      <div className="form-section space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">Multi-factor authentication</p>
            <p className="form-field__helper">
              Secure your account with email-delivered one-time passcodes. Recommended for all creators.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.wantsTwoFactor}
              onClick={toggleTwoFactor}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 ${
                form.wantsTwoFactor ? 'bg-primary' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition ${
                  form.wantsTwoFactor ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-semibold text-slate-600">
              {form.wantsTwoFactor ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          checked={form.termsAccepted}
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
            or continue with
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <SocialSignOn onSelect={handleSocialSignOn} />
      </div>
    </AuthForm>
  );
}
