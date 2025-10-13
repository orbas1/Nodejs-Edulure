import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import { API_BASE_URL, httpClient } from '../api/httpClient.js';

const SOCIAL_ROUTES = {
  google: '/auth/oauth/google',
  apple: '/auth/oauth/apple',
  facebook: '/auth/oauth/facebook',
  linkedin: '/auth/oauth/linkedin'
};

const ROLE_OPTIONS = [
  { value: 'instructor', label: 'Instructor' },
  { value: 'user', label: 'Learner' },
  { value: 'admin', label: 'Administrator' }
];

const passwordHint = 'Use at least 12 characters with upper, lower, number, and symbol.';

export default function Register() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'instructor',
    age: '',
    address: ''
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (formState.password !== formState.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agreeToTerms) {
      setError('You must accept the terms to create an account.');
      return;
    }

    const ageValue = formState.age.trim();
    const age = ageValue ? Number.parseInt(ageValue, 10) : undefined;
    if (ageValue && Number.isNaN(age)) {
      setError('Age must be a number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await httpClient.post('/auth/register', {
        firstName: formState.firstName,
        lastName: formState.lastName,
        email: formState.email,
        password: formState.password,
        role: formState.role,
        ...(age ? { age } : {}),
        ...(formState.address.trim() ? { address: formState.address.trim() } : {})
      });
      setSuccess('Account created. Check your inbox to verify your email before signing in.');
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Unable to create your account right now.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your Edulure workspace"
      subtitle="Tell us about yourself so we can tailor onboarding for your communities, instructors, and learners."
    >
      <div className="space-y-8">
        <SocialSignOn onSelect={handleSocialSignOn} />
        <div className="relative flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">or continue with credentials</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
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
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Age"
              name="age"
              type="number"
              placeholder="Optional"
              value={formState.age}
              onChange={handleChange}
              min="16"
            />
            <FormField label="Address" name="address">
              <textarea
                name="address"
                value={formState.address}
                onChange={handleChange}
                rows={3}
                placeholder="Optional"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
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
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
          >
            {isSubmitting ? 'Creating account…' : 'Launch workspace'}
          </button>
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </AuthCard>
  );
}
