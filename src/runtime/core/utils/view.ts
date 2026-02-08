import type { Store as SourceStore, BaseState } from "@harlem/core";

import type { ModelDefinitions } from "../types/model";
import type { ViewDefinition, ViewCall } from "../types/view";

function resolveModels<MD extends ModelDefinitions>(definition: ViewDefinition<MD>): readonly (keyof MD)[] {
    return "model" in definition ? definition.model : definition.models;
}

export function createView<MD extends ModelDefinitions, R = unknown>(
    definition: ViewDefinition<MD>,
    source: SourceStore<BaseState>,
): ViewCall<R> {
    const models = resolveModels(definition);

    definition.logger?.debug("Registering view", {
        view: definition.key,
        models,
    });

    const view = source.getter(definition.key, (state) => {
        const values = models.map((sourceKey) => {
            return state[sourceKey as string];
        });

        if (definition.resolver) {
            return (definition.resolver as (...args: unknown[]) => unknown)(...values);
        }

        return values[0];
    });

    return view;
}
