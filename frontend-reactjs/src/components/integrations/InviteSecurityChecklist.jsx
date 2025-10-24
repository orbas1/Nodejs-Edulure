import PropTypes from 'prop-types';

export default function InviteSecurityChecklist({ rotationIntervalDays, documentationUrl }) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary">
      <p className="text-sm font-semibold text-primary-dark">Security checklist</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-primary/90">
        <li>Paste credentials directly into the secure form—avoid sending secrets via email or chat.</li>
        <li>Confirm rotation interval of {rotationIntervalDays ? `${rotationIntervalDays} days` : 'the configured cadence'} in your runbook.</li>
        <li>
          Validate documentation link{' '}
          {documentationUrl ? (
            <a href={documentationUrl} className="font-semibold text-primary hover:text-primary-dark" target="_blank" rel="noreferrer">
              {documentationUrl}
            </a>
          ) : (
            'provided by your integrations contact'
          )}
          .
        </li>
        <li>Schedule a vault review with operations to verify encryption and access controls.</li>
      </ul>
    </section>
  );
}

InviteSecurityChecklist.propTypes = {
  rotationIntervalDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  documentationUrl: PropTypes.string
};

InviteSecurityChecklist.defaultProps = {
  rotationIntervalDays: null,
  documentationUrl: null
};
