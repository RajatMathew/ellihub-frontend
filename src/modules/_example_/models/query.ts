import z, { number } from 'zod';

export const querySchema = z.object({
  query: z.string().min(1, { message: 'Query must be at least 1 character long' }),
});

export const paramsSchema = z.object({
  param: number().min(1, { message: 'ID must be greater than 0' }),
});

export const bodySchema = z.object({
  body: number().min(1, { message: 'ID must be greater than 0' }),
});
