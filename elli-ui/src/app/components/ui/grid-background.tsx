'use client';

import * as React from 'react';

import type { HTMLMotionProps } from 'motion/react';
import { motion } from 'motion/react';

import { cn } from '@app/lib/utils';

type GridSize =
  | '4:4'
  | '5:5'
  | '6:6'
  | '6:8'
  | '8:8'
  | '8:12'
  | '10:10'
  | '12:12'
  | '12:16'
  | '16:16';

type GridBackgroundProps = HTMLMotionProps<'div'> & {
  children?: React.ReactNode;
  gridSize?: GridSize;
  colors?: {
    background?: string;
    borderColor?: string;
    borderSize?: string;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
  };
  beams?: {
    count?: number;
    colors?: string[];
    size?: string;
    shadow?: string;
    speed?: number;
  };
};

const createSeededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

function GridBackground({
  className,
  children,
  gridSize = '8:8',
  colors = {},
  beams = {},
  ...props
}: GridBackgroundProps) {
  const {
    background = 'bg-slate-900',
    borderColor = 'border-slate-700/50',
    borderSize = '1px',
    borderStyle = 'solid',
  } = colors;

  const {
    count = 12,
    colors: beamColors = [
      'bg-cyan-400',
      'bg-purple-400',
      'bg-fuchsia-400',
      'bg-violet-400',
      'bg-blue-400',
      'bg-indigo-400',
      'bg-green-400',
      'bg-yellow-400',
      'bg-orange-400',
      'bg-red-400',
      'bg-pink-400',
      'bg-rose-400',
    ],
    shadow = 'shadow-lg shadow-cyan-400/50 rounded-full',
    speed = 4,
  } = beams;

  // Parse grid dimensions
  const [cols, rows] = gridSize.split(':').map(Number);

  // Generate beam configurations
  const animatedBeams = React.useMemo(
    () =>
      Array.from({ length: Math.min(count, 12) }, (_, i) => {
        const baseSeed = count * 31 + rows * 17 + cols * 19 + i * 23;
        const directionSeed = createSeededRandom(baseSeed + 1);
        const lineSeed = createSeededRandom(baseSeed + 2);
        const delaySeed = createSeededRandom(baseSeed + 3);
        const durationSeed = createSeededRandom(baseSeed + 4);
        const repeatSeed = createSeededRandom(baseSeed + 5);

        const direction = directionSeed > 0.5 ? 'horizontal' : 'vertical';
        const startPosition = createSeededRandom(baseSeed + 6) > 0.5 ? 'start' : 'end';

        return {
          id: i,
          color: beamColors[i % beamColors.length],
          direction,
          startPosition,
          // For horizontal beams: choose a row index (1 to rows-1) - exclude edges
          // For vertical beams: choose a column index (1 to cols-1) - exclude edges
          gridLine:
            direction === 'horizontal'
              ? Math.floor(lineSeed * (rows - 1)) + 1
              : Math.floor(lineSeed * (cols - 1)) + 1,
          delay: delaySeed * 2,
          duration: speed + durationSeed * 2,
          repeatDelay: repeatSeed * 3 + 2,
        };
      }),
    [count, beamColors, speed, cols, rows]
  );

  const gridStyle = {
    '--border-style': borderStyle,
  } as React.CSSProperties;

  return (
    <motion.div
      data-slot="grid-background"
      className={cn('relative size-full overflow-hidden', background, className)}
      style={gridStyle}
      {...props}
    >
      {/* Grid Container */}
      <div
        className={cn('absolute inset-0 size-full', borderColor)}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          borderRightWidth: borderSize,
          borderBottomWidth: borderSize,
          borderRightStyle: borderStyle,
          borderBottomStyle: borderStyle,
        }}
      >
        {/* Grid Cells */}
        {Array.from({ length: cols * rows }).map((_, index) => (
          <div
            key={index}
            className={cn('relative', borderColor)}
            style={{
              borderTopWidth: borderSize,
              borderLeftWidth: borderSize,
              borderTopStyle: borderStyle,
              borderLeftStyle: borderStyle,
            }}
          />
        ))}
      </div>

      {/* Animated Beams */}
      {animatedBeams.map((beam) => {
        // Calculate exact grid line positions as percentages
        const horizontalPosition = (beam.gridLine / rows) * 100;
        const verticalPosition = (beam.gridLine / cols) * 100;

        return (
          <motion.div
            key={beam.id}
            className={cn(
              'absolute rounded-full backdrop-blur-sm z-20',
              beam.color,
              beam.direction === 'horizontal' ? 'w-6 h-0.5' : 'w-0.5 h-6',
              shadow
            )}
            style={{
              ...(beam.direction === 'horizontal'
                ? {
                    // Position exactly on the horizontal grid line
                    top: `${horizontalPosition}%`,
                    left: beam.startPosition === 'start' ? '-12px' : 'calc(100% + 12px)',
                    transform: 'translateY(-50%)', // Center on the line
                  }
                : {
                    // Position exactly on the vertical grid line
                    left: `${verticalPosition}%`,
                    top: beam.startPosition === 'start' ? '-12px' : 'calc(100% + 12px)',
                    transform: 'translateX(-50%)', // Center on the line
                  }),
            }}
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              ...(beam.direction === 'horizontal'
                ? {
                    // Move across the full width of the container
                    x:
                      beam.startPosition === 'start'
                        ? [0, 'calc(100vw + 24px)']
                        : [0, 'calc(-100vw - 24px)'],
                  }
                : {
                    // Move across the full height of the container
                    y:
                      beam.startPosition === 'start'
                        ? [0, 'calc(100vh + 24px)']
                        : [0, 'calc(-100vh - 24px)'],
                  }),
            }}
            transition={{
              duration: beam.duration,
              delay: beam.delay,
              repeat: Infinity,
              repeatDelay: beam.repeatDelay, // 2-5s pause between repeats
              ease: 'linear',
              times: [0, 0.1, 0.9, 1], // Quick fade in, maintain, quick fade out
            }}
          />
        );
      })}

      {/* Content Layer */}
      <div className="relative z-10 size-full">{children}</div>
    </motion.div>
  );
}

export { GridBackground, type GridBackgroundProps };
