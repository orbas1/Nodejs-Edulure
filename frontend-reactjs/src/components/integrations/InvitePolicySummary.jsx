import PropTypes from 'prop-types';

export default function InvitePolicySummary({ policyUrl, runbookUrl, providerLabel }) {
  if (!policyUrl && !runbookUrl) {
    return null;
  }

  return (
    <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-card">
      <h3 className="text-base font-semibold text-slate-900">Governance references</h3>
      <p className="text-sm leading-6 text-slate-600">
        Keep this credential aligned with Edulure security controls. Review the policy and runbook before
        submitting secrets to confirm encryption, rotation, and incident escalation steps.
      </p>
      <ul className="space-y-3 text-sm text-slate-700">
        {policyUrl ? (
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Security policy</span>
              <a
                href={policyUrl}
                className="font-semibold text-primary hover:text-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/30"
                target="_blank"
                rel="noreferrer"
              >
                Credential handling standards for {providerLabel}
              </a>
            </span>
          </li>
        ) : null}
        {runbookUrl ? (
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Operations runbook</span>
              <a
                href={runbookUrl}
                className="font-semibold text-emerald-700 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400/40"
                target="_blank"
                rel="noreferrer"
              >
                Step-by-step rotation workflow
              </a>
            </span>
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

InvitePolicySummary.propTypes = {
  policyUrl: PropTypes.string,
  runbookUrl: PropTypes.string,
  providerLabel: PropTypes.string
};

InvitePolicySummary.defaultProps = {
  policyUrl: null,
  runbookUrl: null,
  providerLabel: 'the integration'
};
