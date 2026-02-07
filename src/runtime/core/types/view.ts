import type { DeepReadonly } from "vue";

import type { Model, ModelInstance } from "./model";

export type ViewFromResolver<M extends Model, K extends keyof M, R> = (value: DeepReadonly<ModelInstance<M, K>>) => R;

export type ViewMergeResolver<M extends Model, K extends readonly (keyof M)[], R> = (
    ...values: {
        [I in keyof K]: K[I] extends keyof M ? DeepReadonly<ModelInstance<M, K[I]>> : never;
    }
) => R;

export interface ViewFromDefinition<M extends Model, K extends keyof M, R = ModelInstance<M, K>> {
    sources: readonly [K];
    resolver?: ViewFromResolver<M, K, R>;
}

export interface ViewMergeDefinition<M extends Model, K extends readonly (keyof M)[], R> {
    sources: K;
    resolver: ViewMergeResolver<M, K, R>;
}

export type ViewDefinition<M extends Model> =
    | ViewFromDefinition<M, keyof M, unknown>
    | ViewMergeDefinition<M, readonly (keyof M)[], unknown>;

export type ViewDefinitions<M extends Model> = Record<string, ViewDefinition<M>>;

export type ViewResult<M extends Model, VD extends ViewDefinition<M>> =
    VD extends ViewFromDefinition<M, infer _K, infer R>
        ? R
        : VD extends ViewMergeDefinition<M, infer _K, infer R>
          ? R
          : never;

export interface ViewFactory<M extends Model> {
    from<K extends keyof M>(source: K): ViewFromDefinition<M, K, ModelInstance<M, K>>;
    from<K extends keyof M, R>(source: K, resolver: ViewFromResolver<M, K, R>): ViewFromDefinition<M, K, R>;
    merge<K extends readonly (keyof M)[], R>(
        sources: K,
        resolver: ViewMergeResolver<M, K, R>,
    ): ViewMergeDefinition<M, K, R>;
}
