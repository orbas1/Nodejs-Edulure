import { useEffect, useId, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import SearchBar from '../SearchBar.jsx';
import useGlobalSearchSuggestions from '../../hooks/useGlobalSearchSuggestions.js';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function HighlightedText({ segments }) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  return (
    <span className="text-slate-600">
      {segments.map((segment, index) =>
        segment.isMatch ? (
          <mark key={`match-${index}`} className="rounded bg-primary/10 px-0.5 text-primary">
            {segment.text}
          </mark>
        ) : (
          <span key={`text-${index}`}>{segment.text}</span>
        )
      )}
    </span>
  );
}

HighlightedText.propTypes = {
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired,
      isMatch: PropTypes.bool.isRequired
    })
  )
};

HighlightedText.defaultProps = {
  segments: []
};

export default function GlobalSearchBar({
  value,
  onChange,
  onSubmit,
  onSuggestionSelect,
  entityTypes,
  suggestionLimit,
  className,
  placeholder,
  searchLoading
}) {
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const listboxId = useId();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    savedSearches,
    savedSearchLoading,
    savedSearchError,
    isAuthenticated
  } = useGlobalSearchSuggestions({ entityTypes, limit: suggestionLimit });

  const controlled = value !== undefined;
  const currentQuery = controlled ? value : query;
  const trimmedQuery = currentQuery?.trim?.() ?? '';

  useEffect(() => {
    if (controlled) {
      setQuery(value ?? '');
    }
  }, [controlled, setQuery, value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setIsPanelOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const suggestionOptions = useMemo(() => {
    return (suggestions ?? []).map((item) => ({ kind: 'suggestion', data: item }));
  }, [suggestions]);

  const savedSearchOptions = useMemo(() => {
    return (savedSearches ?? []).map((item) => ({ kind: 'saved', data: item }));
  }, [savedSearches]);

  const options = useMemo(() => {
    if (trimmedQuery.length >= 2) {
      return suggestionOptions;
    }
    return savedSearchOptions;
  }, [savedSearchOptions, suggestionOptions, trimmedQuery.length]);

  useEffect(() => {
    setActiveIndex(options.length ? 0 : -1);
  }, [options.length]);

  const combinedLoading = loading || searchLoading;

  const showPanel = isPanelOpen && (options.length > 0 || combinedLoading || error || savedSearchError);

  const notifyChange = (nextValue, event) => {
    onChange?.(nextValue, event);
    if (!controlled) {
      setQuery(nextValue);
    }
  };

  const handleInputChange = (nextValue, event) => {
    notifyChange(nextValue, event);
    setIsPanelOpen(true);
  };

  const handleInputFocus = () => {
    setIsPanelOpen(true);
  };

  const handleClear = () => {
    notifyChange('', null);
    setActiveIndex(-1);
  };

  const commitSearch = (searchValue, event) => {
    const trimmed = (searchValue ?? '').trim();
    onSubmit?.(trimmed, event);
    if (!controlled) {
      setQuery(trimmed);
    }
    setIsPanelOpen(false);
    setActiveIndex(-1);
  };

  const handleInputSubmit = (event, submittedValue) => {
    commitSearch(submittedValue, event);
  };

  const handleSuggestionSelection = (option) => {
    if (!option) return;
    if (option.kind === 'saved') {
      const queryValue = option.data.query ?? option.data.name;
      commitSearch(queryValue, null);
      onSuggestionSelect?.({ ...option.data, kind: 'saved' });
      return;
    }

    commitSearch(option.data.title ?? option.data.query ?? '', null);
    onSuggestionSelect?.({ ...option.data, kind: 'suggestion' });
  };

  const handleKeyDown = (event) => {
    if (!showPanel || !options.length) {
      if (event.key === 'ArrowDown' && options.length) {
        setIsPanelOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= options.length ? 0 : next;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? options.length - 1 : next;
      });
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < options.length) {
        event.preventDefault();
        handleSuggestionSelection(options[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      setIsPanelOpen(false);
      setActiveIndex(-1);
    }
  };

  const renderSuggestion = (option, index) => {
    const { data } = option;
    const isActive = index === activeIndex;
    return (
      <button
        key={`suggestion-${data.entity}-${data.id}`}
        type="button"
        role="option"
        aria-selected={isActive}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => handleSuggestionSelection(option)}
        className={classNames(
          'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition',
          isActive ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100'
        )}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          {data.previewMedia?.src ? (
            <img
              src={data.previewMedia.src}
              alt={data.previewMedia.alt ?? data.title ?? 'Result preview'}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold uppercase text-slate-400">{data.entity?.slice(0, 2)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{data.title ?? 'Untitled result'}</p>
          {data.highlight ? (
            <p className="truncate text-xs text-slate-600">
              <HighlightedText segments={data.highlight.segments} />
            </p>
          ) : (
            <p className="truncate text-xs text-slate-500">{data.subtitle}</p>
          )}
          {Array.isArray(data.tags) && data.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {data.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderSaved = (option, index) => {
    const { data } = option;
    const isActive = index === activeIndex;
    return (
      <button
        key={`saved-${data.id ?? data.name}`}
        type="button"
        role="option"
        aria-selected={isActive}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => handleSuggestionSelection(option)}
        className={classNames(
          'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition',
          isActive ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100'
        )}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold uppercase tracking-wide text-primary">
          Pin
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{data.name}</p>
          <p className="truncate text-xs text-slate-500">{data.query || 'Saved filters'}</p>
        </div>
      </button>
    );
  };

  return (
    <div ref={containerRef} className={classNames('relative', className)}>
      <SearchBar
        value={currentQuery}
        onChange={handleInputChange}
        onSubmit={handleInputSubmit}
        loading={combinedLoading}
        placeholder={placeholder}
        allowClear
        onClear={handleClear}
        inputRef={inputRef}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
      />
      {showPanel && (
        <div
          role="listbox"
          id={listboxId}
          aria-label="Search suggestions"
          className="absolute left-0 right-0 z-20 mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
        >
          {!isAuthenticated && (
            <div className="px-4 py-3 text-sm text-slate-600">
              Sign in to fetch personalised search suggestions.
            </div>
          )}
          {error && (
            <div className="px-4 py-3 text-sm text-red-500" role="alert">
              {error}
            </div>
          )}
          {savedSearchError && !trimmedQuery.length && (
            <div className="px-4 py-3 text-sm text-red-500" role="alert">
              {savedSearchError}
            </div>
          )}
          {combinedLoading && (
            <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
          )}
          {savedSearchLoading && !trimmedQuery.length && (
            <div className="px-4 py-3 text-sm text-slate-500">Loading saved searches…</div>
          )}
          {options.length === 0 && !combinedLoading && !savedSearchLoading && !error && !savedSearchError && (
            <div className="px-4 py-3 text-sm text-slate-500">No suggestions yet. Try a different keyword.</div>
          )}
          {options.map((option, index) =>
            option.kind === 'suggestion' ? renderSuggestion(option, index) : renderSaved(option, index)
          )}
        </div>
      )}
    </div>
  );
}

GlobalSearchBar.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onSuggestionSelect: PropTypes.func,
  entityTypes: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string
  ]),
  suggestionLimit: PropTypes.number,
  className: PropTypes.string,
  placeholder: PropTypes.string,
  searchLoading: PropTypes.bool
};

GlobalSearchBar.defaultProps = {
  value: undefined,
  onChange: undefined,
  onSubmit: undefined,
  onSuggestionSelect: undefined,
  entityTypes: undefined,
  suggestionLimit: 8,
  className: '',
  placeholder: 'Search the Edulure network',
  searchLoading: false
};
