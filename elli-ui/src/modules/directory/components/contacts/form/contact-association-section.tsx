import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { Separator } from '@/app/components/ui/separator';
import type { DirectorySelectOption } from '@/modules/directory/components/contacts/form/contact-form.types';
import type { ContactAssociationsState } from '@/modules/directory/hooks/contacts/use-contact-associations';
import { Plus } from 'lucide-react';

import { ContactAssociationList } from './contact-association-list';

interface ContactAssociationSectionProps {
  associations: ContactAssociationsState;
  vendorOptions: DirectorySelectOption[];
  gcOptions: DirectorySelectOption[];
}

export function ContactAssociationSection({
  associations,
  vendorOptions,
  gcOptions,
}: ContactAssociationSectionProps) {
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

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Vendors
          </h3>
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
            <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
              Add Vendor
            </FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <SearchableSelect
                  options={vendorOptions.filter(
                    (option) =>
                      !associations.vendorLinks.some((link) => link.vendorId === option.value)
                  )}
                  value={null}
                  onValueChange={(vendorId) => {
                    if (vendorId) associations.handleAddAssociation(vendorId, 'VENDOR');
                  }}
                  placeholder="Search Vendors..."
                  searchPlaceholder="Search vendors..."
                  emptyMessage="No vendors found."
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
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            General Contractors
          </h3>
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
            <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
              Add GC
            </FieldLabel>
            <div className="min-w-0">
              <SearchableSelect
                options={gcOptions.filter(
                  (option) =>
                    !associations.gcLinks.some((link) => link.generalContractorId === option.value)
                )}
                value={null}
                onValueChange={(generalContractorId) => {
                  if (generalContractorId) {
                    associations.handleAddAssociation(generalContractorId, 'GC');
                  }
                }}
                placeholder="Search GCs..."
                searchPlaceholder="Search GCs..."
                emptyMessage="No GCs found."
              />
            </div>
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
