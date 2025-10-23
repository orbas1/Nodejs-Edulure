import PropTypes from 'prop-types';

function resolveIssuedLabel(issuedAt) {
  if (!issuedAt) return 'Issued today';
  try {
    const date = new Date(issuedAt);
    if (Number.isNaN(date.getTime())) {
      return 'Issued today';
    }
    return `Issued ${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;
  } catch (_error) {
    return 'Issued today';
  }
}

export default function CertificatePreview({
  courseTitle,
  learnerName,
  issuedAt,
  issuer,
  accentColor,
  backgroundUrl
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          alt="Certificate background"
          className="absolute inset-0 h-full w-full object-cover opacity-15"
          loading="lazy"
        />
      ) : null}
      <div className="relative space-y-6 px-6 py-8 sm:px-10">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-lg"
            style={{ background: accentColor }}
          >
            🎓
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Certificate of completion</p>
            <h3 className="text-lg font-semibold text-slate-900">{courseTitle}</h3>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-slate-500">Awarded to</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{learnerName}</p>
          <p className="mt-3 text-sm text-slate-500">
            For completing the course requirements and demonstrating mastery of the learning outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">{issuer}</p>
            <p className="text-slate-400">Program Director</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-700">{resolveIssuedLabel(issuedAt)}</p>
            <p className="text-slate-400">Digital certificate</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wide text-slate-400">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Verified by Edulure</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Shareable link ready</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Printable layout</span>
        </div>
      </div>
    </div>
  );
}

CertificatePreview.propTypes = {
  courseTitle: PropTypes.string.isRequired,
  learnerName: PropTypes.string,
  issuedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  issuer: PropTypes.string,
  accentColor: PropTypes.string,
  backgroundUrl: PropTypes.string
};

CertificatePreview.defaultProps = {
  learnerName: 'Learner',
  issuedAt: undefined,
  issuer: 'Edulure Academy',
  accentColor: '#4338ca',
  backgroundUrl: undefined
};
