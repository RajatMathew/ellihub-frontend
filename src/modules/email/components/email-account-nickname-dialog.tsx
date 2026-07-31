import { useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputAddon, InputGroup } from '@/app/components/ui/input';
import {
  emailAccountNicknameSchema,
  getEmailAccountNicknameLocalPart,
  type EmailAccountNicknameInput,
} from '@/modules/email/schemas/email-account.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface EmailAccountNicknameDialogProps {
  open: boolean;
  required: boolean;
  connectedAddress: string;
  defaultNickname: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (nickname: string) => void;
}

export function EmailAccountNicknameDialog({
  open,
  required,
  connectedAddress,
  defaultNickname,
  isSaving,
  onOpenChange,
  onSave,
}: EmailAccountNicknameDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailAccountNicknameInput>({
    resolver: zodResolver(emailAccountNicknameSchema),
    defaultValues: { nickname: getEmailAccountNicknameLocalPart(defaultNickname) },
  });

  useEffect(() => {
    if (open) {
      reset({ nickname: getEmailAccountNicknameLocalPart(defaultNickname) });
    }
  }, [defaultNickname, open, reset]);

  const closeDialog = () => {
    if (!required && !isSaving) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDialog())}
    >
      <DialogContent
        className="max-w-md"
        showCloseButton={!required}
        onEscapeKeyDown={(event) => {
          if (required) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (required) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Name your Elli email</DialogTitle>
          <DialogDescription>
            {connectedAddress} is connected. Choose the address you want to see inside Elli.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(event) => void handleSubmit((values) => onSave(values.nickname.trim()))(event)}
        >
          <Field data-invalid={Boolean(errors.nickname)}>
            <FieldLabel htmlFor="email-account-nickname">Elli email address</FieldLabel>
            <InputGroup>
              <Input
                id="email-account-nickname"
                type="text"
                autoComplete="off"
                placeholder="aaryan"
                spellCheck={false}
                autoFocus
                disabled={isSaving}
                aria-invalid={Boolean(errors.nickname)}
                aria-describedby={
                  errors.nickname ? 'email-account-nickname-error' : 'email-account-nickname-help'
                }
                {...register('nickname')}
              />
              <InputAddon className="select-none font-medium">@ellicorp.com</InputAddon>
            </InputGroup>
            <FieldDescription id="email-account-nickname-help">
              This is only your Elli label. Your connected email address stays unchanged.
            </FieldDescription>
            <FieldError id="email-account-nickname-error" errors={[errors.nickname]} />
          </Field>

          <DialogFooter>
            {!required && (
              <Button type="button" variant="outline" disabled={isSaving} onClick={closeDialog}>
                Not now
              </Button>
            )}
            <Button type="submit" disabled={isSaving} aria-busy={isSaving}>
              {isSaving ? 'Saving...' : 'Save email name'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
