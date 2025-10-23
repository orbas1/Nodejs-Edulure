import PropTypes from 'prop-types';

export default function SponsoredPlacementCard({ placement }) {
  if (!placement) {
    return null;
  }

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-inner">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Sponsored
        </span>
        {placement.advertiser ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-700/80">
            {placement.advertiser}
          </span>
        ) : null}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-amber-900">{placement.headline}</h3>
        {placement.description ? (
          <p className="text-sm leading-relaxed text-amber-800">{placement.description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">
        {placement.objective ? <span>{placement.objective}</span> : null}
        {placement.disclosure ? <span>{placement.disclosure}</span> : null}
      </div>
      {placement.ctaUrl ? (
        <a
          href={placement.ctaUrl}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Explore offer
        </a>
      ) : null}
    </article>
  );
}

SponsoredPlacementCard.propTypes = {
  placement: PropTypes.shape({
    placementId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    headline: PropTypes.string,
    description: PropTypes.string,
    advertiser: PropTypes.string,
    objective: PropTypes.string,
    disclosure: PropTypes.string,
    ctaUrl: PropTypes.string
  })
};

SponsoredPlacementCard.defaultProps = {
  placement: null
};

