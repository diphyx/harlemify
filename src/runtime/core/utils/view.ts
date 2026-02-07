import type { Store as SourceStore, BaseState } from "@harlem/core";

import type { StoreView } from "../store";
import type { Model } from "../types/model";
import type { ViewDefinitions } from "../types/view";

export function createView<M extends Model, VD extends ViewDefinitions<M>>(
    source: SourceStore<BaseState>,
    definitions: VD,
): StoreView<M, VD> {
    const view = {} as Record<string, unknown>;
    for (const [key, definition] of Object.entries(definitions)) {
        definition.logger?.debug("View registered", {
            view: key,
            sources: definition.sources,
        });

        view[key] = source.getter(key, (state) => {
            const values = definition.sources.map((sourceKey) => {
                return state[sourceKey as string];
            });

            if (definition.resolver) {
                return definition.resolver(...(values as [any]));
            }

            return values[0];
        });
    }

    return view as StoreView<M, VD>;
}
