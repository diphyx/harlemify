import { defineNuxtPlugin, useHead } from "#imports";
import { createVuePlugin } from "@harlem/core";
import { createServerSSRPlugin, createClientSSRPlugin, getBridgingScript } from "@harlem/plugin-ssr";

// @ts-expect-error - Generated at build time by addTemplate
import config from "#build/harlemify.config";

import { runtimeConfig } from "./config";

export default defineNuxtPlugin((nuxtApp) => {
    runtimeConfig.model = config.model;
    runtimeConfig.action = config.action;

    const plugins = [];

    if (import.meta.server) {
        plugins.push(createServerSSRPlugin());
    }

    if (import.meta.client && window["__harlemState"]) {
        plugins.push(createClientSSRPlugin());
    }

    const harlem = createVuePlugin({
        plugins,
    });

    nuxtApp.vueApp.use(harlem);

    useHead({
        script: [
            {
                innerHTML: getBridgingScript(),
            },
        ],
    });
});
