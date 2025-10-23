import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { MagnifyingGlassIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';

import { useExplorerSearchSuggestions } from '../../hooks/useExplorerSearchSuggestions.js';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function entityLabel(entityType) {
  switch (entityType) {
    case 'communities':
      return 'Community';
    case 'courses':
      return 'Course';
    case 'ebooks':
      return 'E-book';
    case 'tutors':
      return 'Tutor';
    case 'profiles':
      return 'Profile';
    case 'ads':
      return 'Campaign';
    case 'events':
      return 'Event';
    default:
      return entityType;
  }
}

export default function GlobalSearchBar({
  value,
  onChange,
  onSubmit,
  entityTypes,
  placeholder = 'Search across Edulure…',
  loading = false,
  disabled = false,
  autoFocus = false,
  onSuggestionSelect
}) {
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const { suggestions, loading: suggestionsLoading, error } = useExplorerSearchSuggestions({
    query: value,
    entityTypes,
    enabled: !disabled
  });

  const hasSuggestions = suggestions.length > 0;

  useEffect(() => {
    if (!hasSuggestions) {
      setHighlightedIndex(-1);
    }
  }, [hasSuggestions]);

  const closeSuggestions = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const handleInputFocus = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleInputBlur = (event) => {
    if (!containerRef.current?.contains(event.relatedTarget)) {
      // Delay closing slightly to allow click handlers to run
      setTimeout(() => closeSuggestions(), 120);
    }
  };

  const handleInputChange = (event) => {
    onChange?.(event.target.value, event);
  };

  const handleSuggestionSelection = useCallback(
    (suggestion) => {
      if (!suggestion) return;
      onSuggestionSelect?.(suggestion);
      closeSuggestions();
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    [closeSuggestions, onSuggestionSelect]
  );

  const handleKeyDown = (event) => {
    if (!hasSuggestions) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) => {
        const next = index + 1;
        return next >= suggestions.length ? 0 : next;
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) => {
        const next = index - 1;
        if (next < 0) {
          return suggestions.length - 1;
        }
        return next;
      });
      return;
    }
    if (event.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      event.preventDefault();
      handleSuggestionSelection(suggestions[highlightedIndex]);
    }
  };

  const suggestionItems = useMemo(() => {
    if (!open || !hasSuggestions) {
      return null;
    }
    return (
      <ul
        id="global-search-suggestions"
        role="listbox"
        className="absolute z-20 mt-2 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-xl"
      >
        {suggestions.map((suggestion, index) => {
          const highlighted = index === highlightedIndex;
          return (
            <li key={`${suggestion.entityType}-${suggestion.entityId ?? index}`}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionSelection(suggestion)}
                className={classNames(
                  'flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition',
                  highlighted ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100/80'
                )}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">{suggestion.title}</span>
                  {suggestion.subtitle ? (
                    <span className="text-xs font-medium text-slate-500">{suggestion.subtitle}</span>
                  ) : null}
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {entityLabel(suggestion.entityType)}
                    {suggestion.description ? <span className="font-normal text-slate-400">· {suggestion.description}</span> : null}
                  </span>
                </div>
                <ArrowUpRightIcon className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }, [handleSuggestionSelection, hasSuggestions, highlightedIndex, open, suggestions]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="search"
          value={value ?? ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          className="w-full rounded-full border border-slate-200 bg-white px-12 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          aria-autocomplete="list"
          aria-expanded={open && hasSuggestions}
          aria-controls="global-search-suggestions"
        />
        {(loading || suggestionsLoading) && (
          <div
            className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-200 border-t-primary"
            aria-hidden="true"
          />
        )}
      </div>
      {suggestionItems}
      {error && !hasSuggestions ? (
        <p className="mt-2 text-xs font-medium text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

GlobalSearchBar.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  entityTypes: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
  placeholder: PropTypes.string,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  autoFocus: PropTypes.bool,
  onSuggestionSelect: PropTypes.func
};

GlobalSearchBar.defaultProps = {
  value: '',
  onChange: undefined,
  onSubmit: undefined,
  entityTypes: undefined,
  placeholder: 'Search across Edulure…',
  loading: false,
  disabled: false,
  autoFocus: false,
  onSuggestionSelect: undefined
};
