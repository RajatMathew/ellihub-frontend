import { auth } from '@lib/auth';
import 'hono';

declare module 'hono' {
    interface ContextVariableMap {
        pagination: PaginationParams;
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    }
}
