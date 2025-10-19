import PropTypes from 'prop-types';

function formatUrl(url) {
  if (!url) return 'landing page';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (error) {
    return url;
  }
}

export default function FeedSponsoredCard({ ad, canManage = false, onDismiss, isProcessing = false }) {
  const advertiser = ad.advertiser ?? 'Edulure Partner';
  const description = ad.description || 'Discover how operators are scaling with Edulure Ads.';
  const targetLabel = formatUrl(ad.ctaUrl);

  return (
    <article className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Sponsored</p>
          <h3 className="text-lg font-semibold text-slate-900">{ad.headline}</h3>
          <p className="text-sm text-slate-600">{description}</p>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-amber-600">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1">{advertiser}</span>
            {ad.objective && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1">{ad.objective}</span>
            )}
          </div>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">Ad slot #{ad.position}</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-400">{ad.disclosure ?? 'Edulure Ads'}</p>
        {ad.ctaUrl && (
          <a
            href={ad.ctaUrl}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-amber-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit {targetLabel}
          </a>
        )}
        {canManage && (
          <button
            type="button"
            onClick={onDismiss}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400 bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? 'Updating…' : 'Hide placement'}
          </button>
        )}
      </div>
    </article>
  );
}

FeedSponsoredCard.propTypes = {
  ad: PropTypes.shape({
    placementId: PropTypes.string,
    headline: PropTypes.string.isRequired,
    description: PropTypes.string,
    advertiser: PropTypes.string,
    objective: PropTypes.string,
    ctaUrl: PropTypes.string,
    disclosure: PropTypes.string,
    position: PropTypes.number
  }).isRequired,
  canManage: PropTypes.bool,
  onDismiss: PropTypes.func,
  isProcessing: PropTypes.bool
};

