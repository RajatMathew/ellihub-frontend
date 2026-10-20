import { useState } from 'react';

import { FormFieldLabel } from '@/app/components/form-field-label';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field } from '@/app/components/ui/field';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Separator } from '@/app/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import type { DirectorySelectOption } from '@/modules/directory/components/contacts/form/contact-form.types';
import type { ContactAssociationsState } from '@/modules/directory/hooks/contacts/use-contact-associations';
import { Plus } from 'lucide-react';

import { ContactAssociationList } from './contact-association-list';

interface ContactAssociationSectionProps {
  associations: ContactAssociationsState;
  vendorOptions: DirectorySelectOption[];
  vendorSearch: string;
  onVendorSearchChange: (value: string) => void;
  isVendorLoading?: boolean;
  isVendorFetchingNextPage?: boolean;
  hasMoreVendors?: boolean;
  onFetchMoreVendors?: () => void;
  gcOptions: DirectorySelectOption[];
  gcSearch: string;
  onGCSearchChange: (value: string) => void;
  isGCLoading?: boolean;
  isGCFetchingNextPage?: boolean;
  hasMoreGCs?: boolean;
  onFetchMoreGCs?: () => void;
}

export function ContactAssociationSection({
  associations,
  vendorOptions,
  vendorSearch,
  onVendorSearchChange,
  isVendorLoading = false,
  isVendorFetchingNextPage = false,
  hasMoreVendors = false,
  onFetchMoreVendors,
  gcOptions,
  gcSearch,
  onGCSearchChange,
  isGCLoading = false,
  isGCFetchingNextPage = false,
  hasMoreGCs = false,
  onFetchMoreGCs,
}: ContactAssociationSectionProps) {
  const [activeTab, setActiveTab] = useState<'VENDOR' | 'GC'>(
    associations.currentAssociation?.type ?? 'VENDOR'
  );

  return (
    <Card id="association">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">External Association</h2>
          <p className="text-sm text-muted-foreground">
            Link this contact to one vendor or general contractor.
          </p>
        </div>

        <Separator />

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'VENDOR' | 'GC')}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="VENDOR">Vendor</TabsTrigger>
            <TabsTrigger value="GC">GC</TabsTrigger>
          </TabsList>

          <TabsContent value="VENDOR" className="space-y-4">
            <ContactAssociationList
              vendorLinks={associations.vendorLinks}
              gcLinks={[]}
              vendorOptions={vendorOptions}
              gcOptions={gcOptions}
              setVendorLinks={associations.setVendorLinks}
              setGCLinks={associations.setGCLinks}
              onUnlink={associations.handleUnlinkClick}
            />

            <Field>
              <FormFieldLabel>Vendor</FormFieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <InfiniteSearchSelect
                    options={vendorOptions.filter(
                      (option) =>
                        !associations.vendorLinks.some((link) => link.vendorId === option.value)
                    )}
                    value={null}
                    onValueChange={(vendorId) => {
                      if (!vendorId) return;
                      const selected = vendorOptions.find((option) => option.value === vendorId);
                      associations.handleAddAssociation(vendorId, 'VENDOR', selected?.label);
                    }}
                    search={vendorSearch}
                    onSearchChange={onVendorSearchChange}
                    isLoading={isVendorLoading}
                    isFetchingNextPage={isVendorFetchingNextPage}
                    hasNextPage={hasMoreVendors}
                    onFetchNextPage={onFetchMoreVendors}
                    placeholder="Search vendors..."
                    searchPlaceholder="Search vendors..."
                    emptyMessage="No vendors found."
                    loadingMessage="Loading vendors..."
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => associations.setVendorDialogOpen(true)}
                >
                  <Plus className="size-4" />
                  Create Vendor
                </Button>
              </div>
            </Field>
          </TabsContent>

          <TabsContent value="GC" className="space-y-4">
            <ContactAssociationList
              vendorLinks={[]}
              gcLinks={associations.gcLinks}
              vendorOptions={vendorOptions}
              gcOptions={gcOptions}
              setVendorLinks={associations.setVendorLinks}
              setGCLinks={associations.setGCLinks}
              onUnlink={associations.handleUnlinkClick}
            />

            <Field>
              <FormFieldLabel>GC</FormFieldLabel>
              <div className="min-w-0">
                <InfiniteSearchSelect
                  options={gcOptions.filter(
                    (option) =>
                      !associations.gcLinks.some(
                        (link) => link.generalContractorId === option.value
                      )
                  )}
                  value={null}
                  onValueChange={(generalContractorId) => {
                    if (generalContractorId) {
                      const selected = gcOptions.find(
                        (option) => option.value === generalContractorId
                      );
                      associations.handleAddAssociation(generalContractorId, 'GC', selected?.label);
                    }
                  }}
                  search={gcSearch}
                  onSearchChange={onGCSearchChange}
                  isLoading={isGCLoading}
                  isFetchingNextPage={isGCFetchingNextPage}
                  hasNextPage={hasMoreGCs}
                  onFetchNextPage={onFetchMoreGCs}
                  placeholder="Search GCs..."
                  searchPlaceholder="Search GCs..."
                  emptyMessage="No GCs found."
                  loadingMessage="Loading GCs..."
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => associations.setGCDialogOpen(true)}
              >
                <Plus className="size-4" />
                Create GC
              </Button>
            </Field>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
