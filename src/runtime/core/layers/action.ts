import type { Logger } from "../types/base";
import type { ModelDefinitions } from "../types/model";
import type { ViewDefinitions } from "../types/view";
import { wrapBaseDefinition } from "../utils/base";
import {
    type RuntimeActionConfig,
    type ActionApiRequest,
    type ActionApiRequestShortcut,
    type ActionApiCommit,
    type ActionApiDefinition,
    type ActionHandlerCallback,
    type ActionHandlerOptions,
    type ActionHandlerDefinition,
    type ActionFactory,
    ActionApiMethod,
} from "../types/action";

export function createActionFactory<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    config?: RuntimeActionConfig,
    logger?: Logger,
): ActionFactory<MD, VD> {
    function apiCall(
        request: ActionApiRequest<MD, VD>,
        ...commits: ActionApiCommit<MD, VD>[]
    ): ActionApiDefinition<MD, VD, ActionApiCommit<MD, VD>[]> {
        return wrapBaseDefinition({
            request: {
                endpoint: config?.endpoint,
                headers: config?.headers,
                query: config?.query,
                timeout: config?.timeout,
                concurrent: config?.concurrent,
                ...request,
            },
            commits,
            logger,
        });
    }

    function apiGet(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: ActionApiCommit<MD, VD>[]
    ): ActionApiDefinition<MD, VD, ActionApiCommit<MD, VD>[]> {
        return apiCall({ ...request, method: ActionApiMethod.GET }, ...commits);
    }

    function apiHead(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: ActionApiCommit<MD, VD>[]
    ): ActionApiDefinition<MD, VD, ActionApiCommit<MD, VD>[]> {
        return apiCall({ ...request, method: ActionApiMethod.HEAD }, ...commits);
    }

    function apiPost(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: ActionApiCommit<MD, VD>[]
    ): ActionApiDefinition<MD, VD, ActionApiCommit<MD, VD>[]> {
        return apiCall({ ...request, method: ActionApiMethod.POST }, ...commits);
    }

    function apiPut(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: ActionApiCommit<MD, VD>[]
    ): ActionApiDefinition<MD, VD, ActionApiCommit<MD, VD>[]> {
        return apiCall({ ...request, method: ActionApiMethod.PUT }, ...commits);
    }

    function apiPatch(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: ActionApiCommit<MD, VD>[]
    ): ActionApiDefinition<MD, VD, ActionApiCommit<MD, VD>[]> {
        return apiCall({ ...request, method: ActionApiMethod.PATCH }, ...commits);
    }

    function apiDelete(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: ActionApiCommit<MD, VD>[]
    ): ActionApiDefinition<MD, VD, ActionApiCommit<MD, VD>[]> {
        return apiCall({ ...request, method: ActionApiMethod.DELETE }, ...commits);
    }

    const api = Object.assign(apiCall, {
        get: apiGet,
        head: apiHead,
        post: apiPost,
        put: apiPut,
        patch: apiPatch,
        delete: apiDelete,
    }) as ActionFactory<MD, VD>["api"];

    function handler<P = unknown, R = void>(
        callback: ActionHandlerCallback<MD, VD, P, R>,
        options?: ActionHandlerOptions<P>,
    ): ActionHandlerDefinition<MD, VD, P, R> {
        return wrapBaseDefinition({
            callback,
            options: {
                concurrent: config?.concurrent,
                ...options,
            },
            logger,
        });
    }

    return {
        api,
        handler,
    };
}
