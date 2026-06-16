import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';

import type { MenuConfig } from '@app/config/types';

import SidebarBuilder from './sidebar-builder';

type SidebarMode = 'main' | 'project';

interface SidebarAnimatedContentProps {
  menuConfig: MenuConfig;
  mode: SidebarMode;
}

const sidebarVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 18 : -18,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -18 : 18,
  }),
};

const reducedMotionVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

export type { SidebarMode };

export function SidebarAnimatedContent({ menuConfig, mode }: SidebarAnimatedContentProps) {
  const shouldReduceMotion = useReducedMotion();
  const direction = mode === 'project' ? 1 : -1;

  return (
    <div className="min-h-full min-w-60 overflow-x-hidden">
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={mode}
          custom={direction}
          variants={shouldReduceMotion ? reducedMotionVariants : sidebarVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: shouldReduceMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <SidebarBuilder menuConfig={menuConfig} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
