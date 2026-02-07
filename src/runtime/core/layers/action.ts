import type { ConsolaInstance } from "consola";

import { buildCommitMethod } from "../utils/action";

import type { Model } from "../types/model";
import {
    type RuntimeActionConfig,
    type ActionApiDefinition,
    type ActionApiShortcutDefinition,
    type ActionDefinition,
    type ActionApiChain,
    type ActionHandleChain,
    type ActionHandleCallback,
    type ActionHandleCallbackNoApi,
    type ActionFactory,
    ActionApiMethod,
    DEFINITION,
} from "../types/action";

export function createActionFactory<M extends Model, V>(
    config?: RuntimeActionConfig,
    logger?: ConsolaInstance,
    _model?: M,
    _view?: V,
): ActionFactory<M, V> {
    function apiCall<A>(apiDefinition: ActionApiDefinition<V>): ActionApiChain<M, V, A> {
        apiDefinition = {
            endpoint: config?.endpoint,
            headers: config?.headers,
            query: config?.query,
            timeout: config?.timeout,
            concurrent: config?.concurrent,
            ...apiDefinition,
        };

        const actionDefinition: ActionDefinition<M, V, A> = {
            api: apiDefinition,
            logger,
        };

        return {
            handle<R>(callback: ActionHandleCallback<M, V, R, A>): ActionHandleChain<M, V, R> {
                const handleDefinition: ActionDefinition<M, V, R> = {
                    api: apiDefinition,
                    handle: callback as ActionHandleCallback<M, V, R, unknown>,
                    logger,
                };

                return {
                    commit: buildCommitMethod(handleDefinition),
                    get [DEFINITION]() {
                        return handleDefinition;
                    },
                };
            },
            commit: buildCommitMethod(actionDefinition),
            get [DEFINITION]() {
                return actionDefinition;
            },
        };
    }

    function apiGet<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A> {
        return apiCall({
            ...definition,
            method: ActionApiMethod.GET,
        });
    }

    function apiHead<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A> {
        return apiCall({
            ...definition,
            method: ActionApiMethod.HEAD,
        });
    }

    function apiPost<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A> {
        return apiCall({
            ...definition,
            method: ActionApiMethod.POST,
        });
    }

    function apiPut<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A> {
        return apiCall({
            ...definition,
            method: ActionApiMethod.PUT,
        });
    }

    function apiPatch<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A> {
        return apiCall({
            ...definition,
            method: ActionApiMethod.PATCH,
        });
    }

    function apiDelete<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A> {
        return apiCall({
            ...definition,
            method: ActionApiMethod.DELETE,
        });
    }

    const api = Object.assign(apiCall, {
        get: apiGet,
        head: apiHead,
        post: apiPost,
        put: apiPut,
        patch: apiPatch,
        delete: apiDelete,
    });

    function handle<R>(callback: ActionHandleCallbackNoApi<M, V, R>): ActionHandleChain<M, V, R> {
        const definition: ActionDefinition<M, V, R> = {
            handle: callback,
            logger,
        };

        return {
            commit: buildCommitMethod(definition),
            get [DEFINITION]() {
                return definition;
            },
        };
    }

    const commit = buildCommitMethod({ logger } as ActionDefinition<M, V, void>);

    return {
        api,
        handle,
        commit,
    };
}
