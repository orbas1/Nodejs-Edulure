import { Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const SIZE_STYLES = {
  compact: 'px-3 py-1.5 text-xs',
  medium: 'px-4 py-2 text-sm',
  large: 'px-5 py-2.5 text-base'
};

const VARIANT_STYLES = {
  light:
    'border-slate-200/80 bg-white/90 text-slate-600 hover:border-primary/60 hover:text-primary focus-visible:border-primary focus-visible:ring-primary/30',
  dark:
    'border-white/40 bg-white/10 text-white hover:border-white/70 hover:bg-white/20 focus-visible:border-white focus-visible:ring-white/40',
  subtle:
    'border-transparent bg-slate-100/80 text-slate-700 hover:border-primary/60 hover:bg-white focus-visible:border-primary focus-visible:ring-primary/20'
};

export default function LanguageSelector({
  size = 'medium',
  variant = 'light',
  align = 'end',
  className,
  fullWidth = false,
  showLabel = true
}) {
  const { language, languages, setLanguage, t } = useLanguage();
  const selectedLanguage = useMemo(
    () => languages.find((item) => item.code === language) ?? languages[0],
    [language, languages]
  );

  const buttonClasses = clsx(
    'group inline-flex items-center gap-2 rounded-full border shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    SIZE_STYLES[size] ?? SIZE_STYLES.medium,
    VARIANT_STYLES[variant] ?? VARIANT_STYLES.light,
    fullWidth ? 'w-full justify-between' : 'justify-center',
    className
  );

  const optionsPanelClasses = clsx(
    'absolute z-50 mt-3 max-h-72 overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-2 text-sm shadow-xl backdrop-blur',
    fullWidth ? 'w-full' : 'w-64 sm:w-72',
    align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
  );

  return (
    <Listbox value={language} onChange={setLanguage} as="div" className={clsx('relative', fullWidth && 'w-full')}>
      {({ open }) => (
        <>
          <Listbox.Button className={buttonClasses} aria-label={t('languageSelector.ariaLabel')}>
            <span className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                {selectedLanguage?.flag ?? '🌐'}
              </span>
              {showLabel ? (
                <span className="flex flex-col text-left">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-60">
                    {t('navigation.language')}
                  </span>
                  <span className="font-semibold text-current">{selectedLanguage?.nativeName ?? 'English'}</span>
                </span>
              ) : (
                <span className="font-semibold text-current">{selectedLanguage?.nativeName ?? 'English'}</span>
              )}
            </span>
            <span className="ml-2 inline-flex items-center gap-1 text-slate-400">
              {showLabel ? <GlobeAltIcon className="h-4 w-4" aria-hidden="true" /> : null}
              <ChevronUpDownIcon className="h-4 w-4" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            show={open}
            enter="transition ease-out duration-200"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition ease-in duration-150"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Listbox.Options className={optionsPanelClasses} static>
              <div className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('languageSelector.menuHelp')}
              </div>
              {languages.map((option) => (
                <Listbox.Option
                  key={option.code}
                  value={option.code}
                  className={({ active, selected }) =>
                    clsx(
                      'relative flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition',
                      active && 'bg-primary/10 text-primary',
                      selected && 'bg-primary/5 text-primary'
                    )
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className="text-lg" aria-hidden="true">
                        {option.flag}
                      </span>
                      <span className="flex flex-col text-left">
                        <span className="text-sm font-semibold text-slate-900">{option.nativeName}</span>
                        <span className="text-xs text-slate-500">{option.label}</span>
                      </span>
                      <span className="ml-auto">
                        {selected ? <CheckIcon className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                      </span>
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </>
      )}
    </Listbox>
  );
}

LanguageSelector.propTypes = {
  size: PropTypes.oneOf(['compact', 'medium', 'large']),
  variant: PropTypes.oneOf(['light', 'dark', 'subtle']),
  align: PropTypes.oneOf(['start', 'end']),
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
  showLabel: PropTypes.bool
};
