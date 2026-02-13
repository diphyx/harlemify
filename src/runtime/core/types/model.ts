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

export interface ModelOneDefinitionOptions<S extends Shape> {
    identifier?: keyof S;
    default?: S;
    pre?: () => void;
    post?: () => void;
}

export type ModelManyDefinitionOptions<
    S extends Shape,
    I extends keyof S = ModelDefaultIdentifier<S>,
    T extends ModelManyKind = ModelManyKind.LIST,
> = {
    kind?: T;
    default?: [T] extends [ModelManyKind.LIST] ? S[] : Record<string, S[]>;
    pre?: () => void;
    post?: () => void;
} & ([T] extends [ModelManyKind.LIST] ? { identifier?: I } : {});

// Definitions

export interface ModelOneDefinition<S extends Shape> extends BaseDefinition {
    shape: ShapeType<S>;
    type: ModelType.ONE;
    options?: ModelOneDefinitionOptions<S>;
}

export interface ModelManyDefinition<
    S extends Shape,
    I extends keyof S = ModelDefaultIdentifier<S>,
    T extends ModelManyKind = ModelManyKind.LIST,
> extends BaseDefinition {
    shape: ShapeType<S>;
    type: ModelType.MANY;
    options?: ModelManyDefinitionOptions<S, I, T>;
}

export type ModelDefinition<S extends Shape> = ModelOneDefinition<S> | ModelManyDefinition<S, any, any>;

export type ModelDefinitions = Record<string, ModelDefinition<any>>;

// Infer

export type ModelDefinitionInfer<MD extends ModelDefinitions, K extends keyof MD> =
    MD[K] extends ModelOneDefinition<infer S>
        ? S | null
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
    one<S extends Shape>(shape: ShapeType<S>, options?: ModelOneDefinitionOptions<S>): ModelOneDefinition<S>;
    many<S extends Shape, I extends keyof S = ModelDefaultIdentifier<S>, T extends ModelManyKind = ModelManyKind.LIST>(
        shape: ShapeType<S>,
        options?: ModelManyDefinitionOptions<S, I, T>,
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
    set: (value: S, options?: ModelOneCommitOptions) => void;
    reset: (options?: ModelOneCommitOptions) => void;
    patch: (value: Partial<S>, options?: ModelOneCommitOptions) => void;
}

export interface ModelManyListCommit<S extends Shape, I extends keyof S = ModelDefaultIdentifier<S>> {
    set: (value: S[], options?: ModelManyCommitOptions) => void;
    reset: (options?: ModelManyCommitOptions) => void;
    patch: (value: Partial<S> | Partial<S>[], options?: ModelManyCommitOptions) => void;
    remove: (
        value: Pick<S, I> | Pick<S, I>[] | AtLeastOne<S> | AtLeastOne<S>[],
        options?: ModelManyCommitOptions,
    ) => void;
    add: (value: S | S[], options?: ModelManyCommitOptions) => void;
}

export interface ModelManyRecordCommit<S extends Shape> {
    set: (value: Record<string, S[]>, options?: ModelOneCommitOptions) => void;
    reset: (options?: ModelOneCommitOptions) => void;
    patch: (value: Record<string, S[]>, options?: ModelOneCommitOptions) => void;
    remove: (key: string, options?: ModelOneCommitOptions) => void;
    add: (key: string, value: S[], options?: ModelOneCommitOptions) => void;
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
