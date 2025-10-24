import { useCallback, useEffect, useMemo, useState } from 'react';

import designSystemApi from '../../api/designSystemApi.js';

function TokenRow({ token, onCopy }) {
  const isColor = token.type === 'color';
  const isGradient = token.type === 'gradient';
  const isShadow = token.type === 'shadow';
  const swatchStyle = useMemo(() => {
    if (isColor) {
      return { background: token.value };
    }
    if (isGradient) {
      return { backgroundImage: token.value };
    }
    if (isShadow) {
      return { boxShadow: token.value, background: 'white' };
    }
    return null;
  }, [isColor, isGradient, isShadow, token.value]);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{token.name}</p>
        <p className="mt-1 text-xs text-slate-500">{token.value}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{token.type}</p>
      </div>
      <div className="flex items-center gap-3">
        {swatchStyle ? (
          <span
            aria-hidden="true"
            className="h-10 w-10 rounded-full border border-slate-200"
            style={swatchStyle}
          />
        ) : null}
        <button
          type="button"
          onClick={() => onCopy(token.name)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          Copy name
        </button>
        <button
          type="button"
          onClick={() => onCopy(token.value)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          Copy value
        </button>
      </div>
    </li>
  );
}

function PreviewCard({ attributes }) {
  return (
    <div
      className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm transition"
      data-theme={attributes.theme}
      data-contrast={attributes.contrast}
      data-density={attributes.density}
      data-radius={attributes.radius}
    >
      <div
        className="rounded-3xl border border-slate-200 p-6 shadow"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Navigation preview
        </p>
        <h3 className="mt-2 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
          Design token alignment
        </h3>
        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-subtle)' }}>
          Cards inherit shared spacing (<code>--space-6</code>), border radii (<code>--radius-xl</code>),
          and primary accents (<code>--color-primary</code>) to stay consistent across handbook and
          dashboard surfaces.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow"
            style={{
              background: 'var(--color-primary)',
              boxShadow: 'var(--shadow-cta)'
            }}
          >
            Primary CTA
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: 'var(--color-primary-soft)',
              color: 'var(--color-primary)'
            }}
          >
            Secondary
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div
            className="rounded-2xl border border-slate-200 p-4"
            style={{ background: 'var(--color-surface-subtle)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Metrics
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text)' }}>
              Streak retention improved by <strong>12%</strong> post token rollout.
            </p>
          </div>
          <div
            className="rounded-2xl border border-slate-200 p-4"
            style={{ background: 'var(--color-surface-subtle)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              QA checklist
            </p>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--color-text-subtle)' }}>
              <li>Focus ring respects <code>--shadow-focus-ring</code></li>
              <li>Skeleton loaders reuse <code>--skeleton-base</code></li>
              <li>Form controls adopt <code>--form-field-border</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesignSystemPlayground() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const [themeMode, setThemeMode] = useState('light');
  const [highContrast, setHighContrast] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);
  const [radiusMode, setRadiusMode] = useState('base');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    designSystemApi
      .fetchTokens({ signal: controller.signal })
      .then((data) => {
        setState({ status: 'loaded', data, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ status: 'error', data: null, error });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }
    const id = setTimeout(() => setFeedback(null), 2200);
    return () => clearTimeout(id);
  }, [feedback]);

  const manifest = state.data ?? { metadata: {}, groups: [], overrides: {} };
  const groups = manifest.groups ?? [];

  const handleCopy = useCallback(async (value) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setFeedback(`Copied ${value}`);
    } catch (error) {
      setFeedback('Unable to copy to clipboard');
      console.error('Failed to copy token to clipboard', error);
    }
  }, []);

  const previewAttributes = useMemo(() => ({
    theme: themeMode === 'dark' ? 'dark' : undefined,
    contrast: highContrast ? 'high' : undefined,
    density: compactDensity ? 'compact' : undefined,
    radius: radiusMode !== 'base' ? radiusMode : undefined
  }), [themeMode, highContrast, compactDensity, radiusMode]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="space-y-3 text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Annex A55</p>
        <h1 className="text-3xl font-semibold text-slate-900">Design system token playground</h1>
        <p className="text-sm text-slate-600">
          Inspect the canonical token manifest backing navigation remediation. Toggle themes, contrast, and density to preview
          how CSS variables flow through Annex components.
        </p>
        {manifest.metadata?.version ? (
          <span className="inline-flex h-9 items-center justify-center rounded-full bg-primary/10 px-4 text-[11px] font-semibold uppercase tracking-wide text-primary">
            Version {manifest.metadata.version}
          </span>
        ) : null}
      </header>

      {state.status === 'loading' ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
          Loading design system tokens…
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-600">
          Unable to load design system tokens. Try refreshing the page.
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <header className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Live preview</h2>
            <p className="text-sm text-slate-600">
              Apply token overrides to the preview card to validate palette, radius, and density combinations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Theme
              <select
                className="mt-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                value={themeMode}
                onChange={(event) => setThemeMode(event.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/60"
                checked={highContrast}
                onChange={(event) => setHighContrast(event.target.checked)}
              />
              High contrast
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/60"
                checked={compactDensity}
                onChange={(event) => setCompactDensity(event.target.checked)}
              />
              Compact density
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Radius
              <select
                className="mt-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                value={radiusMode}
                onChange={(event) => setRadiusMode(event.target.value)}
              >
                <option value="base">Base</option>
                <option value="soft">Soft</option>
                <option value="sharp">Sharp</option>
              </select>
            </label>
          </div>
        </header>
        <div className="mt-6">
          <PreviewCard attributes={previewAttributes} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Token catalogue</h2>
        <p className="text-sm text-slate-600">
          {groups.length} token groups sourced from <code>docs/design-system/tokens.json</code>.
        </p>
        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`group-${group.id}`} className="rounded-2xl border border-slate-100 p-5">
              <header className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 id={`group-${group.id}`} className="text-base font-semibold text-slate-900">
                    {group.title}
                  </h3>
                  {group.description ? (
                    <p className="text-sm text-slate-600">{group.description}</p>
                  ) : null}
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.tokens?.length ?? 0} tokens
                </span>
              </header>
              <ul className="mt-4 space-y-3">
                {(group.tokens ?? []).map((token) => (
                  <TokenRow key={`${group.id}-${token.name}`} token={token} onCopy={handleCopy} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      {feedback ? (
        <div className="fixed bottom-6 right-6 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
