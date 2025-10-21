import { useEffect, useMemo } from 'react';

const DEFAULT_BASE_URL = 'https://www.edulure.com';
const STRUCTURED_DATA_ELEMENT_ID = 'edulure-structured-data';

function resolveBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_BASE_URL;
}

function resolveCanonicalUrl(path) {
  if (!path) {
    if (typeof window !== 'undefined') {
      return window.location?.href ?? resolveBaseUrl();
    }
    return DEFAULT_BASE_URL;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = resolveBaseUrl();
  try {
    return new URL(path, base).toString();
  } catch (_error) {
    const normalisedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalisedPath}`;
  }
}

function ensureMeta(identifier, attribute = 'name') {
  if (typeof document === 'undefined') {
    return { element: null, existed: false };
  }
  const selector = `meta[${attribute}="${identifier}"]`;
  const existing = document.head.querySelector(selector);
  if (existing) {
    return { element: existing, existed: true };
  }
  const element = document.createElement('meta');
  element.setAttribute(attribute, identifier);
  document.head.appendChild(element);
  return { element, existed: false };
}

function ensureLink(rel) {
  if (typeof document === 'undefined') {
    return { element: null, existed: false };
  }
  const selector = `link[rel="${rel}"]`;
  const existing = document.head.querySelector(selector);
  if (existing) {
    return { element: existing, existed: true };
  }
  const element = document.createElement('link');
  element.setAttribute('rel', rel);
  document.head.appendChild(element);
  return { element, existed: false };
}

function normaliseStructuredData(structuredData) {
  if (!structuredData) {
    return null;
  }
  try {
    return JSON.stringify(structuredData);
  } catch (_error) {
    return null;
  }
}

function pushAnalyticsEvent(eventPayload) {
  if (typeof window === 'undefined') {
    return;
  }
  if (!eventPayload) {
    return;
  }
  try {
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }
    window.dataLayer.push(eventPayload);
  } catch (_error) {
    // Silently ignore analytics push failures to avoid impacting UX.
  }
}

export default function usePageMetadata({
  title,
  description,
  canonicalPath,
  image,
  robots,
  keywords,
  structuredData,
  analytics = {}
} = {}) {
  const structuredDataJson = useMemo(() => normaliseStructuredData(structuredData), [structuredData]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const previousTitle = document.title;
    const baseTitle = title ? String(title).trim() : 'Edulure';
    const effectiveTitle = baseTitle.includes('Edulure') ? baseTitle : `${baseTitle} · Edulure`;
    document.title = effectiveTitle;

    const canonicalUrl = resolveCanonicalUrl(canonicalPath);

    const updates = [];

    if (description !== undefined) {
      const { element, existed } = ensureMeta('description');
      if (element) {
        const previousContent = element.getAttribute('content');
        if (description === null) {
          element.removeAttribute('content');
        } else {
          element.setAttribute('content', description);
        }
        updates.push({ element, existed, previousContent });
      }
    }

    if (keywords !== undefined) {
      const { element, existed } = ensureMeta('keywords');
      if (element) {
        const previousContent = element.getAttribute('content');
        if (keywords === null) {
          element.removeAttribute('content');
        } else {
          element.setAttribute('content', Array.isArray(keywords) ? keywords.join(', ') : keywords);
        }
        updates.push({ element, existed, previousContent });
      }
    }

    const openGraphEntries = [
      ['og:title', effectiveTitle],
      ['og:description', description ?? null],
      ['og:url', canonicalUrl],
      ['twitter:title', effectiveTitle],
      ['twitter:description', description ?? null]
    ];

    if (image) {
      openGraphEntries.push(['og:image', image], ['twitter:image', image]);
    }

    openGraphEntries.forEach(([property, value]) => {
      if (value === undefined) {
        return;
      }
      const { element, existed } = ensureMeta(property, 'property');
      if (element) {
        const previousContent = element.getAttribute('content');
        if (value === null) {
          element.removeAttribute('content');
        } else {
          element.setAttribute('content', value);
        }
        updates.push({ element, existed, previousContent });
      }
    });

    if (image !== undefined) {
      const { element, existed } = ensureMeta('twitter:card', 'name');
      if (element) {
        const previousContent = element.getAttribute('content');
        if (image) {
          element.setAttribute('content', 'summary_large_image');
        } else {
          element.setAttribute('content', 'summary');
        }
        updates.push({ element, existed, previousContent });
      }
    }

    if (robots !== undefined) {
      const { element, existed } = ensureMeta('robots');
      if (element) {
        const previousContent = element.getAttribute('content');
        if (robots === null) {
          element.removeAttribute('content');
        } else {
          element.setAttribute('content', robots);
        }
        updates.push({ element, existed, previousContent });
      }
    }

    let canonicalLink;
    let canonicalLinkExisted = false;
    let previousCanonicalHref = null;
    if (canonicalUrl) {
      const ensured = ensureLink('canonical');
      canonicalLink = ensured.element;
      canonicalLinkExisted = ensured.existed;
      if (canonicalLink) {
        previousCanonicalHref = canonicalLink.getAttribute('href');
        canonicalLink.setAttribute('href', canonicalUrl);
      }
    }

    let structuredDataElement = null;
    let structuredDataExisted = false;
    let previousStructuredData = null;
    if (structuredDataJson !== null) {
      structuredDataElement = document.getElementById(STRUCTURED_DATA_ELEMENT_ID);
      if (structuredDataElement) {
        structuredDataExisted = true;
        previousStructuredData = structuredDataElement.textContent;
      } else {
        structuredDataElement = document.createElement('script');
        structuredDataElement.id = STRUCTURED_DATA_ELEMENT_ID;
        structuredDataElement.type = 'application/ld+json';
        document.head.appendChild(structuredDataElement);
      }
      structuredDataElement.textContent = structuredDataJson;
    }

    const analyticsPayload = analytics === false ? null : {
      event: 'page_view',
      page_title: effectiveTitle,
      page_description: description ?? '',
      page_path:
        canonicalPath ?? (typeof window !== 'undefined' ? window.location?.pathname ?? '' : ''),
      ...((analytics && typeof analytics === 'object') ? analytics : {})
    };
    if (analyticsPayload) {
      pushAnalyticsEvent(analyticsPayload);
    }

    return () => {
      document.title = previousTitle;
      updates.forEach(({ element, existed, previousContent }) => {
        if (!element) {
          return;
        }
        if (!existed) {
          element.remove();
          return;
        }
        if (previousContent === null || previousContent === undefined) {
          element.removeAttribute('content');
        } else {
          element.setAttribute('content', previousContent);
        }
      });
      if (canonicalLink) {
        if (!canonicalLinkExisted) {
          canonicalLink.remove();
        } else if (previousCanonicalHref !== null) {
          canonicalLink.setAttribute('href', previousCanonicalHref);
        } else {
          canonicalLink.removeAttribute('href');
        }
      }
      if (structuredDataElement) {
        if (!structuredDataExisted) {
          structuredDataElement.remove();
        } else {
          structuredDataElement.textContent = previousStructuredData ?? '';
        }
      }
    };
  }, [
    title,
    description,
    canonicalPath,
    image,
    robots,
    keywords,
    structuredDataJson,
    analytics
  ]);
}
