import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'edulure.theme.preferences.v1';
const DEFAULT_PREFERENCES = Object.freeze({ theme: 'system', contrast: 'auto' });
const ThemeContext = createContext(null);

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function readStoredPreferences() {
  if (!isBrowser() || !window.localStorage) {
    return DEFAULT_PREFERENCES;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_PREFERENCES;
    }
    const theme = ['light', 'dark', 'system'].includes(parsed.theme) ? parsed.theme : DEFAULT_PREFERENCES.theme;
    const contrast = ['normal', 'high', 'auto'].includes(parsed.contrast) ? parsed.contrast : DEFAULT_PREFERENCES.contrast;
    return { theme, contrast };
  } catch (_error) {
    return DEFAULT_PREFERENCES;
  }
}

function writeStoredPreferences(preferences) {
  if (!isBrowser() || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (_error) {
    // Ignore persistence errors; theme can still be applied for this session.
  }
}

function getSystemTheme() {
  if (!isBrowser() || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSystemContrast() {
  if (!isBrowser() || typeof window.matchMedia !== 'function') {
    return 'normal';
  }
  try {
    return window.matchMedia('(prefers-contrast: more)').matches ? 'high' : 'normal';
  } catch (_error) {
    return 'normal';
  }
}

function readBreakpoints() {
  if (!isBrowser()) {
    return { xs: 360, sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
  }
  const styles = getComputedStyle(document.documentElement);
  const toNumber = (token, fallback) => {
    if (!token) {
      return fallback;
    }
    const numeric = Number.parseFloat(token.toString().trim());
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  return {
    xs: toNumber(styles.getPropertyValue('--screen-xs'), 360),
    sm: toNumber(styles.getPropertyValue('--screen-sm'), 480),
    md: toNumber(styles.getPropertyValue('--screen-md'), 768),
    lg: toNumber(styles.getPropertyValue('--screen-lg'), 1024),
    xl: toNumber(styles.getPropertyValue('--screen-xl'), 1280),
    '2xl': toNumber(styles.getPropertyValue('--screen-2xl'), 1536)
  };
}

function attachMediaListener(mediaQueryList, handler) {
  if (!mediaQueryList) {
    return () => {};
  }
  try {
    mediaQueryList.addEventListener('change', handler);
    return () => mediaQueryList.removeEventListener('change', handler);
  } catch (_error) {
    // Safari < 14 fallback
    mediaQueryList.addListener?.(handler);
    return () => mediaQueryList.removeListener?.(handler);
  }
}

export function ThemeProvider({ children }) {
  const [preferences, setPreferences] = useState(() => readStoredPreferences());
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme());
  const [systemContrast, setSystemContrast] = useState(() => getSystemContrast());
  const [breakpoints, setBreakpoints] = useState(() => readBreakpoints());

  const resolvedTheme = preferences.theme === 'system' ? systemTheme : preferences.theme;
  const resolvedContrast = preferences.contrast === 'auto' ? systemContrast : preferences.contrast;

  useEffect(() => {
    if (!isBrowser()) {
      return undefined;
    }
    const themeMedia = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const contrastMedia = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-contrast: more)') : null;

    const handleThemeChange = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    const handleContrastChange = (event) => {
      setSystemContrast(event.matches ? 'high' : 'normal');
    };

    if (themeMedia) {
      setSystemTheme(themeMedia.matches ? 'dark' : 'light');
    }
    if (contrastMedia) {
      setSystemContrast(contrastMedia.matches ? 'high' : 'normal');
    }

    const detachTheme = attachMediaListener(themeMedia, handleThemeChange);
    const detachContrast = attachMediaListener(contrastMedia, handleContrastChange);

    return () => {
      detachTheme();
      detachContrast();
    };
  }, []);

  useEffect(() => {
    writeStoredPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    if (resolvedContrast === 'high') {
      root.dataset.contrast = 'high';
    } else {
      root.removeAttribute('data-contrast');
    }
    root.style.setProperty('color-scheme', resolvedTheme === 'dark' ? 'dark' : 'light');
  }, [resolvedTheme, resolvedContrast]);

  const setThemePreference = useCallback((value) => {
    setPreferences((current) => {
      const nextTheme = ['light', 'dark', 'system'].includes(value) ? value : current.theme;
      return { ...current, theme: nextTheme };
    });
  }, []);

  const setContrastPreference = useCallback((value) => {
    setPreferences((current) => {
      const nextContrast = ['normal', 'high', 'auto'].includes(value) ? value : current.contrast;
      return { ...current, contrast: nextContrast };
    });
  }, []);

  const refreshBreakpoints = useCallback(() => {
    setBreakpoints(readBreakpoints());
  }, []);

  const value = useMemo(
    () => ({
      theme: resolvedTheme,
      contrast: resolvedContrast,
      preferences,
      setTheme: setThemePreference,
      setContrast: setContrastPreference,
      breakpoints,
      refreshBreakpoints
    }),
    [resolvedTheme, resolvedContrast, preferences, setThemePreference, setContrastPreference, breakpoints, refreshBreakpoints]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
