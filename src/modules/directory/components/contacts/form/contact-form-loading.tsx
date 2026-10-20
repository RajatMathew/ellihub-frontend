import {
  formPageContainerClassName,
  unifiedFormHeaderClassName,
  unifiedSingleSectionFormToolbarClassName,
} from '@/app/components/form-page-layout';
import { PageHeaderSkeleton } from '@/app/components/page-header';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function ContactFormLoading() {
  return (
    <div className={formPageContainerClassName}>
      <div className={unifiedFormHeaderClassName}>
        <PageHeaderSkeleton
          actionCount={2}
          className={unifiedSingleSectionFormToolbarClassName}
          showEyebrow
          sticky={false}
        />
      </div>

      <div className="space-y-6 pt-4 pb-8 lg:pb-10">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={`contact-form-loader-${index}`}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Skeleton className="h-18 w-full" />
                <Skeleton className="h-18 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
