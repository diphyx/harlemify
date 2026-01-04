import { toValue, type MaybeRefOrGetter } from "vue";

export enum ApiAction {
    GET = "get",
    POST = "post",
    PUT = "put",
    PATCH = "patch",
    DELETE = "delete",
}

export enum ApiResponseType {
    JSON = "json",
    TEXT = "text",
    BLOB = "blob",
    ARRAY_BUFFER = "arrayBuffer",
}

export enum ApiErrorSource {
    REQUEST = "request",
    RESPONSE = "response",
}

export type ApiRequestHeader = MaybeRefOrGetter<Record<string, unknown>>;
export type ApiRequestQuery = MaybeRefOrGetter<Record<string, unknown>>;
export type ApiRequestBody = MaybeRefOrGetter<
    string | number | ArrayBuffer | FormData | Blob | Record<string, any>
>;

export interface ApiRequestOptions<
    A extends ApiAction = ApiAction,
    H extends ApiRequestHeader = ApiRequestHeader,
    Q extends ApiRequestQuery = ApiRequestQuery,
    B extends ApiRequestBody = ApiRequestBody,
> {
    action?: A;
    headers?: H;
    query?: Q;
    body?: B;
    responseType?: ApiResponseType;
    retry?: number | false;
    retryDelay?: number;
    retryStatusCodes?: number[];
}

export interface ApiOptions {
    url?: string;
    headers?: ApiRequestHeader;
    query?: ApiRequestQuery;
    timeout?: number;
}

export type ApiActionOptions<
    A extends ApiAction,
    H extends ApiRequestHeader = ApiRequestHeader,
    Q extends ApiRequestQuery = ApiRequestQuery,
    B extends ApiRequestBody = ApiRequestBody,
> = Omit<ApiRequestOptions<A, H, Q, B>, "action">;

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
        super(options.message || "Unknown error");

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

export function createApi(options?: ApiOptions) {
    async function request<
        T,
        A extends ApiAction = ApiAction,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        requestOptions?: ApiRequestOptions<A, H, Q, B> & ApiOptions,
    ): Promise<T> {
        return $fetch<T>(url, {
            baseURL: options?.url,
            method: requestOptions?.action ?? ApiAction.GET,
            headers: {
                ...toValue(options?.headers),
                ...toValue(requestOptions?.headers),
            } as any,
            query: {
                ...toValue(requestOptions?.query),
                ...toValue(options?.query),
            } as any,
            body: toValue(requestOptions?.body) as any,
            timeout: requestOptions?.timeout ?? options?.timeout,
            responseType: requestOptions?.responseType,
            retry: requestOptions?.retry,
            retryDelay: requestOptions?.retryDelay,
            retryStatusCodes: requestOptions?.retryStatusCodes,
            onRequestError({ request, options, error }) {
                throw new ApiRequestError({
                    method: options.method as string,
                    url: request.toString(),
                    message: error?.message,
                });
            },
            onResponseError({ request, options, error }) {
                throw new ApiResponseError({
                    method: options.method as string,
                    url: request.toString(),
                    message: error?.message,
                });
            },
        });
    }

    async function get<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
    >(url: string, options?: ApiActionOptions<ApiAction.GET, H, Q, never>) {
        return request<T, ApiAction.GET, H, Q, never>(url, {
            ...options,
            action: ApiAction.GET,
        });
    }

    async function post<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, options?: ApiActionOptions<ApiAction.POST, H, Q, B>) {
        return request<T, ApiAction.POST, H, Q, B>(url, {
            ...options,
            action: ApiAction.POST,
        });
    }

    async function put<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, options?: ApiActionOptions<ApiAction.PUT, H, Q, B>) {
        return request<T, ApiAction.PUT, H, Q, B>(url, {
            ...options,
            action: ApiAction.PUT,
        });
    }

    async function patch<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, options?: ApiActionOptions<ApiAction.PATCH, H, Q, B>) {
        return request<T, ApiAction.PATCH, H, Q, B>(url, {
            ...options,
            action: ApiAction.PATCH,
        });
    }

    async function del<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
    >(url: string, options?: ApiActionOptions<ApiAction.DELETE, H, Q, never>) {
        return request<T, ApiAction.DELETE, H, Q, never>(url, {
            ...options,
            action: ApiAction.DELETE,
        });
    }

    return {
        get,
        post,
        put,
        patch,
        del,
    };
}
