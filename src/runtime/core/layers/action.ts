import type { ConsolaInstance } from "consola";

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
    logger?: ConsolaInstance,
): ActionFactory<MD, VD> {
    function apiCall(request: ActionApiRequest<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD> {
        return wrapBaseDefinition({
            request: {
                endpoint: config?.endpoint,
                headers: config?.headers,
                query: config?.query,
                timeout: config?.timeout,
                concurrent: config?.concurrent,
                ...request,
            },
            commit,
            logger,
        });
    }

    function apiGet(
        request: ActionApiRequestShortcut<MD, VD>,
        commit?: ActionApiCommit<MD>,
    ): ActionApiDefinition<MD, VD> {
        return apiCall({ ...request, method: ActionApiMethod.GET }, commit);
    }

    function apiHead(
        request: ActionApiRequestShortcut<MD, VD>,
        commit?: ActionApiCommit<MD>,
    ): ActionApiDefinition<MD, VD> {
        return apiCall(
            {
                ...request,
                method: ActionApiMethod.HEAD,
            },
            commit,
        );
    }

    function apiPost(
        request: ActionApiRequestShortcut<MD, VD>,
        commit?: ActionApiCommit<MD>,
    ): ActionApiDefinition<MD, VD> {
        return apiCall(
            {
                ...request,
                method: ActionApiMethod.POST,
            },
            commit,
        );
    }

    function apiPut(
        request: ActionApiRequestShortcut<MD, VD>,
        commit?: ActionApiCommit<MD>,
    ): ActionApiDefinition<MD, VD> {
        return apiCall(
            {
                ...request,
                method: ActionApiMethod.PUT,
            },
            commit,
        );
    }

    function apiPatch(
        request: ActionApiRequestShortcut<MD, VD>,
        commit?: ActionApiCommit<MD>,
    ): ActionApiDefinition<MD, VD> {
        return apiCall(
            {
                ...request,
                method: ActionApiMethod.PATCH,
            },
            commit,
        );
    }

    function apiDelete(
        request: ActionApiRequestShortcut<MD, VD>,
        commit?: ActionApiCommit<MD>,
    ): ActionApiDefinition<MD, VD> {
        return apiCall(
            {
                ...request,
                method: ActionApiMethod.DELETE,
            },
            commit,
        );
    }

    const api = Object.assign(apiCall, {
        get: apiGet,
        head: apiHead,
        post: apiPost,
        put: apiPut,
        patch: apiPatch,
        delete: apiDelete,
    });

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
