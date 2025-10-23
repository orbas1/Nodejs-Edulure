import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import { API_BASE_URL, httpClient } from '../api/httpClient.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import OnboardingFormLayout from '../components/onboarding/OnboardingFormLayout.jsx';
import { createRegistrationPayload } from '../utils/validation/onboarding.js';

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
  const [formErrors, setFormErrors] = useState({});

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
    setFormErrors((prev) => ({ ...prev, [name]: undefined, ...(name === 'password' ? { confirmPassword: undefined } : {}) }));
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
    setFormErrors((prev) => ({ ...prev, address: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setTwoFactorEnrollment(null);

    const { errors, payload } = createRegistrationPayload(formState, {
      requireTermsAcceptance: true,
      acceptedTerms: agreeToTerms,
      twoFactor: { locked: twoFactorLocked, enabled: twoFactorEnabled }
    });

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      setError(errors.agreeToTerms ?? 'Review the highlighted fields to continue.');
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    try {
      const response = await httpClient.post('/auth/register', payload);
      const result = response?.data ?? {};
      setTwoFactorEnrollment(result.twoFactor ?? null);
      if (result.twoFactor?.enabled) {
        setTwoFactorEnabled(true);
        setTwoFactorLocked(Boolean(result.twoFactor.enforced));
      }
      const verificationStatus = result.verification?.status ?? null;
      const baseMessage =
        verificationStatus === 'pending'
          ? 'Account created. Check your inbox to verify your email—verification continues in the background so you can keep exploring.'
          : 'Account created. You can sign in right away.';
      const securityMessage = result.twoFactor?.enabled
        ? ' Email one-time codes are now active and will be sent whenever you sign in.'
        : '';
      setSuccess(`${baseMessage}${securityMessage}`.trim());
      setFormErrors({});
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
    <div className="bg-slate-100 py-16">
      <div className="mx-auto max-w-5xl px-4">
        <OnboardingFormLayout
          title="Create your Edulure Learnspace"
          description="Tell us about yourself so we can tailor onboarding for your communities, instructors, and learners."
          highlights={[
            'Enterprise-grade security with SSO and audit trails',
            'Role-based access controls tuned for learning operators',
            'Human support that responds within the hour'
          ]}
          aside={
            <div className="space-y-4 text-sm text-slate-600">
              <p>{ADMIN_REQUEST_NOTE}</p>
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary">
                  Sign in
                </Link>
              </p>
            </div>
          }
        >
          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
          {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</p> : null}

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

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="First name"
                name="firstName"
                placeholder="Alex"
                value={formState.firstName}
                onChange={handleChange}
                required
                error={formErrors.firstName}
              />
              <FormField
                label="Last name"
                name="lastName"
                placeholder="Morgan"
                value={formState.lastName}
                onChange={handleChange}
                required
                error={formErrors.lastName}
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
              error={formErrors.email}
            />
            <FormField
              label="Role"
              name="role"
              value={formState.role}
              onChange={handleChange}
              required
              helper="Choose how you plan to use Edulure so we can tailor the dashboard."
            >
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
            </FormField>
            <FormField
              label="Age (optional)"
              name="age"
              placeholder="Your age"
              value={formState.age}
              onChange={handleChange}
              required={false}
              helper="Used only to personalise recommendations."
              error={formErrors.age}
            />

            <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-5 shadow-inner">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Multi-factor authentication</p>
                  <p className="text-xs text-slate-500">
                    Secure your account with email-delivered one-time passcodes.{' '}
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
                    We will send a six-digit security code to {formState.email || 'your email'} on every sign in. Check your inbox
                    (and spam folder) when prompted.
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Address (optional)</p>
                  <p className="text-xs text-slate-500">
                    Provide as much detail as possible to help us tailor regional onboarding.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-primary"
                  onClick={() =>
                    setFormState((prev) => ({
                      ...prev,
                      address: { ...prev.address, streetAddress: '', addressLine2: '', town: '', city: '', country: '', postcode: '' }
                    }))
                  }
                >
                  Clear
                </button>
              </div>
              {formErrors.address ? (
                <p className="text-xs font-semibold text-rose-600">{formErrors.address}</p>
              ) : null}
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
              error={formErrors.password}
            />
            <FormField
              label="Confirm password"
              type="password"
              name="confirmPassword"
              value={formState.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              error={formErrors.confirmPassword}
            />

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
                {formErrors.agreeToTerms ? (
                  <span className="mt-1 block text-xs font-semibold text-rose-600">{formErrors.agreeToTerms}</span>
                ) : null}
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
        </OnboardingFormLayout>
      </div>
    </div>
  );

}
