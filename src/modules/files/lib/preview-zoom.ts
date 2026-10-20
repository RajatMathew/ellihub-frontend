/**
 * Zoom for the file previews (spreadsheets and Word documents), as Excel's and
 * Word's status bars do it: 10%–400%,
 * the − / + buttons move to the next multiple of 10, and the slider puts 100%
 * at its middle — the left half covers 10–100%, the right half 100–400%.
 */

export const MIN_ZOOM = 10;
export const MAX_ZOOM = 400;
export const DEFAULT_ZOOM = 100;
const STEP = 10;
const MAX_WHEEL_DELTA = 25;
const WHEEL_SENSITIVITY = 0.004;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
}

/** The − / + buttons: to the next multiple of 10 in that direction, so 87% steps to 90% or 80%. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const next =
    direction > 0 ? Math.floor(zoom / STEP) * STEP + STEP : Math.ceil(zoom / STEP) * STEP - STEP;
  return clampZoom(next);
}

/**
 * Ctrl/⌘ + scroll, and trackpad pinch (which browsers report as a wheel event
 * with `ctrlKey`). Proportional, so a pinch feels the same at 50% and at 300%.
 * A mouse-wheel notch (deltaY ≈ 100) is capped to about 10%, as in Excel; a
 * pinch sends many small deltas, so it stays smooth.
 */
export function wheelZoom(zoom: number, deltaY: number): number {
  const delta = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, deltaY));
  // Rounding would swallow a pinch's 1px steps, so a nonzero delta always moves at least 1%.
  const next = zoom * Math.exp(-delta * WHEEL_SENSITIVITY);
  const moved = delta < 0 ? Math.max(next, zoom + 1) : delta > 0 ? Math.min(next, zoom - 1) : zoom;
  return clampZoom(moved);
}

/** Slider position, 0–100, with 100% zoom at 50. */
export function zoomToSlider(zoom: number): number {
  const z = clampZoom(zoom);
  return z <= DEFAULT_ZOOM
    ? ((z - MIN_ZOOM) / (DEFAULT_ZOOM - MIN_ZOOM)) * 50
    : 50 + ((z - DEFAULT_ZOOM) / (MAX_ZOOM - DEFAULT_ZOOM)) * 50;
}

export function sliderToZoom(position: number): number {
  const p = Math.min(100, Math.max(0, position));
  return clampZoom(
    p <= 50
      ? MIN_ZOOM + (p / 50) * (DEFAULT_ZOOM - MIN_ZOOM)
      : DEFAULT_ZOOM + ((p - 50) / 50) * (MAX_ZOOM - DEFAULT_ZOOM)
  );
}

/**
 * A pinch, from the zoom it began at and how far the fingers have spread:
 * Safari's `GestureEvent.scale`, or the ratio of touch distances on a
 * touchscreen. Always measured from the start, so rounding cannot drift.
 */
export function pinchZoom(startZoom: number, scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return clampZoom(startZoom);
  return clampZoom(startZoom * scale);
}

export function touchDistance(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number }
): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** How long a zoom must hold still before the preview relays out at it. */
export const ZOOM_SETTLE_MS = 150;

/**
 * The zoomed box's style while a zoom is in flight. CSS `zoom` relays out the
 * whole preview — every cell of a sheet — so it holds the last settled zoom,
 * and the step from there to the live zoom is a `transform`, which the GPU
 * scales without layout. Once the zoom settles the two agree and the transform
 * goes, so text is crisp again.
 */
export function zoomBoxStyle(
  zoom: number,
  settledZoom: number
): { zoom: number; transform?: string; transformOrigin?: string; willChange?: string } {
  if (zoom === settledZoom || settledZoom <= 0) return { zoom: zoom / 100 };
  return {
    zoom: settledZoom / 100,
    transform: `scale(${zoom / settledZoom})`,
    transformOrigin: '0 0',
    willChange: 'transform',
  };
}

/** Applies a frame's queued zoom updates in order, so none is lost when they are batched. */
export function applyZoomUpdates(zoom: number, updates: ((zoom: number) => number)[]): number {
  return updates.reduce((current, update) => update(current), zoom);
}
