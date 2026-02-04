import { toValue } from "vue";

import type { MaybeRefOrGetter } from "vue";

import { defineApiAdapter } from "../utils/adapter";
import { EndpointMethod } from "../utils/endpoint";

import type { ApiAdapter, ApiAdapterRequest } from "../utils/adapter";

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
    signal?: AbortSignal;
}

export interface ApiOptions {
    headers?: ApiRequestHeader;
    query?: ApiRequestQuery;
    adapter?: ApiAdapter<any>;
}

export type EndpointMethodOptions<
    A extends EndpointMethod,
    H extends ApiRequestHeader = ApiRequestHeader,
    Q extends ApiRequestQuery = ApiRequestQuery,
    B extends ApiRequestBody = ApiRequestBody,
> = Omit<ApiRequestOptions<A, H, Q, B>, "action">;

export interface Api {
    get: <T, H extends ApiRequestHeader = ApiRequestHeader, Q extends ApiRequestQuery = ApiRequestQuery>(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.GET, H, Q, never> & {
            adapter?: ApiAdapter<T>;
        },
    ) => Promise<T>;
    post: <
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.POST, H, Q, B> & {
            adapter?: ApiAdapter<T>;
        },
    ) => Promise<T>;
    put: <
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.PUT, H, Q, B> & {
            adapter?: ApiAdapter<T>;
        },
    ) => Promise<T>;
    patch: <
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.PATCH, H, Q, B> & {
            adapter?: ApiAdapter<T>;
        },
    ) => Promise<T>;
    del: <T, H extends ApiRequestHeader = ApiRequestHeader, Q extends ApiRequestQuery = ApiRequestQuery>(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.DELETE, H, Q, never> & {
            adapter?: ApiAdapter<T>;
        },
    ) => Promise<T>;
}

export function createApi(options?: ApiOptions): Api {
    const defaultAdapter = options?.adapter ?? defineApiAdapter();

    async function executeRequest<
        T,
        A extends EndpointMethod = EndpointMethod,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        requestOptions?: ApiRequestOptions<A, H, Q, B> & {
            adapter?: ApiAdapter<T>;
        },
    ): Promise<T> {
        const adapter = requestOptions?.adapter ?? defaultAdapter;
        const adapterRequest: ApiAdapterRequest = {
            method: requestOptions?.action ?? EndpointMethod.GET,
            url,
            body: toValue(requestOptions?.body),
            query: Object.assign({}, toValue(options?.query), toValue(requestOptions?.query)),
            headers: Object.assign({}, toValue(options?.headers), toValue(requestOptions?.headers)) as any,
            signal: requestOptions?.signal,
        };

        const response = await adapter(adapterRequest);

        return response.data as T;
    }

    async function get<T, H extends ApiRequestHeader = ApiRequestHeader, Q extends ApiRequestQuery = ApiRequestQuery>(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.GET, H, Q, never> & {
            adapter?: ApiAdapter<T>;
        },
    ) {
        return executeRequest<T, EndpointMethod.GET, H, Q, never>(url, {
            ...options,
            action: EndpointMethod.GET,
        });
    }

    async function post<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.POST, H, Q, B> & {
            adapter?: ApiAdapter<T>;
        },
    ) {
        return executeRequest<T, EndpointMethod.POST, H, Q, B>(url, {
            ...options,
            action: EndpointMethod.POST,
        });
    }

    async function put<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.PUT, H, Q, B> & {
            adapter?: ApiAdapter<T>;
        },
    ) {
        return executeRequest<T, EndpointMethod.PUT, H, Q, B>(url, {
            ...options,
            action: EndpointMethod.PUT,
        });
    }

    async function patch<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.PATCH, H, Q, B> & {
            adapter?: ApiAdapter<T>;
        },
    ) {
        return executeRequest<T, EndpointMethod.PATCH, H, Q, B>(url, {
            ...options,
            action: EndpointMethod.PATCH,
        });
    }

    async function del<T, H extends ApiRequestHeader = ApiRequestHeader, Q extends ApiRequestQuery = ApiRequestQuery>(
        url: string,
        options?: EndpointMethodOptions<EndpointMethod.DELETE, H, Q, never> & {
            adapter?: ApiAdapter<T>;
        },
    ) {
        return executeRequest<T, EndpointMethod.DELETE, H, Q, never>(url, {
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
