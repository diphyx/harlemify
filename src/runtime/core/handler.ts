import type { Store } from "@harlem/core";

import { createApi } from "../utils/api";
import { runtimeConfig } from "../config";
import { ActionMethod, resolveActionUrl, resolveActionQuery, resolveActionHeaders, resolveActionBody } from "./actions";
import { MutationTarget, MutationMode } from "./mutations";

import type { ApiMethod } from "../utils/api";
import type { StoreSchema } from "./schema";
import type { StoreMutations } from "./mutations";
import type { ActionDefinition, ActionOptions } from "./actions";

export interface HttpAdapterRequest {
    method: ApiMethod;
    url: string;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
    body?: unknown;
    signal?: AbortSignal;
}

export type HttpAdapter = <T>(request: HttpAdapterRequest) => Promise<T>;

export interface CommitOptions {
    path?: string[];
    deep?: boolean;
    prepend?: boolean;
}

export interface CommitDefinition {
    target: MutationTarget;
    mode?: MutationMode;
    options?: CommitOptions;
}

export interface HandlerDefinition<S = Record<string, unknown>> {
    action: ActionDefinition<S>;
    commit?: CommitDefinition;
}

export interface HandlerOptions extends ActionOptions {
    signal?: AbortSignal;
}

export type HandlerFunction<S> = (params?: Partial<S>, options?: HandlerOptions) => Promise<S | S[] | boolean>;

export type HandlersDefinition<S = Record<string, unknown>> = Record<string, HandlerDefinition<S>>;

export type StoreHandlers<H extends HandlersDefinition<S>, S> = {
    [K in keyof H]: HandlerFunction<S>;
};

const defaultModeMap: Record<ActionMethod, Record<MutationTarget, MutationMode>> = {
    [ActionMethod.GET]: {
        [MutationTarget.UNIT]: MutationMode.SET,
        [MutationTarget.UNITS]: MutationMode.SET,
    },
    [ActionMethod.POST]: {
        [MutationTarget.UNIT]: MutationMode.SET,
        [MutationTarget.UNITS]: MutationMode.ADD,
    },
    [ActionMethod.PUT]: {
        [MutationTarget.UNIT]: MutationMode.SET,
        [MutationTarget.UNITS]: MutationMode.PATCH,
    },
    [ActionMethod.PATCH]: {
        [MutationTarget.UNIT]: MutationMode.PATCH,
        [MutationTarget.UNITS]: MutationMode.PATCH,
    },
    [ActionMethod.DELETE]: {
        [MutationTarget.UNIT]: MutationMode.REMOVE,
        [MutationTarget.UNITS]: MutationMode.REMOVE,
    },
};

function getDefaultMode(method: ActionMethod, target: MutationTarget): MutationMode {
    return defaultModeMap[method][target];
}

let defaultHttpAdapter: HttpAdapter | null = null;

function getHttpAdapter(): HttpAdapter {
    if (!defaultHttpAdapter) {
        defaultHttpAdapter = function <T>(options: HttpAdapterRequest): Promise<T> {
            return createApi(runtimeConfig.api).request<T>(options.url, options.method, options as any);
        };
    }

    return defaultHttpAdapter;
}

function commitToUnit<S, I extends keyof S>(
    mutations: StoreMutations<S, I>,
    mode: MutationMode,
    data: any,
    params: Partial<S> | undefined,
    options: CommitOptions | undefined,
): void {
    switch (mode) {
        case MutationMode.SET:
            mutations.unit.set({ data, path: options?.path });
            break;
        case MutationMode.PATCH:
            mutations.unit.patch({
                data: { ...params, ...data },
                path: options?.path,
                deep: options?.deep,
            });
            break;
        case MutationMode.REMOVE:
            mutations.unit.remove({ data: params as any, path: options?.path });
            break;
    }
}

function commitToUnits<S, I extends keyof S>(
    mutations: StoreMutations<S, I>,
    mode: MutationMode,
    data: any,
    params: Partial<S> | undefined,
    options: CommitOptions | undefined,
) {
    const items = Array.isArray(data) ? data : [data];

    switch (mode) {
        case MutationMode.SET: {
            mutations.units.set({
                data: items,
                path: options?.path?.[0],
            });

            break;
        }
        case MutationMode.PATCH: {
            const patchData = items.map((item: any) => {
                return {
                    ...params,
                    ...item,
                };
            });

            mutations.units.patch({
                data: patchData,
                path: options?.path?.[0],
                deep: options?.deep,
            });

            break;
        }
        case MutationMode.REMOVE: {
            if (params) {
                mutations.units.remove({
                    data: [params as any],
                    path: options?.path?.[0],
                });
            } else {
                mutations.units.remove({
                    data: items,
                    path: options?.path?.[0],
                });
            }

            break;
        }
        case MutationMode.ADD: {
            mutations.units.add({
                data: items,
                path: options?.path?.[0],
                prepend: options?.prepend,
            });

            break;
        }
    }
}

function commitResponse<S, I extends keyof S>(
    mutations: StoreMutations<S, I>,
    commit: CommitDefinition,
    method: ActionMethod,
    data: any,
    params?: Partial<S>,
): void {
    const resolvedMode = commit.mode ?? getDefaultMode(method, commit.target);

    if (commit.target === MutationTarget.UNIT) {
        commitToUnit(mutations, resolvedMode, data, params, commit.options);

        return;
    }

    commitToUnits(mutations, resolvedMode, data, params, commit.options);
}

export function createStoreHandlers<S, H extends HandlersDefinition<S>, I extends keyof S>(
    source: Store<{ unit: S | null; units: S[] }>,
    schema: StoreSchema<S>,
    mutations: StoreMutations<S, I>,
    definitions: H,
    httpAdapter?: HttpAdapter,
): StoreHandlers<H, S> {
    const adapter = httpAdapter ?? getHttpAdapter();
    const handlers = {} as StoreHandlers<H, S>;

    for (const name in definitions) {
        (handlers as any)[name] = async function (
            params?: Partial<S>,
            options?: HandlerOptions,
        ): Promise<S | S[] | boolean> {
            const url = resolveActionUrl(definitions[name].action, params);
            const query = resolveActionQuery(definitions[name].action, options);
            const headers = resolveActionHeaders(definitions[name].action, options);
            const body = resolveActionBody(definitions[name].action, params, options);

            const data = await adapter<S | S[] | boolean>({
                method: definitions[name].action.method as any,
                url,
                query,
                headers,
                body,
                signal: options?.signal,
            });

            if (definitions[name].commit) {
                commitResponse(mutations, definitions[name].commit, definitions[name].action.method, data, params);
            }

            return data;
        };
    }

    return handlers;
}

export { getDefaultMode };
