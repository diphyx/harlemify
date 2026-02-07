import type { ConsolaInstance } from "consola";

import type { Model, ModelInstance } from "../types/model";
import type {
    RuntimeViewConfig,
    ViewFromResolver,
    ViewMergeResolver,
    ViewFromDefinition,
    ViewMergeDefinition,
    ViewFactory,
} from "../types/view";

export function createViewFactory<M extends Model>(
    config?: RuntimeViewConfig,
    logger?: ConsolaInstance,
    _model?: M,
): ViewFactory<M> {
    function from<K extends keyof M, R = ModelInstance<M, K>>(
        source: K,
        resolver?: ViewFromResolver<M, K, R>,
    ): ViewFromDefinition<M, K, R> {
        const definition = {
            sources: [source] as const,
            resolver,
            logger,
        };

        return definition as ViewFromDefinition<M, K, R>;
    }

    function merge<K extends readonly (keyof M)[], R>(
        sources: K,
        resolver: ViewMergeResolver<M, K, R>,
    ): ViewMergeDefinition<M, K, R> {
        return {
            sources,
            resolver,
            logger,
        } as ViewMergeDefinition<M, K, R>;
    }

    return {
        from,
        merge,
    };
}
