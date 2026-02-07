import type { Model, ModelInstance } from "./model";

export type ViewFromResolver<M extends Model, K extends keyof M, R> = (value: ModelInstance<M, K>) => R;

export type ModelInstanceTuple<M extends Model, K extends readonly (keyof M)[]> = {
    [I in keyof K]: K[I] extends keyof M ? ModelInstance<M, K[I]> : never;
};

export type ViewMergeResolver<M extends Model, K extends readonly (keyof M)[], R> = (
    ...values: [...ModelInstanceTuple<M, K>]
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
    merge<K1 extends keyof M, K2 extends keyof M, R>(
        sources: readonly [K1, K2],
        resolver: (v1: ModelInstance<M, K1>, v2: ModelInstance<M, K2>) => R,
    ): ViewMergeDefinition<M, readonly [K1, K2], R>;
    merge<K1 extends keyof M, K2 extends keyof M, K3 extends keyof M, R>(
        sources: readonly [K1, K2, K3],
        resolver: (v1: ModelInstance<M, K1>, v2: ModelInstance<M, K2>, v3: ModelInstance<M, K3>) => R,
    ): ViewMergeDefinition<M, readonly [K1, K2, K3], R>;
    merge<K extends readonly (keyof M)[], R>(
        sources: K,
        resolver: ViewMergeResolver<M, K, R>,
    ): ViewMergeDefinition<M, K, R>;
}
