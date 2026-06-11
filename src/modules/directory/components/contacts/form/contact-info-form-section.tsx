import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { TagInput } from '@/app/components/ui/tag-input';
import type {
  ContactFormValues,
  ProfessionalRole,
} from '@/modules/directory/schemas/contact.schema';
import { Building2, CircleUserRound, Mail, Phone } from 'lucide-react';
import { Controller, type Control, type FormState } from 'react-hook-form';

import { ContactFormFieldLabel, contactInvalidControlClassName } from './contact-form-field';

interface ContactInfoFormSectionProps {
  control: Control<ContactFormValues>;
  formState: FormState<ContactFormValues>;
  roles: ProfessionalRole[];
  isLoadingRoles: boolean;
}

export function ContactInfoFormSection({
  control,
  formState,
  roles,
  isLoadingRoles,
}: ContactInfoFormSectionProps) {
  return (
    <Card id="contact-info">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contact Info</h2>
          <p className="text-sm text-muted-foreground">Core identity and professional details.</p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="fullName"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <ContactFormFieldLabel required>Full Name</ContactFormFieldLabel>
                <InputWrapper
                  className={fieldState.invalid ? contactInvalidControlClassName : undefined}
                >
                  <CircleUserRound className="size-4" />
                  <Input
                    {...field}
                    placeholder="e.g. Michael Chen"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    data-testid="contact-full-name-input"
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="professionalRoleId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <ContactFormFieldLabel>Professional Role</ContactFormFieldLabel>
                <Select
                  key={`${roles.length}-${field.value || 'none'}`}
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(value) => field.onChange(value || undefined)}
                  disabled={isLoadingRoles}
                >
                  <SelectTrigger
                    aria-invalid={fieldState.invalid}
                    className={fieldState.invalid ? contactInvalidControlClassName : undefined}
                    data-testid="contact-role-select"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      <SelectValue
                        placeholder={isLoadingRoles ? 'Loading roles...' : 'Select role...'}
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.label || role.name || role.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => {
              const emailValue = field.value?.email ?? '';
              const isInvalid = fieldState.invalid || Boolean(formState.errors.email);
              return (
                <Field data-invalid={isInvalid}>
                  <ContactFormFieldLabel>Email Address</ContactFormFieldLabel>
                  <InputWrapper className={isInvalid ? contactInvalidControlClassName : undefined}>
                    <Mail className="size-4" />
                    <Input
                      type="email"
                      value={emailValue}
                      onChange={(event) => {
                        const value = event.target.value;
                        field.onChange(value ? { email: value, label: 'Work' } : undefined);
                      }}
                      placeholder="m.chen@company.com"
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      data-testid="contact-email-input"
                    />
                  </InputWrapper>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  {!fieldState.error && formState.errors.email && (
                    <FieldError errors={[formState.errors.email]} />
                  )}
                </Field>
              );
            }}
          />

          <Controller
            name="phoneNumber"
            control={control}
            render={({ field, fieldState }) => {
              const phoneValue = field.value?.number ?? '';
              return (
                <Field data-invalid={fieldState.invalid}>
                  <ContactFormFieldLabel>Direct Phone</ContactFormFieldLabel>
                  <InputWrapper
                    className={fieldState.invalid ? contactInvalidControlClassName : undefined}
                  >
                    <Phone className="size-4" />
                    <Input
                      type="tel"
                      value={phoneValue}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^+\d\s\-().]/g, '');
                        field.onChange(value ? { number: value, label: 'Office' } : undefined);
                      }}
                      placeholder="(555) 000-0000"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      data-testid="contact-phone-input"
                    />
                  </InputWrapper>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />
        </div>

        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <Field>
              <ContactFormFieldLabel>Tags</ContactFormFieldLabel>
              <TagInput
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="e.g. Decision Maker, Finance..."
              />
              <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag.</p>
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
}
