import { defineNuxtModule, addPlugin, addTemplate, createResolver, addImportsDir } from "@nuxt/kit";

import type { SharedConfig } from "./runtime";

export default defineNuxtModule<SharedConfig>({
    meta: {
        name: "harlemify",
        configKey: "harlemify",
        compatibility: {
            nuxt: ">=3.0.0 || >=4.0.0",
        },
    },
    defaults: {
        api: {
            headers: {},
            query: {},
            adapter: {},
        },
    },
    setup(options, nuxt) {
        const { resolve } = createResolver(import.meta.url);

        addTemplate({
            write: true,
            filename: "harlemify.config.mjs",
            getContents() {
                return `export default ${JSON.stringify(options)}`;
            },
        });

        addPlugin(resolve("./runtime", "plugin"));

        addImportsDir(resolve("./runtime", "core"));
        addImportsDir(resolve("./runtime", "composables"));
        addImportsDir(resolve("./runtime", "utils"));

        nuxt.options.build.transpile.push(/@harlem\//);
    },
});
