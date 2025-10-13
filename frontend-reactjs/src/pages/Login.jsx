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

function generateBase32Secret(length = 16) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const output = [];
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const buffer = new Uint8Array(length);
    window.crypto.getRandomValues(buffer);
    for (let index = 0; index < buffer.length; index += 1) {
      const charIndex = buffer[index] % alphabet.length;
      output.push(alphabet[charIndex]);
    }
  } else {
    for (let index = 0; index < length; index += 1) {
      const randomIndex = Math.floor(Math.random() * alphabet.length);
      output.push(alphabet[randomIndex]);
    }
  }
  return output.join('');
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    emailCode: '',
    googleCode: '',
    deviceLabel: '',
    twoFactorMethod: 'google-authenticator'
  });
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState(null);

  const totpSecret = useMemo(() => generateBase32Secret(16), []);
  const issuer = 'Edulure';
  const otpauthUrl = useMemo(() => {
    const identifier = formState.email || 'user@edulure.com';
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(identifier)}?secret=${totpSecret}&issuer=${encodeURIComponent(issuer)}`;
  }, [formState.email, totpSecret]);
  const qrCodeUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`,
    [otpauthUrl]
  );

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
      await login({
        email: formState.email,
        password: formState.password,
        emailCode: formState.emailCode,
        totpCode: formState.googleCode,
        twoFactorMethod: formState.twoFactorMethod,
        deviceLabel: formState.deviceLabel,
        rememberDevice
      });
      navigate('/content');
    } catch (err) {
      setError(err.message ?? 'Unable to sign in. Please try again.');
    }
  };

  return (
    <AuthCard
      title="Welcome back to Edulure"
      subtitle="Securely access your learning operating system with MFA across email, Google Authenticator, and enterprise SSO."
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
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Email one-time passcode"
              name="emailCode"
              placeholder="Enter 6-digit code"
              value={formState.emailCode}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9]{6}"
              helper="Check your inbox for the emailed passcode."
            />
            <FormField
              label="Authenticator code"
              name="googleCode"
              placeholder="Enter 6-digit code"
              value={formState.googleCode}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9]{6}"
              helper="Generated in Google Authenticator, Authy, or 1Password."
            />
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-600">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preferred MFA method</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600">
                    <input
                      type="radio"
                      name="twoFactorMethod"
                      value="google-authenticator"
                      checked={formState.twoFactorMethod === 'google-authenticator'}
                      onChange={handleChange}
                    />
                    Google Authenticator
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600">
                    <input
                      type="radio"
                      name="twoFactorMethod"
                      value="email"
                      checked={formState.twoFactorMethod === 'email'}
                      onChange={handleChange}
                    />
                    Email OTP
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  id="remember-device"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={rememberDevice}
                  onChange={(event) => setRememberDevice(event.target.checked)}
                />
                <label htmlFor="remember-device" className="font-semibold">
                  Remember this device for 30 days
                </label>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField
                label="Trusted device label"
                name="deviceLabel"
                placeholder="e.g. MacBook Pro home"
                value={formState.deviceLabel}
                onChange={handleChange}
                helper="Shown in your security log so you can revoke sessions quickly."
              />
              <div className="rounded-2xl border border-primary/30 bg-white/80 p-4 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Scan to link Google Authenticator</p>
                <div className="mt-3 flex items-center gap-3">
                  <img src={qrCodeUrl} alt="Google Authenticator QR code" className="h-20 w-20 rounded-xl border border-slate-200 bg-white p-2" />
                  <div className="space-y-1">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">Secret: {totpSecret}</p>
                    <a
                      href={otpauthUrl}
                      className="inline-flex items-center gap-1 font-semibold text-primary"
                    >
                      Open in authenticator app
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M4.25 4A.75.75 0 0 0 3.5 4.75v10.5a.75.75 0 0 0 1.28.53l3.22-3.22 2.97 2.97a.75.75 0 1 0 1.06-1.06L10.06 11.5l3.22-3.22A.75.75 0 0 0 12.5 7H6.31l3.22-3.22A.75.75 0 1 0 8.47 2.72L4.72 6.47A.75.75 0 0 0 4.25 7Z" />
                      </svg>
                    </a>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Add the code above to Google Authenticator, Authy, 1Password, or Microsoft Authenticator to generate fresh 6-digit codes every 30 seconds.
                </p>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
          >
            {isLoading ? 'Authenticating…' : 'Log in securely'}
          </button>
          <div className="flex flex-wrap justify-between gap-4 text-sm text-slate-500">
            <Link to="/reset" className="font-semibold text-primary">
              Forgot password?
            </Link>
            <p>
              New to Edulure?{' '}
              <Link to="/register" className="font-semibold text-primary">
                Create your account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </AuthCard>
  );
}
