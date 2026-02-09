import type { BaseDefinition } from "./base";
import type { Shape, ShapeType } from "./shape";

// Config

export interface RuntimeModelConfig {
    identifier?: string;
}

// Enums

export enum ModelKind {
    OBJECT = "object",
    ARRAY = "array",
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

// Definition Options

export interface ModelOneDefinitionOptions<S extends Shape> {
    identifier?: keyof S;
    default?: S;
}

export interface ModelManyDefinitionOptions<S extends Shape> {
    identifier?: keyof S;
    default?: S[];
}

// Definitions

export interface ModelOneDefinition<S extends Shape> extends BaseDefinition {
    shape: ShapeType<S>;
    kind: ModelKind.OBJECT;
    options?: ModelOneDefinitionOptions<S>;
}

export interface ModelManyDefinition<S extends Shape> extends BaseDefinition {
    shape: ShapeType<S>;
    kind: ModelKind.ARRAY;
    options?: ModelManyDefinitionOptions<S>;
}

export type ModelDefinition<S extends Shape> = ModelOneDefinition<S> | ModelManyDefinition<S>;

export type ModelDefinitions = Record<string, ModelDefinition<any>>;

// Infer

export type ModelDefinitionInfer<MD extends ModelDefinitions, K extends keyof MD> =
    MD[K] extends ModelOneDefinition<infer S> ? S | null : MD[K] extends ModelManyDefinition<infer S> ? S[] : never;

export type ModelDefinitionInferTuple<MD extends ModelDefinitions, K extends readonly (keyof MD)[]> = {
    [I in keyof K]: K[I] extends keyof MD ? ModelDefinitionInfer<MD, K[I]> : never;
};

export type ModelDefinitionsInfer<MD extends ModelDefinitions> = {
    [K in keyof MD]: ModelDefinitionInfer<MD, K>;
};

// Factory

export interface ModelFactory {
    one<S extends Shape>(shape: ShapeType<S>, options?: ModelOneDefinitionOptions<S>): ModelOneDefinition<S>;
    many<S extends Shape>(shape: ShapeType<S>, options?: ModelManyDefinitionOptions<S>): ModelManyDefinition<S>;
}

// Commit Options

export interface ModelOneCommitOptions {
    deep?: boolean;
}

export interface ModelManyCommitOptions {
    by?: string;
    prepend?: boolean;
    unique?: boolean;
    deep?: boolean;
}

// Commit

export interface ModelOneCommit<S extends Shape> {
    set: (value: S) => void;
    reset: () => void;
    patch: (value: Partial<S>, options?: ModelOneCommitOptions) => void;
}

export interface ModelManyCommit<S extends Shape> {
    set: (value: S[]) => void;
    reset: () => void;
    patch: (value: Partial<S> | Partial<S>[], options?: ModelManyCommitOptions) => void;
    remove: (value: S | S[], options?: ModelManyCommitOptions) => void;
    add: (value: S | S[], options?: ModelManyCommitOptions) => void;
}

// Call

export type ModelOneCall<S extends Shape> = ModelOneCommit<S> & {
    commit(mode: string, value?: unknown, options?: unknown): void;
    aliases(): Record<string, string>;
};

export type ModelManyCall<S extends Shape> = ModelManyCommit<S> & {
    commit(mode: string, value?: unknown, options?: unknown): void;
    aliases(): Record<string, string>;
};

export type ModelCall<S extends Shape> = ModelOneCall<S> | ModelManyCall<S>;

// Store Model

export type StoreModel<MD extends ModelDefinitions> = {
    [K in keyof MD]: MD[K] extends ModelOneDefinition<infer S>
        ? ModelOneCall<S>
        : MD[K] extends ModelManyDefinition<infer S>
          ? ModelManyCall<S>
          : never;
};
