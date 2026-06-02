import type { Logger } from "../types/base";
import type { ModelDefinitions, ModelDefinitionInfer } from "../types/model";
import { wrapBaseDefinition } from "../utils/base";
import type {
    RuntimeViewConfig,
    ViewDefinitionOptions,
    ViewFromDefinitionResolver,
    ViewMergeDefinitionResolver,
    ViewFromDefinition,
    ViewMergeDefinition,
    ViewFactory,
} from "../types/view";

export function createViewFactory<MD extends ModelDefinitions>(
    config?: RuntimeViewConfig,
    logger?: Logger,
): ViewFactory<MD> {
    function from<K extends keyof MD, R = ModelDefinitionInfer<MD, K>>(
        model: K,
        resolver?: ViewFromDefinitionResolver<MD, K, R>,
        options?: ViewDefinitionOptions,
    ): ViewFromDefinition<MD, K, R> {
        return wrapBaseDefinition({
            model: [model] as const,
            resolver,
            options: {
                clone: config?.clone,
                ...options,
            },
            logger,
        });
    }

    function merge<K extends readonly (keyof MD)[], R>(
        models: K,
        resolver: ViewMergeDefinitionResolver<MD, K, R>,
        options?: ViewDefinitionOptions,
    ): ViewMergeDefinition<MD, K, R> {
        return wrapBaseDefinition({
            models,
            resolver,
            options: {
                clone: config?.clone,
                ...options,
            },
            logger,
        });
    }

    return {
        from,
        merge,
    };
}
