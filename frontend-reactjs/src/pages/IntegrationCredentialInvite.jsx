import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import InviteSecurityChecklist from '../components/integrations/InviteSecurityChecklist.jsx';
import InviteStatusBanner from '../components/integrations/InviteStatusBanner.jsx';
import InviteSummaryCard from '../components/integrations/InviteSummaryCard.jsx';
import useIntegrationInvite from '../hooks/useIntegrationInvite.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import {
  trackIntegrationInviteEvent,
  trackIntegrationInviteStatus,
  trackIntegrationInviteSubmit
} from '../lib/analytics.js';

export default function IntegrationCredentialInvite() {
  const { token } = useParams();
  const {
    invite,
    loading,
    error,
    status,
    message,
    form,
    updateField,
    submit,
    countdown,
    documentationStatus,
    refresh,
    isExpired,
    lastFetchedAt
  } = useIntegrationInvite({ inviteToken: token ?? '' });

  const metaDescription = useMemo(() => {
    if (!invite) {
      return 'Securely deliver API credentials requested by the Edulure integrations team. Tokens are vaulted immediately and never displayed.';
    }
    return `Submit the ${invite.providerLabel} key for the ${invite.alias ?? invite.provider} integration. Credentials are encrypted and governed by Edulure security policies.`;
  }, [invite]);

  usePageMetadata({
    title: invite?.providerLabel
      ? `Provide ${invite.providerLabel} credential`
      : 'Integration credential invitation · Edulure',
    description: metaDescription,
    canonicalPath: token ? `/integrations/credential-invite/${token}` : '/integrations/credential-invite',
    robots: 'noindex, nofollow',
    analytics: {
      page_type: 'integration_invite',
      provider: invite?.provider ?? invite?.providerLabel ?? 'unknown',
      environment: invite?.environment ?? 'unspecified'
    }
  });

  useEffect(() => {
    if (!token || !invite) return;
    trackIntegrationInviteEvent('view', {
      provider: invite.provider ?? invite.providerLabel ?? 'unknown',
      environment: invite.environment ?? 'unspecified',
      has_expiry: Boolean(invite.expiresAt)
    });
  }, [invite, token]);

  const documentationBanner = useMemo(() => {
    if (!documentationStatus) {
      return null;
    }
    if (documentationStatus.state === 'missing') {
      return {
        tone: 'warning',
        message: 'No documentation link provided. Confirm the latest integration runbook with the Edulure team.'
      };
    }
    if (documentationStatus.state === 'warning') {
      return {
        tone: 'warning',
        message: 'The documentation link could not be verified automatically. Double-check the URL before sharing credentials.'
      };
    }
    if (documentationStatus.state === 'checking' || documentationStatus.state === 'unknown') {
      return {
        tone: 'info',
        message: 'Validating integration documentation… ensure the link resolves before final submission.'
      };
    }
    return null;
  }, [documentationStatus]);

  const statusTone = status === 'error' ? 'danger' : status === 'success' ? 'success' : 'info';

  useEffect(() => {
    if (!documentationStatus?.state || documentationStatus.state === 'checking') {
      return;
    }
    trackIntegrationInviteStatus(documentationStatus.state, {
      provider: invite?.provider ?? invite?.providerLabel ?? 'unknown'
    });
  }, [documentationStatus?.state, invite?.provider, invite?.providerLabel]);

  useEffect(() => {
    if (status === 'idle' || status === 'submitting') return;
    trackIntegrationInviteStatus(status, {
      provider: invite?.provider ?? invite?.providerLabel ?? 'unknown',
      has_message: Boolean(message)
    });
  }, [status, invite?.provider, invite?.providerLabel, message]);

  useEffect(() => {
    if (!isExpired) return;
    trackIntegrationInviteStatus('expired', {
      provider: invite?.provider ?? invite?.providerLabel ?? 'unknown'
    });
  }, [isExpired, invite?.provider, invite?.providerLabel]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const provider = invite?.provider ?? invite?.providerLabel ?? 'unknown';
    trackIntegrationInviteSubmit('attempt', {
      provider,
      has_rotation_override: Boolean(form.rotationIntervalDays),
      has_expiry: Boolean(form.keyExpiresAt)
    });
    const result = await submit();
    if (result?.ok) {
      trackIntegrationInviteSubmit('success', {
        provider,
        rotation_interval: result.payload?.invite?.rotationIntervalDays ?? form.rotationIntervalDays || null
      });
    } else {
      trackIntegrationInviteSubmit('failure', {
        provider,
        has_message: Boolean(message)
      });
    }
  };

  const handleRefresh = useCallback(() => {
    const provider = invite?.provider ?? invite?.providerLabel ?? 'unknown';
    trackIntegrationInviteEvent('refresh', {
      provider,
      last_fetched_at: lastFetchedAt
    });
    return refresh();
  }, [invite?.provider, invite?.providerLabel, lastFetchedAt, refresh]);

  if (loading && !invite) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-600">
        Validating invitation…
      </div>
    );
  }

  if ((error || !invite) && !loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <InviteStatusBanner tone="danger" message={error?.message ?? 'This invitation is no longer active.'} />
      </div>
    );
  }

  const disableForm = status === 'submitting' || isExpired;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16">
      <InviteSummaryCard invite={invite} countdown={countdown} onRefresh={handleRefresh} />
      {documentationBanner ? <InviteStatusBanner tone={documentationBanner.tone} message={documentationBanner.message} /> : null}
      {message ? <InviteStatusBanner tone={statusTone} message={message} /> : null}
      {isExpired ? (
        <InviteStatusBanner tone="danger" message="This invitation has expired. Request a fresh link from your Edulure contact." />
      ) : null}
      <InviteSecurityChecklist
        rotationIntervalDays={invite?.rotationIntervalDays}
        documentationUrl={invite?.documentationUrl ?? documentationStatus?.url ?? null}
      />

      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-700">
        <p className="font-semibold">How this works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Paste the live API key directly into the secure field—avoid sharing secrets in chat or email.</li>
          <li>Keys are encrypted on receipt and surfaced only to automation workloads governed by vault policies.</li>
          <li>You’ll receive a confirmation email once connectivity checks complete or if additional steps are required.</li>
        </ul>
      </section>

      <form className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invite-key">
            API key
          </label>
          <textarea
            id="invite-key"
            value={form.key}
            onChange={(event) => updateField('key', event.target.value)}
            className="h-32 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Paste your provider secret"
            required
            spellCheck="false"
            disabled={disableForm}
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
              onChange={(event) => updateField('rotationIntervalDays', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder={invite.rotationIntervalDays ? String(invite.rotationIntervalDays) : 'Use default cadence'}
              disabled={disableForm}
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
              onChange={(event) => updateField('keyExpiresAt', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              disabled={disableForm}
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
              onChange={(event) => updateField('actorEmail', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="you@example.com"
              disabled={disableForm}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invite-name">
              Your name (optional)
            </label>
            <input
              id="invite-name"
              value={form.actorName}
              onChange={(event) => updateField('actorName', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Full name"
              disabled={disableForm}
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
            onChange={(event) => updateField('reason', event.target.value)}
            className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Add context for the rotation"
            disabled={disableForm}
          />
        </div>
        {status === 'success' ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Next steps</p>
            <p className="mt-1">
              Operations will validate connectivity using this credential. Rotation reminders trigger calendar holds where requested.
            </p>
          </div>
        ) : null}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:bg-slate-400"
          disabled={disableForm}
        >
          {status === 'submitting' ? 'Submitting…' : 'Submit credential'}
        </button>
      </form>
    </div>
  );
}
