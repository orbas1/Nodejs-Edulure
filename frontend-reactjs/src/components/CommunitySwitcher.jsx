import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

export default function CommunitySwitcher({ communities, selected, onSelect }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary">
          {selected?.name ?? 'All Communities'}
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
        <Menu.Items className="absolute z-40 mt-3 w-64 origin-top-left rounded-3xl border border-slate-200 bg-white p-3 shadow-xl focus:outline-none">
          <div className="space-y-1">
            {communities.map((community) => (
              <Menu.Item key={community.id}>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => onSelect(community)}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                      selected?.id === community.id
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
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
