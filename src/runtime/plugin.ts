import { createVuePlugin } from "@harlem/core";
import { defineNuxtPlugin } from "#imports";

import { createServerSideRenderingPlugin } from "./plugins/ssr";

export default defineNuxtPlugin((nuxtApp) => {
    const harlem = createVuePlugin({
        plugins: [createServerSideRenderingPlugin(nuxtApp)],
    });

    nuxtApp.vueApp.use(harlem);
});
