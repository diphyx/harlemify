import type { ConsolaInstance } from "consola";

import type { Shape, ShapeType } from "./shape";

export interface RuntimeModelConfig {
    identifier?: string;
}

export enum ModelKind {
    OBJECT = "object",
    ARRAY = "array",
}

export interface ModelOneOptions<S extends Shape> {
    identifier?: keyof S;
    default?: S;
}

export interface ModelManyOptions<S extends Shape> {
    identifier?: keyof S;
    default?: S[];
}

export interface ModelOneDefinition<S extends Shape> {
    shape: ShapeType<S>;
    kind: ModelKind.OBJECT;
    options?: ModelOneOptions<S>;
    logger?: ConsolaInstance;
}

export interface ModelManyDefinition<S extends Shape> {
    shape: ShapeType<S>;
    kind: ModelKind.ARRAY;
    options?: ModelManyOptions<S>;
    logger?: ConsolaInstance;
}

export type ModelDefinition<S extends Shape> = ModelOneDefinition<S> | ModelManyDefinition<S>;

export type Model = Record<string, ModelDefinition<any>>;

export type ModelInstance<M extends Model, K extends keyof M> =
    M[K] extends ModelOneDefinition<infer S> ? S | null : M[K] extends ModelManyDefinition<infer S> ? S[] : never;

export type ModelShape<M extends Model, K extends keyof M> = M[K] extends ModelDefinition<infer S> ? S : never;

export type ModelOneKey<M extends Model> = {
    [K in keyof M]: M[K] extends ModelOneDefinition<infer _S> ? K : never;
}[keyof M];

export type ModelManyKey<M extends Model> = {
    [K in keyof M]: M[K] extends ModelManyDefinition<infer _S> ? K : never;
}[keyof M];

export type ModelStateOf<M extends Model> = {
    [K in keyof M]: ModelInstance<M, K>;
};

export interface ModelFactory {
    one<S extends Shape>(shape: ShapeType<S>, options?: ModelOneOptions<S>): ModelOneDefinition<S>;
    many<S extends Shape>(shape: ShapeType<S>, options?: ModelManyOptions<S>): ModelManyDefinition<S>;
}

export interface MutationsOneOptions {
    deep?: boolean;
}

export interface MutationsManyOptions {
    by?: string;
    prepend?: boolean;
    unique?: boolean;
    deep?: boolean;
}

export interface MutationsOne<S extends Shape> {
    set: (value: S) => void;
    reset: () => void;
    patch: (value: Partial<S>, options?: MutationsOneOptions) => void;
}

export interface MutationsMany<S extends Shape> {
    set: (value: S[]) => void;
    reset: () => void;
    patch: (value: Partial<S> | Partial<S>[], options?: MutationsManyOptions) => void;
    remove: (value: S | S[], options?: MutationsManyOptions) => void;
    add: (value: S | S[], options?: MutationsManyOptions) => void;
}

export type Mutations<M extends Model> = {
    [K in keyof M]: M[K] extends ModelOneDefinition<infer S>
        ? MutationsOne<S>
        : M[K] extends ModelManyDefinition<infer S>
          ? MutationsMany<S>
          : never;
};
