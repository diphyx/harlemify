import type { ApiAdapter } from "../core/adapter";
import { capitalize } from "./transform";
import type { Capitalize } from "./transform";

export enum EndpointMethod {
    GET = "get",
    POST = "post",
    PUT = "put",
    PATCH = "patch",
    DELETE = "delete",
}

export enum Endpoint {
    GET_UNIT = "getUnit",
    GET_UNITS = "getUnits",
    POST_UNIT = "postUnit",
    POST_UNITS = "postUnits",
    PUT_UNIT = "putUnit",
    PUT_UNITS = "putUnits",
    PATCH_UNIT = "patchUnit",
    PATCH_UNITS = "patchUnits",
    DELETE_UNIT = "deleteUnit",
    DELETE_UNITS = "deleteUnits",
}

export enum EndpointStatus {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
}

export interface EndpointDefinition<T = Record<string, unknown>> {
    method: EndpointMethod;
    url: string | ((params: T) => string);
    // Adapter uses `any` since response types vary per endpoint (single vs array)
    adapter?: ApiAdapter<any>;
}

export type EndpointStatusFlag<S extends EndpointStatus = EndpointStatus> = `Is${Capitalize<S>}`;

export type EndpointStatusName<
    K extends Endpoint = Endpoint,
    S extends EndpointStatus = EndpointStatus,
> = `${K}${EndpointStatusFlag<S>}`;

export function makeEndpointStatusFlag<S extends EndpointStatus>(status: S): EndpointStatusFlag<S> {
    return `Is${capitalize(status)}` as EndpointStatusFlag<S>;
}

export function makeEndpointStatusName<K extends Endpoint, S extends EndpointStatus>(
    key: K,
    status: S,
): EndpointStatusName<K, S> {
    return `${key}${makeEndpointStatusFlag(status)}` as EndpointStatusName<K, S>;
}

export function getEndpoint<T = Record<string, unknown>>(
    endpoints: Partial<Record<Endpoint, EndpointDefinition<T>>> | undefined,
    endpoint: Endpoint,
) {
    if (!endpoints || !(endpoint in endpoints)) {
        throw new Error(`Endpoint "${endpoint}" is not configured`);
    }

    return endpoints[endpoint]!;
}

export function resolveEndpointUrl<T>(endpoint: EndpointDefinition<T>, params?: { [key: string]: unknown }) {
    if (typeof endpoint.url === "function") {
        return endpoint.url(params as T);
    }

    return endpoint.url;
}
