import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { Separator } from '@/app/components/ui/separator';
import { Switch } from '@/app/components/ui/switch';
import { CircleUserRound, Plus, X } from 'lucide-react';

export interface LinkedContactItem {
  contactId: string;
  isPrimary: boolean;
}

export interface LinkedContactNameSource {
  id: string;
  fullName: string;
}

export interface LinkedContactOriginalLink {
  contactId: string;
  contact?: { fullName?: string | null } | null;
}

interface LinkedContactsSectionProps {
  title: string;
  description: string;
  emptyMessage: string;
  contactLinks: LinkedContactItem[];
  originalLinks: LinkedContactOriginalLink[];
  contacts: LinkedContactNameSource[];
  contactOptions: { value: string; label: string }[];
  onChange: (links: LinkedContactItem[]) => void;
  onCreateContact: () => void;
}

export function LinkedContactsSection({
  title,
  description,
  emptyMessage,
  contactLinks,
  originalLinks,
  contacts,
  contactOptions,
  onChange,
  onCreateContact,
}: LinkedContactsSectionProps) {
  const availableOptions = contactOptions.filter(
    (contact) => !contactLinks.some((link) => link.contactId === contact.value)
  );

  return (
    <Card id="contacts">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Separator />

        {contactLinks.length > 0 && (
          <div className="space-y-2">
            {contactLinks.map((link, index) => (
              <div
                key={link.contactId}
                className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <CircleUserRound className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-words text-sm font-medium text-foreground">
                    {getLinkedContactName(link.contactId, originalLinks, contacts)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Primary
                    <Switch
                      checked={link.isPrimary}
                      onCheckedChange={(checked) =>
                        onChange(
                          contactLinks.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, isPrimary: checked } : item
                          )
                        )
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    mode="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      onChange(contactLinks.filter((_, itemIndex) => itemIndex !== index))
                    }
                    aria-label="Remove contact"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Field>
          <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
            Add Contact
          </FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SearchableSelect
                options={availableOptions}
                value={null}
                onValueChange={(contactId) => {
                  if (!contactId) return;
                  onChange([...contactLinks, { contactId, isPrimary: false }]);
                }}
                placeholder="Search contacts..."
                searchPlaceholder="Search contacts..."
                emptyMessage="No contacts found."
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onCreateContact}>
              <Plus className="size-4" />
              Create Contact
            </Button>
          </div>
        </Field>

        {contactLinks.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getLinkedContactName(
  contactId: string,
  originalLinks: LinkedContactOriginalLink[],
  contacts: LinkedContactNameSource[]
) {
  const fromLink = originalLinks.find((link) => link.contactId === contactId);
  if (fromLink?.contact?.fullName) {
    return fromLink.contact.fullName;
  }

  return contacts.find((contact) => contact.id === contactId)?.fullName ?? contactId;
}
