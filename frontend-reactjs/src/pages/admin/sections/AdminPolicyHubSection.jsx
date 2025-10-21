import { useMemo } from 'react';
import PropTypes from 'prop-types';

import { coerceNumber, ensureString } from '../utils.js';

export default function AdminPolicyHubSection({
  sectionId,
  status,
  owner,
  contact,
  lastReviewed,
  slaHours,
  policyHubUrl
}) {
  const safeContact = ensureString(contact);
  const safeContactLabel = useMemo(() => {
    if (!safeContact) return 'Contact owner';
    if (safeContact.startsWith('mailto:')) {
      return safeContact.replace('mailto:', '');
    }
    return safeContact;
  }, [safeContact]);

  const safeStatus = ensureString(status, 'Operational');
  const safeOwner = ensureString(owner, 'Operations');
  const safeLastReviewed = ensureString(lastReviewed, 'Awaiting review');
  const safePolicyUrl = ensureString(policyHubUrl, '#');
  const safeContactHref = safeContact ? safeContact : '#';
  const safeSlaHours = coerceNumber(slaHours, { min: 0, fallback: 0, precision: 0 });

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Policy &amp; compliance hub</h3>
          <p className="text-sm text-slate-600">
            Track policy acknowledgements, review cadences, and escalation owners before incidents escalate.
          </p>
        </div>
        <a
          href={safePolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="dashboard-pill inline-flex items-center justify-center gap-2 px-5 py-2 text-sm"
        >
          View policy Learnspace
          <span aria-hidden="true" className="text-base">↗</span>
        </a>
      </div>
      <dl className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current status</dt>
          <dd className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
            <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {safeStatus}
            </span>
            <span className="text-xs text-slate-500">
              SLA response within <strong className="font-semibold text-slate-900">{safeSlaHours} hours</strong>
            </span>
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policy owner</dt>
          <dd className="mt-3 space-y-2 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{safeOwner}</p>
            <a
              href={safeContactHref}
              className="text-sm font-semibold text-primary hover:text-primary-dark"
              target={safeContactHref.startsWith('http') ? '_blank' : undefined}
              rel={safeContactHref.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {safeContactLabel}
            </a>
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last reviewed</dt>
          <dd className="mt-3 text-sm text-slate-600">{safeLastReviewed}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next actions</dt>
          <dd className="mt-3 text-sm text-slate-600">
            Confirm new administrators sign updated policies and schedule the next compliance tabletop.
          </dd>
        </div>
      </dl>
    </section>
  );
}

AdminPolicyHubSection.propTypes = {
  sectionId: PropTypes.string,
  status: PropTypes.string.isRequired,
  owner: PropTypes.string.isRequired,
  contact: PropTypes.string.isRequired,
  lastReviewed: PropTypes.string.isRequired,
  slaHours: PropTypes.number.isRequired,
  policyHubUrl: PropTypes.string.isRequired
};

AdminPolicyHubSection.defaultProps = {
  sectionId: undefined
};
