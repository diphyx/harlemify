import { defu } from "defu";
import { type DeepReadonly, type Ref, ref, computed, readonly, toValue } from "vue";

import {
    type Action,
    type ActionApiDefinition,
    type ActionApiError,
    type ActionCallPayload,
    type ActionCommitError,
    type ActionCommitMethod,
    type ActionConcurrentError,
    type ActionDefinition,
    type ActionError,
    type ActionHandleError,
    type ActionHandleResolver,
    ActionOneMode,
    ActionManyMode,
    ActionStatus,
    ActionConcurrent,
    DEFINITION,
} from "../types/action";

import { createCommitter, executeCommit } from "./model";

import type { Model, Mutations } from "../types/model";

class ApiError extends Error implements ActionApiError {
    override name = "ActionApiError" as const;
    status?: number;
    statusText?: string;
    data?: unknown;

    constructor(message: string, options?: { status?: number; statusText?: string; data?: unknown }) {
        super(message);
        this.status = options?.status;
        this.statusText = options?.statusText;
        this.data = options?.data;
    }
}

class HandleError extends Error implements ActionHandleError {
    override name = "ActionHandleError" as const;
    override cause: Error;

    constructor(cause: Error) {
        super(cause.message);
        this.cause = cause;
    }
}

class CommitError extends Error implements ActionCommitError {
    override name = "ActionCommitError" as const;
    override cause: Error;

    constructor(cause: Error) {
        super(cause.message);
        this.cause = cause;
    }
}

class ConcurrentError extends Error implements ActionConcurrentError {
    override name = "ActionConcurrentError" as const;

    constructor() {
        super("Action is already pending");
    }
}

function createApiError(
    message: string,
    options?: { status?: number; statusText?: string; data?: unknown },
): ActionApiError {
    return new ApiError(message, options);
}

function createHandleError(cause: Error): ActionHandleError {
    return new HandleError(cause);
}

function createCommitError(cause: Error): ActionCommitError {
    return new CommitError(cause);
}

function createConcurrentError(): ActionConcurrentError {
    return new ConcurrentError();
}

export function buildCommitMethod<M extends Model, V, R>(
    definition: ActionDefinition<M, V, R>,
): ActionCommitMethod<M, V, R> {
    function commit(model: keyof M, mode: ActionOneMode | ActionManyMode, value?: any, options?: any) {
        return {
            [DEFINITION]: {
                ...definition,
                commit: {
                    model,
                    mode,
                    value,
                    options,
                },
            },
        };
    }

    return commit as ActionCommitMethod<M, V, R>;
}

function resolveApiValue<V, T>(value: unknown, view: DeepReadonly<V>, fallback?: any): T {
    if (typeof value === "function") {
        const handler = value as (view: DeepReadonly<V>) => T;

        return handler(view) || fallback;
    }

    return toValue(value as T) || (fallback as T);
}

function resolveApiHeaders<V>(
    definition: ActionApiDefinition<V>,
    view: DeepReadonly<V>,
    payload?: ActionCallPayload<V>,
): Record<string, string> {
    const initial = resolveApiValue<V, Record<string, string>>(definition.headers, view, {});
    const custom = resolveApiValue<V, Record<string, string>>(payload?.headers, view, {});

    return defu(custom, initial);
}

function resolveApiQuery<V>(
    definition: ActionApiDefinition<V>,
    view: DeepReadonly<V>,
    payload?: ActionCallPayload<V>,
): Record<string, unknown> {
    const initial = resolveApiValue<V, Record<string, unknown>>(definition.query, view, {});
    const custom = resolveApiValue<V, Record<string, unknown>>(payload?.query, view, {});

    return defu(custom, initial);
}

function resolveApiBody<V>(definition: ActionApiDefinition<V>, view: DeepReadonly<V>, payload?: ActionCallPayload<V>) {
    const initial = resolveApiValue(definition.body, view, {}) as any;
    const custom = resolveApiValue(payload?.body, view, {}) as any;

    return defu(custom, initial);
}

async function executeApi<V>(
    definition: ActionApiDefinition<V>,
    view: DeepReadonly<V>,
    payload?: ActionCallPayload<V>,
): Promise<unknown> {
    const url = resolveApiValue<V, string>(definition.url, view);

    return $fetch(url, {
        method: definition.method,
        headers: resolveApiHeaders(definition, view, payload),
        query: resolveApiQuery(definition, view, payload),
        body: resolveApiBody(definition, view, payload) as any,
        timeout: payload?.timeout ?? definition.timeout,
        signal: payload?.signal,
    });
}

export function createAction<M extends Model, V, R>(
    definition: ActionDefinition<M, V, R>,
    view: V,
    mutations: Mutations<M>,
): Action<V, R> {
    const globalError = ref<ActionError | null>(null);
    const globalStatus = ref<ActionStatus>(ActionStatus.IDLE);

    const loading = computed(() => {
        return globalStatus.value === ActionStatus.PENDING;
    });

    let data: R | null = null;

    let currentController: Promise<R> | null = null;
    let abortController: AbortController | null = null;

    async function execute(payload?: ActionCallPayload<V, R>): Promise<R> {
        if (loading.value) {
            const concurrent = payload?.concurrent ?? ActionConcurrent.BLOCK;

            switch (concurrent) {
                case ActionConcurrent.BLOCK: {
                    throw createConcurrentError();
                }
                case ActionConcurrent.SKIP: {
                    return currentController!;
                }
                case ActionConcurrent.CANCEL: {
                    abortController?.abort();
                }
            }
        }

        abortController = new AbortController();

        const activeStatus = payload?.bind?.status ?? globalStatus;
        const activeError = payload?.bind?.error ?? globalError;

        activeStatus.value = ActionStatus.PENDING;
        activeError.value = null;

        currentController = (async () => {
            try {
                let result: R;
                const readonlyView = readonly(view as object) as DeepReadonly<V>;
                const committer = createCommitter(mutations);

                if (definition.api) {
                    let response: unknown;

                    try {
                        const apiPayload = {
                            ...payload,
                            signal: payload?.signal ?? abortController!.signal,
                        } as ActionCallPayload<V>;

                        response = await executeApi(definition.api, readonlyView, apiPayload);
                    } catch (error: any) {
                        throw createApiError(error?.message ?? "API request failed", {
                            status: error?.status ?? error?.response?.status,
                            statusText: error?.statusText ?? error?.response?.statusText,
                            data: error?.data ?? error?.response?._data,
                        });
                    }

                    if (definition.handle) {
                        const handler = definition.handle as ActionHandleResolver<R>;

                        try {
                            result = await handler({
                                api: () => Promise.resolve(response),
                                view: readonlyView,
                                commit: committer,
                            });
                        } catch (handleError) {
                            if (handleError instanceof ApiError || handleError instanceof HandleError) {
                                throw handleError;
                            }

                            throw createHandleError(handleError as Error);
                        }
                    } else {
                        result = response as R;
                    }
                } else if (definition.handle) {
                    const handler = definition.handle as ActionHandleResolver<R>;

                    try {
                        result = await handler({
                            view: readonlyView,
                            commit: committer,
                        });
                    } catch (handleError) {
                        if (handleError instanceof HandleError) {
                            throw handleError;
                        }

                        throw createHandleError(handleError as Error);
                    }
                } else {
                    result = undefined as R;
                }

                if (payload?.transformer) {
                    result = payload.transformer(result as any) as R;
                }

                if (definition.commit) {
                    try {
                        executeCommit(
                            {
                                ...definition.commit,
                                mode: payload?.commit?.mode ?? definition.commit.mode,
                            },
                            mutations,
                            result,
                        );
                    } catch (commitError) {
                        throw createCommitError(commitError as Error);
                    }
                }

                data = result;
                activeStatus.value = ActionStatus.SUCCESS;

                return result;
            } catch (actionError) {
                activeError.value = actionError as ActionError;
                activeStatus.value = ActionStatus.ERROR;

                throw actionError;
            } finally {
                currentController = null;
                abortController = null;
            }
        })();

        return currentController;
    }

    const action = Object.assign(execute, {
        get loading() {
            return loading;
        },
        get error() {
            return readonly(globalError) as Readonly<Ref<ActionError | null>>;
        },
        get status() {
            return readonly(globalStatus) as Readonly<Ref<ActionStatus>>;
        },
        get data() {
            return data as DeepReadonly<R> | null;
        },
        reset() {
            globalError.value = null;
            globalStatus.value = ActionStatus.IDLE;
            data = null;
        },
    });

    return action;
}
