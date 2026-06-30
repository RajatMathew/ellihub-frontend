import { cors } from 'hono/cors';

export const cors_config: Parameters<typeof cors>[0] = {
    origin: [
        // Development origins
        process.env.CLIENT_URL!,
        // Local Production origins
        'http://localhost:4173',
        'http://localhost:5173',
    ],
    credentials: true,
    exposeHeaders: ['Accept-Ranges', 'Content-Disposition', 'Content-Length', 'Content-Range'],
};
