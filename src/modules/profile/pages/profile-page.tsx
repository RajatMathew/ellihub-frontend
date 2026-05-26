import { useEffect, type ReactNode } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
  CardTitle,
} from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { ProfileSecurityCard } from '@/modules/profile/components/profile-security-card';
import { useProfileQuery, useUpdateProfileMutation } from '@/modules/profile/hooks/profile.hooks';
import {
  updateProfileInputSchema,
  type UpdateProfileInput,
  type UserProfile,
} from '@/modules/profile/schemas/profile.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  Check,
  Contact2,
  Image,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  User,
} from 'lucide-react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const emptyValues: UpdateProfileInput = {
  name: '',
  email: '',
  image: '',
  phoneNumber: '',
  address: '',
  startDate: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  signatureName: '',
  signatureRole: '',
  signatureEmail: '',
};

type ProfileFieldName = keyof UpdateProfileInput;

const toDateInputValue = (value?: string | null) => (value ? value.slice(0, 10) : '');

const getInitials = (name?: string) =>
  (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

const getProfileFormValues = (profile: UserProfile): UpdateProfileInput => ({
  name: profile.user.name ?? profile.employee?.name ?? '',
  email: profile.user.email ?? profile.employee?.email ?? '',
  image: profile.user.image ?? '',
  phoneNumber: profile.employee?.phoneNumber ?? '',
  address: profile.employee?.address ?? '',
  startDate: toDateInputValue(profile.employee?.startDate),
  emergencyContactName: profile.employee?.emergencyContactName ?? '',
  emergencyContactPhone: profile.employee?.emergencyContactPhone ?? '',
  emergencyContactRelation: profile.employee?.emergencyContactRelation ?? '',
  signatureName: profile.signature.name,
  signatureRole: profile.signature.role,
  signatureEmail: profile.signature.email,
});

export default function ProfilePage() {
  const navigate = useNavigate();
  const profileQuery = useProfileQuery();
  const updateProfile = useUpdateProfileMutation();
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInputSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset(getProfileFormValues(profileQuery.data));
    }
  }, [form, profileQuery.data]);

  if (profileQuery.isLoading) {
    return <ProfileLoading />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load profile."
          description="Your profile details could not be loaded."
          onRetry={() => void profileQuery.refetch()}
        />
      </div>
    );
  }

  const profile = profileQuery.data;
  const missingCount = profile.missingFields.length;

  const onSubmit = (values: UpdateProfileInput) => {
    updateProfile.mutate(values, {
      onSuccess: (nextProfile) => {
        form.reset(getProfileFormValues(nextProfile));
        navigate('/app');
      },
    });
  };

  return (
    <div className="container-fluid py-7.5">
      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Account / My Profile
            </div>
            <ToolbarPageTitle>My Profile</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              Keep your account and employee details current.
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={!form.formState.isDirty || updateProfile.isPending}
              onClick={() => form.reset(getProfileFormValues(profile))}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={updateProfile.isPending}
              onClick={form.handleSubmit(onSubmit, onInvalidFormSubmit)}
            >
              <Check className="size-4" />
              Save Profile
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-14">
                <AvatarImage src={profile.user.image ?? undefined} alt={profile.user.name} />
                <AvatarFallback>{getInitials(profile.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">
                  {profile.user.name}
                </h2>
                <p className="truncate text-sm text-muted-foreground">{profile.user.email}</p>
              </div>
            </div>
            <Badge variant={missingCount > 0 ? 'warning' : 'success'} appearance="light" size="sm">
              {missingCount > 0
                ? `${missingCount} Missing Detail${missingCount === 1 ? '' : 's'}`
                : 'Complete'}
            </Badge>
          </CardContent>
        </Card>

        <ProfileSection
          title="Account Details"
          description="Login identity and visible account information."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ProfileTextField
              control={form.control}
              name="name"
              label="Full Name"
              placeholder="Full name"
              icon={<User className="size-4 text-muted-foreground" />}
            />
            <ProfileTextField
              control={form.control}
              name="email"
              label="Email Address"
              placeholder="name@company.com"
              type="email"
              icon={<Mail className="size-4 text-muted-foreground" />}
            />
          </div>
          <ProfileTextField
            control={form.control}
            name="image"
            label="Profile Image"
            placeholder="https://..."
            icon={<Image className="size-4 text-muted-foreground" />}
          />
        </ProfileSection>

        <ProfileSection title="Employee Details" description="Contact and employment profile data.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ProfileTextField
              control={form.control}
              name="phoneNumber"
              label="Phone Number"
              placeholder="(555) 000-0000"
              icon={<Phone className="size-4 text-muted-foreground" />}
            />
            <ProfileTextField
              control={form.control}
              name="startDate"
              label="Start Date"
              placeholder=""
              type="date"
              icon={<Calendar className="size-4 text-muted-foreground" />}
            />
          </div>
          <ProfileTextField
            control={form.control}
            name="address"
            label="Address"
            placeholder="Office or mailing address"
            icon={<MapPin className="size-4 text-muted-foreground" />}
          />
        </ProfileSection>

        <ProfileSection
          title="Emergency Contact"
          description="Contact information for urgent cases."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <ProfileTextField
              control={form.control}
              name="emergencyContactName"
              label="Contact Name"
              placeholder="Contact name"
              icon={<Contact2 className="size-4 text-muted-foreground" />}
            />
            <ProfileTextField
              control={form.control}
              name="emergencyContactPhone"
              label="Contact Phone"
              placeholder="(555) 999-9999"
              icon={<Phone className="size-4 text-muted-foreground" />}
            />
            <ProfileTextField
              control={form.control}
              name="emergencyContactRelation"
              label="Relationship"
              placeholder="Relationship"
            />
          </div>
        </ProfileSection>

        <ProfileSection
          title="Email Signature"
          description="Signature identity used by outbound emails."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <ProfileTextField
              control={form.control}
              name="signatureName"
              label="Signature Name"
              placeholder="Name shown in signature"
              icon={<User className="size-4 text-muted-foreground" />}
            />
            <ProfileTextField
              control={form.control}
              name="signatureRole"
              label="Signature Role"
              placeholder="Role shown in signature"
            />
            <ProfileTextField
              control={form.control}
              name="signatureEmail"
              label="Signature Email"
              placeholder="signature@company.com"
              type="email"
              icon={<Mail className="size-4 text-muted-foreground" />}
            />
          </div>
        </ProfileSection>

        <ProfileSecurityCard />
      </div>
    </div>
  );
}

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeading>
      </CardHeader>
      <CardContent className="space-y-5">
        <Separator />
        {children}
      </CardContent>
    </Card>
  );
}

function ProfileTextField({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  icon,
}: {
  control: Control<UpdateProfileInput>;
  name: ProfileFieldName;
  label: string;
  placeholder: string;
  type?: string;
  icon?: ReactNode;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel className="text-xs font-bold uppercase tracking-widest">{label}</FieldLabel>
          <InputWrapper>
            {icon}
            <Input
              {...field}
              value={String(field.value ?? '')}
              type={type}
              placeholder={placeholder}
              autoComplete="off"
            />
          </InputWrapper>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

function ProfileLoading() {
  return (
    <div className="container-fluid py-7.5">
      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </ToolbarHeading>
          <ToolbarActions>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
