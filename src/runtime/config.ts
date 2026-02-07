// @ts-expect-error - Generated at build time by addTemplate
import config from "#build/harlemify.config";

import type { RuntimeModelConfig } from "./core/types/model";
import type { RuntimeViewConfig } from "./core/types/view";
import type { RuntimeActionConfig } from "./core/types/action";

export type RuntimeConfig = {
    model?: RuntimeModelConfig;
    view?: RuntimeViewConfig;
    action?: RuntimeActionConfig;
};

export const runtimeConfig: RuntimeConfig = {
    model: config.model ?? {},
    view: config.view ?? {},
    action: config.action ?? {},
};
