import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';

import {
  clamp01,
  ringDashArray,
  ringGeometry,
  statusMarkSpoken,
  type StatusMarkStatus,
} from '@/app/lib/status-mark';
import { AnimValue, criticalSpring, cubicBezier, linear, type TweenOptions } from '@/app/lib/tween';
import { cn } from '@/app/lib/utils';

export type { StatusMarkStatus };

export interface StatusMarkProps {
  status?: StatusMarkStatus;
  /** 0–1 while running; leave it out for an indeterminate spin. */
  progress?: number;
  /** Text beside the mark, struck through once done. */
  label?: ReactNode;
  color?: string;
  doneColor?: string;
  errorColor?: string;
  size?: number;
  strokeWidth?: number;
  dashes?: number;
  fontSize?: number;
  /** Milliseconds per indeterminate turn. */
  spinDuration?: number;
  /** Share of the ring the indeterminate arc covers. */
  arcLength?: number;
  drawDuration?: number;
  fillOpacity?: number;
  strike?: boolean;
  strikeDelay?: number;
  className?: string;
}

const UI: TweenOptions = { duration: 0.3, ease: criticalSpring };
const MORPH: TweenOptions = { duration: 0.3, ease: cubicBezier(0.77, 0, 0.175, 1) };
const CHECK = 'M7.5 12.25 10.5 15.25 16.75 8.75';
const CROSS = 'M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

/**
 * A task-status glyph that morphs from an idle dashed ring to a spinning or
 * filling arc, then draws a check (done) or a cross (failed, cancelled). Ported
 * from React Bits' StatusMark with `motion` swapped for `@/app/lib/tween`, so it
 * carries no dependency. It draws in `currentColor` and the theme's success and
 * destructive tokens unless told otherwise, and announces its status itself.
 */
export function StatusMark({
  status = 'pending',
  progress,
  label,
  color = 'currentColor',
  doneColor = 'var(--color-success-accent)',
  errorColor = 'var(--color-destructive)',
  size = 20,
  strokeWidth = 2,
  dashes = 8,
  fontSize = 14,
  spinDuration = 1100,
  arcLength = 0.68,
  drawDuration = 240,
  fillOpacity = 0.06,
  strike = true,
  strikeDelay = 60,
  className,
}: StatusMarkProps) {
  const reduce = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const { radius, circumference, period } = ringGeometry(strokeWidth, dashes);
  const determinate =
    status === 'running' && typeof progress === 'number' && Number.isFinite(progress);
  const indeterminate = status === 'running' && !determinate;
  const solid = status === 'running' || status === 'done' || status === 'failed';
  const targetArc = indeterminate ? arcLength : determinate ? clamp01(progress) : 1;

  const [values] = useState(() => ({
    mode: new AnimValue(solid ? 1 : 0),
    arc: new AnimValue(targetArc),
    travel: new AnimValue(0),
  }));
  const ringRef = useRef<SVGCircleElement>(null);
  const geometry = useRef({ circumference, period });
  const generation = useRef(0);

  // The ring is written straight to the DOM each frame, never through state.
  const writeDash = useCallback(() => {
    const g = geometry.current;
    ringRef.current?.setAttribute(
      'stroke-dasharray',
      ringDashArray(values.mode.get(), values.arc.get(), g.circumference, g.period)
    );
  }, [values]);

  useLayoutEffect(() => {
    geometry.current = { circumference, period };
    writeDash();
    ringRef.current?.setAttribute('stroke-dashoffset', String(values.travel.get()));
  }, [circumference, period, values, writeDash]);

  useEffect(() => {
    const offs = [
      values.mode.onChange(writeDash),
      values.arc.onChange(writeDash),
      values.travel.onChange((v) => ringRef.current?.setAttribute('stroke-dashoffset', String(v))),
    ];
    return () => {
      offs.forEach((off) => off());
      Object.values(values).forEach((value) => value.stop());
    };
  }, [values, writeDash]);

  useEffect(() => {
    const { mode, arc, travel } = values;
    const run = ++generation.current;
    if (reduce) {
      mode.jump(solid ? 1 : 0);
      arc.jump(targetArc);
      travel.jump(0);
      return;
    }
    if (mode.get() === 0) arc.jump(targetArc);
    void mode.animate(solid ? 1 : 0, MORPH);
    void arc.animate(targetArc, UI);
    if (indeterminate) {
      const from = travel.get();
      void travel.animate(
        from - circumference,
        { duration: spinDuration / 1000, ease: linear, repeat: true },
        from
      );
      return;
    }
    // Settle the dashes on a whole period so they come to rest where they started.
    const unit = determinate ? circumference : period;
    void travel.animate(Math.floor(travel.get() / unit) * unit, UI).then(() => {
      if (generation.current === run) travel.jump(0);
    });
  }, [
    values,
    status,
    solid,
    determinate,
    indeterminate,
    targetArc,
    reduce,
    circumference,
    period,
    spinDuration,
  ]);

  const spoken = statusMarkSpoken(status, progress);
  const hasLabel = label !== undefined && label !== null;

  return (
    <span
      className={cn(
        'group relative inline-flex items-center align-middle leading-none [gap:calc(var(--sm-size)*0.5)]',
        className
      )}
      data-status={status}
      data-indeterminate={indeterminate ? '' : undefined}
      data-strike={strike ? '' : undefined}
      style={
        {
          '--sm-size': `${size}px`,
          '--sm-stroke': strokeWidth,
          '--sm-color': color,
          '--sm-done': doneColor,
          '--sm-error': errorColor,
          '--sm-fill': fillOpacity,
          '--sm-font': `${fontSize}px`,
          '--sm-draw': `${drawDuration}ms`,
          '--sm-strike-delay': `${120 + strikeDelay}ms`,
          '--sm-check-delay': '120ms',
        } as CSSProperties
      }
    >
      <svg
        className="shrink-0 overflow-visible [color:var(--sm-color)] [transition:color_200ms_ease] group-data-[status=done]:[color:var(--sm-done)] group-data-[status=failed]:[color:var(--sm-error)]"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        role={hasLabel ? undefined : 'img'}
        aria-label={hasLabel ? undefined : spoken}
        aria-hidden={hasLabel || undefined}
      >
        <circle
          className="[fill:currentColor] [stroke:currentColor] [stroke-width:var(--sm-stroke)] [fill-opacity:0] [stroke-opacity:0] [transition:fill-opacity_180ms_ease,stroke-opacity_200ms_ease] group-data-[status=running]:[stroke-opacity:0.2] group-data-[status=done]:[fill-opacity:var(--sm-fill)] group-data-[status=failed]:[fill-opacity:var(--sm-fill)]"
          cx="12"
          cy="12"
          r={radius}
          transform="rotate(-90 12 12)"
        />
        <circle
          ref={ringRef}
          className="fill-none [stroke:currentColor] [stroke-width:var(--sm-stroke)] [stroke-linecap:round] opacity-[0.55] [transition:opacity_200ms_ease] group-data-[status=running]:opacity-100 group-data-[status=done]:opacity-100 group-data-[status=failed]:opacity-100 motion-reduce:group-data-[indeterminate]:animate-pulse"
          cx="12"
          cy="12"
          r={radius}
          transform="rotate(-90 12 12)"
        />
        <path
          className="fill-none [stroke:currentColor] [stroke-width:var(--sm-stroke)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1_2] [stroke-dashoffset:1.05] opacity-0 [transition:stroke-dashoffset_160ms_cubic-bezier(0.23,1,0.32,1),opacity_0ms_linear_160ms] group-data-[status=done]:[stroke-dashoffset:0] group-data-[status=done]:opacity-100 group-data-[status=done]:[transition:stroke-dashoffset_var(--sm-draw)_cubic-bezier(0.23,1,0.32,1)_var(--sm-check-delay),opacity_0ms_linear_var(--sm-check-delay)] motion-reduce:[stroke-dashoffset:0] motion-reduce:[transition:opacity_200ms_ease] motion-reduce:group-data-[status=done]:[transition:opacity_200ms_ease]"
          d={CHECK}
          pathLength="1"
        />
        <path
          className="fill-none [stroke:currentColor] [stroke-width:var(--sm-stroke)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1_2] [stroke-dashoffset:1.05] opacity-0 [transition:stroke-dashoffset_160ms_cubic-bezier(0.23,1,0.32,1),opacity_0ms_linear_160ms] group-data-[status=failed]:[stroke-dashoffset:0] group-data-[status=failed]:opacity-100 group-data-[status=failed]:[transition:stroke-dashoffset_var(--sm-draw)_cubic-bezier(0.23,1,0.32,1)_var(--sm-check-delay),opacity_0ms_linear_var(--sm-check-delay)] group-data-[status=cancelled]:[stroke-dashoffset:0] group-data-[status=cancelled]:opacity-100 group-data-[status=cancelled]:[transition:stroke-dashoffset_var(--sm-draw)_cubic-bezier(0.23,1,0.32,1)_var(--sm-check-delay),opacity_0ms_linear_var(--sm-check-delay)] motion-reduce:[stroke-dashoffset:0] motion-reduce:[transition:opacity_200ms_ease] motion-reduce:group-data-[status=failed]:[transition:opacity_200ms_ease] motion-reduce:group-data-[status=cancelled]:[transition:opacity_200ms_ease]"
          d={CROSS}
          pathLength="1"
        />
      </svg>
      {hasLabel ? <span className="sr-only">{spoken}: </span> : null}
      {hasLabel ? (
        <span className="relative leading-[1.25] opacity-[0.65] [color:var(--sm-color)] [font-size:var(--sm-font)] [transition:opacity_200ms_ease] group-data-[status=running]:opacity-100 group-data-[status=done]:opacity-60 group-data-[status=failed]:opacity-100 group-data-[status=cancelled]:opacity-[0.55]">
          {label}
          <span
            className="pointer-events-none absolute inset-x-0 top-1/2 origin-left scale-x-0 bg-current [translate:0_-50%] [height:max(1px,calc(var(--sm-font)/14))] [transition:transform_160ms_cubic-bezier(0.23,1,0.32,1)] group-data-[status=done]:group-data-[strike]:scale-x-100 group-data-[status=done]:group-data-[strike]:[transition:transform_280ms_cubic-bezier(0.23,1,0.32,1)_var(--sm-strike-delay)] motion-reduce:scale-x-100! motion-reduce:opacity-0 motion-reduce:[transition:opacity_200ms_ease] motion-reduce:group-data-[status=done]:group-data-[strike]:opacity-100 motion-reduce:group-data-[status=done]:group-data-[strike]:[transition:opacity_200ms_ease]"
            aria-hidden="true"
          />
        </span>
      ) : null}
    </span>
  );
}
