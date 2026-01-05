import type { BaseState } from "@harlem/core";

import type { ApiAction } from "../core/api";

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
    action: ApiAction;
    url: string | ((params: T) => string);
}

export interface EndpointMemory {
    status: EndpointStatus;
}

export function makeEndpointStatusKey<
    K extends Endpoint,
    S extends EndpointStatus,
>(key: K, status: S): `${K}Is${Capitalize<S>}` {
    return `${key}Is${status.charAt(0).toUpperCase() + status.slice(1)}` as any;
}

export function getEndpoint<T = Record<string, unknown>>(
    endpoints: Partial<Record<Endpoint, EndpointDefinition<T>>> | undefined,
    key: Endpoint,
) {
    const endpoint = endpoints?.[key];
    if (!endpoint) {
        throw new Error(`Endpoint "${key}" is not configured`);
    }

    return endpoint;
}

export function resolveEndpointUrl<T>(
    endpoint: EndpointDefinition<T>,
    params?: { [key: string]: unknown },
) {
    if (typeof endpoint.url === "function") {
        return endpoint.url(params as T);
    }

    return endpoint.url;
}

export function makeEndpointsStatus<T>(
    getter: (name: string, fn: (state: BaseState) => boolean) => T,
) {
    const output = {} as {
        [K in Endpoint as `${K}Is${Capitalize<EndpointStatus>}`]: T;
    };

    for (const key of Object.values(Endpoint)) {
        for (const status of Object.values(EndpointStatus)) {
            const statusKey = makeEndpointStatusKey(key, status);

            output[statusKey] = getter(statusKey, (state) => {
                return state.endpoints[key]?.status === status;
            });
        }
    }

    return output;
}
