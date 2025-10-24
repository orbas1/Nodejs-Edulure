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

function ThemeGlyph({ theme }) {
  if (theme === 'dark') {
    return <MoonIcon className="h-5 w-5" />;
  }
  if (theme === 'light') {
    return <SunIcon className="h-5 w-5" />;
  }
  return <ComputerDesktopIcon className="h-5 w-5" />;
}

export default function ThemeSwitcher({ className }) {
  const { theme, contrast, setTheme, setContrast } = useTheme();

  const themeOptions = useMemo(
    () => [
      { id: 'system', label: 'System', description: 'Follow your operating system setting.' },
      { id: 'light', label: 'Light', description: 'Bright surfaces with slate accents.' },
      { id: 'dark', label: 'Dark', description: 'Dimmed surfaces for low-light spaces.' }
    ],
    []
  );

  const contrastOptions = useMemo(
    () => [
      { id: 'auto', label: 'Auto', description: 'Match your system contrast preferences.' },
      { id: 'normal', label: 'Standard', description: 'Default contrast tokens.' },
      { id: 'high', label: 'High', description: 'Enhanced borders and text for accessibility.' }
    ],
    []
  );

  const activeThemeLabel = themeOptions.find((option) => option.id === theme)?.label ?? 'Theme';

  return (
    <Menu as="div" className={classNames('relative inline-block text-left', className)}>
      <Menu.Button
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-label={`Theme preferences: ${activeThemeLabel}`}
      >
        <ThemeGlyph theme={theme} />
        <span className="hidden lg:inline">{activeThemeLabel}</span>
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
        <Menu.Items className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-3xl border border-slate-200 bg-white/95 p-3 text-sm shadow-2xl backdrop-blur">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Theme</p>
          <ul className="mt-2 space-y-1">
            {themeOptions.map((option) => (
              <Menu.Item key={option.id}>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => setTheme(option.id)}
                    className={classNames(
                      'flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                      theme === option.id
                        ? 'bg-primary/10 text-primary'
                        : active
                          ? 'bg-slate-100 text-slate-700'
                          : 'text-slate-600'
                    )}
                  >
                    <ThemeGlyph theme={option.id} />
                    <span>
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
                    </span>
                  </button>
                )}
              </Menu.Item>
            ))}
          </ul>
          <p className="mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Contrast</p>
          <ul className="mt-2 space-y-1">
            {contrastOptions.map((option) => (
              <Menu.Item key={option.id}>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => setContrast(option.id)}
                    className={classNames(
                      'flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                      contrast === option.id
                        ? 'bg-primary/10 text-primary'
                        : active
                          ? 'bg-slate-100 text-slate-700'
                          : 'text-slate-600'
                    )}
                  >
                    <AdjustmentsHorizontalIcon className="mt-1 h-4 w-4" />
                    <span>
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
                    </span>
                  </button>
                )}
              </Menu.Item>
            ))}
          </ul>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
