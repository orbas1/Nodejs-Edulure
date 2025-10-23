import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import AuthForm from '../components/auth/AuthForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE_URL } from '../api/httpClient.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import { validateLogin } from '../utils/validation/auth.js';

const SOCIAL_ROUTES = {
  google: '/auth/oauth/google',
  apple: '/auth/oauth/apple',
  facebook: '/auth/oauth/facebook',
  linkedin: '/auth/oauth/linkedin'
};

const EMAIL_CODE_TTL_MINUTES = 5;

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [rememberMe, setRememberMe] = useState(true);
  const [isTwoFactorRequired, setIsTwoFactorRequired] = useState(false);
  const [showTwoFactorInput, setShowTwoFactorInput] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState({ message: null, tone: 'info' });

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
      if (typeof window !== 'undefined') {
        window.location.assign(destination);
      }
    },
    [oauthBase]
  );

  const handleSubmit = useCallback(
    async (values) => {
      setTwoFactorStatus({ message: null, tone: 'info' });
      try {
        const payload = {
          email: values.email,
          password: values.password,
          ...(showTwoFactorInput && values.twoFactorCode
            ? { twoFactorCode: values.twoFactorCode.trim() }
            : {})
        };
        await login(payload);
        navigate('/feed', { replace: true });
        setIsTwoFactorRequired(false);
        setShowTwoFactorInput(false);
        return {};
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
          setTwoFactorStatus({ message: deliveredMessage, tone: 'info' });
          return { status: 'handled' };
        }
        if (code === 'TWO_FACTOR_INVALID') {
          setShowTwoFactorInput(true);
          setIsTwoFactorRequired(true);
          setTwoFactorStatus({
            message: 'That email security code was invalid or expired. Request a new code and try again.',
            tone: 'error'
          });
          return {
            errors: { twoFactorCode: 'Enter the code exactly as it appears in your email' },
            formError: 'Check the code we sent and try again.'
          };
        }
        if (code === 'TWO_FACTOR_SETUP_REQUIRED') {
          setShowTwoFactorInput(true);
          setIsTwoFactorRequired(true);
          setTwoFactorStatus({
            message: 'Multi-factor email codes must be configured before access. Check your security settings.',
            tone: 'warning'
          });
          return { status: 'handled' };
        }
        setTwoFactorStatus({ message: null, tone: 'info' });
        return { formError: message };
      }
    },
    [login, navigate, showTwoFactorInput]
  );

  const formFields = useMemo(
    () => [
      {
        name: 'email',
        label: 'Email address',
        type: 'email',
        placeholder: 'you@company.com',
        autoComplete: 'email',
        required: true
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: '••••••••',
        autoComplete: 'current-password',
        required: true,
        helper: 'Use the password you created when registering your Learnspace.'
      },
      {
        name: 'twoFactorCode',
        label: 'Email security code',
        placeholder: '123456',
        hidden: !showTwoFactorInput,
        inputMode: 'numeric',
        pattern: '\\d{6,10}',
        helper: '6-digit code sent to your Edulure email',
        render: ({ value, error, onChange }) => (
          <FormField
            label="Email security code"
            name="twoFactorCode"
            placeholder="123456"
            value={(value ?? '').replace(/[^0-9]/g, '')}
            onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            pattern="\\d{6,10}"
            required={isTwoFactorRequired}
            helper="6-digit code sent to your Edulure email"
            error={error}
          />
        )
      }
    ],
    [showTwoFactorInput, isTwoFactorRequired]
  );

  return (
    <AuthCard title="Welcome back" subtitle="Please sign in with your email address or choose a social account.">
      <div className="space-y-8">
        <AuthForm
          fields={formFields}
          initialValues={{ email: '', password: '', twoFactorCode: '' }}
          validator={(values) => validateLogin(values)}
          onSubmit={handleSubmit}
          submitLabel="Log in securely"
          busyLabel="Authenticating…"
          isSubmitting={isLoading}
          status={twoFactorStatus.message}
          statusTone={twoFactorStatus.tone}
          afterFields={
            <div className="space-y-4">
              {showTwoFactorInput ? (
                <div className="rounded-3xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-slate-600 shadow-inner">
                  <p className="font-semibold text-primary">Multi-factor verification</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the six-digit code we emailed to you. Codes expire after {EMAIL_CODE_TTL_MINUTES} minutes and should be
                    entered without spaces.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTwoFactorInput(true)}
                  className="text-xs font-semibold text-primary transition hover:text-primary-dark"
                >
                  Have an email code?
                </button>
              )}
              <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
            </div>
          }
          footer={
            <div className="space-y-4">
              <div className="relative flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  or try an alternative login
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <SocialSignOn onSelect={handleSocialSignOn} />
              <div className="text-sm text-slate-500">
                New to Edulure?{' '}
                <Link to="/register" className="font-semibold text-primary">
                  Create your account
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AuthCard>
  );
}
