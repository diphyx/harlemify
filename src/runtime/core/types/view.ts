import type { ComputedRef } from "vue";

import type { BaseDefinition } from "./base";
import type { ModelDefinitions, ModelDefinitionInfer, ModelDefinitionInferTuple } from "./model";

// Enums

export enum ViewClone {
    SHALLOW = "shallow",
    DEEP = "deep",
}

// Config

export interface RuntimeViewConfig {
    clone?: ViewClone;
}

// Options

export interface ViewDefinitionOptions {
    clone?: ViewClone;
}

// Resolvers

export type ViewFromDefinitionResolver<MD extends ModelDefinitions, K extends keyof MD, R> = (
    model: ModelDefinitionInfer<MD, K>,
) => R;

export type ViewMergeDefinitionResolver<MD extends ModelDefinitions, K extends readonly (keyof MD)[], R> = (
    ...values: [...ModelDefinitionInferTuple<MD, K>]
) => R;

// Definitions

export interface ViewFromDefinition<
    MD extends ModelDefinitions,
    K extends keyof MD,
    R = ModelDefinitionInfer<MD, K>,
> extends BaseDefinition {
    model: readonly [K];
    resolver?: ViewFromDefinitionResolver<MD, K, R>;
    options?: ViewDefinitionOptions;
}

export interface ViewMergeDefinition<
    MD extends ModelDefinitions,
    K extends readonly (keyof MD)[],
    R,
> extends BaseDefinition {
    models: K;
    resolver: ViewMergeDefinitionResolver<MD, K, R>;
    options?: ViewDefinitionOptions;
}

export type ViewDefinition<MD extends ModelDefinitions> =
    | ViewFromDefinition<MD, keyof MD, unknown>
    | ViewMergeDefinition<MD, readonly (keyof MD)[], unknown>;

export type ViewDefinitions<MD extends ModelDefinitions> = Record<string, ViewDefinition<MD>>;

// Infer

export type ViewDefinitionInfer<MD extends ModelDefinitions, VD extends ViewDefinition<MD>> =
    VD extends ViewFromDefinition<MD, infer _K, infer R>
        ? R
        : VD extends ViewMergeDefinition<MD, infer _K, infer R>
          ? R
          : never;

// Factory

export interface ViewFactory<MD extends ModelDefinitions> {
    from<K extends keyof MD>(model: K): ViewFromDefinition<MD, K, ModelDefinitionInfer<MD, K>>;
    from<K extends keyof MD, R>(
        model: K,
        resolver: ViewFromDefinitionResolver<MD, K, R>,
        options?: ViewDefinitionOptions,
    ): ViewFromDefinition<MD, K, R>;
    merge<MK1 extends keyof MD, MK2 extends keyof MD, R>(
        models: readonly [MK1, MK2],
        resolver: (mv1: ModelDefinitionInfer<MD, MK1>, mv2: ModelDefinitionInfer<MD, MK2>) => R,
        options?: ViewDefinitionOptions,
    ): ViewMergeDefinition<MD, readonly [MK1, MK2], R>;
    merge<MK1 extends keyof MD, MK2 extends keyof MD, MK3 extends keyof MD, R>(
        models: readonly [MK1, MK2, MK3],
        resolver: (
            mv1: ModelDefinitionInfer<MD, MK1>,
            mv2: ModelDefinitionInfer<MD, MK2>,
            mv3: ModelDefinitionInfer<MD, MK3>,
        ) => R,
        options?: ViewDefinitionOptions,
    ): ViewMergeDefinition<MD, readonly [MK1, MK2, MK3], R>;
    merge<MK1 extends keyof MD, MK2 extends keyof MD, MK3 extends keyof MD, MK4 extends keyof MD, R>(
        models: readonly [MK1, MK2, MK3, MK4],
        resolver: (
            mv1: ModelDefinitionInfer<MD, MK1>,
            mv2: ModelDefinitionInfer<MD, MK2>,
            mv3: ModelDefinitionInfer<MD, MK3>,
            mv4: ModelDefinitionInfer<MD, MK4>,
        ) => R,
        options?: ViewDefinitionOptions,
    ): ViewMergeDefinition<MD, readonly [MK1, MK2, MK3, MK4], R>;
    merge<
        MK1 extends keyof MD,
        MK2 extends keyof MD,
        MK3 extends keyof MD,
        MK4 extends keyof MD,
        MK5 extends keyof MD,
        R,
    >(
        models: readonly [MK1, MK2, MK3, MK4, MK5],
        resolver: (
            mv1: ModelDefinitionInfer<MD, MK1>,
            mv2: ModelDefinitionInfer<MD, MK2>,
            mv3: ModelDefinitionInfer<MD, MK3>,
            mv4: ModelDefinitionInfer<MD, MK4>,
            mv5: ModelDefinitionInfer<MD, MK5>,
        ) => R,
        options?: ViewDefinitionOptions,
    ): ViewMergeDefinition<MD, readonly [MK1, MK2, MK3, MK4, MK5], R>;
}

// Call

export type ViewCall<R = unknown> = ComputedRef<R>;

// Store View

export type StoreView<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> = {
    readonly [K in keyof VD]: ViewCall<ViewDefinitionInfer<MD, VD[K]>>;
};
