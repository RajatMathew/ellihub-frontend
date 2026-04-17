const { z } = require('zod');

const elemSchema = z.object({
  id: z.string(),
  isPrimary: z.boolean(),
}).passthrough();

const objSchema = z.object({
  id: z.string(),
  contactLinks: z.array(elemSchema).optional().default([]),
}).passthrough();

const raw = {
  id: "123",
  contactLinks: [{ id: "link1" }] // Missing isPrimary
};

const result = objSchema.safeParse(raw);
console.log("Success:", result.success);
if (!result.success) {
  console.log("Error:", result.error.issues);
} else {
  console.log("Data:", result.data.contactLinks);
}
