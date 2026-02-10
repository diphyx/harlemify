import type { ComputedRef, DeepReadonly, MaybeRefOrGetter, Ref } from "vue";

import type { BaseDefinition } from "./base";
import type {
    ModelDefinitions,
    ModelDefinitionInfer,
    ModelOneCommitOptions,
    ModelManyCommitOptions,
    StoreModel,
} from "./model";
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

export enum ActionType {
    API = "api",
    HANDLER = "handler",
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

export interface ActionApiCommit<MD extends ModelDefinitions, K extends keyof MD = keyof MD> {
    model: K;
    mode: ModelOneMode | ModelManyMode;
    value?: (data: unknown) => unknown;
    options?: ModelOneCommitOptions | ModelManyCommitOptions;
}

// Api Definition

export interface ActionApiDefinition<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    K extends keyof MD = keyof MD,
> extends BaseDefinition {
    request: ActionApiRequest<MD, VD>;
    commit?: ActionApiCommit<MD, K>;
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
    <K extends keyof MD>(
        request: ActionApiRequest<MD, VD>,
        commit: ActionApiCommit<MD, K>,
    ): ActionApiDefinition<MD, VD, K>;
    (request: ActionApiRequest<MD, VD>): ActionApiDefinition<MD, VD>;
    get<K extends keyof MD>(
        request: ActionApiRequestShortcut<MD, VD>,
        commit: ActionApiCommit<MD, K>,
    ): ActionApiDefinition<MD, VD, K>;
    get(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD>;
    head<K extends keyof MD>(
        request: ActionApiRequestShortcut<MD, VD>,
        commit: ActionApiCommit<MD, K>,
    ): ActionApiDefinition<MD, VD, K>;
    head(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD>;
    post<K extends keyof MD>(
        request: ActionApiRequestShortcut<MD, VD>,
        commit: ActionApiCommit<MD, K>,
    ): ActionApiDefinition<MD, VD, K>;
    post(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD>;
    put<K extends keyof MD>(
        request: ActionApiRequestShortcut<MD, VD>,
        commit: ActionApiCommit<MD, K>,
    ): ActionApiDefinition<MD, VD, K>;
    put(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD>;
    patch<K extends keyof MD>(
        request: ActionApiRequestShortcut<MD, VD>,
        commit: ActionApiCommit<MD, K>,
    ): ActionApiDefinition<MD, VD, K>;
    patch(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD>;
    delete<K extends keyof MD>(
        request: ActionApiRequestShortcut<MD, VD>,
        commit: ActionApiCommit<MD, K>,
    ): ActionApiDefinition<MD, VD, K>;
    delete(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD>;
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
    readonly actionType: ActionType.API;
    (options?: ActionApiCallOptions): Promise<T>;
}

export interface ActionHandlerCall<P = unknown, T = void> extends ActionCallBase {
    readonly actionType: ActionType.HANDLER;
    (options?: ActionHandlerCallOptions<P>): Promise<T>;
}

export type ActionCall<T = void> = ActionApiCall<T> | ActionHandlerCall<any, T>;

// Store Action

export type StoreAction<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
> = {
    [K in keyof AD]: AD[K] extends ActionApiDefinition<MD, VD, infer MK>
        ? MK extends keyof MD
            ? ActionApiCall<ModelDefinitionInfer<MD, MK>>
            : ActionApiCall
        : AD[K] extends ActionHandlerDefinition<MD, VD, infer P, infer R>
          ? ActionHandlerCall<P, R>
          : never;
};
