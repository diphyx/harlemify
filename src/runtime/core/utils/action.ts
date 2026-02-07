import { defu } from "defu";
import { type DeepReadonly, type Ref, ref, computed, readonly, toValue, nextTick } from "vue";

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
    ActionApiMethod,
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
    declare status?: number;
    declare statusText?: string;
    declare data?: unknown;

    constructor(message: string, options?: { status?: number; statusText?: string; data?: unknown }) {
        super(message);
        this.status = options?.status;
        this.statusText = options?.statusText;
        this.data = options?.data;
    }
}

class HandleError extends Error implements ActionHandleError {
    override name = "ActionHandleError" as const;
    declare cause: Error;

    constructor(cause: Error) {
        super(cause.message);
        this.cause = cause;
    }
}

class CommitError extends Error implements ActionCommitError {
    override name = "ActionCommitError" as const;
    declare cause: Error;

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
    function commit(model: keyof M, mode: ActionOneMode | ActionManyMode, value?: unknown, options?: unknown) {
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

function resolveApiValue<V, T>(value: unknown, view: DeepReadonly<V>, fallback?: T): T {
    if (typeof value === "function") {
        const handler = value as (view: DeepReadonly<V>) => T;

        return handler(view) || (fallback as T);
    }

    return toValue(value as T) || (fallback as T);
}

function resolveApiUrl<V>(definition: ActionApiDefinition<V>, view: DeepReadonly<V>): string {
    const endpoint = (definition.endpoint ?? "").replace(/\/+$/, "");
    const path = resolveApiValue<V, string>(definition.url, view);

    if (endpoint) {
        return `${endpoint}/${path.replace(/^\/+/, "")}`;
    }

    return path;
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

function resolveApiBody<V>(
    definition: ActionApiDefinition<V>,
    view: DeepReadonly<V>,
    payload?: ActionCallPayload<V>,
): any {
    if (definition.method === ActionApiMethod.GET || definition.method === ActionApiMethod.HEAD) {
        return undefined;
    }

    const initial = resolveApiValue<V, Record<string, unknown>>(definition.body, view, {});
    const custom = resolveApiValue<V, Record<string, unknown>>(payload?.body, view, {});

    return defu(custom, initial);
}

export function createAction<M extends Model, V, R>(
    definition: ActionDefinition<M, V, R>,
    mutations: Mutations<M>,
    view: V,
    key: string,
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
        await nextTick();

        if (loading.value) {
            const concurrent = payload?.concurrent ?? definition.api?.concurrent ?? ActionConcurrent.BLOCK;

            switch (concurrent) {
                case ActionConcurrent.BLOCK: {
                    definition.logger?.error("Action blocked by concurrent guard", {
                        action: key,
                    });

                    throw createConcurrentError();
                }
                case ActionConcurrent.SKIP: {
                    definition.logger?.warn("Action skipped by concurrent guard", {
                        action: key,
                    });

                    return currentController!;
                }
                case ActionConcurrent.CANCEL: {
                    definition.logger?.warn("Action cancelling previous execution", {
                        action: key,
                    });

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
                const committer = createCommitter(mutations);

                if (definition.api) {
                    let response: unknown;

                    try {
                        const apiPayload = {
                            ...payload,
                            signal: payload?.signal ?? abortController!.signal,
                        } as ActionCallPayload<V>;

                        const url = resolveApiUrl(definition.api, view as DeepReadonly<V>);

                        definition.logger?.debug("Action API request", {
                            action: key,
                            method: definition.api.method,
                            url,
                        });

                        response = await $fetch(url, {
                            method: definition.api.method,
                            headers: resolveApiHeaders(definition.api, view as DeepReadonly<V>, apiPayload),
                            query: resolveApiQuery(definition.api, view as DeepReadonly<V>, apiPayload),
                            body: resolveApiBody(definition.api, view as DeepReadonly<V>, apiPayload),
                            timeout: apiPayload?.timeout ?? definition.api.timeout,
                            signal: apiPayload?.signal,
                        });

                        definition.logger?.debug("Action API response received", {
                            action: key,
                            method: definition.api.method,
                            url,
                        });
                    } catch (error: any) {
                        const errorMessage = error?.message ?? "API request failed";
                        const errorOptions = {
                            status: error?.status ?? error?.response?.status,
                            statusText: error?.statusText ?? error?.response?.statusText,
                            data: error?.data ?? error?.response?._data,
                        };

                        definition.logger?.error("Action API error", {
                            action: key,
                            error: errorMessage,
                        });

                        throw createApiError(errorMessage, errorOptions);
                    }

                    if (definition.handle) {
                        const handler = definition.handle as ActionHandleResolver<R>;

                        try {
                            definition.logger?.debug("Action handle phase", {
                                action: key,
                            });

                            result = await handler({
                                view,
                                commit: committer,
                                async api() {
                                    return response;
                                },
                            });
                        } catch (handleError: any) {
                            if (handleError instanceof ApiError || handleError instanceof HandleError) {
                                throw handleError;
                            }

                            definition.logger?.error("Action handle error", {
                                action: key,
                                error: handleError?.message,
                            });

                            throw createHandleError(handleError as Error);
                        }
                    } else {
                        result = response as R;
                    }
                } else if (definition.handle) {
                    const handler = definition.handle as ActionHandleResolver<R>;

                    try {
                        definition.logger?.debug("Action handle phase", {
                            action: key,
                        });

                        result = await handler({
                            view,
                            commit: committer,
                        });
                    } catch (handleError: any) {
                        if (handleError instanceof HandleError) {
                            throw handleError;
                        }

                        definition.logger?.error("Action handle error", {
                            action: key,
                            error: handleError?.message,
                        });

                        throw createHandleError(handleError as Error);
                    }
                } else {
                    result = undefined as R;
                }

                if (payload?.transformer) {
                    result = payload.transformer(result) as R;
                }

                if (definition.commit) {
                    try {
                        definition.logger?.debug("Action commit phase", {
                            action: key,
                            model: definition.commit.model as string,
                            mode: definition.commit.mode,
                        });

                        executeCommit(
                            {
                                ...definition.commit,
                                mode: payload?.commit?.mode ?? definition.commit.mode,
                            },
                            mutations,
                            result,
                        );
                    } catch (commitError: any) {
                        definition.logger?.error("Action commit error", {
                            action: key,
                            error: commitError?.message,
                        });

                        throw createCommitError(commitError as Error);
                    }
                }

                data = result;
                activeStatus.value = ActionStatus.SUCCESS;

                definition.logger?.debug("Action success", {
                    action: key,
                });

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
