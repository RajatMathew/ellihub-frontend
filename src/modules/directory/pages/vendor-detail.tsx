import { useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { ComingSoonPlaceholder } from '@/modules/directory/components/coming-soon-placeholder';
import { DirectoryDetailLoading, mergeLinkedContacts } from '@/modules/directory/components/shared';
import {
  VendorDetailDialogs,
  VendorDetailSidebar,
  VendorDetailStats,
  VendorDetailToolbar,
  VendorOverviewTab,
} from '@/modules/directory/components/vendors/detail';
import { VENDOR_DETAIL_TABS } from '@/modules/directory/constants/vendors/vendor-detail.constants';
import { useDirectoryActivity } from '@/modules/directory/hooks/shared';
import {
  useDeleteVendorMutation,
  useVendorDetailQuery,
} from '@/modules/directory/hooks/vendors.hooks';
import { DollarSign, FileText, FolderOpen, Package } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const VENDOR_PLACEHOLDER_ICONS = {
  projects: FolderOpen,
  'purchase-orders': Package,
  'change-orders': FileText,
  payments: DollarSign,
} as const;

const VENDOR_PLACEHOLDER_TITLES = {
  projects: 'Project Assignments',
  'purchase-orders': 'Purchase Order History',
  'change-orders': 'Change Order History',
  payments: 'Payment Log',
} as const;

export function VendorDetailPage() {
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

  return (
    <div className="container-fluid max-w-full overflow-x-hidden py-5 sm:py-7.5">
      <VendorDetailToolbar
        vendor={vendor}
        sidebarOpen={sidebarOpen}
        onDelete={() => setDeleteOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <VendorDetailStats />

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

            {VENDOR_DETAIL_TABS.filter((tab) => tab.value !== 'overview').map((tab) => {
              const Icon = VENDOR_PLACEHOLDER_ICONS[tab.value];
              return (
                <TabsContent key={tab.value} value={tab.value}>
                  <Card>
                    <CardContent>
                      <ComingSoonPlaceholder
                        icon={Icon}
                        title={VENDOR_PLACEHOLDER_TITLES[tab.value]}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
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
