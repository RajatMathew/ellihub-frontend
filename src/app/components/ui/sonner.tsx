'use client';

import * as React from 'react';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="group toaster [&_[data-type=success]>[data-icon]]:text-success [&_[data-type=success]_[data-title]]:text-success [&_[data-type=info]_[data-title]]:text-info [&_[data-type=error]>[data-icon]]:text-destructive [&_[data-type=error]_[data-title]]:text-destructive"
      duration={8000}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground! group-[.toaster]:border-border group-[.toaster]:shadow-lg has-[[role=alert]]:border-0! has-[[role=alert]]:shadow-none! has-[[role=alert]]:bg-transparent!',
          description: 'group-[.toast]:text-muted-foreground',
          // The background needs the `!` as much as the text colour does. Sonner
          // ships its own `[data-button]` background, and without the flag it
          // wins — which left the action button transparent while the
          // foreground override still applied, i.e. near-white text on a white
          // toast. Nothing used a toast action until the tasks board's Undo, so
          // it went unnoticed.
          actionButton:
            'group-[.toast]:rounded-md! group-[.toast]:bg-primary! group-[.toast]:text-primary-foreground!',
          cancelButton:
            'group-[.toast]:rounded-md! group-[.toast]:bg-secondary! group-[.toast]:text-secondary-foreground!',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
