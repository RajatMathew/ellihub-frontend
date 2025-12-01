import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
  BadRequestError,
  ConflictError,
  failure,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '@utils';
import { AxiosError } from 'axios';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

const prismaErrorMessages: Record<string, string> = {
  P1000: 'Database connection error',
  P1001: 'Database server not found',
  P2002: 'Unique constraint violation',
  P2003: 'Foreign key constraint violation',
  P2025: 'Record not found',
};

export const errorHandler = (err: Error | HTTPException, c: Context) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('------------------- ERROR -------------------');
    console.error('Name:', err.name);
    console.error('Message:', err.message);
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
    console.error('---------------------------------------------');
  }
  if (err instanceof ZodError) {
    return failure(c, 'Validation failed', 400, { code: err.name, details: err.issues });
  } else if (err instanceof HTTPException) {
    return failure(c, err.message, err.status, { code: err.name });
  } else if (err instanceof BadRequestError) {
    return failure(c, err.message, 400, { code: err.name });
  } else if (err instanceof NotFoundError) {
    return failure(c, err.message, 404, { code: err.name });
  } else if (err instanceof TooManyRequestsError) {
    return failure(c, err.message, 429, { code: err.name });
  } else if (err instanceof UnauthorizedError) {
    return failure(c, err.message, 401, { code: err.name });
  } else if (err instanceof ConflictError) {
    return failure(c, err.message, 409, { code: err.name });
  } else if (err instanceof ForbiddenError) {
    return failure(c, err.message, 403, { code: err.name });
  } else if (err instanceof SyntaxError) {
    return failure(c, 'Invalid JSON format', 400, { code: 'SYNTAX_ERROR' });
  } else if (err instanceof PrismaClientKnownRequestError) {
    const message = prismaErrorMessages[err.code] || 'unknown DB error';
    return failure(c, message, 500, { code: err.code });
  } else if (err instanceof AxiosError) {
    return failure(c, 'External service error', 500, { code: err.code || 'API_ERROR' });
  }
  return failure(c, 'Internal Server Error (GH)', 500);
};
