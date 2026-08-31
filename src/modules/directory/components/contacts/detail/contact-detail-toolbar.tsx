import { DetailPageHeader } from '@/app/components/page-header';
import { Pencil, Trash2 } from 'lucide-react';

interface ContactDetailToolbarProps {
  contactName: string;
  roleName: string | null;
  primaryCompanyName: string | null;
  sidebarOpen: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onOpenSidebar: () => void;
  onDelete: () => void;
}

export function ContactDetailToolbar({
  contactName,
  roleName,
  primaryCompanyName,
  sidebarOpen,
  canUpdate,
  canDelete,
  onOpenSidebar,
  onDelete,
}: ContactDetailToolbarProps) {
  const subtitle = [roleName, primaryCompanyName ? `at ${primaryCompanyName}` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <DetailPageHeader
      backLabel="Contacts"
      title={contactName}
      description={
        <span className="max-w-full break-words text-sm text-muted-foreground">
          {subtitle || 'Directory contact'}
        </span>
      }
      actions={[
        { label: 'Edit Contact', icon: Pencil, to: 'edit', enabled: canUpdate },
        {
          label: 'Delete Permanently',
          icon: Trash2,
          placement: 'overflow',
          destructive: true,
          onClick: onDelete,
          enabled: canDelete,
        },
      ]}
      panel={{ open: sidebarOpen, onOpen: onOpenSidebar }}
    />
  );
}
