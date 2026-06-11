import { auth } from '@lib/auth';
import { FileUploadRequest } from '@modules/file/models';

import type { AccessContext } from '@lib/access';
import 'hono';

declare module 'hono' {
    interface ContextVariableMap {
        pagination: PaginationParams;
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
        access: AccessContext;
        fileId: string | null;
        fileData: FileUploadRequest | null;
    }
}
