export const LAYOUT_BREAKPOINTS = Object.freeze({
  xs: 360,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
});

export const LAYOUT_CONTENT_MAX_WIDTH = '80rem';
export const LAYOUT_DASHBOARD_MAX_WIDTH = '88rem';
export const LAYOUT_TELEMETRY_EVENT = 'edulure:layout-metric';

export function getBreakpoint(name) {
  return LAYOUT_BREAKPOINTS[name] ?? null;
}
