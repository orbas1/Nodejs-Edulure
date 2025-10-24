import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'edulure.theme.preferences.v1';
const MODES = new Set(['light', 'dark', 'system']);
const CONTRAST_OPTIONS = new Set(['normal', 'high']);
const DENSITY_OPTIONS = new Set(['comfortable', 'compact']);
const RADIUS_OPTIONS = new Set(['rounded', 'sharp', 'pill']);

const defaultPreferences = Object.freeze({
  mode: 'system',
  contrast: 'normal',
  density: 'comfortable',
  radius: 'rounded'
});

function normaliseValue(value, allowedValues, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim().toLowerCase();
  return allowedValues.has(trimmed) ? trimmed : fallback;
}

function readStoredPreferences(storageKey = STORAGE_KEY) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      mode: normaliseValue(parsed.mode, MODES, defaultPreferences.mode),
      contrast: normaliseValue(parsed.contrast, CONTRAST_OPTIONS, defaultPreferences.contrast),
      density: normaliseValue(parsed.density, DENSITY_OPTIONS, defaultPreferences.density),
      radius: normaliseValue(parsed.radius, RADIUS_OPTIONS, defaultPreferences.radius)
    };
  } catch (error) {
    console.error('Failed to parse stored theme preferences', error);
    return null;
  }
}

function writeStoredPreferences(preferences, storageKey = STORAGE_KEY) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to persist theme preferences', error);
  }
}

function resolveSystemMode() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (_error) {
    return 'light';
  }
}

function applyThemeAttributes(preferences, resolvedMode) {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (!root) {
    return;
  }

  root.dataset.theme = resolvedMode;
  root.dataset.themePreference = preferences.mode;
  root.dataset.contrast = preferences.contrast;
  root.dataset.density = preferences.density;
  root.dataset.radius = preferences.radius;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children, initialPreferences, storageKey }) {
  const mergedInitial = useMemo(() => ({
    ...defaultPreferences,
    ...(initialPreferences || {}),
    ...(readStoredPreferences(storageKey) || {})
  }), [initialPreferences, storageKey]);

  const [preferences, setPreferences] = useState(mergedInitial);
  const [resolvedMode, setResolvedMode] = useState(() =>
    preferences.mode === 'system' ? resolveSystemMode() : preferences.mode
  );

  useEffect(() => {
    if (preferences.mode === 'system') {
      setResolvedMode(resolveSystemMode());
    } else {
      setResolvedMode(preferences.mode);
    }
  }, [preferences.mode]);

  useEffect(() => {
    if (preferences.mode !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedMode(media.matches ? 'dark' : 'light');
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler);
    } else if (typeof media.addListener === 'function') {
      media.addListener(handler);
    }
    handler();
    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', handler);
      } else if (typeof media.removeListener === 'function') {
        media.removeListener(handler);
      }
    };
  }, [preferences.mode]);

  useEffect(() => {
    applyThemeAttributes(preferences, resolvedMode);
    writeStoredPreferences(preferences, storageKey);
  }, [preferences, resolvedMode, storageKey]);

  const setMode = useCallback((mode) => {
    setPreferences((prev) => ({
      ...prev,
      mode: normaliseValue(mode, MODES, prev.mode)
    }));
  }, []);

  const setContrast = useCallback((contrast) => {
    setPreferences((prev) => ({
      ...prev,
      contrast: normaliseValue(contrast, CONTRAST_OPTIONS, prev.contrast)
    }));
  }, []);

  const setDensity = useCallback((density) => {
    setPreferences((prev) => ({
      ...prev,
      density: normaliseValue(density, DENSITY_OPTIONS, prev.density)
    }));
  }, []);

  const setRadius = useCallback((radius) => {
    setPreferences((prev) => ({
      ...prev,
      radius: normaliseValue(radius, RADIUS_OPTIONS, prev.radius)
    }));
  }, []);

  const applyTheme = useCallback((nextPreferences = {}) => {
    setPreferences((prev) => ({
      ...prev,
      ...(nextPreferences.mode
        ? { mode: normaliseValue(nextPreferences.mode, MODES, prev.mode) }
        : {}),
      ...(nextPreferences.contrast
        ? { contrast: normaliseValue(nextPreferences.contrast, CONTRAST_OPTIONS, prev.contrast) }
        : {}),
      ...(nextPreferences.density
        ? { density: normaliseValue(nextPreferences.density, DENSITY_OPTIONS, prev.density) }
        : {}),
      ...(nextPreferences.radius
        ? { radius: normaliseValue(nextPreferences.radius, RADIUS_OPTIONS, prev.radius) }
        : {})
    }));
  }, []);

  const resetTheme = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  const value = useMemo(
    () => ({
      mode: preferences.mode,
      contrast: preferences.contrast,
      density: preferences.density,
      radius: preferences.radius,
      resolvedMode,
      setMode,
      setContrast,
      setDensity,
      setRadius,
      applyTheme,
      resetTheme
    }),
    [preferences, resolvedMode, setMode, setContrast, setDensity, setRadius, applyTheme, resetTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
  initialPreferences: PropTypes.shape({
    mode: PropTypes.string,
    contrast: PropTypes.string,
    density: PropTypes.string,
    radius: PropTypes.string
  }),
  storageKey: PropTypes.string
};

ThemeProvider.defaultProps = {
  initialPreferences: null,
  storageKey: STORAGE_KEY
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
