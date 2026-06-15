import { cn } from '@app/lib/utils';

export const formPageContainerClassName =
  'container-fluid max-w-full overflow-x-hidden px-4 pb-5 sm:px-6 lg:px-7.5';

export const formPageContainerWithSpacingClassName = cn(formPageContainerClassName, 'space-y-6');

export const unifiedFormPageClassName = cn(
  formPageContainerClassName,
  'min-h-full overflow-x-visible bg-form-background pt-0 lg:pt-0'
);

export const unifiedFullHeightFormPageClassName = cn(
  formPageContainerClassName,
  'flex min-h-[calc(100dvh-5rem)] flex-col overflow-x-visible bg-form-background pt-0 lg:pt-0'
);

export const unifiedProjectFormPageClassName = cn(
  formPageContainerClassName,
  'min-h-[calc(100dvh-5rem)] overflow-x-visible bg-form-background pt-0 lg:pt-0'
);

export const unifiedFormHeaderClassName =
  'sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-7.5 lg:px-7.5';

export const unifiedFormToolbarClassName =
  'mx-0 mt-0 mb-0 gap-2 bg-transparent px-0 pt-4 pb-2 lg:mx-0 lg:mt-0 lg:px-0 lg:pt-4 lg:pb-2';

export const unifiedSingleSectionFormToolbarClassName =
  'mx-0 mt-0 mb-0 gap-2 bg-transparent px-0 pt-4 pb-4 lg:mx-0 lg:mt-0 lg:px-0 lg:pt-4 lg:pb-4';

export const unifiedFormNavClassName =
  'static -mx-4 bg-transparent backdrop-blur-none sm:-mx-6 lg:-mx-7.5';
