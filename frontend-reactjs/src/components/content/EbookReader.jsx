import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
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

export default function EbookReader({ url, initialLocation, onProgress, asset }) {
  const viewerRef = useRef(null);
  const renditionRef = useRef(null);
  const bookRef = useRef(null);
  const [theme, setTheme] = useState('light');
  const [fontScale, setFontScale] = useState(100);
  const [isReady, setIsReady] = useState(false);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

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
    if (initialLocation) {
      renditionRef.current.display(initialLocation).catch((error) => {
        console.error('Failed to restore initial location', error);
      });
    }
  }, [initialLocation, isReady]);

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo('prev')}
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-primary hover:text-primary"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => goTo('next')}
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-primary hover:text-primary"
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <span>Font</span>
            <input
              type="range"
              min="80"
              max="140"
              step="5"
              value={fontScale}
              onChange={(event) => setFontScale(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-primary hover:text-primary"
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </div>
      <div ref={viewerRef} className="flex-1 bg-slate-100" />
      <footer className="border-t border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-500">
        {asset?.metadata?.ebook?.chapterCount ? `${asset.metadata.ebook.chapterCount} chapters` : 'Secure reader session active'}
      </footer>
    </div>
  );
}

EbookReader.propTypes = {
  url: PropTypes.string.isRequired,
  initialLocation: PropTypes.string,
  onProgress: PropTypes.func,
  asset: PropTypes.shape({
    metadata: PropTypes.shape({
      ebook: PropTypes.shape({
        chapterCount: PropTypes.number
      })
    })
  })
};
