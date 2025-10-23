import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  BookmarkIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import SearchBar from '../SearchBar.jsx';
import { getExplorerSearchSuggestions } from '../../api/explorerApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const DEFAULT_ENTITY_TYPES = ['courses', 'communities', 'ebooks', 'tutors'];

const SUGGESTION_ICONS = {
  saved: BookmarkIcon,
  trending: SparklesIcon
};

function buildSuggestionItems({ savedSearches = [], trendingQueries = [] }) {
  const savedItems = savedSearches.map((item) => ({
    id: `saved-${item.id}`,
    type: 'saved',
    label: item.name,
    query: item.query ?? '',
    entityTypes: item.entityTypes ?? [],
    isPinned: Boolean(item.isPinned)
  }));

  const trendingItems = trendingQueries.map((item, index) => ({
    id: `trending-${index}-${item.query}`,
    type: 'trending',
    label: item.query,
    query: item.query ?? ''
  }));

  return [...savedItems, ...trendingItems];
}

function buildPreviewEntries(previewDigest = {}, limitPerEntity = 3) {
  return Object.entries(previewDigest).flatMap(([entityType, entries]) =>
    (entries ?? []).slice(0, limitPerEntity).map((entry, index) => ({
      entityType,
      index,
      entityId: entry.entityId,
      title: entry.title ?? entry.entityId,
      subtitle: entry.subtitle ?? null,
      thumbnailUrl: entry.thumbnailUrl ?? null,
      previewUrl: entry.previewUrl ?? null,
      previewType: entry.previewType ?? (entry.previewUrl ? 'video' : 'image')
    }))
  );
}

export default function GlobalSearchBar({
  entityTypes = DEFAULT_ENTITY_TYPES,
  limit = 6,
  value,
  onChange,
  onSubmit,
  placeholder = 'Search courses, tutors, communities…',
  className,
  onFocus
}) {
  const containerRef = useRef(null);
  const [internalValue, setInternalValue] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [suggestionData, setSuggestionData] = useState({
    savedSearches: [],
    trendingQueries: [],
    previewDigest: {}
  });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;

  const suggestions = useMemo(
    () => buildSuggestionItems(suggestionData),
    [suggestionData]
  );

  const previewEntries = useMemo(
    () => buildPreviewEntries(suggestionData.previewDigest),
    [suggestionData.previewDigest]
  );

  const inputValue = value !== undefined ? value : internalValue;

  const handleInputChange = useCallback(
    (nextValue) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onChange?.(nextValue);
      setHighlightedIndex(-1);
    },
    [onChange, value]
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const loadSuggestions = useCallback(async () => {
    if (!token || hasLoaded || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getExplorerSearchSuggestions(
        { entityTypes, limit },
        { token }
      );
      if (response?.data) {
        setSuggestionData({
          savedSearches: response.data.savedSearches ?? [],
          trendingQueries: response.data.trendingQueries ?? [],
          previewDigest: response.data.previewDigest ?? {}
        });
        setHasLoaded(true);
      }
    } catch (err) {
      setError(err.message ?? 'Unable to load search suggestions');
    } finally {
      setLoading(false);
    }
  }, [entityTypes, hasLoaded, limit, loading, token]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleClickAway = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [handleClose, open]);

  const handleFocus = useCallback(
    (event) => {
      setOpen(true);
      onFocus?.(event);
      if (!hasLoaded) {
        loadSuggestions();
      }
    },
    [hasLoaded, loadSuggestions, onFocus]
  );

  const handleSuggestionSelect = useCallback(
    (item) => {
      if (!item) {
        return;
      }
      const query = item.query ?? '';
      if (value === undefined) {
        setInternalValue(query);
      }
      onChange?.(query);
      onSubmit?.(query, item);
      handleClose();
    },
    [handleClose, onChange, onSubmit, value]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!suggestions.length) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setOpen(true);
        setHighlightedIndex((previous) => {
          const next = previous + 1;
          return next >= suggestions.length ? 0 : next;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setOpen(true);
        setHighlightedIndex((previous) => {
          if (previous <= 0) {
            return suggestions.length - 1;
          }
          return previous - 1;
        });
      } else if (event.key === 'Enter' && highlightedIndex >= 0) {
        event.preventDefault();
        handleSuggestionSelect(suggestions[highlightedIndex]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    },
    [handleClose, handleSuggestionSelect, highlightedIndex, suggestions]
  );

  const handleSubmit = useCallback(
    (_event, submittedValue) => {
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSuggestionSelect(suggestions[highlightedIndex]);
        return;
      }
      const query = submittedValue ?? '';
      onSubmit?.(query, null);
      handleClose();
    },
    [handleClose, handleSuggestionSelect, highlightedIndex, onSubmit, suggestions]
  );

  return (
    <div ref={containerRef} className={classNames('relative', className)}>
      <SearchBar
        value={inputValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        allowClear
        onClear={() => handleInputChange('')}
        ariaLabel="Search across Edulure"
      />
      {open ? (
        <div className="absolute inset-x-0 top-full z-40 mt-2 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <MagnifyingGlassIcon className="h-4 w-4" />
              <span>Quick suggestions</span>
            </div>
            {loading ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                <ClockIcon className="h-4 w-4 animate-spin" />
                Loading…
              </span>
            ) : null}
          </div>
          {error ? (
            <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>
          ) : null}
          {!error && suggestions.length > 0 ? (
            <ul className="mt-3 space-y-1" role="listbox">
              {suggestions.map((item, index) => {
                const Icon = SUGGESTION_ICONS[item.type] ?? MagnifyingGlassIcon;
                const active = index === highlightedIndex;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={classNames(
                        'flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition',
                        active ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onFocus={() => setHighlightedIndex(index)}
                      onClick={() => handleSuggestionSelect(item)}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                        {item.isPinned ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                            Pinned
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs font-medium text-slate-400">Press Enter</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {!error && previewEntries.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent previews</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {previewEntries.map((entry) => (
                  <button
                    type="button"
                    key={`${entry.entityType}-${entry.entityId}-${entry.index}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/60 p-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => handleSuggestionSelect({
                      type: 'preview',
                      id: entry.entityId,
                      label: entry.title,
                      query: entry.title ?? entry.entityId
                    })}
                  >
                    <div className="h-12 w-12 flex-none overflow-hidden rounded-xl bg-slate-100">
                      {entry.thumbnailUrl ? (
                        <img
                          src={entry.thumbnailUrl}
                          alt={entry.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <SparklesIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{entry.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {entry.subtitle ?? entry.entityType}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Search</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {!error && !suggestions.length && !previewEntries.length && !loading ? (
            <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Start typing to see personalised suggestions.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

GlobalSearchBar.propTypes = {
  entityTypes: PropTypes.arrayOf(PropTypes.string),
  limit: PropTypes.number,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  onFocus: PropTypes.func
};

GlobalSearchBar.defaultProps = {
  entityTypes: DEFAULT_ENTITY_TYPES,
  limit: 6,
  value: undefined,
  onChange: undefined,
  onSubmit: undefined,
  placeholder: 'Search courses, tutors, communities…',
  className: undefined,
  onFocus: undefined
};
