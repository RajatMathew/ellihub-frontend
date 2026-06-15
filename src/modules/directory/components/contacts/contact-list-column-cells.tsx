import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { getInitials } from '@/app/lib/helpers';
import {
  getContactLinkedEntities,
  type ContactLinkedEntity,
} from '@/modules/directory/components/contacts/contact-list-utils';
import type { Contact } from '@/modules/directory/schemas/contact.schema';
import { Mail, MoreHorizontal, Phone, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ContactNameCell({ contact }: { contact: Contact }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9">
        <AvatarFallback className="text-xs font-semibold">
          {getInitials(contact.fullName, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <Link
          to={`${contact.id}`}
          className="truncate text-sm font-medium text-foreground hover:text-primary"
        >
          {contact.fullName}
        </Link>
        {contact.professionalRole && (
          <span className="truncate text-sm text-muted-foreground">
            {contact.professionalRole.label || contact.professionalRole.name}
          </span>
        )}
      </div>
    </div>
  );
}

function LinkedEntityList({ links }: { links: ContactLinkedEntity[] }) {
  return (
    <>
      <span className="mb-0.5 text-xs font-semibold tracking-normal text-muted-foreground/70">
        Linked Entities
      </span>
      {links.map((link) => (
        <span key={`${link.type}-${link.id}`} className="text-xs font-medium">
          {link.name} ({link.type})
        </span>
      ))}
    </>
  );
}

export function ContactLinkedCompanyCell({
  contact,
  vendorNames,
}: {
  contact: Contact;
  vendorNames: Map<string, string>;
}) {
  const links = getContactLinkedEntities(contact, vendorNames);

  if (links.length === 0) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const firstName = links[0].name;

  if (links.length === 1) {
    return <span className="text-sm text-muted-foreground">{firstName}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default text-sm text-muted-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 hover:decoration-muted-foreground">
          {firstName}{' '}
          <span className="text-xs font-semibold text-muted-foreground/75">
            +{links.length - 1}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex flex-col gap-1 p-2">
        <LinkedEntityList links={links} />
      </TooltipContent>
    </Tooltip>
  );
}

export function ContactEmailCell({ contact }: { contact: Contact }) {
  const email = contact.email?.[0];

  if (!email) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      <Mail className="size-3.5" />
      <a href={`mailto:${email.email}`} className="truncate hover:text-primary">
        {email.email}
      </a>
    </div>
  );
}

export function ContactPhoneCell({ contact }: { contact: Contact }) {
  const phone = contact.phoneNumber?.[0];

  if (!phone) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      <Phone className="size-3.5" />
      <a href={`tel:${phone.number}`} className="truncate hover:text-primary">
        {phone.number}
      </a>
    </div>
  );
}

export function ContactRoleCell({ contact }: { contact: Contact }) {
  const role = contact.professionalRole;

  return role ? (
    <Badge variant="primary" appearance="light" size="sm">
      {role.label || role.name || role.id}
    </Badge>
  ) : (
    <span className="text-sm text-muted-foreground">-</span>
  );
}

export function ContactActionsCell({
  contact,
  canUpdate,
  canDelete,
  onDelete,
}: {
  contact: Contact;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (contact: Contact) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          mode="icon"
          size="sm"
          className="size-7"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <Link to={`${contact.id}`}>View</Link>
        </DropdownMenuItem>
        {canUpdate && (
          <DropdownMenuItem asChild>
            <Link to={`${contact.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(contact)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
