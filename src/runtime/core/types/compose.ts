import type { Ref } from "vue";

import type { ModelDefinitions, StoreModel } from "./model";
import type { ViewDefinitions, StoreView } from "./view";
import type { ActionDefinitions, StoreAction } from "./action";

// Compose Callback

export type ComposeCallback<A extends any[] = any[]> = (...args: A) => Promise<void> | void;

// Compose Definitions

export type ComposeDefinitions = Record<string, ComposeCallback<any[]>>;

// Compose Context

export interface ComposeContext<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
> {
    model: StoreModel<MD>;
    view: StoreView<MD, VD>;
    action: StoreAction<MD, VD, AD>;
}

// Compose Call

export type ComposeCall<A extends any[] = any[]> = {
    (...args: A): Promise<void>;
    active: Readonly<Ref<boolean>>;
};

// Store Compose

export type StoreCompose<CD extends ComposeDefinitions> = {
    [K in keyof CD]: CD[K] extends ComposeCallback<infer A> ? ComposeCall<A> : never;
};
