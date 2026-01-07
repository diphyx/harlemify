import { toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";

import { EndpointMethod } from "../utils/endpoint";

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
export type ApiRequestBody = MaybeRefOrGetter<string | number | ArrayBuffer | FormData | Blob | Record<string, any>>;

export interface ApiRequestOptions<
    A extends EndpointMethod = EndpointMethod,
    H extends ApiRequestHeader = ApiRequestHeader,
    Q extends ApiRequestQuery = ApiRequestQuery,
    B extends ApiRequestBody = ApiRequestBody,
> {
    action?: A;
    headers?: H;
    query?: Q;
    body?: B;
    timeout?: number;
    responseType?: ApiResponseType;
    retry?: number | false;
    retryDelay?: number;
    retryStatusCodes?: number[];
    signal?: AbortSignal;
}

export interface ApiOptions {
    url?: string;
    headers?: ApiRequestHeader;
    query?: ApiRequestQuery;
    timeout?: number;
}

export type EndpointMethodOptions<
    A extends EndpointMethod,
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

export interface Api {
    get: <T, H extends ApiRequestHeader = ApiRequestHeader, Q extends ApiRequestQuery = ApiRequestQuery>(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.GET, H, Q, never>,
    ) => Promise<T>;
    post: <
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.POST, H, Q, B>,
    ) => Promise<T>;
    put: <
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.PUT, H, Q, B>,
    ) => Promise<T>;
    patch: <
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.PATCH, H, Q, B>,
    ) => Promise<T>;
    del: <T, H extends ApiRequestHeader = ApiRequestHeader, Q extends ApiRequestQuery = ApiRequestQuery>(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.DELETE, H, Q, never>,
    ) => Promise<T>;
}

export function createApi(options?: ApiOptions): Api {
    async function request<
        T,
        A extends EndpointMethod = EndpointMethod,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, requestOptions?: ApiRequestOptions<A, H, Q, B> & ApiOptions): Promise<T> {
        return $fetch(url, {
            baseURL: options?.url,
            method: requestOptions?.action ?? EndpointMethod.GET,
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
            signal: requestOptions?.signal,
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

    async function get<T, H extends ApiRequestHeader = ApiRequestHeader, Q extends ApiRequestQuery = ApiRequestQuery>(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.GET, H, Q, never>,
    ) {
        return request<T, EndpointMethod.GET, H, Q, never>(url, {
            ...options,
            action: EndpointMethod.GET,
        });
    }

    async function post<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, options?: EndpointMethodOptions<EndpointMethod.POST, H, Q, B>) {
        return request<T, EndpointMethod.POST, H, Q, B>(url, {
            ...options,
            action: EndpointMethod.POST,
        });
    }

    async function put<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, options?: EndpointMethodOptions<EndpointMethod.PUT, H, Q, B>) {
        return request<T, EndpointMethod.PUT, H, Q, B>(url, {
            ...options,
            action: EndpointMethod.PUT,
        });
    }

    async function patch<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, options?: EndpointMethodOptions<EndpointMethod.PATCH, H, Q, B>) {
        return request<T, EndpointMethod.PATCH, H, Q, B>(url, {
            ...options,
            action: EndpointMethod.PATCH,
        });
    }

    async function del<T, H extends ApiRequestHeader = ApiRequestHeader, Q extends ApiRequestQuery = ApiRequestQuery>(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.DELETE, H, Q, never>,
    ) {
        return request<T, EndpointMethod.DELETE, H, Q, never>(url, {
            ...options,
            action: EndpointMethod.DELETE,
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
