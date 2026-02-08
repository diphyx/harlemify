import { createConsola } from "consola";
import { createStore as createStoreSource } from "@harlem/core";

import { runtimeConfig } from "../config";

import { createModelFactory } from "./layers/model";
import { createViewFactory } from "./layers/view";
import { createActionFactory } from "./layers/action";

import { createStoreState, createStoreModel, createStoreView, createStoreAction } from "./utils/store";

import type { ModelDefinitions } from "./types/model";
import type { ViewDefinitions } from "./types/view";
import type { ActionDefinitions } from "./types/action";
import type { Store, StoreConfig } from "./types/store";

export function createStore<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
>(config: StoreConfig<MD, VD, AD>): Store<MD, VD, AD> {
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

    logger.info("Store created");

    return {
        model,
        view,
        action,
    };
}
