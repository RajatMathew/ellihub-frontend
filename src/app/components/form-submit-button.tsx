import type { ComponentProps } from 'react';

import { Button } from '@/app/components/ui/button';
import { Check, LoaderCircle } from 'lucide-react';

interface FormSubmitButtonProps extends Omit<ComponentProps<typeof Button>, 'type'> {
  isSubmitting: boolean;
}

export function FormSubmitButton({
  isSubmitting,
  disabled,
  children,
  size = 'sm',
  ...props
}: FormSubmitButtonProps) {
  const Icon = isSubmitting ? LoaderCircle : Check;

  return (
    <Button size={size} type="submit" disabled={disabled || isSubmitting} {...props}>
      <Icon className={isSubmitting ? 'size-4 animate-spin' : 'size-4'} />
      {children}
    </Button>
  );
}
