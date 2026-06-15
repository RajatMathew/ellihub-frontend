import { useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAccess } from '@/app/contexts/access-context';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { DirectoryDetailLoading, mergeLinkedContacts } from '@/modules/directory/components/shared';
import {
  VendorDetailDialogs,
  VendorDetailSidebar,
  VendorDetailStats,
  VendorDetailToolbar,
  VendorOverviewTab,
  VendorProjectsTab,
  VendorPurchaseOrdersTab,
} from '@/modules/directory/components/vendors/detail';
import { VENDOR_DETAIL_TABS } from '@/modules/directory/constants/vendors/vendor-detail.constants';
import { useDirectoryActivity } from '@/modules/directory/hooks/shared';
import {
  useDeleteVendorMutation,
  useVendorDetailQuery,
} from '@/modules/directory/hooks/vendors.hooks';
import { useNavigate, useParams } from 'react-router-dom';

export function VendorDetailPage() {
  const { can } = useAccess();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: vendor, isLoading, isError, refetch } = useVendorDetailQuery(id ?? '');
  const deleteMutation = useDeleteVendorMutation();
  const activity = useDirectoryActivity('vendor', id);

  useBreadcrumbLabel(id ? `/app/directory/vendors/${id}` : undefined, vendor?.name ?? 'Vendor');

  if (isLoading) {
    return <DirectoryDetailLoading />;
  }

  if (isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load vendor."
          description="The vendor details could not be loaded."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Vendor not found."
          description="This vendor may have been deleted or moved."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const contacts = mergeLinkedContacts(vendor.contacts, vendor.contactLinks);
  const canUpdateVendor = can('vendor', 'update');
  const canDeleteVendor = can('vendor', 'delete');

  return (
    <div className="container-fluid max-w-full overflow-x-hidden pb-5">
      <VendorDetailToolbar
        vendor={vendor}
        sidebarOpen={sidebarOpen}
        canUpdate={canUpdateVendor}
        canDelete={canDeleteVendor}
        onDelete={() => setDeleteOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <VendorDetailStats vendor={vendor} />

          <Tabs defaultValue="overview" className="min-w-0">
            <TabsList variant="line" className="max-w-full overflow-x-auto">
              {VENDOR_DETAIL_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <VendorOverviewTab vendor={vendor} contacts={contacts} />
            </TabsContent>

            <TabsContent value="projects">
              <VendorProjectsTab vendor={vendor} />
            </TabsContent>

            <TabsContent value="purchase-orders">
              <VendorPurchaseOrdersTab vendor={vendor} />
            </TabsContent>
          </Tabs>
        </div>

        <VendorDetailSidebar
          vendor={vendor}
          open={sidebarOpen}
          activityItems={activity.items}
          isActivityLoading={activity.isLoading}
          isActivityError={activity.isError}
          onClose={() => setSidebarOpen(false)}
          onRetryActivity={() => void activity.refetch()}
        />
      </div>

      <VendorDetailDialogs
        vendor={vendor}
        open={deleteOpen && canDeleteVendor}
        isDeleting={deleteMutation.isPending}
        onOpenChange={setDeleteOpen}
        onDelete={() => {
          if (!id || !canDeleteVendor) return;
          deleteMutation.mutate(id, {
            onSuccess: () => navigate('..', { relative: 'path' }),
          });
        }}
      />
    </div>
  );
}
