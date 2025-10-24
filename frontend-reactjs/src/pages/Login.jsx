import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AuthForm from '../components/auth/AuthForm.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE_URL } from '../api/httpClient.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import { createLoginState, validateLoginState } from '../utils/validation/auth.js';
import { trackAuthAttempt, trackAuthInteraction, trackAuthView } from '../lib/analytics.js';

const SOCIAL_ROUTES = {
  google: '/auth/oauth/google',
  apple: '/auth/oauth/apple',
  facebook: '/auth/oauth/facebook',
  linkedin: '/auth/oauth/linkedin'
};

const EMAIL_CODE_TTL_MINUTES = 5;
const TWO_FACTOR_FIELD_ID = 'login-two-factor-code';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [formState, setFormState] = useState(() => createLoginState());
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isTwoFactorRequired, setIsTwoFactorRequired] = useState(false);
  const [showTwoFactorInput, setShowTwoFactorInput] = useState(false);
  const lastTwoFactorStatus = useRef(null);

  usePageMetadata({
    title: 'Secure login · Edulure',
    description:
      'Sign in to Edulure with email, password, or enterprise social providers. Multi-factor authentication enforced for sensitive roles.',
    canonicalPath: '/login',
    robots: 'noindex, nofollow',
    analytics: {
      page_type: 'login'
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
      trackAuthAttempt('login', 'social_redirect', {
        provider,
        destination: route
      });
      if (typeof window !== 'undefined') {
        window.location.assign(destination);
      }
    },
    [oauthBase]
  );

  useEffect(() => {
    trackAuthView('login', {
      social_providers: Object.keys(SOCIAL_ROUTES).length,
      has_remember_me: true
    });
  }, []);

  useEffect(() => {
    if (!showTwoFactorInput) {
      lastTwoFactorStatus.current = null;
      return;
    }
    if (lastTwoFactorStatus.current === 'focused') {
      return;
    }
    const input = document.getElementById(TWO_FACTOR_FIELD_ID);
    if (input) {
      input.focus();
      lastTwoFactorStatus.current = 'focused';
    }
  }, [showTwoFactorInput]);

  const updateField = useCallback((name, value) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev || !prev[name]) {
        return prev;
      }
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const validation = validateLoginState(formState, { requireTwoFactor: isTwoFactorRequired });
    setFieldErrors(validation.errors);
    if (!validation.isValid) {
      setFormError('Please review the highlighted fields and try again.');
      trackAuthAttempt('login', 'validation_error', {
        method: 'password',
        error_count: Object.keys(validation.errors ?? {}).length
      });
      return;
    }

    trackAuthAttempt('login', 'submit', {
      method: 'password',
      has_two_factor_code: Boolean(validation.cleaned.twoFactorCode),
      remember_me: Boolean(validation.cleaned.rememberMe)
    });

    try {
      const payload = {
        email: validation.cleaned.email,
        password: validation.cleaned.password,
        ...(validation.cleaned.twoFactorCode ? { twoFactorCode: validation.cleaned.twoFactorCode } : {})
      };

      await login(payload);
      navigate('/feed', { replace: true });
      setFormState(() => createLoginState({ rememberMe: validation.cleaned.rememberMe }));
      setIsTwoFactorRequired(false);
      setShowTwoFactorInput(false);
      trackAuthAttempt('login', 'success', {
        method: 'password',
        two_factor_challenge: Boolean(validation.cleaned.twoFactorCode)
      });
    } catch (err) {
      const message =
        err?.original?.response?.data?.message ?? err?.message ?? 'Unable to sign in. Please try again.';
      const code = err?.original?.response?.data?.code ?? err?.code;

      if (code === 'TWO_FACTOR_REQUIRED') {
        const details = err?.original?.response?.data?.details ?? {};
        const deliveredMessage =
          details.delivered === false
            ? 'We recently sent a code. Please wait for the resend window and check your inbox.'
            : 'We just emailed you a six-digit security code. Enter it below to continue.';
        setShowTwoFactorInput(true);
        setIsTwoFactorRequired(true);
        setFormError(deliveredMessage);
        trackAuthInteraction('login', 'two_factor_prompt', {
          reason: 'required',
          delivered: details.delivered !== false
        });
        return;
      }
      if (code === 'TWO_FACTOR_INVALID') {
        setShowTwoFactorInput(true);
        setIsTwoFactorRequired(true);
        setFormError('That email security code was invalid or expired. Request a new code and try again.');
        trackAuthInteraction('login', 'two_factor_prompt', { reason: 'invalid' });
        return;
      }
      if (code === 'TWO_FACTOR_SETUP_REQUIRED') {
        setShowTwoFactorInput(true);
        setIsTwoFactorRequired(true);
        setFormError('Multi-factor email codes must be configured before access. Check your security settings.');
        trackAuthInteraction('login', 'two_factor_prompt', { reason: 'setup_required' });
        return;
      }

      setFormError(message);
      trackAuthAttempt('login', 'failure', {
        method: 'password',
        code: code ?? 'unknown',
        two_factor_required: showTwoFactorInput || isTwoFactorRequired
      });
    }
  };

  useEffect(() => {
    if (!showTwoFactorInput) return;
    trackAuthInteraction('login', 'two_factor_visible', {
      has_code: Boolean(formState.twoFactorCode?.length),
      required: isTwoFactorRequired
    });
  }, [showTwoFactorInput, formState.twoFactorCode, isTwoFactorRequired]);

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Please sign in with your email address or choose a social account."
      onSubmit={handleSubmit}
      submitLabel={isLoading ? 'Authenticating…' : 'Log in securely'}
      busy={isLoading}
      error={formError}
      actions={
        <span>
          New to Edulure?{' '}
          <Link to="/register" className="font-semibold text-primary">
            Create your account
          </Link>
        </span>
      }
    >
      <AuthForm.Field
        label="Email address"
        type="email"
        name="email"
        value={formState.email}
        onChange={(event) => updateField(event.target.name, event.target.value)}
        placeholder="you@company.com"
        required
        error={fieldErrors.email}
      />
      <AuthForm.Field
        label="Password"
        type="password"
        name="password"
        value={formState.password}
        onChange={(event) => updateField(event.target.name, event.target.value)}
        placeholder="••••••••"
        required
        helper="Use the password you created when registering your Learnspace."
        error={fieldErrors.password}
      />
      <div className="space-y-3">
        {showTwoFactorInput ? (
          <div className="rounded-3xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-slate-600 shadow-inner">
            <p className="font-semibold text-primary">Multi-factor verification</p>
            <p className="mt-1 text-xs text-slate-500">
              Enter the six-digit code we emailed to you. Codes expire after {EMAIL_CODE_TTL_MINUTES} minutes and should be
              entered without spaces.
            </p>
          </div>
        ) : null}
        {showTwoFactorInput ? (
          <AuthForm.Field
            label="Email security code"
            name="twoFactorCode"
            placeholder="123456"
            value={formState.twoFactorCode}
            onChange={(event) => updateField(event.target.name, event.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            pattern="\d{6}"
            required={isTwoFactorRequired}
            helper="6-digit code sent to your Edulure email"
            error={fieldErrors.twoFactorCode}
            id={TWO_FACTOR_FIELD_ID}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowTwoFactorInput(true);
              trackAuthInteraction('login', 'two_factor_toggle', { source: 'manual' });
            }}
            className="text-xs font-semibold text-primary transition hover:text-primary-dark"
          >
            Have an email code?
          </button>
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            checked={formState.rememberMe}
            onChange={(event) => updateField('rememberMe', event.target.checked)}
          />
          <span className="font-semibold">Remember this device</span>
        </label>
        <Link to="/reset" className="font-semibold text-primary">
          Forgot password?
        </Link>
      </div>
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
