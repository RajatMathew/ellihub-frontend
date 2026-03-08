import { FlaskConical } from 'lucide-react';

import { Button } from '@app/components/ui/button';

const isDev = import.meta.env.DEV;

interface MockDataButtonProps<T> {
  data: T;
  onLoad: (data: T) => void;
  label?: string;
}

export function MockDataButton<T>({ data, onLoad, label = 'Enter Mock Data' }: MockDataButtonProps<T>) {
  if (!isDev) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className="border-dashed border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
      onClick={() => onLoad(data)}
    >
      <FlaskConical className="size-4" />
      {label}
    </Button>
  );
}
