import PropTypes from 'prop-types';

const themeClasses = {
  light: 'bg-white text-slate-900 border-slate-200',
  dark: 'bg-slate-900 text-white border-slate-700',
  midnight: 'bg-slate-950 text-slate-100 border-slate-800'
};

const accentClasses = {
  primary: 'bg-primary text-white',
  emerald: 'bg-emerald-500 text-white',
  amber: 'bg-amber-500 text-slate-900',
  slate: 'bg-slate-600 text-white'
};

function resolveThemeClass(theme) {
  return themeClasses[theme] ?? themeClasses.light;
}

function resolveAccentClass(accent) {
  return accentClasses[accent] ?? accentClasses.primary;
}

function resolveHostname(value) {
  if (!value) {
    return 'Add destination URL';
  }
  try {
    const parsed = new URL(value);
    return parsed.hostname;
  } catch (error) {
    return value;
  }
}

export default function CampaignPreview({
  headline,
  description,
  url,
  asset,
  advertiser,
  objective,
  disclosure,
  theme,
  accent
}) {
  const themeClass = resolveThemeClass(theme);
  const accentClass = resolveAccentClass(accent);
  const hasImage = Boolean(asset?.publicUrl);

  return (
    <article className={`w-full rounded-3xl border p-5 shadow-sm transition ${themeClass}`}>
      <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-wide">
        <span className="text-slate-400">{objective ?? 'Campaign preview'}</span>
        <span className="text-primary">{disclosure ?? 'Sponsored'}</span>
      </div>
      <div className="mt-4 flex flex-col gap-4 md:flex-row">
        {hasImage && (
          <div className="h-36 w-full overflow-hidden rounded-2xl border border-slate-200 md:w-48">
            <img
              src={asset.publicUrl}
              alt={headline ? `${headline} creative` : 'Campaign creative'}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <h3 className="text-lg font-semibold leading-tight">{headline || 'Write a compelling headline'}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              {description || 'Use this space to describe the offer and reinforce the call to action.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${accentClass}`}>
              Visit campaign
            </span>
            <span className="text-xs text-slate-400">
              {advertiser ? `${advertiser} ·` : ''} {resolveHostname(url)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

CampaignPreview.propTypes = {
  headline: PropTypes.string,
  description: PropTypes.string,
  url: PropTypes.string,
  asset: PropTypes.shape({
    publicUrl: PropTypes.string
  }),
  advertiser: PropTypes.string,
  objective: PropTypes.string,
  disclosure: PropTypes.string,
  theme: PropTypes.string,
  accent: PropTypes.string
};

CampaignPreview.defaultProps = {
  headline: '',
  description: '',
  url: '',
  asset: null,
  advertiser: '',
  objective: '',
  disclosure: 'Sponsored',
  theme: 'light',
  accent: 'primary'
};
