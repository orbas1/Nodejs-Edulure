import PropTypes from 'prop-types';

function formatPercent(value) {
  const numeric = Number.isFinite(value) ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric * 10) / 10));
}

export default function CourseProgressMeter({
  progressPercent,
  completedLessons,
  totalLessons,
  certificate
}) {
  const percent = formatPercent(progressPercent);
  const completionCopy = `${completedLessons} of ${totalLessons} lessons complete`;
  const hasCertificate = Boolean(certificate?.certificateUrl);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Learning progress</p>
          <p className="text-xs text-slate-500">{completionCopy}</p>
        </div>
        <p className="text-3xl font-semibold text-slate-900">{percent}%</p>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100" role="presentation">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {hasCertificate ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          <p className="font-semibold">Certificate issued</p>
          <p className="mt-1">Download your certificate to celebrate your achievement.</p>
          <a
            href={certificate.certificateUrl}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            View certificate
          </a>
        </div>
      ) : null}
    </div>
  );
}

CourseProgressMeter.propTypes = {
  progressPercent: PropTypes.number,
  completedLessons: PropTypes.number,
  totalLessons: PropTypes.number,
  certificate: PropTypes.shape({
    certificateUrl: PropTypes.string
  })
};

CourseProgressMeter.defaultProps = {
  progressPercent: 0,
  completedLessons: 0,
  totalLessons: 0,
  certificate: null
};
