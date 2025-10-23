import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import { API_BASE_URL, httpClient } from '../api/httpClient.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import { validateRegisterForm } from '../utils/validation/onboarding.js';

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
  'Need administrator access? Contact your organisation\'s Edulure operations representative to provision it securely.';

const passwordHint = 'Use at least 12 characters with upper, lower, number, and symbol.';

export default function Register() {
  const navigate = useNavigate();
  const defaultRole = ROLE_OPTIONS[0]?.value ?? 'instructor';
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: defaultRole,
    age: '',
    address: {
      streetAddress: '',
      addressLine2: '',
      town: '',
      city: '',
      country: '',
      postcode: ''
    }
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(ENFORCED_TWO_FACTOR_ROLES.has(defaultRole));
  const [twoFactorLocked, setTwoFactorLocked] = useState(ENFORCED_TWO_FACTOR_ROLES.has(defaultRole));
  const [twoFactorEnrollment, setTwoFactorEnrollment] = useState(null);

  usePageMetadata({
    title: 'Create your Edulure account',
    description: 'Register to access Edulure courses, communities, live classrooms, and analytics dashboards with built-in security controls.',
    canonicalPath: '/register',
    robots: 'noindex, nofollow',
    analytics: {
      page_type: 'register',
      enforced_two_factor_roles: ENFORCED_TWO_FACTOR_ROLES.size
    }
  });

  const oauthBase = useMemo(() => {
    if (!API_BASE_URL) return '';
    return API_BASE_URL.replace(/\/$/, '').replace(/\/?api$/, '');
  }, []);

  const handleSocialSignOn = useCallback(
    (provider) => {
      const route = SOCIAL_ROUTES[provider];
      if (!route) return;
      const destination = `${oauthBase}${route}`;
      if (typeof window !== 'undefined') {
        window.location.assign(destination);
      }
    },
    [oauthBase]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (name === 'role') {
      const enforced = ENFORCED_TWO_FACTOR_ROLES.has(value);
      setTwoFactorLocked(enforced);
      setTwoFactorEnabled((prev) => (enforced ? true : prev));
      setTwoFactorEnrollment(null);
    }
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setTwoFactorEnrollment(null);

    setIsSubmitting(true);
    try {
      const { valid, errors, normalized } = validateRegisterForm(formState);

      if (!agreeToTerms) {
        throw new Error('You must accept the terms to create an account.');
      }

      if (!valid) {
        const [firstError] = Object.values(errors);
        throw new Error(firstError ?? 'Please resolve the highlighted form issues.');
      }

      const requestBody = {
        ...normalized,
        twoFactor: { enabled: twoFactorLocked ? true : twoFactorEnabled }
      };
      const response = await httpClient.post('/auth/register', requestBody);
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
      setSuccess(`${baseMessage}${securityMessage}`.trim());
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      const message =
        err?.original?.response?.data?.message ?? err?.message ?? 'Unable to create your account right now.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your Edulure Learnspace"
      subtitle="Tell us about yourself so we can tailor onboarding for your communities, instructors, and learners."
    >
      <div className="space-y-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {success ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="First name"
              name="firstName"
              placeholder="Alex"
              value={formState.firstName}
              onChange={handleChange}
              required
            />
            <FormField
              label="Last name"
              name="lastName"
              placeholder="Morgan"
              value={formState.lastName}
              onChange={handleChange}
              required
            />
          </div>
          <FormField
            label="Email address"
            type="email"
            name="email"
            placeholder="you@company.com"
            value={formState.email}
            onChange={handleChange}
            required
          />
          <FormField label="Role" name="role">
            <select
              name="role"
              value={formState.role}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">{ADMIN_REQUEST_NOTE}</p>
          </FormField>
          <FormField
            label="Age"
            name="age"
            type="number"
            placeholder="Optional"
            value={formState.age}
            onChange={handleChange}
            min="16"
            required={false}
          />
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-5 shadow-inner">
            <div>
              <p className="text-sm font-semibold text-slate-700">Address (optional)</p>
              <p className="text-xs text-slate-500">Provide as much detail as possible to help us tailor regional onboarding.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Street address"
                name="streetAddress"
                placeholder="123 Example Street"
                value={formState.address.streetAddress}
                onChange={handleAddressChange}
                required={false}
              />
              <FormField
                label="Address line 2"
                name="addressLine2"
                placeholder="Apartment, suite, etc."
                value={formState.address.addressLine2}
                onChange={handleAddressChange}
                required={false}
              />
              <FormField
                label="Town"
                name="town"
                placeholder="Town"
                value={formState.address.town}
                onChange={handleAddressChange}
                required={false}
              />
              <FormField
                label="City"
                name="city"
                placeholder="City"
                value={formState.address.city}
                onChange={handleAddressChange}
                required={false}
              />
              <FormField
                label="Country"
                name="country"
                placeholder="Country"
                value={formState.address.country}
                onChange={handleAddressChange}
                required={false}
              />
              <FormField
                label="Postcode"
                name="postcode"
                placeholder="Postal code"
                value={formState.address.postcode}
                onChange={handleAddressChange}
                required={false}
              />
            </div>
          </div>
          <FormField
            label="Password"
            type="password"
            name="password"
            value={formState.password}
            onChange={handleChange}
            placeholder="Create a secure password"
            required
            helper={passwordHint}
          />
          <FormField
            label="Confirm password"
            type="password"
            name="confirmPassword"
            value={formState.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            required
          />
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-5 shadow-inner">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">Multi-factor authentication</p>
                <p className="text-xs text-slate-500">
                  Secure your account with email-delivered one-time passcodes.{" "}
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
                    setTwoFactorEnabled((prev) => !prev);
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
              <p className="text-xs text-slate-400">
                Turn this on to have email one-time codes enabled right after registration.
              </p>
            ) : null}
          </div>
          {twoFactorEnrollment?.enabled ? (
            <div className="space-y-4 rounded-3xl border border-primary/30 bg-white/90 px-6 py-6 shadow-card ring-1 ring-primary/10">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-primary">Email codes are ready</p>
                <p className="text-xs text-slate-500">
                  We will send a six-digit security code to {formState.email || 'your email'} on every sign in. Check your inbox (and spam folder) when prompted.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
              >
                Proceed to secure login
              </button>
            </div>
          ) : null}
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              checked={agreeToTerms}
              onChange={(event) => setAgreeToTerms(event.target.checked)}
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
            </span>
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/40"
          >
            {isSubmitting ? 'Creating account…' : 'Launch Learnspace'}
          </button>
        </form>
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
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
