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
    hooks?: ActionHooks;
}

export type ActionApiRequestShortcut<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> = Omit<
    ActionApiRequest<MD, VD>,
    "method"
>;

// Api Commit

export interface ActionApiCommitContext<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> {
    request: Readonly<{
        url: string;
        method: ActionApiMethod;
        headers: Readonly<Record<string, string>>;
        query: Readonly<Record<string, unknown>>;
        body: unknown;
    }>;
    params: Readonly<Record<string, string | number>>;
    view: DeepReadonly<StoreView<MD, VD>>;
}

export interface ActionApiCommit<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    K extends keyof MD = keyof MD,
> {
    model: K;
    mode: ModelOneMode | ModelManyMode;
    transform?: (data: unknown, context: ActionApiCommitContext<MD, VD>) => unknown;
    options?: ModelOneCommitOptions | ModelManyCommitOptions;
}

// Api Commit Return

export type ActionApiCommitReturn<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    C extends readonly ActionApiCommit<MD, VD>[],
> = C extends readonly []
    ? unknown
    : {
          [E in C[number] as E["model"] & string]: E["model"] extends keyof MD
              ? ModelDefinitionInfer<MD, E["model"]>
              : never;
      };

// Api Definition

export interface ActionApiDefinition<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    C extends readonly ActionApiCommit<MD, VD>[] = readonly ActionApiCommit<MD, VD>[],
> extends BaseDefinition {
    request: ActionApiRequest<MD, VD>;
    commits: C;
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
> = (context: { model: StoreModel<MD>; view: StoreView<MD, VD>; payload: P }) => Promise<R> | R;

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
    | ActionApiDefinition<MD, VD, any>
    | ActionHandlerDefinition<MD, VD, any, any>;

export type ActionDefinitions<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> = Record<
    string,
    ActionDefinition<MD, VD>
>;

// Factory

type ActionApiCommitTuple<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> = readonly [
    ActionApiCommit<MD, VD, keyof MD>,
    ...ActionApiCommit<MD, VD, keyof MD>[],
];

export interface ActionApiFactory<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> {
    (request: ActionApiRequest<MD, VD>): ActionApiDefinition<MD, VD, []>;
    <const C extends ActionApiCommitTuple<MD, VD>>(
        request: ActionApiRequest<MD, VD>,
        ...commits: C
    ): ActionApiDefinition<MD, VD, C>;
    get(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD, []>;
    get<const C extends ActionApiCommitTuple<MD, VD>>(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: C
    ): ActionApiDefinition<MD, VD, C>;
    head(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD, []>;
    head<const C extends ActionApiCommitTuple<MD, VD>>(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: C
    ): ActionApiDefinition<MD, VD, C>;
    post(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD, []>;
    post<const C extends ActionApiCommitTuple<MD, VD>>(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: C
    ): ActionApiDefinition<MD, VD, C>;
    put(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD, []>;
    put<const C extends ActionApiCommitTuple<MD, VD>>(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: C
    ): ActionApiDefinition<MD, VD, C>;
    patch(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD, []>;
    patch<const C extends ActionApiCommitTuple<MD, VD>>(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: C
    ): ActionApiDefinition<MD, VD, C>;
    delete(request: ActionApiRequestShortcut<MD, VD>): ActionApiDefinition<MD, VD, []>;
    delete<const C extends ActionApiCommitTuple<MD, VD>>(
        request: ActionApiRequestShortcut<MD, VD>,
        ...commits: C
    ): ActionApiDefinition<MD, VD, C>;
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

// Api Hooks

export interface ActionHookRequest extends ActionResolvedApi {
    error?: Error;
}

export interface ActionHookResponse {
    status: number;
    headers: Record<string, string>;
    data: unknown;
}

export interface ActionHookPreContext {
    request: Readonly<ActionResolvedApi>;
}

export interface ActionHookPostContext {
    request: Readonly<ActionHookRequest>;
    response?: Readonly<ActionHookResponse>;
}

export interface ActionHooks {
    pre?: (context: ActionHookPreContext) => void | Promise<void>;
    post?: (context: ActionHookPostContext) => void | Promise<void>;
}

export interface ActionCallTransformerOptions {
    request?: (api: ActionResolvedApi) => ActionResolvedApi;
    response?: (data: unknown) => unknown;
}

export interface ActionCallCommitOptions {
    mode?: ModelOneMode | ModelManyMode | Record<string, ModelOneMode | ModelManyMode>;
    options?:
        | ModelOneCommitOptions
        | ModelManyCommitOptions
        | Record<string, ModelOneCommitOptions | ModelManyCommitOptions>;
}

export interface ActionApiCallOptions extends ActionCallBaseOptions {
    params?: Record<string, string | number>;
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
    [K in keyof AD]: AD[K] extends ActionApiDefinition<MD, VD, infer C>
        ? C extends readonly ActionApiCommit<MD, VD>[]
            ? ActionApiCall<ActionApiCommitReturn<MD, VD, C>>
            : ActionApiCall
        : AD[K] extends ActionHandlerDefinition<MD, VD, infer P, infer R>
          ? ActionHandlerCall<P, R>
          : never;
};
