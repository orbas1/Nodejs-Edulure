import PropTypes from 'prop-types';
import clsx from 'clsx';

function normaliseOffers(offers) {
  if (!Array.isArray(offers)) {
    return [];
  }
  return offers
    .filter((offer) => offer && (offer.title || offer.description))
    .map((offer) => ({
      id: offer.id ?? offer.slug ?? offer.title,
      title: offer.title ?? 'Revenue opportunity',
      description: offer.description ?? offer.summary ?? '',
      ctaLabel: offer.ctaLabel ?? offer.cta ?? 'Review offer',
      ctaHref: offer.ctaHref ?? offer.href ?? offer.url ?? '#',
      badge: offer.badge ?? offer.tier ?? null
    }));
}

export default function LearnerMonetizationSection({ spotlight, offers, className }) {
  const safeOffers = normaliseOffers(offers);
  if (!spotlight && safeOffers.length === 0) {
    return null;
  }

  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-white to-primary/5 p-6 shadow-sm',
        className
      )}
    >
      <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="relative z-10 space-y-4">
        <div>
          <p className="dashboard-kicker text-primary">Monetisation boost</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            {spotlight?.title ?? 'Convert your momentum into revenue'}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {spotlight?.description ??
              'Highlight recommended upsells and bundles so the right learners discover premium communities, tutors, and resources.'}
          </p>
        </div>
        {safeOffers.length ? (
          <ul className="space-y-3">
            {safeOffers.map((offer) => (
              <li
                key={offer.id}
                className="flex flex-col gap-2 rounded-2xl border border-white/40 bg-white/70 p-4 text-sm text-slate-700 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{offer.title}</p>
                  {offer.badge ? (
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {offer.badge}
                    </span>
                  ) : null}
                </div>
                {offer.description ? <p className="text-slate-600">{offer.description}</p> : null}
                <div>
                  <a
                    href={offer.ctaHref}
                    className="dashboard-primary-pill inline-flex items-center gap-2 px-4 py-2 text-xs"
                  >
                    {offer.ctaLabel}
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

LearnerMonetizationSection.propTypes = {
  spotlight: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string
  }),
  offers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string,
      description: PropTypes.string,
      ctaLabel: PropTypes.string,
      ctaHref: PropTypes.string,
      badge: PropTypes.string
    })
  ),
  className: PropTypes.string
};

LearnerMonetizationSection.defaultProps = {
  spotlight: null,
  offers: [],
  className: ''
};
