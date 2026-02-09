import type {
    ModelCall,
    ModelOneCall,
    ModelManyCall,
    ModelOneCommit,
    ModelManyCommit,
    StoreModel,
    ModelDefinitions,
} from "../core/types/model";
import type { Shape } from "../core/types/shape";
import { debounce, throttle } from "../core/utils/base";

// Options

export interface UseStoreModelOptions {
    debounce?: number;
    throttle?: number;
}

// Return

type UseStoreModelOne<C extends ModelOneCommit<any>> = {
    set: C["set"];
    reset: C["reset"];
    patch: C["patch"];
};

type UseStoreModelMany<C extends ModelManyCommit<any>> = {
    set: C["set"];
    reset: C["reset"];
    patch: C["patch"];
    add: C["add"];
    remove: C["remove"];
};

export type UseStoreModel<M extends ModelCall<any> = ModelCall<any>> =
    M extends ModelManyCall<infer S>
        ? UseStoreModelMany<ModelManyCommit<S>>
        : M extends ModelOneCall<infer S>
          ? UseStoreModelOne<ModelOneCommit<S>>
          : never;

// Helpers

function isMany<S extends Shape>(model: ModelCall<S>): model is ModelManyCall<S> {
    return "add" in model && typeof model.add === "function";
}

function wrapCommit<T extends (...args: any[]) => any>(commit: T, options?: UseStoreModelOptions): T {
    if (options?.debounce) {
        return debounce(commit, options.debounce);
    }

    if (options?.throttle) {
        return throttle(commit, options.throttle);
    }

    return commit;
}

// Composable

export function useStoreModel<M extends StoreModel<ModelDefinitions>, K extends keyof M & string>(
    store: { model: M },
    key: K,
    options?: UseStoreModelOptions,
): UseStoreModel<M[K]> {
    const model = store.model[key] as unknown as ModelCall<Shape>;
    if (!model) {
        throw new Error(`Model "${key}" not found in store`);
    }

    let output: Record<string, unknown> = {
        set: wrapCommit(model.set.bind(model), options),
        reset: wrapCommit(model.reset.bind(model), options),
        patch: wrapCommit(model.patch.bind(model), options),
    };

    if (isMany(model)) {
        output = {
            ...output,
            add: wrapCommit(model.add.bind(model), options),
            remove: wrapCommit(model.remove.bind(model), options),
        };
    }

    return output as UseStoreModel<M[K]>;
}
