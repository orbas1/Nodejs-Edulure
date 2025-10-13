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

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);

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
      await login({ email: formState.email, password: formState.password });
      navigate('/content');
    } catch (err) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Unable to sign in. Please try again.';
      setError(message);
    }
  };

  return (
    <AuthCard
      title="Welcome back to Edulure"
      subtitle="Securely access your workspace with your email and password or continue with social sign-on."
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
