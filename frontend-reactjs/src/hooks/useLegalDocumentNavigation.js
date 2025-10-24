import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

function normaliseSections(sections) {
  if (!Array.isArray(sections)) {
    return [];
  }
  return sections.filter((section) => section && typeof section.id === 'string' && section.id.length > 0);
}

export default function useLegalDocumentNavigation({
  sections,
  intersectionRootMargin = '-40% 0px -45% 0px',
  intersectionThreshold = 0.2
}) {
  const normalisedSections = useMemo(() => normaliseSections(sections), [sections]);
  const sectionIds = useMemo(() => normalisedSections.map((section) => section.id), [normalisedSections]);
  const initialSection = sectionIds[0] ?? null;
  const { hash } = useLocation();
  const [activeSection, setActiveSection] = useState(initialSection);

  const scrollToSection = useCallback(
    (id) => {
      if (typeof window === 'undefined' || !id) {
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
        // Ignore history update failures in non-browser environments.
      }
    },
    [setActiveSection]
  );

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

  useEffect(() => {
    if (!hash) {
      return;
    }
    const targetId = hash.replace('#', '');
    if (!sectionIds.includes(targetId)) {
      return;
    }

    const timer = setTimeout(() => {
      scrollToSection(targetId);
    }, 100);

    return () => clearTimeout(timer);
  }, [hash, sectionIds, scrollToSection]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observers = [];

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { rootMargin: intersectionRootMargin, threshold: intersectionThreshold }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [sectionIds, intersectionRootMargin, intersectionThreshold]);

  useEffect(() => {
    if (initialSection && !activeSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection, activeSection]);

  return {
    activeSection,
    scrollToSection,
    handleAnchorClick,
    handleMobileSelect,
    setActiveSection
  };
}
