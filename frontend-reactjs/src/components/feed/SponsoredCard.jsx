import PropTypes from 'prop-types';

const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:']);

function formatUrl(url) {
  if (!url) return 'landing page';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (error) {
    return url;
  }
}

function getSafeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (error) {
    return null;
  }
}

export default function SponsoredCard({ ad, canManage = false, onDismiss, isProcessing = false, onVisit }) {
  const advertiser = ad.advertiser ?? 'Edulure Partner';
  const description = ad.description || 'Discover how operators are scaling with Edulure Ads.';
  const safeCtaUrl = getSafeUrl(ad.ctaUrl);
  const targetLabel = formatUrl(safeCtaUrl);
  const metrics = ad.metrics ?? {};

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
        {safeCtaUrl && (
          <a
            href={safeCtaUrl}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-amber-600"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onVisit?.(ad)}
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
      {(metrics.clicks || metrics.conversions) && (
        <dl className="mt-4 flex flex-wrap gap-4 text-xs text-amber-700">
          {metrics.clicks && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">{metrics.clicks}</span>
              <span>clicks</span>
            </div>
          )}
          {metrics.conversions && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">{metrics.conversions}</span>
              <span>conversions</span>
            </div>
          )}
        </dl>
      )}
    </article>
  );
}

SponsoredCard.propTypes = {
  ad: PropTypes.shape({
    placementId: PropTypes.string,
    headline: PropTypes.string.isRequired,
    description: PropTypes.string,
    advertiser: PropTypes.string,
    objective: PropTypes.string,
    ctaUrl: PropTypes.string,
    disclosure: PropTypes.string,
    position: PropTypes.number,
    metrics: PropTypes.shape({
      clicks: PropTypes.number,
      conversions: PropTypes.number
    })
  }).isRequired,
  canManage: PropTypes.bool,
  onDismiss: PropTypes.func,
  isProcessing: PropTypes.bool,
  onVisit: PropTypes.func
};

SponsoredCard.defaultProps = {
  canManage: false,
  onDismiss: undefined,
  isProcessing: false,
  onVisit: undefined
};
