import { isMockDataFillEnabled } from '@/app/lib/mock-data-fill';
import { Shuffle } from 'lucide-react';

import { Button } from '@app/components/ui/button';

interface MockDataButtonProps<T> {
  data?: T;
  onLoad?: (data: T) => void;
  onClick?: () => void;
  label?: string;
}

export function MockDataButton<T>({
  data,
  onLoad,
  onClick,
  label = 'Fill Sample',
}: MockDataButtonProps<T>) {
  if (!isMockDataFillEnabled) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }

        if (onLoad) {
          onLoad(data as T);
        }
      }}
    >
      <Shuffle className="size-4" />
      {label}
    </Button>
  );
}
