import { createVuePlugin } from "@harlem/core";
import {
    createServerSSRPlugin,
    createClientSSRPlugin,
    getBridgingScript,
} from "@harlem/plugin-ssr";

export default defineNuxtPlugin((nuxtApp) => {
    const plugins = [];

    if (import.meta.server) {
        plugins.push(createServerSSRPlugin());
    }

    if (import.meta.client) {
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
