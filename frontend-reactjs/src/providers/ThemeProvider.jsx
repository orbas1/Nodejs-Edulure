import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'edulure.theme.preferences.v1';

const defaultState = {
  mode: 'auto',
  density: 'comfortable',
  contrast: 'default'
};

const ThemeContext = createContext({
  mode: defaultState.mode,
  resolvedMode: 'light',
  density: defaultState.density,
  contrast: defaultState.contrast,
  setMode: () => {},
  setDensity: () => {},
  setContrast: () => {}
});

function readStoredPreferences() {
  if (typeof window === 'undefined') {
    return defaultState;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed
    };
  } catch (error) {
    console.warn('Unable to read theme preferences', error);
    return defaultState;
  }
}

function writeStoredPreferences(preferences) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Unable to persist theme preferences', error);
  }
}

function resolveMode(mode) {
  if (mode !== 'auto') {
    return mode;
  }
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}

function applyThemeAttributes({ mode, density, contrast }) {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.setAttribute('data-density', density);
  root.setAttribute('data-contrast', contrast);
}

function broadcastThemeChange(payload) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent('edulure:theme-change', {
      detail: { ...payload, timestamp: Date.now() }
    })
  );
}

export function ThemeProvider({ children, initialMode = 'auto', initialDensity = 'comfortable', initialContrast = 'default' }) {
  const stored = useMemo(() => readStoredPreferences(), []);
  const [mode, setMode] = useState(stored.mode ?? initialMode);
  const [density, setDensity] = useState(stored.density ?? initialDensity);
  const [contrast, setContrast] = useState(stored.contrast ?? initialContrast);
  const [resolvedMode, setResolvedMode] = useState(resolveMode(stored.mode ?? initialMode));

  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mql) {
      return undefined;
    }

    const handleChange = () => {
      setResolvedMode(resolveMode(mode));
    };

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [mode]);

  useEffect(() => {
    const currentResolved = resolveMode(mode);
    setResolvedMode(currentResolved);
    applyThemeAttributes({ mode: currentResolved, density, contrast });
    writeStoredPreferences({ mode, density, contrast });
    broadcastThemeChange({ mode, resolvedMode: currentResolved, density, contrast });
  }, [mode, density, contrast]);

  const handleSetMode = useCallback((value) => setMode(value ?? 'auto'), []);
  const handleSetDensity = useCallback((value) => setDensity(value ?? 'comfortable'), []);
  const handleSetContrast = useCallback((value) => setContrast(value ?? 'default'), []);

  const contextValue = useMemo(
    () => ({
      mode,
      resolvedMode,
      density,
      contrast,
      setMode: handleSetMode,
      setDensity: handleSetDensity,
      setContrast: handleSetContrast
    }),
    [mode, resolvedMode, density, contrast, handleSetMode, handleSetDensity, handleSetContrast]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
