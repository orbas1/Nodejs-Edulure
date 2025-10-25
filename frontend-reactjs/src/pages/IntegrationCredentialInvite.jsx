import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';

import InviteSecurityChecklist from '../components/integrations/InviteSecurityChecklist.jsx';
import InviteStatusBanner from '../components/integrations/InviteStatusBanner.jsx';
import InviteSummaryCard from '../components/integrations/InviteSummaryCard.jsx';
import InvitePolicySummary from '../components/integrations/InvitePolicySummary.jsx';
import useIntegrationInvite from '../hooks/useIntegrationInvite.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import {
  trackIntegrationInviteEvent,
  trackIntegrationInviteInteraction,
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

  const provider = invite?.provider ?? invite?.providerLabel ?? 'unknown';
  const environment = invite?.environment ?? 'unspecified';
  const touchedFieldsRef = useRef(new Set());
  const viewStartedAtRef = useRef(null);

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
      provider,
      environment
    }
  });

  useEffect(() => {
    if (!token || !invite) return;
    trackIntegrationInviteEvent('view', {
      provider,
      environment,
      has_expiry: Boolean(invite.expiresAt)
    });
    touchedFieldsRef.current = new Set();
    viewStartedAtRef.current = Date.now();
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
      provider,
      environment
    });
  }, [documentationStatus?.state, provider, environment]);

  useEffect(() => {
    if (status === 'idle' || status === 'submitting') return;
    trackIntegrationInviteStatus(status, {
      provider,
      environment,
      has_message: Boolean(message)
    });
  }, [status, provider, environment, message]);

  useEffect(() => {
    if (!isExpired) return;
    trackIntegrationInviteStatus('expired', {
      provider,
      environment
    });
  }, [isExpired, provider, environment]);

  useEffect(() => {
    if (!error || loading) return;
    trackIntegrationInviteEvent('error', {
      provider,
      environment,
      code: error?.code ?? 'unknown'
    });
  }, [error, loading, provider, environment]);

  const handleFieldChange = useCallback(
    (field, value, { isSecret = false } = {}) => {
      updateField(field, value);
      if (!field) {
        return;
      }
      const touched = touchedFieldsRef.current;
      if (!touched.has(field)) {
        touched.add(field);
        const baseMetadata = {
          field,
          provider,
          environment,
          status,
          is_secret: isSecret || undefined
        };
        if (!isSecret) {
          const hasValue =
            typeof value === 'string'
              ? value.trim().length > 0
              : value !== null && value !== undefined && value !== '';
          baseMetadata.has_value = hasValue;
        }
        trackIntegrationInviteInteraction('field_change', baseMetadata);
      }
    },
    [environment, provider, status, updateField]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const durationSeconds =
      viewStartedAtRef.current != null ? Number(((Date.now() - viewStartedAtRef.current) / 1000).toFixed(2)) : null;
    trackIntegrationInviteSubmit('attempt', {
      provider,
      has_rotation_override: Boolean(form.rotationIntervalDays),
      has_expiry: Boolean(form.keyExpiresAt),
      environment,
      duration_seconds: durationSeconds
    });
    const result = await submit();
    if (result?.ok) {
      const rotationInterval =
        result.payload?.invite?.rotationIntervalDays ??
        form.rotationIntervalDays ??
        null;
      trackIntegrationInviteSubmit('success', {
        provider,
        environment,
        rotation_interval: rotationInterval,
        duration_seconds: durationSeconds
      });
    } else {
      trackIntegrationInviteSubmit('failure', {
        provider,
        environment,
        has_message: Boolean(message),
        duration_seconds: durationSeconds
      });
    }
  };

  const handleRefresh = useCallback(() => {
    trackIntegrationInviteEvent('refresh', {
      provider,
      environment,
      last_fetched_at: lastFetchedAt
    });
    return refresh();
  }, [environment, lastFetchedAt, provider, refresh]);

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
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-16">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <InviteSummaryCard invite={invite} countdown={countdown} onRefresh={handleRefresh} />
        <InvitePolicySummary
          policyUrl={invite?.policyUrl ?? null}
          runbookUrl={invite?.runbookUrl ?? invite?.documentationUrl ?? null}
          providerLabel={invite?.providerLabel ?? invite?.provider ?? 'the integration'}
        />
      </div>
      {documentationBanner ? (
        <InviteStatusBanner tone={documentationBanner.tone} message={documentationBanner.message} />
      ) : null}
      {message ? <InviteStatusBanner tone={statusTone} message={message} /> : null}
      {isExpired ? (
        <InviteStatusBanner
          tone="danger"
          message="This invitation has expired. Request a fresh link from your Edulure contact."
        />
      ) : null}
      <InviteSecurityChecklist
        rotationIntervalDays={invite?.rotationIntervalDays}
        documentationUrl={invite?.documentationUrl ?? documentationStatus?.url ?? null}
      />

      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5 text-xs text-emerald-800">
        <p className="font-semibold uppercase tracking-wide">Credential handling workflow</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            Submit the live credential using this form. Secrets are encrypted client-side, transferred via TLS, and vaulted with
            hardware-backed keys.
          </li>
          <li>
            Rotation cadences and expiry overrides are logged to governance dashboards so on-call responders receive PagerDuty
            alerts ahead of SLA breaches.
          </li>
          <li>
            A confirmation email and audit entry will be issued once connectivity checks succeed or if additional remediation is
            required.
          </li>
        </ul>
      </section>

      <form className="space-y-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-card" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invite-key">
            API key
          </label>
          <textarea
            id="invite-key"
            value={form.key}
            onChange={(event) => handleFieldChange('key', event.target.value, { isSecret: true })}
            className="h-32 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Paste your provider secret"
            required
            spellCheck="false"
            disabled={disableForm}
          />
          <p className="mt-2 text-xs text-slate-500">
            Ensure the credential is unique, high-entropy, and free from placeholders. The vault will reject secrets containing
            provider names, repeated characters, or demo strings.
          </p>
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
              onChange={(event) => handleFieldChange('rotationIntervalDays', event.target.value)}
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
              onChange={(event) => handleFieldChange('keyExpiresAt', event.target.value)}
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
              onChange={(event) => handleFieldChange('actorEmail', event.target.value)}
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
              onChange={(event) => handleFieldChange('actorName', event.target.value)}
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
            onChange={(event) => handleFieldChange('reason', event.target.value)}
            className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Add context for the rotation"
            disabled={disableForm}
          />
        </div>
        {status === 'success' ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Next steps</p>
            <p className="mt-1">
              Operations will validate connectivity and log an audit trail within 24 hours. You will receive confirmation once
              automation checks succeed or if rotation adjustments are required.
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
