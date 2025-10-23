import PropTypes from 'prop-types';
import clsx from 'clsx';

export default function LearnerRevenueBanner({ promotion, className }) {
  if (!promotion) {
    return null;
  }

  return (
    <aside
      className={clsx(
        'dashboard-card-muted flex h-full flex-col justify-between rounded-xl border border-amber-200/60 bg-amber-50/80 p-5 shadow-sm shadow-amber-200/40',
        className
      )}
    >
      <div className="space-y-3">
        <p className="dashboard-kicker text-xs font-semibold uppercase tracking-wide text-amber-600">
          {promotion.kicker ?? 'Revenue boost'}
        </p>
        <h2 className="text-lg font-semibold text-amber-900">{promotion.headline}</h2>
        {promotion.body ? <p className="text-sm text-amber-800">{promotion.body}</p> : null}
        {promotion.bullets ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
            {promotion.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {promotion.action ? (
        <a
          href={promotion.action.href}
          className="mt-4 inline-flex items-center text-sm font-semibold text-amber-900 underline decoration-amber-400 decoration-2 underline-offset-4 hover:text-amber-950"
        >
          {promotion.action.label}
        </a>
      ) : null}
    </aside>
  );
}

LearnerRevenueBanner.propTypes = {
  promotion: PropTypes.shape({
    kicker: PropTypes.string,
    headline: PropTypes.string.isRequired,
    body: PropTypes.string,
    bullets: PropTypes.arrayOf(PropTypes.string),
    action: PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired
    })
  }),
  className: PropTypes.string
};

LearnerRevenueBanner.defaultProps = {
  promotion: null,
  className: ''
};
