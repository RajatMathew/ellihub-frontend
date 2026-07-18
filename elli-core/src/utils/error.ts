export class BadRequestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BadRequestError';
    }
}

export class UnauthorizedError extends Error {
    public readonly code: string;

    constructor(message: string, code = 'UNAUTHORIZED') {
        super(message);
        this.name = 'UnauthorizedError';
        this.code = code;
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class InternalServerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InternalServerError';
    }
}

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}

export class ForbiddenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ForbiddenError';
    }
}

export class TooManyRequestsError extends Error {
    public readonly retryAfterSeconds?: number;

    constructor(message: string, retryAfterSeconds?: number) {
        super(message);
        this.name = 'TooManyRequestsError';
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

type ExternalServiceErrorOptions = {
    code: string;
    status: 502 | 503 | 504;
    upstreamStatus?: number;
    requestId?: string;
};

export class ExternalServiceError extends Error {
    public readonly code: string;
    public readonly status: 502 | 503 | 504;
    public readonly upstreamStatus?: number;
    public readonly requestId?: string;

    constructor(message: string, options: ExternalServiceErrorOptions) {
        super(message);
        this.name = 'ExternalServiceError';
        this.code = options.code;
        this.status = options.status;
        this.upstreamStatus = options.upstreamStatus;
        this.requestId = options.requestId;
    }
}
