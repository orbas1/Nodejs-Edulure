import PropTypes from 'prop-types';

import InviteExpiryCountdown from './InviteExpiryCountdown.jsx';

function formatDisplayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function InviteSummaryCard({ invite, countdown, onRefresh }) {
  if (!invite) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">Integration invite</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Provide credential for {invite.providerLabel ?? invite.provider ?? 'integration'}
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Submit API secrets directly to the Edulure vault. Credentials are encrypted at rest and masked from administrators.
          </p>
          {invite.reason ? <p className="mt-2 text-xs text-slate-500">Reason: {invite.reason}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-3 text-right text-xs text-slate-500">
          <InviteExpiryCountdown countdown={countdown} />
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Refresh invite
          </button>
        </div>
      </header>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Environment</dt>
          <dd className="text-sm font-medium text-slate-800">{invite.environment ?? 'Unspecified'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rotation cadence</dt>
          <dd className="text-sm font-medium text-slate-800">
            {invite.rotationIntervalDays ? `${invite.rotationIntervalDays} days` : 'Refer to security policy'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invitation expires</dt>
          <dd className="text-sm font-medium text-slate-800">{formatDisplayDate(invite.expiresAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Key expiry</dt>
          <dd className="text-sm font-medium text-slate-800">
            {invite.keyExpiresAt ? formatDisplayDate(invite.keyExpiresAt) : 'Set if the provider enforces expiry'}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documentation</dt>
          <dd className="text-sm font-medium text-slate-800">
            {invite.documentationUrl ? (
              <a
                href={invite.documentationUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:text-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                View integration runbook
              </a>
            ) : (
              'Refer to the security checklist for required controls'
            )}
          </dd>
        </div>
        {invite.policyUrl ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Security policy</dt>
            <dd className="text-sm font-medium text-slate-800">
              <a
                href={invite.policyUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald-700 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
              >
                Review credential handling standards
              </a>
            </dd>
          </div>
        ) : null}
        {invite.runbookUrl && !invite.documentationUrl ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Operations runbook</dt>
            <dd className="text-sm font-medium text-slate-800">
              <a
                href={invite.runbookUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:text-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                View rotation workflow
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
        The integrations team cannot view the secret you submit. Keys are stored in a hardware-backed vault and surfaced only to
        automated services. You will receive confirmation once connectivity tests pass.
      </div>
    </section>
  );
}

InviteSummaryCard.propTypes = {
  invite: PropTypes.shape({
    provider: PropTypes.string,
    providerLabel: PropTypes.string,
    environment: PropTypes.string,
    rotationIntervalDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    expiresAt: PropTypes.string,
    keyExpiresAt: PropTypes.string,
    reason: PropTypes.string,
    documentationUrl: PropTypes.string,
    policyUrl: PropTypes.string,
    runbookUrl: PropTypes.string
  }),
  countdown: PropTypes.shape({
    expired: PropTypes.bool,
    days: PropTypes.number,
    hours: PropTypes.number,
    minutes: PropTypes.number,
    seconds: PropTypes.number
  }),
  onRefresh: PropTypes.func.isRequired
};

InviteSummaryCard.defaultProps = {
  invite: null,
  countdown: null
};
