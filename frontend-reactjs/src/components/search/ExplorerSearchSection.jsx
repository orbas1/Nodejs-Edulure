import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  BookmarkIcon,
  FunnelIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon
} from '@heroicons/react/24/outline';

import SearchResultCard from './SearchResultCard.jsx';
import { useExplorerEntitySearch } from '../../hooks/useExplorerEntitySearch.js';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function FilterControl({ definition, value, onChange, onToggle }) {
  if (definition.type === 'multi') {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{definition.label}</p>
        <div className="flex flex-wrap gap-2">
          {definition.options.map((option) => {
            const selected = value?.includes(option.value);
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => onToggle(option.value)}
                className={classNames(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 text-slate-600 hover:border-primary/60 hover:text-primary'
                )}
              >
                <Squares2X2Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (definition.type === 'boolean') {
    const selected = Boolean(value);
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{definition.label}</p>
        <button
          type="button"
          onClick={() => onChange(!selected)}
          className={classNames(
            'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition',
            selected
              ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
              : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
          )}
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
          {selected ? 'Enabled' : 'Disabled'}
        </button>
      </div>
    );
  }

  if (definition.type === 'select') {
    return (
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{definition.label}</span>
        <select
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">All</option>
          {definition.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (definition.type === 'range') {
    const minValue = value?.min ?? '';
    const maxValue = value?.max ?? '';
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{definition.label}</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={minValue}
            onChange={(event) =>
              onChange({
                ...value,
                min: event.target.value ? Number(event.target.value) : null
              })
            }
          />
          <input
            type="number"
            placeholder="Max"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={maxValue}
            onChange={(event) =>
              onChange({
                ...value,
                max: event.target.value ? Number(event.target.value) : null
              })
            }
          />
        </div>
      </div>
    );
  }

  return null;
}

FilterControl.propTypes = {
  definition: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['multi', 'boolean', 'select', 'range']).isRequired,
    options: PropTypes.array
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  onToggle: PropTypes.func
};

FilterControl.defaultProps = {
  value: null,
  onToggle: () => {}
};

export default function ExplorerSearchSection({
  entityType,
  title,
  description,
  placeholder,
  sortOptions,
  filterDefinitions,
  defaultSort
}) {
  const [queryDraft, setQueryDraft] = useState('');
  const [newSavedSearchName, setNewSavedSearchName] = useState('');
  const [pinSearch, setPinSearch] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingSearchId, setEditingSearchId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [updating, setUpdating] = useState(false);

  const {
    query,
    setQuery,
    filters,
    setFilterValue,
    toggleMultiFilter,
    clearFilters,
    sort,
    setSort,
    page,
    total,
    totalPages,
    goToPage,
    results,
    loading,
    error,
    savedSearches,
    savedSearchError,
    savedSearchLoading,
    saveSearch,
    updateSearch,
    removeSearch,
    applySavedSearch,
    isAuthenticated
  } = useExplorerEntitySearch({ entityType, defaultSort });

  useEffect(() => {
    setQueryDraft(query ?? '');
  }, [query]);

  const filtersByKey = filters ?? {};

  const handleSubmit = (event) => {
    event.preventDefault();
    setQuery(queryDraft.trim());
  };

  const handleSaveSearch = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setSaveError('Sign in to save explorer searches.');
      return;
    }
    if (!newSavedSearchName.trim()) {
      setSaveError('Provide a descriptive name for the saved search.');
      return;
    }
    try {
      setSaving(true);
      setSaveError(null);
      await saveSearch({ name: newSavedSearchName, pin: pinSearch });
      setNewSavedSearchName('');
      setPinSearch(false);
    } catch (err) {
      setSaveError(err.message ?? 'Unable to save search');
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (event) => {
    event.preventDefault();
    if (!editingSearchId) return;
    try {
      setUpdating(true);
      await updateSearch(editingSearchId, { name: editingName.trim() });
      setEditingSearchId(null);
      setEditingName('');
    } catch (err) {
      setSaveError(err.message ?? 'Unable to update saved search');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (searchId) => {
    try {
      await removeSearch(searchId);
    } catch (err) {
      setSaveError(err.message ?? 'Unable to delete saved search');
    }
  };

  const activeFilters = useMemo(() => Object.keys(filtersByKey).length, [filtersByKey]);

  return (
    <section className="rounded-4xl bg-white/80 p-8 shadow-xl ring-1 ring-slate-100">
      <header className="flex flex-col gap-6 border-b border-slate-100 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search {title}</span>
              <input
                type="search"
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
            >
              Search
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <label className="hidden text-xs font-semibold uppercase tracking-wide text-slate-500 sm:block">
              Sort by
            </label>
            <select
              value={sort ?? ''}
              onChange={(event) => setSort(event.target.value || defaultSort)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            >
              <ArrowPathIcon className="h-4 w-4" /> Reset filters
            </button>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[3fr,1fr] lg:gap-10">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                <FunnelIcon className="mr-2 inline-block h-4 w-4" /> Filters
              </h3>
              <span className="text-xs font-semibold text-primary">{activeFilters} applied</span>
            </div>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {filterDefinitions.map((definition) => (
                <FilterControl
                  key={definition.key}
                  definition={definition}
                  value={filtersByKey[definition.key]}
                  onChange={(value) => setFilterValue(definition.key, value)}
                  onToggle={(value) => toggleMultiFilter(definition.key, value)}
                />
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}

          {loading && !results.length ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="animate-pulse rounded-3xl border border-slate-100 bg-white/80 p-6">
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="mt-3 h-5 w-64 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : null}

          {!loading && results.length === 0 && !error ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center">
              <h3 className="text-lg font-semibold text-slate-800">No results yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Broaden your query, adjust the filters or try a different sort order. Saved searches make it easy to revisit high-performing setups.
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            {results.map((hit) => (
              <SearchResultCard key={`${entityType}-${hit.id ?? hit.documentId ?? hit.slug}`} entityType={entityType} hit={hit} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600">
              <span>
                Showing page {page} of {totalPages} · {total} results
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-full border border-slate-200 px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary hover:text-primary"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-full border border-slate-200 px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary hover:text-primary"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white/60 p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Saved searches</h3>
            <p className="mt-2 text-sm text-slate-500">
              Capture your favourite filters and replay them instantly. Pin essentials for the team.
            </p>
            {savedSearchLoading ? (
              <p className="mt-4 text-xs text-slate-400">Loading saved searches…</p>
            ) : null}
            {savedSearchError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{savedSearchError}</p>
            ) : null}
            {!savedSearchLoading && !savedSearches.length ? (
              <p className="mt-4 text-xs text-slate-400">No saved searches yet. Create one to activate rapid discovery packs.</p>
            ) : null}
            <ul className="mt-5 space-y-3">
              {savedSearches.map((savedSearch) => (
                <li key={savedSearch.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  {editingSearchId === savedSearch.id ? (
                    <form className="space-y-3" onSubmit={handleRename}>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={updating}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSearchId(null);
                            setEditingName('');
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => applySavedSearch(savedSearch)}
                        className="text-left text-sm font-semibold text-slate-800 transition hover:text-primary"
                      >
                        {savedSearch.name}
                      </button>
                      <p className="mt-1 text-xs text-slate-500">
                        {savedSearch.query ? `“${savedSearch.query}”` : 'All content'} · Updated{' '}
                        {new Date(savedSearch.updatedAt).toLocaleString()}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSearchId(savedSearch.id);
                            setEditingName(savedSearch.name);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                        >
                          <BookmarkIcon className="h-4 w-4" /> Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(savedSearch.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-primary/5 p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Save this search</h3>
            <p className="mt-2 text-xs text-primary/80">
              Give this configuration a name and reuse it across the team. Pin it to keep it at the top of the list.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleSaveSearch}>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">Name</span>
                <input
                  type="text"
                  value={newSavedSearchName}
                  onChange={(event) => setNewSavedSearchName(event.target.value)}
                  className="w-full rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Top rated automation courses"
                  disabled={!isAuthenticated}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                <input
                  type="checkbox"
                  checked={pinSearch}
                  onChange={(event) => setPinSearch(event.target.checked)}
                  className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                />
                Pin to favourites
              </label>
              {saveError ? <p className="text-xs font-semibold text-red-600">{saveError}</p> : null}
              <button
                type="submit"
                disabled={saving || !isAuthenticated}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusIcon className="h-4 w-4" /> Save search
              </button>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}

ExplorerSearchSection.propTypes = {
  entityType: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  sortOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  ).isRequired,
  filterDefinitions: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['multi', 'boolean', 'select', 'range']).isRequired,
      options: PropTypes.array
    })
  ).isRequired,
  defaultSort: PropTypes.string
};

ExplorerSearchSection.defaultProps = {
  placeholder: 'Search signals, people and programmes…',
  defaultSort: null
};
