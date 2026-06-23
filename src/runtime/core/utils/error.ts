// Error Classes

export class ActionApiError extends Error {
    override name = "ActionApiError" as const;

    declare status: number;
    declare statusText: string;
    declare data: unknown;

    constructor(source: any) {
        super(source?.message || "API request failed", {
            cause: source,
        });

        this.status = source?.status ?? source?.response?.status ?? 500;
        this.statusText = source?.statusText ?? source?.response?.statusText ?? "Internal Server Error";
        this.data = source?.data ?? source?.response?._data ?? null;
    }
}

export class ActionHandlerError extends Error {
    override name = "ActionHandlerError" as const;

    constructor(source: any) {
        super(source?.message || "Action handler failed", {
            cause: source,
        });
    }
}

export class ActionCommitError extends Error {
    override name = "ActionCommitError" as const;

    constructor(source: any) {
        super(source?.message || "Action commit failed", {
            cause: source,
        });
    }
}

export class ActionConcurrentError extends Error {
    override name = "ActionConcurrentError" as const;

    constructor() {
        super("Action is already pending");
    }
}

// Error Helpers

export function isError(error: unknown, ...types: (abstract new (...args: never[]) => Error)[]): error is Error {
    return types.some((ErrorType) => {
        return error instanceof ErrorType;
    });
}

export function toError<T extends Error = Error>(error: unknown, ErrorType?: new (source: unknown) => T): T {
    if (ErrorType) {
        return error instanceof ErrorType ? error : new ErrorType(error);
    }

    return (error instanceof Error ? error : new Error(String(error))) as T;
}
