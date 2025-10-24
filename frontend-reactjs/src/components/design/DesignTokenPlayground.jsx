import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';

function isColourValue(value) {
  if (!value) return false;
  const normalised = value.trim().toLowerCase();
  return normalised.startsWith('#') || normalised.startsWith('rgb');
}

function isGradientValue(value) {
  if (!value) return false;
  return value.trim().toLowerCase().startsWith('linear-gradient');
}

const SPACING_PATTERN = /^\s*([\d.]+)\s*(rem|px|em)\s*$/iu;

function isSpacingValue(value) {
  if (!value) return false;
  return SPACING_PATTERN.test(value);
}

function toPixelWidth(value) {
  const match = typeof value === 'string' ? value.match(SPACING_PATTERN) : null;
  if (!match) {
    return 0;
  }
  const numeric = Number.parseFloat(match[1]);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  const unit = match[2].toLowerCase();
  if (unit === 'px') {
    return numeric;
  }
  if (unit === 'rem' || unit === 'em') {
    return numeric * 16;
  }
  return 0;
}

function TokenPreview({ token }) {
  if (isGradientValue(token.value)) {
    return (
      <div
        className="h-10 w-full rounded-2xl border border-slate-200"
        style={{ backgroundImage: token.value }}
        aria-hidden="true"
      />
    );
  }

  if (isColourValue(token.value)) {
    return (
      <div
        className="h-10 w-full rounded-2xl border border-slate-200"
        style={{ backgroundColor: token.value }}
        aria-hidden="true"
      />
    );
  }

  if (isSpacingValue(token.value)) {
    return (
      <div className="flex h-10 w-full items-center">
        <div className="h-2 rounded-full bg-primary" style={{ width: toPixelWidth(token.value) }} />
      </div>
    );
  }

  return (
    <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">{token.value}</code>
  );
}

TokenPreview.propTypes = {
  token: PropTypes.shape({
    value: PropTypes.string
  }).isRequired
};

function groupTokens(tokens) {
  const groups = new Map();
  tokens.forEach((token) => {
    if (!groups.has(token.group)) {
      groups.set(token.group, []);
    }
    groups.get(token.group).push(token);
  });
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function filterTokens(tokens, { mode, query }) {
  const lowerQuery = query.trim().toLowerCase();
  return tokens.filter((token) => {
    if (token.mode !== mode) {
      return false;
    }
    if (!lowerQuery) {
      return true;
    }
    return token.name.toLowerCase().includes(lowerQuery) || token.group.toLowerCase().includes(lowerQuery);
  });
}

export default function DesignTokenPlayground({ catalog, insights = { insights: [] } }) {
  const [mode, setMode] = useState('light');
  const [query, setQuery] = useState('');

  const tokens = useMemo(() => {
    if (Array.isArray(catalog?.tokens)) {
      return catalog.tokens;
    }
    if (Array.isArray(catalog?.tokens?.tokens)) {
      return catalog.tokens.tokens;
    }
    return [];
  }, [catalog]);

  const summary = catalog?.summary ?? {};
  const summaryByMode = summary.modeCounts ?? summary.byMode ?? {};
  const summaryByGroup = summary.groupCounts ?? summary.byGroup ?? {};

  const filteredTokens = useMemo(() => filterTokens(tokens, { mode, query }), [tokens, mode, query]);
  const groupedTokens = useMemo(() => groupTokens(filteredTokens), [filteredTokens]);

  const availableModes = useMemo(() => Array.from(new Set(tokens.map((token) => token.mode))), [tokens]);

  const filteredInsights = useMemo(() => {
    if (!Array.isArray(insights?.insights)) {
      return [];
    }
    return insights.insights.filter((insight) =>
      (insight.tags ?? []).some((tag) => catalog?.researchByTag?.[tag]?.length)
    );
  }, [insights, catalog]);

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur"
      aria-labelledby="design-token-playground"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Design System</p>
          <h2 id="design-token-playground" className="text-2xl font-semibold text-slate-900">
            Cross-platform token catalogue
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Tokens are synchronised from <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">tokens.css</code> into
            API clients, documentation, and Flutter themes. Filter by mode to preview light and dark palettes used by Annex A55.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600" htmlFor="token-search">
            <span>Search</span>
            <input
              id="token-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tokens"
              className="h-9 rounded-full border border-slate-200 px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </label>
          <div className="flex gap-2">
            {availableModes.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setMode(entry)}
                className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${mode === entry ? 'bg-primary text-white shadow' : 'bg-slate-100 text-slate-600'}`}
              >
                {entry.charAt(0).toUpperCase() + entry.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {groupedTokens.length ? (
            <div className="space-y-6">
              {groupedTokens.map(([group, groupTokens]) => (
                <div key={group} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</h3>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {groupTokens.map((token) => (
                      <article
                        key={`${token.mode}-${token.name}`}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{token.mode}</p>
                          <p className="text-sm font-semibold text-slate-700">{token.name}</p>
                        </div>
                        <TokenPreview token={token} />
                        <code className="text-xs text-slate-500">{token.value}</code>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No tokens match the current filters.
            </p>
          )}
        </div>
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <dt>Total tokens</dt>
                <dd className="font-semibold text-slate-900">{summary.total ?? tokens.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">By mode</dt>
                <dd className="mt-1 space-y-1 text-xs text-slate-500">
                  {Object.entries(summaryByMode).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">By group</dt>
                <dd className="mt-1 space-y-1 text-xs text-slate-500">
                  {Object.entries(summaryByGroup).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="truncate pr-2">{key}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
          {filteredInsights.length ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">UX research signals</h3>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                {filteredInsights.map((insight) => (
                  <li key={insight.id} className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {insight.area}
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">{insight.summary}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Methods: {(insight.researchMethods ?? []).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

DesignTokenPlayground.propTypes = {
  catalog: PropTypes.shape({
    tokens: PropTypes.oneOfType([
      PropTypes.arrayOf(
        PropTypes.shape({
          mode: PropTypes.string,
          group: PropTypes.string,
          name: PropTypes.string,
          value: PropTypes.string
        })
      ),
      PropTypes.shape({
        tokens: PropTypes.arrayOf(
          PropTypes.shape({
            mode: PropTypes.string,
            group: PropTypes.string,
            name: PropTypes.string,
            value: PropTypes.string
          })
        )
      })
    ]).isRequired,
    summary: PropTypes.shape({
      total: PropTypes.number,
      byMode: PropTypes.object,
      byGroup: PropTypes.object,
      modeCounts: PropTypes.object,
      groupCounts: PropTypes.object
    }),
    researchByTag: PropTypes.object
  }).isRequired,
  insights: PropTypes.shape({
    insights: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        area: PropTypes.string.isRequired,
        summary: PropTypes.string.isRequired,
        researchMethods: PropTypes.arrayOf(PropTypes.string),
        tags: PropTypes.arrayOf(PropTypes.string)
      })
    )
  })
};
