export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
} as const;

export function isTabletWidth(width: number) {
  return width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
}

export function isDesktopWidth(width: number) {
  return width >= BREAKPOINTS.tablet;
}

export function clampSize(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
