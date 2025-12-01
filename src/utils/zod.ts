import { zValidator as zv } from '@hono/zod-validator';
import { ZodSchema } from 'zod';

import type { ValidationTargets } from 'hono';

export const zValidator = <T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      // Directly throw ZodError if validation fails
      throw result.error;
    }
  });
