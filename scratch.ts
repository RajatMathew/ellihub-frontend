import { z } from 'zod';

const contactEmailSchema = z.object({
  email: z.string(),
  label: z.string(),
  isPrimary: z.boolean().optional(),
});

const contactPhoneSchema = z.object({
  number: z.string(),
  label: z.string(),
  isPrimary: z.boolean().optional(),
});

export const vendorContactLinkContactSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    professionalRoleId: z.string().nullable().optional(),
    email: z.array(contactEmailSchema).optional().default([]),
    phoneNumber: z.array(contactPhoneSchema).optional().default([]),
    tags: z.array(z.string()).optional().default([]),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const vendorContactLinkSchema = z
  .object({
    id: z.string(),
    contactId: z.string(),
    vendorId: z.string(),
    isPrimary: z.boolean(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    contact: vendorContactLinkContactSchema.optional().nullable(),
  })
  .passthrough();

export const vendorDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    typeId: z.string().nullable().optional(),
    contactLinks: z.array(vendorContactLinkSchema).optional().default([]),
  })
  .passthrough();

const raw = {
  id: "01KPB3498K43WB9Q7Z1J5NAVCD",
  name: "Random Vendor 3013",
  typeId: "01KPAXJKD1H8K4J0K6JPS6KWX5",
  contactLinks: [{
    id: "01KPB5QGT02XY0JY6Z6TZYZAX6",
    contactId: "01KPB1QESH893T8E55KAGP1RD1",
    // notice no isPrimary, no contact object, no vendorId
  }]
};

const res = vendorDetailSchema.safeParse(raw);
if (!res.success) {
  console.log("Failed!", res.error.issues);
} else {
  console.log("Success!", JSON.stringify(res.data, null, 2));
}
