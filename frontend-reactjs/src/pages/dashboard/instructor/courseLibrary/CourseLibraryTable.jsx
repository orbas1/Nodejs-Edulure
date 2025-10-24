import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

function parseDurationMinutes(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const hoursMatch = raw.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minutesMatch = raw.match(/(\d+(?:\.\d+)?)\s*m/i);
  let total = 0;
  if (hoursMatch) {
    total += Number(hoursMatch[1]) * 60;
  }
  if (minutesMatch) {
    total += Number(minutesMatch[1]);
  }
  if (!hoursMatch && !minutesMatch) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return total || null;
}

function formatDurationMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '—';
  }
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (hours === 0) {
    return `${remaining}m`;
  }
  if (remaining === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remaining}m`;
}

export default function CourseLibraryTable({ assets }) {
  const normalisedAssets = useMemo(() => {
    if (!Array.isArray(assets)) return [];
    return assets
      .filter((asset) => asset && (asset.id ?? asset.title))
      .map((asset, index) => {
        const formatLabel = asset.format ? String(asset.format) : 'Video';
        const formattedFormat = formatLabel
          .split(/[_\s]+/)
          .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1).toLowerCase() : segment))
          .join(' ');
        const durationMinutes = parseDurationMinutes(asset.durationMinutes ?? asset.duration ?? null);
        const tags = Array.isArray(asset.tags) ? asset.tags.filter(Boolean) : [];
        const engagementRate = Number(asset.engagement?.completionRate ?? asset.completionRate);
        const engagementLabel = Number.isFinite(engagementRate)
          ? `${Math.round(engagementRate)}% completion`
          : asset.engagement?.label ?? '—';
        return {
          id: asset.id ?? `asset-${index}`,
          title: asset.title ?? 'Untitled asset',
          format: formattedFormat || 'Video',
          updated: asset.updated ?? asset.updatedAt ?? '—',
          durationMinutes,
          durationLabel: asset.durationLabel ?? formatDurationMinutes(durationMinutes),
          audience: asset.audience ?? 'Learners',
          tags,
          engagementLabel,
          status: asset.status ?? 'Published'
        };
      });
  }, [assets]);

  const formatFilters = useMemo(() => {
    const counts = new Map();
    normalisedAssets.forEach((asset) => {
      counts.set(asset.format, (counts.get(asset.format) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [normalisedAssets]);

  const [activeFormat, setActiveFormat] = useState('All');

  const filteredRows = useMemo(() => {
    if (activeFormat === 'All') {
      return normalisedAssets;
    }
    return normalisedAssets.filter((asset) => asset.format === activeFormat);
  }, [normalisedAssets, activeFormat]);

  const aggregateDuration = useMemo(() => {
    return filteredRows.reduce((total, asset) => total + (asset.durationMinutes ?? 0), 0);
  }, [filteredRows]);

  const aggregateEngagement = useMemo(() => {
    const numericRates = filteredRows
      .map((asset) => {
        const match = asset.engagementLabel.match(/(\d+)%/);
        return match ? Number(match[1]) : null;
      })
      .filter((value) => Number.isFinite(value));
    if (!numericRates.length) return null;
    const average = Math.round(
      numericRates.reduce((total, value) => total + value, 0) / numericRates.length
    );
    return `${average}% avg completion`;
  }, [filteredRows]);

  const handleAssetAction = (asset, action) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('edulure:library-asset', {
        detail: {
          assetId: asset.id,
          action
        }
      })
    );
  };

  const headerSummary = `${filteredRows.length} asset${filteredRows.length === 1 ? '' : 's'}`;

  return (
    <section className="dashboard-section space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recorded asset library</h2>
          <p className="text-sm text-slate-600">
            {headerSummary}
            {aggregateDuration ? ` · ${formatDurationMinutes(aggregateDuration)} runtime` : ''}
            {aggregateEngagement ? ` · ${aggregateEngagement}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`dashboard-pill px-3 py-1 text-xs font-semibold ${
              activeFormat === 'All' ? 'bg-primary/10 text-primary' : 'text-slate-600'
            }`}
            onClick={() => setActiveFormat('All')}
          >
            All ({normalisedAssets.length})
          </button>
          {formatFilters.map(([format, count]) => (
            <button
              key={format}
              type="button"
              className={`dashboard-pill px-3 py-1 text-xs font-semibold ${
                activeFormat === format ? 'bg-primary/10 text-primary' : 'text-slate-600'
              }`}
              onClick={() => setActiveFormat(format)}
            >
              {format} ({count})
            </button>
          ))}
        </div>
      </div>

      <table className="w-full text-left text-sm text-slate-600">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="pb-3">Title</th>
            <th className="pb-3">Format</th>
            <th className="pb-3">Last updated</th>
            <th className="pb-3">Duration</th>
            <th className="pb-3">Engagement</th>
            <th className="pb-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {filteredRows.length > 0 ? (
            filteredRows.map((asset) => (
              <tr key={asset.id} className="align-top hover:bg-primary/5">
                <td className="py-3 text-slate-900">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{asset.title}</span>
                    <span className="text-xs text-slate-500">Audience · {asset.audience}</span>
                    {asset.tags.length ? (
                      <span className="text-[11px] uppercase tracking-wide text-primary">
                        {asset.tags.slice(0, 4).join(' · ')}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="py-3 text-slate-600">{asset.format}</td>
                <td className="py-3 text-slate-600">{asset.updated}</td>
                <td className="py-3 text-slate-600">{asset.durationLabel}</td>
                <td className="py-3 text-slate-600">{asset.engagementLabel}</td>
                <td className="py-3 text-right text-xs text-slate-600">
                  <button
                    type="button"
                    className="dashboard-pill px-3 py-1"
                    onClick={() => handleAssetAction(asset, 'view')}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="ml-2 dashboard-pill px-3 py-1"
                    onClick={() => handleAssetAction(asset, 'share')}
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    className="ml-2 dashboard-pill px-3 py-1"
                    onClick={() => handleAssetAction(asset, 'audit')}
                  >
                    Audit
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="py-4 text-sm text-slate-500">
                No recorded assets yet. Upload a master recording or sync from your studio encoder.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

CourseLibraryTable.propTypes = {
  assets: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      format: PropTypes.string,
      updated: PropTypes.string,
      updatedAt: PropTypes.string,
      duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      durationMinutes: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      durationLabel: PropTypes.string,
      audience: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      engagement: PropTypes.shape({
        completionRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        label: PropTypes.string
      }),
      completionRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      status: PropTypes.string
    })
  )
};

CourseLibraryTable.defaultProps = {
  assets: []
};
