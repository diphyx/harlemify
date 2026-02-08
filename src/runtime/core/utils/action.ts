import { defu } from "defu";
import { type DeepReadonly, type Ref, ref, computed, readonly, toValue, nextTick } from "vue";

import { type StoreModel, type ModelDefinitions, type ModelCall, ModelOneMode, ModelManyMode } from "../types/model";
import type { Shape } from "../types/shape";
import type { StoreView, ViewDefinitions } from "../types/view";
import {
    type ActionApiCommit,
    type ActionApiDefinition,
    type ActionApiRequest,
    type ActionCall,
    type ActionCallOptions,
    type ActionDefinition,
    type ActionHandlerDefinition,
    type ActionResolvedApi,
    ActionApiMethod,
    ActionStatus,
    ActionConcurrent,
} from "../types/action";

// Errors

export class ActionApiError extends Error {
    override name = "ActionApiError" as const;

    declare status: number;
    declare statusText: string;
    declare data: unknown;

    constructor(source: any) {
        super(source.message || "API request failed");

        this.status = source?.status ?? source?.response?.status ?? 500;
        this.statusText = source?.statusText ?? source?.response?.statusText ?? "Internal Server Error";
        this.data = source?.data ?? source?.response?._data ?? null;
    }
}

export class ActionHandlerError extends Error {
    override name = "ActionHandlerError" as const;

    constructor(source: any) {
        super(source.message || "Action handler failed");
    }
}

export class ActionCommitError extends Error {
    override name = "ActionCommitError" as const;

    constructor(source: any) {
        super(source.message || "Action commit failed");
    }
}

export class ActionConcurrentError extends Error {
    override name = "ActionConcurrentError" as const;

    constructor() {
        super("Action is already pending");
    }
}

// Error Helpers

function isError(error: unknown, ...types: (abstract new (...args: never[]) => Error)[]): error is Error {
    return types.some((ErrorType) => error instanceof ErrorType);
}

function toError<T extends Error = Error>(error: unknown, ErrorType?: new (source: unknown) => T): T {
    if (ErrorType) {
        return new ErrorType(error);
    }

    return (error instanceof Error ? error : new Error(String(error))) as T;
}

// Resolve Value

function resolveValue<V, T>(value: unknown, view: DeepReadonly<V>, fallback?: T): T {
    if (typeof value === "function") {
        return (value as (view: DeepReadonly<V>) => T)(view) || (fallback as T);
    }

    return toValue(value as T) || (fallback as T);
}

// Resolve Api

function resolveApiUrl<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    request: ActionApiRequest<MD, VD>,
    options?: ActionCallOptions,
    view?: DeepReadonly<StoreView<MD, VD>>,
): string {
    const endpoint = (request.endpoint ?? "").replace(/\/+$/, "");
    let path = resolveValue<StoreView<MD, VD>, string>(request.url, view as DeepReadonly<StoreView<MD, VD>>);

    if (options?.params) {
        for (const [key, value] of Object.entries(options.params)) {
            path = path.replace(`:${key}`, encodeURIComponent(value));
        }
    }

    if (endpoint) {
        return `${endpoint}/${path.replace(/^\/+/, "")}`;
    }

    return path;
}

function resolveApiHeaders<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    request: ActionApiRequest<MD, VD>,
    options?: ActionCallOptions,
    view?: DeepReadonly<StoreView<MD, VD>>,
): Record<string, string> {
    const initial = resolveValue<StoreView<MD, VD>, Record<string, string>>(
        request.headers,
        view as DeepReadonly<StoreView<MD, VD>>,
        {},
    );
    const custom = options?.headers ?? {};

    return defu(custom, initial);
}

function resolveApiQuery<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    request: ActionApiRequest<MD, VD>,
    options?: ActionCallOptions,
    view?: DeepReadonly<StoreView<MD, VD>>,
): Record<string, unknown> {
    const initial = resolveValue<StoreView<MD, VD>, Record<string, unknown>>(
        request.query,
        view as DeepReadonly<StoreView<MD, VD>>,
        {},
    );
    const custom = options?.query ?? {};

    return defu(custom, initial);
}

function resolveApiBody<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    request: ActionApiRequest<MD, VD>,
    options?: ActionCallOptions,
    view?: DeepReadonly<StoreView<MD, VD>>,
): Record<string, unknown> | BodyInit | null | undefined {
    if (request.method === ActionApiMethod.GET || request.method === ActionApiMethod.HEAD) {
        return undefined;
    }

    const initial = resolveValue<StoreView<MD, VD>, Record<string, unknown>>(
        request.body,
        view as DeepReadonly<StoreView<MD, VD>>,
        {},
    );
    const custom = options?.body ?? {};

    return defu(custom as Record<string, unknown>, initial);
}

function resolveApiMethod<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    request: ActionApiRequest<MD, VD>,
    view?: DeepReadonly<StoreView<MD, VD>>,
): ActionApiMethod {
    return resolveValue<StoreView<MD, VD>, ActionApiMethod>(
        request.method,
        view as DeepReadonly<StoreView<MD, VD>>,
        ActionApiMethod.GET,
    );
}

function resolveApiTimeout<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    request: ActionApiRequest<MD, VD>,
    options?: ActionCallOptions,
    view?: DeepReadonly<StoreView<MD, VD>>,
): number | undefined {
    if (options?.timeout) {
        return options.timeout;
    }

    if (request.timeout) {
        return resolveValue<StoreView<MD, VD>, number>(request.timeout, view as DeepReadonly<StoreView<MD, VD>>);
    }

    return undefined;
}

function resolveApiSignal(options?: ActionCallOptions, abortController?: AbortController): AbortSignal {
    if (options?.signal) {
        return options.signal;
    }

    return abortController!.signal;
}

// Resolve Commit

function resolveCommitTarget<MD extends ModelDefinitions>(
    commit: ActionApiCommit<MD>,
    model: StoreModel<MD>,
): ModelCall<Shape> {
    return model[commit.model] as ModelCall<Shape>;
}

function resolveCommitMode<MD extends ModelDefinitions>(
    commit: ActionApiCommit<MD>,
    options?: ActionCallOptions,
): ModelOneMode | ModelManyMode {
    if (options?.commit?.mode) {
        return options.commit.mode;
    }

    return commit.mode;
}

function resolveCommitValue<MD extends ModelDefinitions>(commit: ActionApiCommit<MD>, data: unknown): unknown {
    if (typeof commit.value === "function") {
        return commit.value(data);
    }

    return data;
}

// Type Guards

function isApiDefinition<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionDefinition<MD, VD>,
): definition is ActionApiDefinition<MD, VD> {
    return "request" in definition;
}

// Resolve Concurrent

function resolveConcurrent<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionDefinition<MD, VD>,
    options?: ActionCallOptions,
): ActionConcurrent {
    if (options?.concurrent) {
        return options.concurrent;
    }

    if (isApiDefinition(definition) && definition.request.concurrent) {
        return definition.request.concurrent;
    }

    return ActionConcurrent.BLOCK;
}

// Execute Api

async function executeApi<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>, R>(
    definition: ActionApiDefinition<MD, VD>,
    api: ActionResolvedApi,
    options?: ActionCallOptions,
): Promise<R> {
    try {
        definition.logger?.debug("Action API request", {
            action: definition.key,
            method: api.method,
            url: api.url,
        });

        if (options?.transformer?.request) {
            api = options.transformer.request(api);
        }

        const response = await $fetch(api.url, {
            method: api.method,
            headers: api.headers,
            query: api.query,
            body: api.body,
            timeout: api.timeout,
            signal: api.signal,
        });

        definition.logger?.debug("Action API response received", {
            action: definition.key,
            method: api.method,
            url: api.url,
        });

        if (options?.transformer?.response) {
            return options.transformer.response(response) as R;
        }

        return response as R;
    } catch (error: unknown) {
        const fetchError = toError(error, ActionApiError);

        definition.logger?.error("Action API error", {
            action: definition.key,
            error: fetchError.message,
        });

        throw fetchError;
    }
}

// Execute Handler

async function executeHandler<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>, R>(
    definition: ActionHandlerDefinition<MD, VD, R>,
    model: StoreModel<MD>,
    view: StoreView<MD, VD>,
): Promise<R> {
    try {
        definition.logger?.debug("Action handler phase", {
            action: definition.key,
        });

        return await definition.callback({
            model,
            view,
        });
    } catch (error: unknown) {
        if (isError(error, ActionApiError, ActionHandlerError)) {
            throw error;
        }

        const handlerError = toError(error, ActionHandlerError);

        definition.logger?.error("Action handler error", {
            action: definition.key,
            error: handlerError.message,
        });

        throw handlerError;
    }
}

// Execute Commit

function executeCommit<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionApiDefinition<MD, VD>,
    model: StoreModel<MD>,
    data: unknown,
    options?: ActionCallOptions,
): void {
    if (!definition.commit) {
        return;
    }

    try {
        definition.logger?.debug("Action commit phase", {
            action: definition.key,
            model: definition.commit.model as string,
            mode: definition.commit.mode,
        });

        const target = resolveCommitTarget(definition.commit, model);
        const mode = resolveCommitMode(definition.commit, options);
        const value = resolveCommitValue(definition.commit, data);

        target.commit(mode, value, definition.commit.options);
    } catch (error: unknown) {
        const commitError = toError(error, ActionCommitError);

        definition.logger?.error("Action commit error", {
            action: definition.key,
            error: commitError.message,
        });

        throw commitError;
    }
}

// Create Action

export function createAction<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>, R>(
    definition: ActionDefinition<MD, VD>,
    model: StoreModel<MD>,
    view: StoreView<MD, VD>,
): ActionCall<R> {
    definition.logger?.debug("Registering action", {
        action: definition.key,
        type: isApiDefinition(definition) ? "api" : "handler",
    });

    let currentController: Promise<R> | null = null;
    let abortController: AbortController | null = null;

    let globalData: R | null = null;

    const globalError = ref<Error | null>(null);
    const globalStatus = ref<ActionStatus>(ActionStatus.IDLE);

    const loading = computed(() => {
        return globalStatus.value === ActionStatus.PENDING;
    });

    async function execute(options?: ActionCallOptions): Promise<R> {
        await nextTick();

        const concurrent = resolveConcurrent(definition, options);

        if (loading.value) {
            switch (concurrent) {
                case ActionConcurrent.BLOCK: {
                    definition.logger?.error("Action blocked by concurrent guard", {
                        action: definition.key,
                    });

                    throw new ActionConcurrentError();
                }
                case ActionConcurrent.SKIP: {
                    definition.logger?.warn("Action skipped by concurrent guard", {
                        action: definition.key,
                    });

                    return currentController!;
                }
                case ActionConcurrent.CANCEL: {
                    definition.logger?.warn("Action cancelling previous execution", {
                        action: definition.key,
                    });

                    abortController?.abort();
                }
            }
        }

        abortController = new AbortController();

        const activeStatus = options?.bind?.status ?? globalStatus;
        const activeError = options?.bind?.error ?? globalError;

        activeStatus.value = ActionStatus.PENDING;
        activeError.value = null;

        currentController = (async () => {
            try {
                let data: R;

                if (isApiDefinition(definition)) {
                    const resolvedApi = {
                        url: resolveApiUrl(definition.request, options, view as DeepReadonly<StoreView<MD, VD>>),
                        method: resolveApiMethod(definition.request, view as DeepReadonly<StoreView<MD, VD>>),
                        headers: resolveApiHeaders(
                            definition.request,
                            options,
                            view as DeepReadonly<StoreView<MD, VD>>,
                        ),
                        query: resolveApiQuery(definition.request, options, view as DeepReadonly<StoreView<MD, VD>>),
                        body: resolveApiBody(definition.request, options, view as DeepReadonly<StoreView<MD, VD>>),
                        timeout: resolveApiTimeout(
                            definition.request,
                            options,
                            view as DeepReadonly<StoreView<MD, VD>>,
                        ),
                        signal: resolveApiSignal(options, abortController!),
                    };

                    data = await executeApi<MD, VD, R>(definition, resolvedApi, options);

                    executeCommit(definition, model, data, options);
                } else {
                    data = await executeHandler(definition as ActionHandlerDefinition<MD, VD, R>, model, view);
                }

                globalData = data;
                activeStatus.value = ActionStatus.SUCCESS;

                definition.logger?.debug("Action success", {
                    action: definition.key,
                });

                return data;
            } catch (actionError) {
                activeError.value = actionError as Error;
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
            return readonly(globalError) as Readonly<Ref<Error | null>>;
        },
        get status() {
            return readonly(globalStatus) as Readonly<Ref<ActionStatus>>;
        },
        get data() {
            return globalData as DeepReadonly<R> | null;
        },
        reset() {
            globalError.value = null;
            globalStatus.value = ActionStatus.IDLE;
            globalData = null;
        },
    });

    return action;
}
