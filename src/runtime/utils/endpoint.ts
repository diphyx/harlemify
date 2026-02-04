import type { ApiAdapter } from "./adapter";
import { capitalize } from "./text";
import type { Capitalize } from "./text";

export enum EndpointMethod {
    GET = "get",
    POST = "post",
    PUT = "put",
    PATCH = "patch",
    DELETE = "delete",
}

export enum EndpointStatus {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
}

export type EndpointUrl<S> = string | ((params: Partial<S>) => string);

export interface EndpointDefinition<S = Record<string, unknown>> {
    readonly method: EndpointMethod;
    readonly url: EndpointUrl<S>;
    readonly adapter?: ApiAdapter<any>;
}

export interface EndpointChain<S> {
    readonly method: EndpointMethod;
    readonly url: EndpointUrl<S>;
    readonly adapter?: ApiAdapter<any>;
    withAdapter(adapter: ApiAdapter<any>): EndpointDefinition<S>;
}

export interface EndpointBuilder {
    get<S = Record<string, unknown>>(url: EndpointUrl<S>): EndpointChain<S>;
    post<S = Record<string, unknown>>(url: EndpointUrl<S>): EndpointChain<S>;
    put<S = Record<string, unknown>>(url: EndpointUrl<S>): EndpointChain<S>;
    patch<S = Record<string, unknown>>(url: EndpointUrl<S>): EndpointChain<S>;
    delete<S = Record<string, unknown>>(url: EndpointUrl<S>): EndpointChain<S>;
}

function createEndpointChain<S>(method: EndpointMethod, url: EndpointUrl<S>): EndpointChain<S> {
    return {
        method,
        url,
        adapter: undefined,
        withAdapter(adapter: ApiAdapter<any>): EndpointDefinition<S> {
            return {
                method,
                url,
                adapter,
            };
        },
    };
}

export const Endpoint: EndpointBuilder = {
    get<S>(url: EndpointUrl<S>): EndpointChain<S> {
        return createEndpointChain(EndpointMethod.GET, url);
    },
    post<S>(url: EndpointUrl<S>): EndpointChain<S> {
        return createEndpointChain(EndpointMethod.POST, url);
    },
    put<S>(url: EndpointUrl<S>): EndpointChain<S> {
        return createEndpointChain(EndpointMethod.PUT, url);
    },
    patch<S>(url: EndpointUrl<S>): EndpointChain<S> {
        return createEndpointChain(EndpointMethod.PATCH, url);
    },
    delete<S>(url: EndpointUrl<S>): EndpointChain<S> {
        return createEndpointChain(EndpointMethod.DELETE, url);
    },
};

export type EndpointStatusFlag<S extends EndpointStatus = EndpointStatus> = `Is${Capitalize<S>}`;

export function makeEndpointStatusFlag<S extends EndpointStatus>(status: S): EndpointStatusFlag<S> {
    return `Is${capitalize(status)}` as EndpointStatusFlag<S>;
}

export function resolveEndpointUrl<S>(endpoint: EndpointDefinition<S>, params?: Partial<S>): string {
    if (typeof endpoint.url === "function") {
        return endpoint.url(params ?? ({} as Partial<S>));
    }

    return endpoint.url;
}
