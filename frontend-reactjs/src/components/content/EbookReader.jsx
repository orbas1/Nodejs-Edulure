import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import ePub from 'epubjs';

const THEMES = {
  light: {
    body: {
      background: '#f8fafc',
      color: '#0f172a'
    }
  },
  dark: {
    body: {
      background: '#0f172a',
      color: '#f8fafc'
    }
  }
};

const STORAGE_NAMESPACE = 'edulure.ebook.progress';

function resolveStorageKey(asset, url) {
  const identifier =
    asset?.id ?? asset?.slug ?? asset?.metadata?.ebook?.id ?? asset?.metadata?.id ?? url;
  if (!identifier) {
    return null;
  }
  return `${STORAGE_NAMESPACE}:${identifier}`;
}

export default function EbookReader({ url, initialLocation, onProgress, asset }) {
  const viewerRef = useRef(null);
  const renditionRef = useRef(null);
  const bookRef = useRef(null);
  const [theme, setTheme] = useState('light');
  const [fontScale, setFontScale] = useState(100);
  const [isReady, setIsReady] = useState(false);
  const onProgressRef = useRef(onProgress);
  const [progress, setProgress] = useState({ cfi: null, percentage: 0 });
  const [storedLocation, setStoredLocation] = useState(null);

  const storageKey = useMemo(() => resolveStorageKey(asset, url), [asset, url]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) {
      setStoredLocation(null);
      return;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setStoredLocation(null);
        return;
      }
      const parsed = JSON.parse(stored);
      setStoredLocation(parsed?.cfi ?? null);
    } catch (error) {
      console.warn('Unable to restore ebook location from storage', error);
      setStoredLocation(null);
    }
  }, [storageKey]);

  useEffect(() => {
    const book = ePub(url);
    bookRef.current = book;
    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'always',
      flow: 'paginated'
    });
    renditionRef.current = rendition;

    Object.entries(THEMES).forEach(([key, styles]) => {
      rendition.themes.register(key, styles);
    });

    const handleRelocated = (location) => {
      if (!location) return;
      const cfi = location.start?.cfi;
      let percentage = 0;
      if (book.locations && typeof book.locations.percentageFromCfi === 'function') {
        try {
          percentage = book.locations.percentageFromCfi(cfi) * 100;
        } catch (error) {
          percentage = 0;
        }
      }
      setProgress({ cfi: cfi ?? null, percentage: Number.isFinite(percentage) ? percentage : 0 });
      onProgressRef.current?.({ cfi, percentage });
    };

    rendition.on('relocated', handleRelocated);

    book.ready
      .then(() => book.locations.generate(600))
      .then(() => {
        setIsReady(true);
        return rendition.display();
      })
      .catch((error) => {
        console.error('Failed to load ebook rendition', error);
      });

    return () => {
      rendition.off('relocated', handleRelocated);
      rendition.destroy();
      book.destroy();
      setIsReady(false);
    };
  }, [url]);

  useEffect(() => {
    if (!renditionRef.current || !isReady) {
      return;
    }

    const locationToRestore = initialLocation || storedLocation;
    if (!locationToRestore) {
      return;
    }

    renditionRef.current.display(locationToRestore).catch((error) => {
      console.error('Failed to restore reader location', error);
    });
  }, [initialLocation, storedLocation, isReady]);

  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) {
      return;
    }
    if (!progress.cfi) {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ cfi: progress.cfi, percentage: progress.percentage }));
    } catch (error) {
      console.warn('Unable to persist ebook progress', error);
    }
  }, [progress.cfi, progress.percentage, storageKey]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontScale}%`);
    }
  }, [fontScale]);

  const goTo = (direction) => {
    if (!renditionRef.current) return;
    if (direction === 'prev') {
      renditionRef.current.prev();
    } else {
      renditionRef.current.next();
    }
  };

  const progressLabel = useMemo(() => {
    if (!progress.percentage) {
      return 'Secure reader session active';
    }
    const rounded = Math.round(progress.percentage);
    return `${rounded}% complete`;
  }, [progress.percentage]);

  const headerTitle =
    asset?.metadata?.ebook?.title || asset?.title || asset?.originalFilename || 'Secure ebook session';

  const headerSubtitle = asset?.metadata?.ebook?.author || asset?.metadata?.author || asset?.uploader || null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-left">
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">E-book session</span>
          <span className="text-base font-semibold text-slate-900">{headerTitle}</span>
          {headerSubtitle ? <span className="text-xs font-medium normal-case text-slate-500">{headerSubtitle}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <button
            type="button"
            onClick={() => goTo('prev')}
            aria-label="Go to previous page"
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => goTo('next')}
            aria-label="Go to next page"
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Next
          </button>
          <label className="flex items-center gap-2" htmlFor="ebook-font-scale">
            <span>Font</span>
            <input
              type="range"
              min="80"
              max="140"
              step="5"
              value={fontScale}
              onChange={(event) => setFontScale(Number(event.target.value))}
              id="ebook-font-scale"
              className="accent-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            aria-pressed={theme === 'dark'}
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </div>
      <div ref={viewerRef} className="flex-1 bg-slate-100" />
      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-500">
        <span>{asset?.metadata?.ebook?.chapterCount ? `${asset.metadata.ebook.chapterCount} chapters` : 'Encrypted distribution enabled'}</span>
        <span aria-live="polite" className="font-semibold text-slate-600">
          {progressLabel}
        </span>
      </footer>
    </div>
  );
}

EbookReader.propTypes = {
  url: PropTypes.string.isRequired,
  initialLocation: PropTypes.string,
  onProgress: PropTypes.func,
  asset: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    slug: PropTypes.string,
    title: PropTypes.string,
    originalFilename: PropTypes.string,
    metadata: PropTypes.shape({
      ebook: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        chapterCount: PropTypes.number,
        title: PropTypes.string,
        author: PropTypes.string
      }),
      author: PropTypes.string,
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  })
};
