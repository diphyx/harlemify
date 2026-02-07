import type { ComputedRef, DeepReadonly, MaybeRefOrGetter, Ref } from "vue";

import type { Model, ModelShape, MutationsOneOptions, MutationsManyOptions } from "./model";

export const DEFINITION = Symbol("definition");

export enum ActionOneMode {
    SET = "set",
    RESET = "reset",
    PATCH = "patch",
}

export enum ActionManyMode {
    SET = "set",
    RESET = "reset",
    PATCH = "patch",
    REMOVE = "remove",
    ADD = "add",
}

export enum ActionStatus {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    ERROR = "error",
}

export enum ActionConcurrent {
    BLOCK = "block",
    SKIP = "skip",
    CANCEL = "cancel",
    ALLOW = "allow",
}

export enum ActionApiMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE",
}

export interface ActionApiError extends Error {
    name: "ActionApiError";
    status?: number;
    statusText?: string;
    data?: unknown;
}

export interface ActionHandleError extends Error {
    name: "ActionHandleError";
    cause: Error;
}

export interface ActionCommitError extends Error {
    name: "ActionCommitError";
    cause: Error;
}

export interface ActionConcurrentError extends Error {
    name: "ActionConcurrentError";
}

export type ActionError = ActionApiError | ActionHandleError | ActionCommitError | ActionConcurrentError;

export type ActionApiValue<V, T> = MaybeRefOrGetter<T> | ((view: DeepReadonly<V>) => T);

export interface ActionApiDefinition<V> {
    url: ActionApiValue<V, string>;
    method: ActionApiMethod;
    headers?: ActionApiValue<V, Record<string, string>>;
    query?: ActionApiValue<V, Record<string, unknown>>;
    body?: ActionApiValue<V, unknown>;
    timeout?: number;
}

export type ActionCommitValue<M extends Model, K extends keyof M, Mode> = Mode extends ActionOneMode.SET
    ? ModelShape<M, K>
    : Mode extends ActionOneMode.PATCH
      ? Partial<ModelShape<M, K>>
      : Mode extends ActionOneMode.RESET
        ? never
        : Mode extends ActionManyMode.SET
          ? ModelShape<M, K>[]
          : Mode extends ActionManyMode.PATCH
            ? Partial<ModelShape<M, K>> | Partial<ModelShape<M, K>>[]
            : Mode extends ActionManyMode.REMOVE
              ? ModelShape<M, K> | ModelShape<M, K>[]
              : Mode extends ActionManyMode.ADD
                ? ModelShape<M, K> | ModelShape<M, K>[]
                : Mode extends ActionManyMode.RESET
                  ? never
                  : never;

export type ActionCommitter<M extends Model> = {
    <K extends keyof M, Mode extends ActionOneMode>(
        model: K,
        mode: Mode,
        ...args: Mode extends ActionOneMode.RESET
            ? []
            : [value: ActionCommitValue<M, K, Mode>, options?: MutationsOneOptions]
    ): void;
    <K extends keyof M, Mode extends ActionManyMode>(
        model: K,
        mode: Mode,
        ...args: Mode extends ActionManyMode.RESET
            ? []
            : [value: ActionCommitValue<M, K, Mode>, options?: MutationsManyOptions]
    ): void;
};

export interface ActionHandleContext<M extends Model, V, ApiResponse = unknown> {
    api: () => Promise<ApiResponse>;
    view: DeepReadonly<V>;
    commit: ActionCommitter<M>;
}

export interface ActionHandleContextNoApi<M extends Model, V> {
    view: DeepReadonly<V>;
    commit: ActionCommitter<M>;
}

export type ActionHandleCallback<M extends Model, V, R = void, ApiResponse = unknown> = (
    context: ActionHandleContext<M, V, ApiResponse>,
) => Promise<R>;

export type ActionHandleCallbackNoApi<M extends Model, V, R = void> = (
    context: ActionHandleContextNoApi<M, V>,
) => Promise<R>;

export type ActionHandleResolver<R = void> = (...args: unknown[]) => Promise<R>;

export interface ActionDefinition<M extends Model, V, R = void> {
    api?: ActionApiDefinition<V>;
    handle?: ActionHandleCallback<M, V, R, unknown> | ActionHandleCallbackNoApi<M, V, R>;
    commit?: {
        model: keyof M;
        mode: ActionOneMode | ActionManyMode;
        value?: unknown;
        options?: MutationsOneOptions | MutationsManyOptions;
    };
}

export type ActionDefinitions<M extends Model, V> = Record<string, ActionDefinition<M, V, unknown>>;

export interface ActionCommitMethod<M extends Model, V, R> {
    <K extends keyof M, Mode extends ActionOneMode>(
        model: K,
        mode: Mode,
        ...args: Mode extends ActionOneMode.RESET
            ? []
            : [value?: ActionCommitValue<M, K, Mode>, options?: MutationsOneOptions]
    ): ActionCommitChain<M, V, R>;
    <K extends keyof M, Mode extends ActionManyMode>(
        model: K,
        mode: Mode,
        ...args: Mode extends ActionManyMode.RESET
            ? []
            : [value?: ActionCommitValue<M, K, Mode>, options?: MutationsManyOptions]
    ): ActionCommitChain<M, V, R>;
}

export interface ActionApiChain<M extends Model, V, ApiResponse> {
    handle<R>(callback: ActionHandleCallback<M, V, R, ApiResponse>): ActionHandleChain<M, V, R>;
    commit: ActionCommitMethod<M, V, ApiResponse>;
    readonly [DEFINITION]: ActionDefinition<M, V, ApiResponse>;
}

export interface ActionHandleChain<M extends Model, V, R> {
    commit: ActionCommitMethod<M, V, R>;
    readonly [DEFINITION]: ActionDefinition<M, V, R>;
}

export interface ActionCommitChain<M extends Model, V, R> {
    readonly [DEFINITION]: ActionDefinition<M, V, R>;
}

export type ActionApiShortcutDefinition<V> = Omit<ActionApiDefinition<V>, "method">;

export interface ActionApiFactory<M extends Model, V> {
    <A>(definition: ActionApiDefinition<V>): ActionApiChain<M, V, A>;
    get<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A>;
    post<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A>;
    put<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A>;
    patch<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A>;
    delete<A>(definition: ActionApiShortcutDefinition<V>): ActionApiChain<M, V, A>;
}

export interface ActionFactory<M extends Model, V> {
    api: ActionApiFactory<M, V>;
    handle<R>(callback: ActionHandleCallbackNoApi<M, V, R>): ActionHandleChain<M, V, R>;
    commit: ActionCommitMethod<M, V, void>;
}

export interface ActionCallBind {
    status?: Ref<ActionStatus>;
    error?: Ref<ActionError | null>;
}

export interface ActionCallCommit {
    mode?: ActionOneMode | ActionManyMode;
}

export interface ActionCallPayload<V, T = unknown, R = T> {
    headers?: Record<string, string> | ((view: DeepReadonly<V>) => Record<string, string>);
    query?: Record<string, unknown> | ((view: DeepReadonly<V>) => Record<string, unknown>);
    body?: unknown | ((view: DeepReadonly<V>) => unknown);
    timeout?: number;
    signal?: AbortSignal;
    transformer?: (response: T) => R;
    concurrent?: ActionConcurrent;
    bind?: ActionCallBind;
    commit?: ActionCallCommit;
}

export interface Action<V, T = void> {
    (payload?: ActionCallPayload<V, T>): Promise<T>;
    <R>(payload: ActionCallPayload<V, T, R>): Promise<R>;
    readonly loading: ComputedRef<boolean>;
    readonly status: Readonly<Ref<ActionStatus>>;
    readonly error: Readonly<Ref<ActionError | null>>;
    readonly data: DeepReadonly<T> | null;
    reset: () => void;
}
