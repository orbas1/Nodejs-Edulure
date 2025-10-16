import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { fetchIntegrationInvite, submitIntegrationInvite } from '../api/integrationInviteApi.js';

function formatDisplayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function IntegrationCredentialInvite() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invite, setInvite] = useState(null);
  const [prefilledInviteId, setPrefilledInviteId] = useState(null);
  const [form, setForm] = useState({
    key: '',
    rotationIntervalDays: '',
    keyExpiresAt: '',
    actorEmail: '',
    actorName: '',
    reason: ''
  });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!token) {
      setError(new Error('Invitation token is required'));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetchIntegrationInvite({ token, signal: controller.signal })
      .then((data) => {
        setInvite(data ?? null);
        setError(null);
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || err?.message === 'canceled') {
          return;
        }
        setError(err instanceof Error ? err : new Error('Unable to load invitation'));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!invite) {
      return;
    }

    if (prefilledInviteId === invite.id) {
      return;
    }

    const rotationPrefill = invite.rotationIntervalDays ? String(invite.rotationIntervalDays) : '';
    const expiryPrefill = invite.keyExpiresAt ? invite.keyExpiresAt.slice(0, 10) : '';

    setForm((prev) => ({
      ...prev,
      rotationIntervalDays: rotationPrefill,
      keyExpiresAt: expiryPrefill,
      reason: invite.reason ?? prev.reason ?? '',
      actorEmail: invite.ownerEmail ?? prev.actorEmail ?? ''
    }));
    setPrefilledInviteId(invite.id);
  }, [invite, prefilledInviteId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) return;

    const trimmedKey = form.key.trim();
    if (trimmedKey.length < 20) {
      setStatus('error');
      setMessage('API key must be at least 20 characters long.');
      return;
    }

    setStatus('submitting');
    setMessage(null);

    try {
      const payload = await submitIntegrationInvite({
        token,
        key: trimmedKey,
        rotationIntervalDays: form.rotationIntervalDays || undefined,
        keyExpiresAt: form.keyExpiresAt || undefined,
        actorEmail: form.actorEmail?.trim() || undefined,
        actorName: form.actorName?.trim() ?? '',
        reason: form.reason?.trim() || undefined
      });
      setStatus('success');
      setMessage('Credential received. Our operations team will verify encryption and confirm rotation.');
      if (payload?.invite) {
        setInvite(payload.invite);
      }
      setForm({
        key: '',
        rotationIntervalDays: invite?.rotationIntervalDays ?? '',
        keyExpiresAt: invite?.keyExpiresAt ? invite.keyExpiresAt.slice(0, 10) : '',
        actorEmail: form.actorEmail,
        actorName: form.actorName,
        reason: form.reason
      });
    } catch (err) {
      setStatus('error');
      setMessage(err?.message ?? 'Unable to submit credential');
    }
  };

  const inviteExpiryDescription = useMemo(() => {
    if (!invite?.expiresAt) {
      return 'Invitation expiry is configured by your Edulure administrator.';
    }
    const expires = new Date(invite.expiresAt);
    if (Number.isNaN(expires.getTime())) {
      return 'Invitation expiry is configured by your Edulure administrator.';
    }
    return `Invitation expires on ${expires.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })}.`;
  }, [invite]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-600">
        Validating invitation…
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error?.message ?? 'This invitation is no longer active.'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Provide secure credential</h1>
          <p className="text-sm text-slate-600">
            Submit the {invite.providerLabel} API key for the <strong>{invite.alias}</strong> integration. The secret is encrypted on receipt and
            masked from administrators.
          </p>
          <p className="text-xs text-slate-500">
            The Edulure integrations team cannot view the value you provide. The key is stored in a hardware-backed vault and surfaced only to
            automated services.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</dt>
              <dd className="text-sm font-medium text-slate-800">{invite.providerLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Environment</dt>
              <dd className="text-sm font-medium text-slate-800">{invite.environment}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rotation cadence</dt>
              <dd className="text-sm font-medium text-slate-800">
                {invite.rotationIntervalDays ? `${invite.rotationIntervalDays} days` : 'Defined by security policy'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invitation expires</dt>
              <dd className="text-sm font-medium text-slate-800">{formatDisplayDate(invite.expiresAt)}</dd>
            </div>
          </dl>
          {invite.reason && (
            <p className="mt-3 text-xs text-slate-500">Reason: {invite.reason}</p>
          )}
          <p className="mt-3 text-xs text-slate-500">{inviteExpiryDescription}</p>
        </section>

        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-700">
          <p className="font-semibold">How this works</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Paste the live API key directly into the field below—avoid sharing it in email or chat.</li>
            <li>
              Once submitted the key is encrypted with the Edulure tenant vault. Only automation workloads can decrypt it for outbound calls.
            </li>
            <li>
              You will receive an acknowledgement from the integrations team if additional verification or rotation scheduling is required.
            </li>
          </ul>
        </section>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invite-key">
              API key
            </label>
            <textarea
              id="invite-key"
              value={form.key}
              onChange={(event) => handleChange('key', event.target.value)}
              className="h-32 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Paste your provider secret"
              required
              spellCheck="false"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invite-rotation">
                Rotation cadence (days)
              </label>
              <input
                id="invite-rotation"
                type="number"
                min={30}
                max={365}
                value={form.rotationIntervalDays}
                onChange={(event) => handleChange('rotationIntervalDays', event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder={invite.rotationIntervalDays ? String(invite.rotationIntervalDays) : 'Use default cadence'}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invite-expiry">
                Key expiry (optional)
              </label>
              <input
                id="invite-expiry"
                type="date"
                value={form.keyExpiresAt}
                onChange={(event) => handleChange('keyExpiresAt', event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invite-email">
                Your email (optional)
              </label>
              <input
                id="invite-email"
                type="email"
                value={form.actorEmail}
                onChange={(event) => handleChange('actorEmail', event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invite-name">
                Your name (optional)
              </label>
              <input
                id="invite-name"
                value={form.actorName}
                onChange={(event) => handleChange('actorName', event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Full name"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invite-reason">
              Notes for operations (optional)
            </label>
            <textarea
              id="invite-reason"
              value={form.reason}
              onChange={(event) => handleChange('reason', event.target.value)}
              className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Add context for the rotation"
            />
          </div>
          {message && (
            <p className={`text-xs ${status === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</p>
          )}
          {status === 'success' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Next steps</p>
              <p className="mt-1">
                Operations will validate connectivity using this credential. If rotation reminders were requested you will receive calendar
                holds when the next rotation window opens.
              </p>
            </div>
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:bg-slate-400"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit credential'}
          </button>
        </form>
      </div>
    </div>
  );
}
