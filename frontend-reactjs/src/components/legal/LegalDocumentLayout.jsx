import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';

import usePageMetadata from '../../hooks/usePageMetadata.js';

function extractSectionNumber(heading) {
  if (!heading) return null;
  const match = heading.match(/^(\d+)(?:\.|\))?/);
  return match ? match[1] : null;
}

export default function LegalDocumentLayout({
  pageTitle,
  meta,
  hero,
  introduction,
  summary,
  sections,
  footer
}) {
  const { hash } = useLocation();
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '');

  usePageMetadata(
    meta ?? {
      title: pageTitle,
      description: undefined,
      canonicalPath: undefined,
      analytics: { page_type: 'legal_content' }
    }
  );

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);

  const scrollToSection = useCallback(
    (id) => {
      if (typeof window === 'undefined') {
        return;
      }
      const element = document.getElementById(id);
      if (!element) {
        return;
      }
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      setActiveSection(id);
      try {
        const url = new URL(window.location.href);
        url.hash = `#${id}`;
        window.history.replaceState(null, '', url.toString());
      } catch (error) {
        console.warn('Failed to update history state', error);
      }
    },
    []
  );

  useEffect(() => {
    if (!hash) {
      return;
    }
    const targetId = hash.replace('#', '');
    if (sectionIds.includes(targetId)) {
      const timer = setTimeout(() => scrollToSection(targetId), 100);
      return () => clearTimeout(timer);
    }
  }, [hash, sectionIds, scrollToSection]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return undefined;
    }
    const observers = [];
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (!element) {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(section.id);
            }
          });
        },
        { rootMargin: '-40% 0px -45% 0px', threshold: 0.2 }
      );
      observer.observe(element);
      observers.push(observer);
    });
    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [sections]);

  const handleAnchorClick = useCallback(
    (event, id) => {
      event.preventDefault();
      scrollToSection(id);
    },
    [scrollToSection]
  );

  const handleMobileSelect = useCallback(
    (event) => {
      const { value } = event.target;
      if (value) {
        scrollToSection(value);
      }
    },
    [scrollToSection]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-16">
      {hero}
      {introduction}
      {summary}
      <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
        <nav
          className="hidden h-fit space-y-2 rounded-3xl border border-slate-200 bg-white/80 p-4 text-sm lg:block lg:sticky lg:top-32"
          aria-label="In-page navigation"
        >
          {sections.map((section) => {
            const sectionNumber = section.number ?? extractSectionNumber(section.heading);
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(event) => handleAnchorClick(event, section.id)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  activeSection === section.id ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                  {sectionNumber ?? '•'}
                </span>
                <span className="flex-1 leading-snug">{section.navTitle ?? section.heading.replace(/^[0-9]+\.\s*/, '')}</span>
              </a>
            );
          })}
        </nav>
        <div className="space-y-12">
          <div className="lg:hidden">
            <label htmlFor="legal-section-select" className="sr-only">
              Select a section
            </label>
            <select
              id="legal-section-select"
              value={activeSection}
              onChange={handleMobileSelect}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.heading}
                </option>
              ))}
            </select>
          </div>
          {sections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-36 space-y-5 rounded-3xl border border-transparent bg-white/80 p-6 shadow-[0_40px_80px_-70px_rgba(15,23,42,0.4)] transition hover:border-primary/20"
            >
              <header className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">Section</p>
                <h2 className="text-2xl font-semibold text-slate-900">{section.heading}</h2>
                {section.summary ? <p className="text-sm text-slate-600">{section.summary}</p> : null}
              </header>
              <div className="space-y-4 text-sm leading-7 text-slate-700">{section.content}</div>
            </article>
          ))}
          {footer}
        </div>
      </div>
    </div>
  );
}

LegalDocumentLayout.propTypes = {
  pageTitle: PropTypes.string.isRequired,
  meta: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    canonicalPath: PropTypes.string,
    structuredData: PropTypes.object,
    analytics: PropTypes.object
  }),
  hero: PropTypes.node,
  introduction: PropTypes.node,
  summary: PropTypes.node,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      heading: PropTypes.string.isRequired,
      number: PropTypes.string,
      navTitle: PropTypes.string,
      summary: PropTypes.node,
      content: PropTypes.node.isRequired
    })
  ).isRequired,
  footer: PropTypes.node
};

LegalDocumentLayout.defaultProps = {
  meta: undefined,
  hero: null,
  introduction: null,
  summary: null,
  footer: null
};
