import type { Store as SourceStore, BaseState } from "@harlem/core";

import type { ModelDefinitions } from "../types/model";
import { type ViewDefinition, type ViewCall, ViewClone } from "../types/view";

// Resolve Clone

function resolveClonedValue<MD extends ModelDefinitions>(definition: ViewDefinition<MD>, value: unknown): unknown {
    if (!definition.options?.clone) {
        return value;
    }

    if (definition.options.clone === ViewClone.DEEP) {
        return JSON.parse(JSON.stringify(value));
    }

    if (Array.isArray(value)) {
        return [...value];
    }

    if (typeof value === "object") {
        return { ...value };
    }

    return value;
}

// Resolve Models

function resolveModels<MD extends ModelDefinitions>(definition: ViewDefinition<MD>): readonly (keyof MD)[] {
    return "model" in definition ? definition.model : definition.models;
}

// Create View

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
            const value = state[sourceKey as string];
            if (definition.resolver) {
                return resolveClonedValue(definition, value);
            }

            return value;
        });

        if (definition.resolver) {
            return (definition.resolver as (...args: unknown[]) => unknown)(...values);
        }

        return values[0];
    });

    return view;
}
