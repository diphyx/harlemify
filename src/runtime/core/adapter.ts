import type { EndpointMethod } from "../utils/endpoint";
import { ApiRequestError, ApiResponseError } from "./errors";

// Minimal request data - common to all adapters
export interface ApiAdapterRequest {
    method: EndpointMethod;
    url: string;
    body?: unknown;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

export interface ApiAdapterResponse<T = unknown> {
    data: T;
    status?: number;
}

// Adapter function signature
export type ApiAdapter<T = unknown> = (request: ApiAdapterRequest) => Promise<ApiAdapterResponse<T>>;

// Adapter factory type
export type DefineApiAdapter<T = unknown, O = unknown> = (options?: O) => ApiAdapter<T>;

// Options specific to the built-in fetch adapter
export interface ApiFetchAdapterOptions {
    baseURL?: string;
    timeout?: number;
    retry?: number | false;
    retryDelay?: number;
    retryStatusCodes?: number[];
    responseType?: "json" | "text" | "blob" | "arrayBuffer";
}

/**
 * Creates a built-in fetch adapter with configurable options.
 *
 * Adapter hierarchy (highest to lowest priority):
 * 1. endpoint.adapter - Per-endpoint adapter
 * 2. storeOptions.adapter - Store-level adapter
 * 3. sharedConfig.api.adapter - Module config adapter options
 * 4. Default adapter (no options)
 */
export function defineApiAdapter<T = unknown>(options?: ApiFetchAdapterOptions): ApiAdapter<T> {
    return async (request): Promise<ApiAdapterResponse<T>> => {
        const data = await $fetch<T>(request.url, {
            baseURL: options?.baseURL,
            method: request.method,
            headers: request.headers as HeadersInit,
            query: request.query,
            body: request.body as any,
            timeout: options?.timeout,
            signal: request.signal,
            retry: options?.retry,
            retryDelay: options?.retryDelay,
            retryStatusCodes: options?.retryStatusCodes,
            responseType: options?.responseType,
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

        return { data: data as T };
    };
}
