import type { Store } from "@harlem/core";

export enum ActionMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE",
}

export type ActionUrl<S> = string | ((params: Partial<S>) => string);
export type ActionBody<S> = (params: Partial<S>, fields: (keyof S)[]) => unknown;
export type ActionHeader = Record<string, string>;
export type ActionQuery = Record<string, unknown>;

export type ActionDefinition<S = Record<string, unknown>> = {
    method: ActionMethod;
    url: ActionUrl<S>;
    query?: ActionQuery;
    headers?: ActionHeader;
    body?: ActionBody<S>;
};

export type ActionOptions = {
    query?: ActionQuery;
    headers?: ActionHeader;
    body?: unknown;
};

export function resolveActionUrl<S>(action: ActionDefinition<S>, params?: Partial<S>): string {
    if (typeof action.url === "function") {
        return action.url(params ?? ({} as Partial<S>));
    }

    return action.url;
}

export function resolveActionQuery(action: ActionDefinition<any>, options?: ActionOptions): ActionQuery {
    return {
        ...action.query,
        ...options?.query,
    };
}

export function resolveActionHeaders(action: ActionDefinition<any>, options?: ActionOptions): ActionHeader {
    return {
        ...action.headers,
        ...options?.headers,
    };
}

export function resolveActionBody<S>(
    action: ActionDefinition<S>,
    params?: Partial<S>,
    options?: ActionOptions,
): unknown {
    if (options?.body !== undefined) {
        return options.body;
    }

    if (action.body) {
        return action.body(params ?? ({} as Partial<S>), []);
    }

    return params;
}

export function createStoreActions<S, H>(
    _: Store<{
        unit: S | null;
        units: S[];
    }>,
): StoreActions<H> {
    return {};
}
