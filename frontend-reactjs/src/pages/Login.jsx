import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE_URL } from '../api/httpClient.js';

const SOCIAL_ROUTES = {
  google: '/auth/oauth/google',
  apple: '/auth/oauth/apple',
  facebook: '/auth/oauth/facebook',
  linkedin: '/auth/oauth/linkedin'
};

const OTP_STEP_SECONDS = 30;

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [isTwoFactorRequired, setIsTwoFactorRequired] = useState(false);
  const [showTwoFactorInput, setShowTwoFactorInput] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

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
    try {
      const payload = {
        email: formState.email,
        password: formState.password,
        ...(showTwoFactorInput && twoFactorCode.trim()
          ? { twoFactorCode: twoFactorCode.trim() }
          : {})
      };
      await login(payload);
      navigate('/content');
      setTwoFactorCode('');
      setIsTwoFactorRequired(false);
      setShowTwoFactorInput(false);
    } catch (err) {
      const message =
        err?.original?.response?.data?.message ?? err?.message ?? 'Unable to sign in. Please try again.';
      const code = err?.original?.response?.data?.code ?? err?.code;
      if (code === 'TWO_FACTOR_REQUIRED') {
        setShowTwoFactorInput(true);
        setIsTwoFactorRequired(true);
        setError('Enter the 6-digit code from your authenticator app to continue.');
        return;
      }
      if (code === 'TWO_FACTOR_INVALID') {
        setShowTwoFactorInput(true);
        setIsTwoFactorRequired(true);
        setError('The security code was invalid or expired. Please try again.');
        return;
      }
      if (code === 'TWO_FACTOR_SETUP_REQUIRED') {
        setShowTwoFactorInput(true);
        setIsTwoFactorRequired(true);
        setError('Multi-factor authentication must be configured before access. Check your security settings.');
        return;
      }
      setError(message);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Please sign in with your email address or choose a social account.">
      <div className="space-y-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <FormField
            label="Email address"
            type="email"
            name="email"
            value={formState.email}
            onChange={handleChange}
            placeholder="you@company.com"
            required
          />
          <FormField
            label="Password"
            type="password"
            name="password"
            value={formState.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            helper="Use the password you created when registering your workspace."
          />
          <div className="space-y-3">
            {showTwoFactorInput ? (
              <div className="rounded-3xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-slate-600 shadow-inner">
                <p className="font-semibold text-primary">Multi-factor verification</p>
                <p className="mt-1 text-xs text-slate-500">
                  Enter the one-time code from your authenticator app. Codes refresh every {OTP_STEP_SECONDS} seconds and
                  should be entered without spaces.
                </p>
              </div>
            ) : null}
            {showTwoFactorInput ? (
              <FormField
                label="Authenticator code"
                name="twoFactorCode"
                placeholder="123 456"
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                pattern="\d{6,10}"
                required={isTwoFactorRequired}
                helper="6-digit code generated by your authenticator"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowTwoFactorInput(true)}
                className="text-xs font-semibold text-primary transition hover:text-primary-dark"
              >
                Have an authenticator code?
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span className="font-semibold">Remember this device</span>
            </label>
            <Link to="/reset" className="font-semibold text-primary">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
          >
            {isLoading ? 'Authenticating…' : 'Log in securely'}
          </button>
          <div className="relative flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <SocialSignOn onSelect={handleSocialSignOn} />
          <div className="text-sm text-slate-500">
            New to Edulure?{' '}
            <Link to="/register" className="font-semibold text-primary">
              Create your account
            </Link>
          </div>
        </form>
      </div>
    </AuthCard>
  );
}
