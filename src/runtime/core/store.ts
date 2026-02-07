import { createStore as createSourceStore } from "@harlem/core";

import { runtimeConfig } from "../config";

import { createModelFactory } from "./layers/model";
import { createViewFactory } from "./layers/view";
import { createActionFactory } from "./layers/action";

import { initializeState, createMutations, createCommitter } from "./utils/model";
import { createView } from "./utils/view";
import { createAction } from "./utils/action";

import type { ComputedRef } from "vue";

import type { Model, ModelFactory, Mutations } from "./types/model";
import type { ViewDefinitions, ViewResult, ViewFactory } from "./types/view";
import {
    type Action,
    type ActionApiChain,
    type ActionCommitChain,
    type ActionCommitter,
    type ActionDefinition,
    type ActionDefinitions,
    type ActionFactory,
    type ActionHandleChain,
    DEFINITION,
} from "./types/action";

export type StoreModel<M extends Model> = ActionCommitter<M>;

export type StoreView<M extends Model, VD extends ViewDefinitions<M>> = {
    readonly [K in keyof VD]: ComputedRef<ViewResult<M, VD[K]>>;
};

export type StoreAction<M extends Model, V, AD extends Record<string, ActionDefinition<M, V, unknown>>> = {
    [K in keyof AD]: Action<V>;
};

export interface StoreConfig<
    M extends Model,
    VD extends ViewDefinitions<M>,
    _AD extends ActionDefinitions<M, StoreView<M, VD>>,
> {
    name: string;
    model: (factory: ModelFactory) => M;
    view: (factory: ViewFactory<M>) => VD;
    action: (
        factory: ActionFactory<M, StoreView<M, VD>>,
    ) => Record<
        string,
        | ActionApiChain<M, StoreView<M, VD>, any>
        | ActionHandleChain<M, StoreView<M, VD>, any>
        | ActionCommitChain<M, StoreView<M, VD>, any>
    >;
}

export interface Store<
    M extends Model,
    VD extends ViewDefinitions<M>,
    AD extends ActionDefinitions<M, StoreView<M, VD>>,
> {
    model: StoreModel<M>;
    view: StoreView<M, VD>;
    action: StoreAction<M, StoreView<M, VD>, AD>;
}

function createStoreModel<M extends Model>(mutations: Mutations<M>): StoreModel<M> {
    return createCommitter(mutations);
}

function createStoreView<M extends Model, VD extends ViewDefinitions<M>>(
    source: ReturnType<typeof createSourceStore>,
    viewDefinitions: VD,
): StoreView<M, VD> {
    return createView(source, viewDefinitions);
}

function createStoreAction<
    M extends Model,
    VD extends ViewDefinitions<M>,
    AD extends ActionDefinitions<M, StoreView<M, VD>>,
>(
    actionDefinitions: Record<string, any>,
    view: StoreView<M, VD>,
    mutations: Mutations<M>,
): StoreAction<M, StoreView<M, VD>, AD> {
    const actions = {} as Record<string, Action<StoreView<M, VD>>>;

    for (const [key, chain] of Object.entries(actionDefinitions)) {
        actions[key] = createAction((chain as any)[DEFINITION], view, mutations);
    }

    return actions as StoreAction<M, StoreView<M, VD>, AD>;
}

export function createStore<
    M extends Model,
    VD extends ViewDefinitions<M>,
    AD extends ActionDefinitions<M, StoreView<M, VD>>,
>(config: StoreConfig<M, VD, AD>): Store<M, VD, AD> {
    const modelFactory = createModelFactory(runtimeConfig.model);
    const viewFactory = createViewFactory<M>(runtimeConfig.view);
    const actionFactory = createActionFactory<M, StoreView<M, VD>>(runtimeConfig.action);

    const modelDefinitions = config.model(modelFactory);
    const viewDefinitions = config.view(viewFactory);
    const actionDefinitions = config.action(actionFactory);

    const state = initializeState(modelDefinitions);
    const source = createSourceStore(config.name, state);
    const mutations = createMutations(source, modelDefinitions);

    const model = createStoreModel(mutations);
    const view = createStoreView<M, VD>(source, viewDefinitions);
    const action = createStoreAction<M, VD, AD>(actionDefinitions, view, mutations);

    return {
        model,
        view,
        action,
    };
}
