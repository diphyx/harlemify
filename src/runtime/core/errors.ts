export enum ApiErrorSource {
    REQUEST = "request",
    RESPONSE = "response",
}

export interface ApiErrorOptions {
    source: ApiErrorSource;
    method: string;
    url: string;
    message?: string;
}

export class ApiError extends Error {
    source: ApiErrorSource;
    method: string;
    url: string;

    constructor(options: ApiErrorOptions) {
        super(options.message ?? "Unknown error");

        this.name = "ApiError";
        this.source = options.source;
        this.method = options.method;
        this.url = options.url;
    }
}

export class ApiRequestError extends ApiError {
    constructor(options: Omit<ApiErrorOptions, "source">) {
        super({
            ...options,
            source: ApiErrorSource.REQUEST,
        });
    }
}

export class ApiResponseError extends ApiError {
    constructor(options: Omit<ApiErrorOptions, "source">) {
        super({
            ...options,
            source: ApiErrorSource.RESPONSE,
        });
    }
}
