import { createConsola } from "consola";
import { createStore as createStoreSource } from "@harlem/core";

import { runtimeConfig } from "../config";

import { createModelFactory } from "./layers/model";
import { createViewFactory } from "./layers/view";
import { createActionFactory } from "./layers/action";

import { createStoreState, createStoreModel, createStoreView, createStoreAction } from "./utils/store";
import { createStoreCompose } from "./utils/compose";

import type { ModelDefinitions } from "./types/model";
import type { ViewDefinitions } from "./types/view";
import type { ActionDefinitions } from "./types/action";
import type { ComposeDefinitions } from "./types/compose";
import type { Store, StoreConfig } from "./types/store";

export function createStore<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
    CD extends ComposeDefinitions = ComposeDefinitions,
>(config: StoreConfig<MD, VD, AD, CD>): Store<MD, VD, AD, CD> {
    function init(): Store<MD, VD, AD, CD> {
        const logger = createConsola({
            level: runtimeConfig.logger,
            defaults: {
                tag: `harlemify:${config.name}`,
            },
        });

        logger.info("Creating store");

        const modelFactory = createModelFactory(runtimeConfig.model, logger);
        const viewFactory = createViewFactory<MD>(runtimeConfig.view, logger);
        const actionFactory = createActionFactory<MD, VD>(runtimeConfig.action, logger);

        const modelDefinitions = config.model(modelFactory);
        const viewDefinitions = config.view(viewFactory);
        const actionDefinitions = config.action(actionFactory);

        const state = createStoreState(modelDefinitions);
        const source = createStoreSource(config.name, state);

        const model = createStoreModel(modelDefinitions, source);
        const view = createStoreView<MD, VD>(viewDefinitions, source);
        const action = createStoreAction<MD, VD, AD>(actionDefinitions, model, view);

        const compose = createStoreCompose(config.compose, { model, view, action }, logger);

        logger.info("Store created");

        return {
            model,
            view,
            action,
            compose,
        } as Store<MD, VD, AD, CD>;
    }

    if (config.lazy) {
        let instance: Store<MD, VD, AD, CD> | undefined;

        return new Proxy({} as Store<MD, VD, AD, CD>, {
            get(_, prop: string) {
                if (!instance) {
                    instance = init();
                }

                return instance[prop as keyof Store<MD, VD, AD, CD>];
            },
        });
    }

    return init();
}
