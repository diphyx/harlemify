import type { ComputedRef, DeepReadonly, MaybeRefOrGetter, Ref } from "vue";

import type { BaseDefinition } from "./base";
import type { ModelDefinitions, ModelOneCommitOptions, ModelManyCommitOptions, StoreModel } from "./model";
import { ModelOneMode, ModelManyMode } from "./model";
import type { ViewDefinitions, StoreView } from "./view";

// Config

export interface RuntimeActionConfig {
    endpoint?: string;
    headers?: Record<string, string>;
    query?: Record<string, unknown>;
    timeout?: number;
    concurrent?: ActionConcurrent;
}

// Enums

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
    HEAD = "HEAD",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE",
}

// Api Request

export type ActionApiRequestValue<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>, T> =
    | MaybeRefOrGetter<T>
    | ((view: DeepReadonly<StoreView<MD, VD>>) => T);

export interface ActionApiRequest<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> {
    endpoint?: string;
    url: ActionApiRequestValue<MD, VD, string>;
    method: ActionApiRequestValue<MD, VD, ActionApiMethod>;
    headers?: ActionApiRequestValue<MD, VD, Record<string, string>>;
    query?: ActionApiRequestValue<MD, VD, Record<string, unknown>>;
    body?: ActionApiRequestValue<MD, VD, unknown>;
    timeout?: ActionApiRequestValue<MD, VD, number>;
    concurrent?: ActionConcurrent;
}

export type ActionApiRequestShortcut<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> = Omit<
    ActionApiRequest<MD, VD>,
    "method"
>;

// Api Commit

export interface ActionApiCommit<MD extends ModelDefinitions> {
    model: keyof MD;
    mode: ModelOneMode | ModelManyMode;
    value?: (data: unknown) => unknown;
    options?: ModelOneCommitOptions | ModelManyCommitOptions;
}

// Api Definition

export interface ActionApiDefinition<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
> extends BaseDefinition {
    request: ActionApiRequest<MD, VD>;
    commit?: ActionApiCommit<MD>;
}

// Handler Options

export interface ActionHandlerOptions<P = unknown> {
    payload?: P;
    concurrent?: ActionConcurrent;
}

// Handler Definition

export type ActionHandlerCallback<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    P = unknown,
    R = void,
> = (context: { model: StoreModel<MD>; view: StoreView<MD, VD>; payload: P }) => Promise<R>;

export interface ActionHandlerDefinition<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    P = unknown,
    R = void,
> extends BaseDefinition {
    callback: ActionHandlerCallback<MD, VD, P, R>;
    options?: ActionHandlerOptions<P>;
}

// Action Definition

export type ActionDefinition<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> =
    | ActionApiDefinition<MD, VD>
    | ActionHandlerDefinition<MD, VD, any, any>;

export type ActionDefinitions<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> = Record<
    string,
    ActionDefinition<MD, VD>
>;

// Factory

export interface ActionApiFactory<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> {
    (request: ActionApiRequest<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    get(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    head(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    post(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    put(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    patch(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    delete(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
}

export interface ActionHandlerFactory<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> {
    <P = unknown, R = void>(
        callback: ActionHandlerCallback<MD, VD, P, R>,
        options?: ActionHandlerOptions<P>,
    ): ActionHandlerDefinition<MD, VD, P, R>;
}

export interface ActionFactory<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> {
    api: ActionApiFactory<MD, VD>;
    handler: ActionHandlerFactory<MD, VD>;
}

// Call Options

export interface ActionCallBindOptions {
    status?: Ref<ActionStatus>;
    error?: Ref<Error | null>;
}

export interface ActionCallBaseOptions {
    concurrent?: ActionConcurrent;
    bind?: ActionCallBindOptions;
}

// Api Call Options

export interface ActionResolvedApi {
    url: string;
    method: ActionApiMethod;
    headers: Record<string, string>;
    query: Record<string, unknown>;
    body?: Record<string, unknown> | BodyInit | null;
    timeout?: number;
    signal: AbortSignal;
}

export interface ActionCallTransformerOptions {
    request?: (api: ActionResolvedApi) => ActionResolvedApi;
    response?: (data: unknown) => unknown;
}

export interface ActionCallCommitOptions {
    mode?: ModelOneMode | ModelManyMode;
}

export interface ActionApiCallOptions extends ActionCallBaseOptions {
    params?: Record<string, string>;
    headers?: Record<string, string>;
    query?: Record<string, unknown>;
    body?: unknown;
    timeout?: number;
    signal?: AbortSignal;
    transformer?: ActionCallTransformerOptions;
    commit?: ActionCallCommitOptions;
}

// Handler Call Options

export interface ActionResolvedHandler<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>, P = unknown> {
    model: StoreModel<MD>;
    view: StoreView<MD, VD>;
    payload: P;
}

export interface ActionHandlerCallOptions<P = unknown> extends ActionCallBaseOptions {
    payload?: P;
}

// Action Call Options

export type ActionCallOptions = ActionApiCallOptions | ActionHandlerCallOptions;

// Call

export interface ActionCallBase {
    readonly error: Readonly<Ref<Error | null>>;
    readonly status: Readonly<Ref<ActionStatus>>;
    readonly loading: ComputedRef<boolean>;
    reset: () => void;
}

export interface ActionApiCall<T = void> extends ActionCallBase {
    (options?: ActionApiCallOptions): Promise<T>;
}

export interface ActionHandlerCall<P = unknown, T = void> extends ActionCallBase {
    (options?: ActionHandlerCallOptions<P>): Promise<T>;
}

export type ActionCall<T = void> = ActionApiCall<T> | ActionHandlerCall<any, T>;

// Store Action

export type StoreAction<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
> = {
    [K in keyof AD]: AD[K] extends ActionApiDefinition<MD, VD>
        ? ActionApiCall
        : AD[K] extends ActionHandlerDefinition<MD, VD, infer P, infer R>
          ? ActionHandlerCall<P, R>
          : never;
};
