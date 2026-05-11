import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import type { ContactTagsEditor as ContactTagsEditorState } from '@/modules/directory/hooks/contacts/use-contact-tags';
import { Briefcase, Building2 } from 'lucide-react';

import { ContactTagsEditor } from './contact-tags-editor';

interface ContactPersonalDetailsCardProps {
  roleName: string | null;
  companyNames: string[];
  tags: string[];
  tagEditor: ContactTagsEditorState;
}

export function ContactPersonalDetailsCard({
  roleName,
  companyNames,
  tags,
  tagEditor,
}: ContactPersonalDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Personal Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ContactDetailField
          icon={<Briefcase className="size-4 text-muted-foreground" />}
          label="Professional Role"
          value={roleName ?? '-'}
        />
        <ContactDetailField
          icon={<Building2 className="size-4 text-muted-foreground" />}
          label="Company"
          value={companyNames.length > 0 ? companyNames.join(', ') : '-'}
        />

        <Separator />
        <ContactTagsEditor tags={tags} editor={tagEditor} />
      </CardContent>
    </Card>
  );
}

function ContactDetailField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-accent">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="break-words text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
