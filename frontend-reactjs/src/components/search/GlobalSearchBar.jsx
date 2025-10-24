import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import SearchBar from '../SearchBar.jsx';
import { useGlobalSearchSuggestions } from '../../hooks/useGlobalSearchSuggestions.js';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const RECENT_QUERY_KEY = 'edulure.global-search.recents';

function loadRecents() {
  try {
    const raw = window.localStorage.getItem(RECENT_QUERY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to load recent global searches', error);
    return [];
  }
}

function persistRecents(recents) {
  try {
    window.localStorage.setItem(RECENT_QUERY_KEY, JSON.stringify(recents));
  } catch (error) {
    console.warn('Unable to persist recent global searches', error);
  }
}

function renderSuggestionPreview(suggestion) {
  if (suggestion?.preview?.thumbnailUrl) {
    return (
      <img
        src={suggestion.preview.thumbnailUrl}
        alt=""
        className="h-10 w-10 rounded-xl object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" aria-hidden="true" />
  );
}

function SuggestionItem({ suggestion, isActive, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
      className={classNames(
        'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
      )}
    >
      {renderSuggestionPreview(suggestion)}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{suggestion.label}</span>
        {suggestion.preview?.subtitle ? (
          <span className="truncate text-xs text-slate-400">{suggestion.preview.subtitle}</span>
        ) : null}
        {suggestion.metadata?.searches ? (
          <span className="truncate text-[11px] text-slate-400">
            {suggestion.metadata.searches} searches this week
          </span>
        ) : null}
      </div>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {suggestion.type.replace('-', ' ')}
      </span>
    </button>
  );
}

SuggestionItem.propTypes = {
  suggestion: PropTypes.shape({
    label: PropTypes.string.isRequired,
    preview: PropTypes.shape({
      thumbnailUrl: PropTypes.string,
      subtitle: PropTypes.string
    }),
    metadata: PropTypes.object,
    type: PropTypes.string.isRequired
  }).isRequired,
  isActive: PropTypes.bool,
  onSelect: PropTypes.func.isRequired
};

SuggestionItem.defaultProps = {
  isActive: false
};

export default function GlobalSearchBar({
  value,
  defaultValue,
  onChange,
  onSubmit,
  onSuggestionSelect,
  placeholder = 'Search courses, tutors, communities…',
  loading: externalLoading = false,
  className,
  suggestionsLimit = 8
}) {
  const [internalValue, setInternalValue] = useState(value ?? defaultValue ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const loadedRef = useRef(false);
  const [recentQueries, setRecentQueries] = useState(() => (typeof window !== 'undefined' ? loadRecents() : []));

  const {
    suggestions,
    loading: suggestionLoading,
    error,
    refresh
  } = useGlobalSearchSuggestions({ auto: false, limit: suggestionsLimit });

  const combinedLoading = externalLoading || suggestionLoading;
  const displayedSuggestions = useMemo(
    () => suggestions.slice(0, suggestionsLimit),
    [suggestions, suggestionsLimit]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistRecents(recentQueries);
  }, [recentQueries]);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFocus = () => {
    setIsOpen(true);
    if (!loadedRef.current) {
      refresh();
      loadedRef.current = true;
    }
  };

  const handleChange = (next, event) => {
    if (value === undefined) {
      setInternalValue(next);
    }
    setActiveIndex(-1);
    onChange?.(next, event);
  };

  const submitValue = (input) => {
    const trimmed = (input ?? '').trim();
    if (trimmed.length === 0) {
      return;
    }
    setRecentQueries((prev) => {
      const next = prev.filter((query) => query !== trimmed);
      next.unshift(trimmed);
      return next.slice(0, 5);
    });
    onSubmit?.(trimmed);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleSubmit = (event, submittedValue) => {
    event?.preventDefault();
    submitValue(submittedValue ?? internalValue);
  };

  const handleSuggestionSelect = (suggestion) => {
    if (!suggestion) return;
    const result = onSuggestionSelect?.(suggestion);
    const query = suggestion.query ?? suggestion.label ?? '';
    if (result !== false) {
      if (value === undefined) {
        setInternalValue(query);
      }
      submitValue(query);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen || !displayedSuggestions.length) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % displayedSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + displayedSuggestions.length) % displayedSuggestions.length);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      handleSuggestionSelect(displayedSuggestions[activeIndex]);
    }
  };

  return (
    <div className={classNames('relative', className)} ref={containerRef} onKeyDown={handleKeyDown}>
      <SearchBar
        value={internalValue}
        onChange={handleChange}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        loading={combinedLoading}
        onClear={() => {
          if (value === undefined) {
            setInternalValue('');
          }
          onChange?.('', null);
        }}
        allowClear
        onFocus={handleFocus}
      />
      {isOpen ? (
        <div className="absolute left-0 right-0 z-40 mt-2">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur">
            {combinedLoading && !displayedSuggestions.length ? (
              <ul className="space-y-2" role="listbox">
                {[...Array(3)].map((_, index) => (
                  <li key={index} className="flex items-center gap-3 rounded-2xl px-3 py-2">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {!combinedLoading && displayedSuggestions.length ? (
              <ul className="space-y-2" role="listbox">
                {displayedSuggestions.map((suggestion, index) => (
                  <li key={suggestion.id ?? `${suggestion.type}-${index}`}>
                    <SuggestionItem
                      suggestion={suggestion}
                      isActive={index === activeIndex}
                      onSelect={handleSuggestionSelect}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
            {!combinedLoading && !displayedSuggestions.length ? (
              <div className="space-y-2">
                {recentQueries.length ? (
                  <>
                    <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent searches</p>
                    <ul className="space-y-1">
                      {recentQueries.map((recent) => (
                        <li key={recent}>
                          <button
                            type="button"
                            className="w-full rounded-2xl px-3 py-2 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-primary"
                            onClick={() => submitValue(recent)}
                          >
                            {recent}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-primary hover:text-primary"
                      onClick={() => setRecentQueries([])}
                    >
                      Clear history
                    </button>
                  </>
                ) : (
                  <p className="px-3 py-2 text-xs text-slate-400">No suggestions yet. Start typing to search.</p>
                )}
              </div>
            ) : null}
            {error ? (
              <p className="px-3 py-2 text-xs text-rose-500" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

GlobalSearchBar.propTypes = {
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onSuggestionSelect: PropTypes.func,
  placeholder: PropTypes.string,
  loading: PropTypes.bool,
  className: PropTypes.string,
  suggestionsLimit: PropTypes.number
};

GlobalSearchBar.defaultProps = {
  value: undefined,
  defaultValue: undefined,
  onChange: undefined,
  onSubmit: undefined,
  onSuggestionSelect: undefined,
  placeholder: 'Search courses, tutors, communities…',
  loading: false,
  className: undefined,
  suggestionsLimit: 8
};
