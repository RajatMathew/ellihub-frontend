import { useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { ComingSoonPlaceholder } from '@/modules/directory/components/coming-soon-placeholder';
import {
  GCDetailDialogs,
  GCDetailSidebar,
  GCDetailStats,
  GCDetailToolbar,
  GCOverviewTab,
} from '@/modules/directory/components/gc/detail';
import { DirectoryDetailLoading, mergeLinkedContacts } from '@/modules/directory/components/shared';
import { GC_DETAIL_TABS } from '@/modules/directory/constants/gc/gc-detail.constants';
import {
  useDeleteGCMutation,
  useGCDetailQuery,
  useGCStatsQuery,
} from '@/modules/directory/hooks/gc.hooks';
import { useDirectoryActivity } from '@/modules/directory/hooks/shared';
import { DollarSign, FileText, FolderOpen } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const GC_PLACEHOLDER_ICONS = {
  projects: FolderOpen,
  'change-orders': FileText,
  'prime-payments': DollarSign,
} as const;

const GC_PLACEHOLDER_TITLES = {
  projects: 'Projects',
  'change-orders': 'Prime Change Orders',
  'prime-payments': 'Prime Payments',
} as const;

export function GCDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: gc, isLoading, isError, refetch } = useGCDetailQuery(id ?? '');
  const { data: stats } = useGCStatsQuery();
  const deleteMutation = useDeleteGCMutation();
  const activity = useDirectoryActivity('gc', id);

  useBreadcrumbLabel(
    id ? `/app/directory/general-contractors/${id}` : undefined,
    gc?.name ?? 'General Contractor'
  );

  if (isLoading) {
    return <DirectoryDetailLoading />;
  }

  if (isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load general contractor."
          description="The general contractor details could not be loaded."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!gc) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="General contractor not found."
          description="This general contractor may have been deleted or moved."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const contacts = mergeLinkedContacts(gc.contacts, gc.contactLinks);

  return (
    <div className="container-fluid max-w-full overflow-x-hidden py-5 sm:py-7.5">
      <GCDetailToolbar
        gc={gc}
        sidebarOpen={sidebarOpen}
        onDelete={() => setDeleteOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <GCDetailStats gc={gc} stats={stats} contactCount={contacts.length} />

          <Tabs defaultValue="overview" className="min-w-0">
            <TabsList variant="line" className="max-w-full overflow-x-auto">
              {GC_DETAIL_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <GCOverviewTab gc={gc} />
            </TabsContent>

            {GC_DETAIL_TABS.filter((tab) => tab.value !== 'overview').map((tab) => {
              const Icon = GC_PLACEHOLDER_ICONS[tab.value];
              return (
                <TabsContent key={tab.value} value={tab.value}>
                  <Card>
                    <CardContent>
                      <ComingSoonPlaceholder icon={Icon} title={GC_PLACEHOLDER_TITLES[tab.value]} />
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        <GCDetailSidebar
          open={sidebarOpen}
          contacts={contacts}
          activityItems={activity.items}
          isActivityLoading={activity.isLoading}
          isActivityError={activity.isError}
          onClose={() => setSidebarOpen(false)}
          onRetryActivity={() => void activity.refetch()}
        />
      </div>

      <GCDetailDialogs
        gc={gc}
        open={deleteOpen}
        isDeleting={deleteMutation.isPending}
        onOpenChange={setDeleteOpen}
        onDelete={() => {
          if (!id) return;
          deleteMutation.mutate(id, {
            onSuccess: () => navigate('..', { relative: 'path' }),
          });
        }}
      />
    </div>
  );
}
