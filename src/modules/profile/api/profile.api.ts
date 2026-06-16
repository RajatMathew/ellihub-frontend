import api from '@/app/api';
import {
  userProfileSchema,
  type UpdateProfileInput,
  type UserProfile,
} from '@/modules/profile/schemas/profile.schema';

const BASE = '/users/me/profile';

const toNullable = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const profileApi = {
  async getCurrent(): Promise<UserProfile> {
    const res = await api.get(BASE);
    return userProfileSchema.parse(res.data?.data ?? res.data);
  },

  async update(input: UpdateProfileInput): Promise<UserProfile> {
    const res = await api.patch(BASE, {
      name: input.name.trim(),
      email: input.email.trim(),
      image: toNullable(input.image),
      phoneNumber: input.phoneNumber.trim(),
      address: toNullable(input.address),
      startDate: toNullable(input.startDate),
      emergencyContactName: toNullable(input.emergencyContactName),
      emergencyContactPhone: toNullable(input.emergencyContactPhone),
      emergencyContactRelation: toNullable(input.emergencyContactRelation),
      signature: {
        name: input.signatureName.trim(),
        role: input.signatureRole.trim(),
        email: input.signatureEmail.trim().toLowerCase(),
      },
    });

    return userProfileSchema.parse(res.data?.data ?? res.data);
  },
};
