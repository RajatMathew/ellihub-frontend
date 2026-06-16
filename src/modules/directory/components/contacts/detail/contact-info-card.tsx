import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { ContactInfoItem } from '@/modules/directory/components/contact-info-item';
import { InlineAddForm } from '@/modules/directory/components/inline-add-form';
import {
  EMAIL_LABEL_OPTIONS,
  PHONE_LABEL_OPTIONS,
} from '@/modules/directory/constants/contacts/contact-detail.constants';
import type { ContactMethodEditor } from '@/modules/directory/hooks/contacts/use-contact-method-editor';
import type { Contact } from '@/modules/directory/schemas/contact.schema';
import { Mail, Phone, Plus } from 'lucide-react';

interface ContactInfoCardProps {
  contact: Contact;
  editor: ContactMethodEditor;
}

export function ContactInfoCard({ contact, editor }: ContactInfoCardProps) {
  const primaryPhone = contact.phoneNumber[0];
  const primaryEmail = contact.email[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Contact Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <ContactInfoSectionHeader
            label="Phone Number"
            isAdding={editor.showAddPhone}
            canAdd={!primaryPhone}
            onToggle={() => editor.setShowAddPhone(!editor.showAddPhone)}
            addLabel="Add Number"
          />
          <div className="space-y-3">
            {primaryPhone ? (
              <ContactInfoItem
                icon={Phone}
                value={primaryPhone.number}
                label={primaryPhone.label}
                onRemove={() => editor.setRemovePhoneConfirm(true)}
              />
            ) : (
              !editor.showAddPhone && (
                <span className="text-sm text-muted-foreground">No phone number</span>
              )
            )}
            {editor.showAddPhone && !primaryPhone && (
              <InlineAddForm
                placeholder="(555) 000-0000"
                value={editor.newPhone}
                onValueChange={(value) => {
                  editor.setNewPhone(value);
                  if (editor.addPhoneError) editor.setAddPhoneError('');
                }}
                labelValue={editor.newPhoneLabel}
                onLabelChange={editor.setNewPhoneLabel}
                labelOptions={PHONE_LABEL_OPTIONS}
                onSubmit={editor.validateAndSubmitPhone}
                isPending={editor.isAddingPhone}
                error={editor.addPhoneError}
              />
            )}
          </div>
        </div>

        <Separator />

        <div>
          <ContactInfoSectionHeader
            label="Email Address"
            isAdding={editor.showAddEmail}
            canAdd={!primaryEmail}
            onToggle={() => editor.setShowAddEmail(!editor.showAddEmail)}
            addLabel="Add Email"
          />
          <div className="space-y-3">
            {primaryEmail ? (
              <ContactInfoItem
                icon={Mail}
                value={primaryEmail.email}
                label={primaryEmail.label}
                onRemove={() => editor.setRemoveEmailConfirm(true)}
              />
            ) : (
              !editor.showAddEmail && (
                <span className="text-sm text-muted-foreground">No email address</span>
              )
            )}
            {editor.showAddEmail && !primaryEmail && (
              <InlineAddForm
                placeholder="email@example.com"
                inputType="email"
                value={editor.newEmail}
                onValueChange={(value) => {
                  editor.setNewEmail(value);
                  if (editor.addEmailError) editor.setAddEmailError('');
                }}
                labelValue={editor.newEmailLabel}
                onLabelChange={editor.setNewEmailLabel}
                labelOptions={EMAIL_LABEL_OPTIONS}
                onSubmit={editor.validateAndSubmitEmail}
                isPending={editor.isAddingEmail}
                error={editor.addEmailError}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactInfoSectionHeader({
  label,
  isAdding,
  canAdd,
  onToggle,
  addLabel,
}: {
  label: string;
  isAdding: boolean;
  canAdd: boolean;
  onToggle: () => void;
  addLabel: string;
}) {
  return (
    <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {canAdd && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-7 self-start px-2 text-xs"
        >
          <Plus className="size-3" />
          {isAdding ? 'Cancel' : addLabel}
        </Button>
      )}
    </div>
  );
}
