import type { BaseDefinition } from "./base";
import type { Shape, ShapeType } from "./shape";

// Config

export interface RuntimeModelConfig {
    identifier?: string;
}

// Enums

export enum ModelType {
    ONE = "one",
    MANY = "many",
}

export enum ModelManyKind {
    LIST = "list",
    RECORD = "record",
}

export enum ModelOneMode {
    SET = "set",
    RESET = "reset",
    PATCH = "patch",
}

export enum ModelManyMode {
    SET = "set",
    RESET = "reset",
    PATCH = "patch",
    REMOVE = "remove",
    ADD = "add",
}

export enum ModelSilent {
    PRE = "pre",
    POST = "post",
}

// Identifier

export type ModelDefaultIdentifier<S extends Shape> = "id" extends keyof S ? "id" : keyof S;

export type AtLeastOne<S extends Shape> = { [K in keyof S]: Pick<S, K> }[keyof S];

// Definition Options

export interface ModelDefinitionOptions {
    pre?: () => void;
    post?: () => void;
}

// Definitions

export interface ModelOneDefinition<S extends Shape> extends BaseDefinition {
    shape: ShapeType<S>;
    type: ModelType.ONE;
    default: () => S;
    options?: ModelDefinitionOptions;
}

export interface ModelManyDefinition<
    S extends Shape,
    I extends keyof S = ModelDefaultIdentifier<S>,
    T extends ModelManyKind = ModelManyKind.LIST,
> extends BaseDefinition {
    shape: ShapeType<S>;
    type: ModelType.MANY;
    kind: T;
    identifier: [T] extends [ModelManyKind.LIST] ? I : never;
    default: () => [T] extends [ModelManyKind.LIST] ? S[] : Record<string, S[]>;
    options?: ModelDefinitionOptions;
}

export type ModelDefinition<S extends Shape> = ModelOneDefinition<S> | ModelManyDefinition<S, any, any>;

export type ModelDefinitions = Record<string, ModelDefinition<any>>;

// Infer

export type ModelDefinitionInfer<MD extends ModelDefinitions, K extends keyof MD> =
    MD[K] extends ModelOneDefinition<infer S>
        ? S
        : MD[K] extends ModelManyDefinition<infer S, any, infer T>
          ? [T] extends [ModelManyKind.LIST]
              ? S[]
              : Record<string, S[]>
          : never;

export type ModelDefinitionInferTuple<MD extends ModelDefinitions, K extends readonly (keyof MD)[]> = {
    [I in keyof K]: K[I] extends keyof MD ? ModelDefinitionInfer<MD, K[I]> : never;
};

export type ModelDefinitionsInfer<MD extends ModelDefinitions> = {
    [K in keyof MD]: ModelDefinitionInfer<MD, K>;
};

// Factory

export interface ModelFactory {
    one<S extends Shape>(
        shape: ShapeType<S>,
        options?: ModelDefinitionOptions & {
            default?: () => S;
        },
    ): ModelOneDefinition<S>;
    many<S extends Shape, I extends keyof S = ModelDefaultIdentifier<S>, T extends ModelManyKind = ModelManyKind.LIST>(
        shape: ShapeType<S>,
        options?: ModelDefinitionOptions & {
            kind?: T;
            identifier?: [T] extends [ModelManyKind.LIST] ? I : never;
            default?: () => [T] extends [ModelManyKind.LIST] ? S[] : Record<string, S[]>;
        },
    ): ModelManyDefinition<S, I, T>;
}

// Commit Options

export interface ModelOneCommitOptions {
    deep?: boolean;
    silent?: true | ModelSilent;
}

export interface ModelManyCommitOptions {
    by?: string;
    prepend?: boolean;
    unique?: boolean;
    deep?: boolean;
    silent?: true | ModelSilent;
}

// Commit

export interface ModelOneCommit<S extends Shape> {
    set: (payload: S, options?: Pick<ModelOneCommitOptions, "silent">) => void;
    reset: (options?: Pick<ModelOneCommitOptions, "silent">) => void;
    patch: (payload: Partial<S>, options?: Pick<ModelOneCommitOptions, "deep" | "silent">) => void;
}

export interface ModelManyListCommit<S extends Shape, I extends keyof S = ModelDefaultIdentifier<S>> {
    set: (payload: S[], options?: Pick<ModelManyCommitOptions, "silent">) => void;
    reset: (options?: Pick<ModelManyCommitOptions, "silent">) => void;
    patch: (
        payload: Partial<S> | Partial<S>[],
        options?: Pick<ModelManyCommitOptions, "by" | "deep" | "silent">,
    ) => void;
    remove: (
        payload: Pick<S, I> | Pick<S, I>[] | AtLeastOne<S> | AtLeastOne<S>[],
        options?: Pick<ModelManyCommitOptions, "silent">,
    ) => void;
    add: (payload: S | S[], options?: Pick<ModelManyCommitOptions, "by" | "prepend" | "unique" | "silent">) => void;
}

export interface ModelManyRecordCommit<S extends Shape> {
    set: (payload: Record<string, S[]>, options?: Pick<ModelOneCommitOptions, "silent">) => void;
    reset: (options?: Pick<ModelOneCommitOptions, "silent">) => void;
    patch: (payload: Record<string, S[]>, options?: Pick<ModelOneCommitOptions, "deep" | "silent">) => void;
    remove: (payload: string, options?: Pick<ModelOneCommitOptions, "silent">) => void;
    add: (payload: { key: string; value: S[] }, options?: Pick<ModelOneCommitOptions, "silent">) => void;
}

export type ModelManyCommit<
    S extends Shape,
    I extends keyof S = ModelDefaultIdentifier<S>,
    T extends ModelManyKind = ModelManyKind.LIST,
> = [T] extends [ModelManyKind.LIST] ? ModelManyListCommit<S, I> : ModelManyRecordCommit<S>;

// Call

export type ModelOneCall<S extends Shape> = ModelOneCommit<S> & {
    commit(mode: string, value?: unknown, options?: unknown): void;
    aliases(): Record<string, string>;
};

export type ModelManyCall<
    S extends Shape,
    I extends keyof S = ModelDefaultIdentifier<S>,
    T extends ModelManyKind = ModelManyKind.LIST,
> = ModelManyCommit<S, I, T> & {
    commit(mode: string, value?: unknown, options?: unknown): void;
    aliases(): Record<string, string>;
};

export type ModelCall<S extends Shape> = ModelOneCall<S> | ModelManyCall<S, any, any>;

// Store Model

export type StoreModel<MD extends ModelDefinitions> = {
    [K in keyof MD]: MD[K] extends ModelOneDefinition<infer S>
        ? ModelOneCall<S>
        : MD[K] extends ModelManyDefinition<infer S, infer I, infer T>
          ? ModelManyCall<S, I, T>
          : never;
};
