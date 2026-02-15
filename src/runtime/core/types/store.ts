import type { ModelDefinitions, ModelFactory, StoreModel } from "./model";
import type { ViewDefinitions, ViewFactory, StoreView } from "./view";
import type { ActionDefinitions, ActionFactory, StoreAction } from "./action";
import type { ComposeDefinitions, ComposeContext, StoreCompose } from "./compose";

// Store Config

export interface StoreConfig<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
    CD extends ComposeDefinitions = ComposeDefinitions,
> {
    name: string;
    model: (factory: ModelFactory) => MD;
    view: (factory: ViewFactory<MD>) => VD;
    action: (factory: ActionFactory<MD, VD>) => AD;
    compose?: (context: ComposeContext<MD, VD, AD>) => CD;
    lazy?: boolean;
}

// Store

export interface Store<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
    CD extends ComposeDefinitions = ComposeDefinitions,
> {
    model: StoreModel<MD>;
    view: StoreView<MD, VD>;
    action: StoreAction<MD, VD, AD>;
    compose: StoreCompose<CD>;
}
