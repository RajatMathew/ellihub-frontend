import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import {
  useEmailSignaturesQuery,
  useSaveEmailSignaturePreferenceMutation,
} from '@/modules/email/hooks/email.hooks';
import {
  findEmailSignatureId,
  withEmailSignature,
  withoutEmailSignature,
} from '@/modules/email/lib/email-signature';
import type {
  EmailSignaturePreference,
  EmailSignatures,
} from '@/modules/email/schemas/email-signature.schema';
import { Signature } from 'lucide-react';

/** The radio value for "no signature": never a template id. */
const NO_SIGNATURE = '';

const LABEL_CLASS = 'text-[11px] font-medium text-mail-muted';

interface EmailSignatureMenuProps {
  accountId?: string;
  /** The composer's body, which the chosen signature is put into. */
  body: string;
  onBodyChange: (body: string) => void;
  disabled?: boolean;
}

/**
 * The signature control in the composer's formatting row: which signature this
 * message carries, and which one this mailbox adds on its own.
 *
 * Choosing puts the signature into the body — replacing the one there — so the
 * user sees exactly what will be sent and can still edit it for this message.
 * Renders nothing until there is a signature to offer.
 */
export function EmailSignatureMenu({
  accountId,
  body,
  onBodyChange,
  disabled = false,
}: EmailSignatureMenuProps) {
  const { data } = useEmailSignaturesQuery(accountId);

  if (!data || data.signatures.length === 0) return null;

  return (
    <>
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-mail-line" />
      <DropdownMenu>
        {/* The app's tooltip, like the formatting buttons beside it (elli-ui#1337). */}
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Signature"
                disabled={disabled}
                className={cn(
                  'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground',
                  'hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                  'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
                  'disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-150'
                )}
              >
                <Signature aria-hidden="true" className="size-4" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Signature</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" side="top" className="w-72">
          {/* Mounted only while open, so the body is read for its signature on
            opening the menu rather than on every keystroke. */}
          <SignatureMenuItems
            accountId={accountId}
            signatures={data}
            body={body}
            onBodyChange={onBodyChange}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function SignatureMenuItems({
  accountId,
  signatures: data,
  body,
  onBodyChange,
}: {
  accountId?: string;
  signatures: EmailSignatures;
  body: string;
  onBodyChange: (body: string) => void;
}) {
  const savePreference = useSaveEmailSignaturePreferenceMutation(accountId);
  const { signatures, preference, defaultSignatureId } = data;
  const current = findEmailSignatureId(body, signatures);
  const currentOption = signatures.find((option) => option.id === current);
  // An edited signature matches no template, so no radio is checked for it.
  const radioValue = current === null ? NO_SIGNATURE : (currentOption?.id ?? 'edited');

  const choose = (value: string) => {
    if (value === NO_SIGNATURE) {
      onBodyChange(withoutEmailSignature(body));
      return;
    }
    const option = signatures.find((signature) => signature.id === value);
    if (option) onBodyChange(withEmailSignature(body, option.html));
  };

  const save = (change: Partial<EmailSignaturePreference>) =>
    savePreference.mutate({ ...preference, ...change });

  return (
    <>
      <DropdownMenuLabel className={LABEL_CLASS}>Signature for this email</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={radioValue} onValueChange={choose}>
        {signatures.map((option) => (
          <DropdownMenuRadioItem key={option.id} value={option.id} className="gap-2">
            <span className="min-w-0 flex-1 truncate">{option.name}</span>
            {option.id === defaultSignatureId && (
              <span className="shrink-0 text-[11px] text-mail-muted">Default</span>
            )}
          </DropdownMenuRadioItem>
        ))}
        <DropdownMenuRadioItem value={NO_SIGNATURE}>No signature</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>

      <DropdownMenuSeparator />
      <DropdownMenuLabel className={LABEL_CLASS}>In this mailbox, add it to</DropdownMenuLabel>
      <DropdownMenuCheckboxItem
        checked={preference.insertOnNew}
        disabled={savePreference.isPending}
        // Keeps the menu open, so both boxes can be set in one visit.
        onSelect={(event) => event.preventDefault()}
        onCheckedChange={(checked) => save({ insertOnNew: checked === true })}
      >
        New emails
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={preference.insertOnReply}
        disabled={savePreference.isPending}
        onSelect={(event) => event.preventDefault()}
        onCheckedChange={(checked) => save({ insertOnReply: checked === true })}
      >
        Replies and forwards
      </DropdownMenuCheckboxItem>
      {currentOption && currentOption.id !== defaultSignatureId && (
        <DropdownMenuItem
          disabled={savePreference.isPending}
          onSelect={() => save({ templateId: currentOption.id })}
        >
          <span className="min-w-0 truncate">Make “{currentOption.name}” the default</span>
        </DropdownMenuItem>
      )}
    </>
  );
}
