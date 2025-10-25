import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'edulure:theme-settings';
const MODES = ['light', 'dark', 'system'];
const DENSITIES = ['comfortable', 'compact'];
const RADII = ['rounded', 'soft', 'sharp'];
const CONTRASTS = ['standard', 'high'];

const ACCENT_PRESETS = {
  primary: {
    '--color-primary': '#2d62ff',
    '--color-primary-dark': '#1f3bb3',
    '--color-primary-soft': '#dbe4ff'
  },
  emerald: {
    '--color-primary': '#059669',
    '--color-primary-dark': '#047857',
    '--color-primary-soft': '#d1fae5'
  },
  amber: {
    '--color-primary': '#f59e0b',
    '--color-primary-dark': '#b45309',
    '--color-primary-soft': '#fef3c7'
  },
  rose: {
    '--color-primary': '#f43f5e',
    '--color-primary-dark': '#be123c',
    '--color-primary-soft': '#ffe4e6'
  }
};

const defaultThemeContext = {
  mode: 'system',
  resolvedMode: 'light',
  accent: 'primary',
  density: 'comfortable',
  radius: 'rounded',
  contrast: 'standard',
  classes: {
    surface: '',
    panel: '',
    muted: ''
  },
  setMode: () => {},
  setAccent: () => {},
  setDensity: () => {},
  setRadius: () => {},
  setContrast: () => {},
  applyThemeSettings: () => {}
};

const ThemeContext = createContext(defaultThemeContext);

function getSystemMode() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function loadStoredSettings() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function applyAccent(root, accent) {
  const preset = ACCENT_PRESETS[accent] ?? ACCENT_PRESETS.primary;
  Object.entries(preset).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });
}

export function ThemeProvider({ children }) {
  const stored = loadStoredSettings();
  const [mode, setModeState] = useState(stored?.mode && MODES.includes(stored.mode) ? stored.mode : 'system');
  const [systemMode, setSystemMode] = useState(getSystemMode());
  const [accent, setAccentState] = useState(stored?.accent && ACCENT_PRESETS[stored.accent] ? stored.accent : 'primary');
  const [density, setDensityState] = useState(stored?.density && DENSITIES.includes(stored.density) ? stored.density : 'comfortable');
  const [radius, setRadiusState] = useState(stored?.radius && RADII.includes(stored.radius) ? stored.radius : 'rounded');
  const [contrast, setContrastState] = useState(stored?.contrast && CONTRASTS.includes(stored.contrast) ? stored.contrast : 'standard');

  const resolvedMode = mode === 'system' ? systemMode : mode;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      setSystemMode(event.matches ? 'dark' : 'light');
    };
    handleChange(media);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    root.dataset.theme = resolvedMode;
    root.dataset.density = density;
    root.dataset.radius = radius;
    root.dataset.contrast = contrast;
    root.dataset.accent = accent;
    root.style.colorScheme = resolvedMode === 'dark' ? 'dark' : 'light';
    applyAccent(root, accent);
  }, [resolvedMode, density, radius, contrast, accent]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode, accent, density, radius, contrast })
      );
    } catch (_error) {
      // ignore persistence issues
    }
  }, [mode, accent, density, radius, contrast]);

  const setMode = useCallback((nextMode) => {
    if (!MODES.includes(nextMode)) {
      return;
    }
    setModeState(nextMode);
  }, []);

  const setAccent = useCallback((nextAccent) => {
    if (!ACCENT_PRESETS[nextAccent]) {
      return;
    }
    setAccentState(nextAccent);
  }, []);

  const setDensity = useCallback((nextDensity) => {
    if (!DENSITIES.includes(nextDensity)) {
      return;
    }
    setDensityState(nextDensity);
  }, []);

  const setRadius = useCallback((nextRadius) => {
    if (!RADII.includes(nextRadius)) {
      return;
    }
    setRadiusState(nextRadius);
  }, []);

  const setContrast = useCallback((nextContrast) => {
    if (!CONTRASTS.includes(nextContrast)) {
      return;
    }
    setContrastState(nextContrast);
  }, []);

  const applyThemeSettings = useCallback(
    (settings = {}) => {
      if (settings.mode) {
        setMode(settings.mode);
      }
      if (settings.accent) {
        setAccent(settings.accent);
      }
      if (settings.density) {
        setDensity(settings.density);
      }
      if (settings.radius) {
        setRadius(settings.radius);
      }
      if (settings.contrast) {
        setContrast(settings.contrast);
      }
    },
    [setMode, setAccent, setDensity, setRadius, setContrast]
  );

  const classes = useMemo(
    () => ({
      surface: resolvedMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
      panel: resolvedMode === 'dark' ? 'bg-slate-900/60 text-slate-100' : 'bg-white',
      muted: resolvedMode === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'
    }),
    [resolvedMode]
  );

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      accent,
      density,
      radius,
      contrast,
      classes,
      setMode,
      setAccent,
      setDensity,
      setRadius,
      setContrast,
      applyThemeSettings
    }),
    [mode, resolvedMode, accent, density, radius, contrast, classes, setMode, setAccent, setDensity, setRadius, setContrast, applyThemeSettings]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return defaultThemeContext;
  }
  return context;
}

export default ThemeProvider;
