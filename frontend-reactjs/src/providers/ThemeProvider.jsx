import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'edulure.theme.preferences.v1';

const ThemeContext = createContext({
  mode: 'system',
  contrast: 'auto',
  resolvedMode: 'light',
  resolvedContrast: 'normal',
  setMode: () => {},
  setContrast: () => {},
  toggleMode: () => {}
});

function readStoredPreferences() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      mode: parsed.mode ?? 'system',
      contrast: parsed.contrast ?? 'auto'
    };
  } catch (error) {
    console.warn('Failed to read stored theme preferences', error);
    return null;
  }
}

function persistPreferences(mode, contrast) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ mode, contrast })
    );
  } catch (error) {
    console.warn('Failed to persist theme preferences', error);
  }
}

function getSystemMode() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (_error) {
    return 'light';
  }
}

function getSystemContrast() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'normal';
  }
  try {
    return window.matchMedia('(prefers-contrast: more)').matches ? 'high' : 'normal';
  } catch (_error) {
    return 'normal';
  }
}

function applyThemeAttributes({ resolvedMode, resolvedContrast }) {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = resolvedMode === 'dark' ? 'dark' : 'light';
  if (resolvedContrast === 'high') {
    root.dataset.contrast = 'high';
  } else {
    delete root.dataset.contrast;
  }
}

export function ThemeProvider({ children, initialMode = 'system', initialContrast = 'auto' }) {
  const stored = readStoredPreferences();
  const [mode, setModeState] = useState(stored?.mode ?? initialMode);
  const [contrast, setContrastState] = useState(stored?.contrast ?? initialContrast);
  const [systemMode, setSystemMode] = useState(() => getSystemMode());
  const [systemContrast, setSystemContrast] = useState(() => getSystemContrast());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const schemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const contrastMedia = window.matchMedia('(prefers-contrast: more)');
    const handleSchemeChange = (event) => {
      setSystemMode(event.matches ? 'dark' : 'light');
    };
    const handleContrastChange = (event) => {
      setSystemContrast(event.matches ? 'high' : 'normal');
    };
    try {
      schemeMedia.addEventListener('change', handleSchemeChange);
      contrastMedia.addEventListener('change', handleContrastChange);
    } catch (_error) {
      schemeMedia.addListener(handleSchemeChange);
      contrastMedia.addListener(handleContrastChange);
    }
    return () => {
      try {
        schemeMedia.removeEventListener('change', handleSchemeChange);
        contrastMedia.removeEventListener('change', handleContrastChange);
      } catch (_error) {
        schemeMedia.removeListener(handleSchemeChange);
        contrastMedia.removeListener(handleContrastChange);
      }
    };
  }, []);

  const resolvedMode = mode === 'system' ? systemMode : mode;
  const resolvedContrast = contrast === 'auto' ? systemContrast : contrast;

  useEffect(() => {
    applyThemeAttributes({ resolvedMode, resolvedContrast });
    persistPreferences(mode, contrast);
  }, [mode, contrast, resolvedMode, resolvedContrast]);

  const setMode = useCallback((nextMode) => {
    setModeState((current) => {
      if (!nextMode || nextMode === current) {
        return current;
      }
      if (!['light', 'dark', 'system'].includes(nextMode)) {
        return current;
      }
      return nextMode;
    });
  }, []);

  const setContrast = useCallback((nextContrast) => {
    setContrastState((current) => {
      if (!nextContrast || nextContrast === current) {
        return current;
      }
      if (!['normal', 'high', 'auto'].includes(nextContrast)) {
        return current;
      }
      return nextContrast;
    });
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      if (current === 'light') {
        return 'dark';
      }
      if (current === 'dark') {
        return 'light';
      }
      return resolvedMode === 'dark' ? 'light' : 'dark';
    });
  }, [resolvedMode]);

  const value = useMemo(
    () => ({
      mode,
      contrast,
      resolvedMode,
      resolvedContrast,
      setMode,
      setContrast,
      toggleMode
    }),
    [contrast, mode, resolvedContrast, resolvedMode, setContrast, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
  initialMode: PropTypes.oneOf(['light', 'dark', 'system']),
  initialContrast: PropTypes.oneOf(['normal', 'high', 'auto'])
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
