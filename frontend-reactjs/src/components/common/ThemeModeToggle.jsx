import PropTypes from 'prop-types';
import { Fragment, useMemo } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  AdjustmentsHorizontalIcon,
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';

import { useTheme } from '../../providers/ThemeProvider.jsx';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const MODE_OPTIONS = [
  {
    id: 'light',
    label: 'Light',
    description: 'Bright surfaces with primary accents.',
    icon: SunIcon
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Dimmed palette suited for low light.',
    icon: MoonIcon
  },
  {
    id: 'system',
    label: 'System',
    description: 'Follow the operating system preference.',
    icon: ComputerDesktopIcon
  }
];

const CONTRAST_OPTIONS = [
  {
    id: 'auto',
    label: 'Auto contrast',
    description: 'Match device accessibility preferences.'
  },
  {
    id: 'normal',
    label: 'Standard contrast',
    description: 'Default interface contrast ratios.'
  },
  {
    id: 'high',
    label: 'High contrast',
    description: 'Elevated contrast for accessibility.'
  }
];

export default function ThemeModeToggle({ className }) {
  const { mode, contrast, resolvedMode, resolvedContrast, setMode, setContrast, toggleMode } = useTheme();

  const buttonIcon = resolvedMode === 'dark' ? MoonIcon : SunIcon;
  const buttonLabel = useMemo(() => {
    if (mode === 'system') {
      return `System (${resolvedMode})`;
    }
    return resolvedMode === 'dark' ? 'Dark mode' : 'Light mode';
  }, [mode, resolvedMode]);

  const contrastLabel = useMemo(() => {
    if (contrast === 'auto') {
      return resolvedContrast === 'high' ? 'Auto • high contrast' : 'Auto contrast';
    }
    return contrast === 'high' ? 'High contrast' : 'Standard contrast';
  }, [contrast, resolvedContrast]);

  return (
    <div className={classNames('inline-flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={toggleMode}
        className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-label={`Toggle color mode (currently ${buttonLabel})`}
      >
        <buttonIcon className="h-5 w-5" />
      </button>
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Theme settings</span>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-50 mt-3 w-72 origin-top-right rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
            <div className="px-2 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Color mode</p>
            </div>
            <div className="space-y-2">
              {MODE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = mode === option.id;
                return (
                  <Menu.Item key={option.id}>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={() => setMode(option.id)}
                        className={classNames(
                          'flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                          selected
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : active
                              ? 'border-slate-200 bg-slate-50 text-slate-700'
                              : 'border-slate-200 bg-white text-slate-600'
                        )}
                      >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1">
                          <span className="block font-semibold">{option.label}</span>
                          <span className="block text-xs text-slate-500">{option.description}</span>
                        </span>
                      </button>
                    )}
                  </Menu.Item>
                );
              })}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Contrast</p>
              <div className="mt-2 space-y-2">
                {CONTRAST_OPTIONS.map((option) => {
                  const selected = contrast === option.id;
                  return (
                    <Menu.Item key={option.id}>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={() => setContrast(option.id)}
                          className={classNames(
                            'flex w-full items-start gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                            selected
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : active
                                ? 'border-slate-200 bg-slate-50 text-slate-700'
                                : 'border-slate-200 bg-white text-slate-600'
                          )}
                        >
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                            <AdjustmentsHorizontalIcon className="h-4 w-4" />
                          </span>
                          <span className="flex-1">
                            <span className="block font-semibold">{option.label}</span>
                            <span className="block text-xs text-slate-500">{option.description}</span>
                          </span>
                        </button>
                      )}
                    </Menu.Item>
                  );
                })}
              </div>
              <p className="mt-3 px-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {buttonLabel} • {contrastLabel}
              </p>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}

ThemeModeToggle.propTypes = {
  className: PropTypes.string
};

ThemeModeToggle.defaultProps = {
  className: undefined
};
