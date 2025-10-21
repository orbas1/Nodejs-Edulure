import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Menu, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

export default function CommunitySwitcher({
  communities,
  selected,
  onSelect,
  disabled = false,
  enableSearch = false
}) {
  const safeCommunities = Array.isArray(communities) ? communities : [];
  const activeCommunityId = selected?.id ?? null;
  const selectedLabel =
    selected?.name ??
    safeCommunities.find((community) =>
      activeCommunityId !== null && String(community.id) === String(activeCommunityId)
    )?.name ??
    'All Communities';

  const [query, setQuery] = useState('');

  const filteredCommunities = useMemo(() => {
    if (!enableSearch || !query.trim()) return safeCommunities;
    const normalisedQuery = query.trim().toLowerCase();

    return safeCommunities.filter((community) => {
      const name = community.name?.toLowerCase() ?? '';
      const description = community.description?.toLowerCase() ?? '';
      return name.includes(normalisedQuery) || description.includes(normalisedQuery);
    });
  }, [enableSearch, query, safeCommunities]);

  const handleSelect = (community) => {
    if (typeof onSelect === 'function') {
      onSelect(community);
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button
          type="button"
          disabled={disabled}
          aria-disabled={disabled}
          data-disabled={disabled ? 'true' : 'false'}
          className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold shadow-sm transition ${
            disabled
              ? 'cursor-not-allowed text-slate-400'
              : 'text-slate-700 hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
          }`}
        >
          {selectedLabel}
          <ChevronDownIcon className="h-4 w-4" />
        </Menu.Button>
      </div>

      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute z-40 mt-3 w-72 origin-top-left rounded-3xl border border-slate-200 bg-white p-3 shadow-xl focus:outline-none">
          <div className="space-y-3">
            {enableSearch && safeCommunities.length > 4 && (
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search communities"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
            {safeCommunities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                No communities available yet.
              </div>
            ) : filteredCommunities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                No matches for “{query}”.
              </div>
            ) : (
              filteredCommunities.map((community) => (
                <Menu.Item key={community.id}>
                  {({ active }) => {
                    const isActive =
                      activeCommunityId !== null &&
                      String(community.id) === String(activeCommunityId);

                    return (
                      <button
                        type="button"
                        onClick={() => handleSelect(community)}
                        aria-current={isActive ? 'true' : 'false'}
                        className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : active
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-600'
                        }`}
                      >
                        <div className="font-semibold">{community.name}</div>
                        {community.description && (
                          <p className="text-xs font-normal text-slate-500">{community.description}</p>
                        )}
                      </button>
                    );
                  }}
                </Menu.Item>
              ))
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

CommunitySwitcher.propTypes = {
  communities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  ),
  selected: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    description: PropTypes.string
  }),
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  enableSearch: PropTypes.bool
};

CommunitySwitcher.defaultProps = {
  communities: [],
  selected: undefined,
  disabled: false,
  enableSearch: false
};
