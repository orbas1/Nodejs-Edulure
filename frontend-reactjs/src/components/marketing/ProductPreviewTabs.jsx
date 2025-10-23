import { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import HomeSection from '../home/HomeSection.jsx';

const DEFAULT_TAB_KEY = 0;

export default function ProductPreviewTabs({
  helper,
  title,
  subtitle,
  cta,
  footnote,
  tablistLabel,
  tabs
}) {
  const [activeKey, setActiveKey] = useState(tabs[DEFAULT_TAB_KEY]?.key ?? null);
  const tabRefs = useRef({});

  const tabOrder = useMemo(() => tabs.map((tab) => tab.key), [tabs]);

  const getTabId = (key) => `product-preview-tab-${key}`;
  const getPanelId = (key) => `product-preview-tabpanel-${key}`;

  const activateTab = (key) => {
    setActiveKey(key);
    const node = tabRefs.current[key];
    if (node) {
      node.focus();
    }
  };

  const handleKeyDown = (event, currentKey) => {
    const currentIndex = tabOrder.indexOf(currentKey);
    if (currentIndex === -1) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % tabOrder.length;
      activateTab(tabOrder[nextIndex]);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
      activateTab(tabOrder[prevIndex]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      activateTab(tabOrder[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      activateTab(tabOrder[tabOrder.length - 1]);
    }
  };

  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <HomeSection className="grid gap-12 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-8">
          <div className="space-y-4">
            {helper ? (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{helper}</p>
            ) : null}
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{title}</h2>
            {subtitle ? <p className="text-base text-slate-600">{subtitle}</p> : null}
          </div>
          <div
            className="flex flex-col gap-3"
            role="tablist"
            aria-label={tablistLabel}
            aria-orientation="vertical"
          >
            {tabs.map((tab) => {
              const isActive = tab.key === activeKey;
              const tabId = getTabId(tab.key);
              const panelId = getPanelId(tab.key);
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveKey(tab.key)}
                  onKeyDown={(event) => handleKeyDown(event, tab.key)}
                  ref={(element) => {
                    if (element) {
                      tabRefs.current[tab.key] = element;
                    } else {
                      delete tabRefs.current[tab.key];
                    }
                  }}
                  className={`relative overflow-hidden rounded-2xl border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border-transparent bg-gradient-to-r from-primary/10 via-white to-white shadow-[0_12px_40px_-20px_rgba(79,70,229,0.6)]'
                      : 'border-slate-200 bg-white/70 hover:border-primary/40 hover:bg-white'
                  }`}
                  role="tab"
                  id={tabId}
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{tab.label}</p>
                      {tab.caption ? <p className="text-xs text-slate-500">{tab.caption}</p> : null}
                    </div>
                    <span
                      className={`h-10 w-10 rounded-full bg-gradient-to-br ${tab.accent ?? 'from-primary to-primary/40'} opacity-70 transition ${
                        isActive ? 'scale-100' : 'scale-95'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  {isActive ? (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500">
            {footnote ? <p>{footnote}</p> : <span />}
            {cta ? (
              <Link
                to={cta.to}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-dark"
              >
                {cta.label}
                <span aria-hidden="true">↗</span>
              </Link>
            ) : null}
          </div>
        </aside>
        <div className="relative">
          {tabs.map((tab) => {
            const isActive = tab.key === activeKey;
            const tabId = getTabId(tab.key);
            const panelId = getPanelId(tab.key);
            return (
              <div
                key={panelId}
                className="relative"
                role="tabpanel"
                id={panelId}
                aria-labelledby={tabId}
                tabIndex={isActive ? 0 : -1}
                hidden={!isActive}
              >
                <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
                <div className="absolute -right-6 top-12 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-[140px]" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-[2.75rem] border border-slate-200 bg-white shadow-[0_40px_120px_-45px_rgba(15,23,42,0.45)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10" aria-hidden="true" />
                  {tab.image ? (
                    <img
                      src={tab.image.src}
                      alt={tab.image.alt}
                      className="relative block h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-slate-900/70 p-4 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)] backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">{tab.label}</p>
                    {tab.caption ? <p className="mt-2 text-lg font-semibold text-white">{tab.caption}</p> : null}
                    {tab.description ? <p className="mt-2 text-sm text-white/75">{tab.description}</p> : null}
                  </div>
                </div>
                {tab.highlights?.length ? (
                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {tab.highlights.map((highlight) => (
                      <div
                        key={highlight}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-card"
                      >
                        <CheckCircleIcon className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                        <p className="text-sm font-medium text-slate-700">{highlight}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </HomeSection>
    </section>
  );
}

const highlightShape = PropTypes.arrayOf(PropTypes.string);

const tabShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  caption: PropTypes.string,
  description: PropTypes.string,
  highlights: highlightShape,
  accent: PropTypes.string,
  image: PropTypes.shape({
    src: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired
  })
});

ProductPreviewTabs.propTypes = {
  helper: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  cta: PropTypes.shape({
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
  }),
  footnote: PropTypes.string,
  tablistLabel: PropTypes.string.isRequired,
  tabs: PropTypes.arrayOf(tabShape).isRequired
};

ProductPreviewTabs.defaultProps = {
  helper: undefined,
  subtitle: undefined,
  cta: null,
  footnote: undefined
};
