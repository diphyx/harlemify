import { defineNuxtModule, addPlugin, addTemplate, createResolver, addImports, addImportsDir } from "@nuxt/kit";

import type { RuntimeConfig } from "./runtime";

export default defineNuxtModule<RuntimeConfig>({
    meta: {
        name: "harlemify",
        configKey: "harlemify",
        compatibility: {
            nuxt: ">=3.0.0 || >=4.0.0",
        },
    },
    defaults: {},
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
        addImportsDir(resolve("./runtime", "composables"));
        addImports([
            {
                name: "createStore",
                from: resolve("./runtime/core/store"),
            },
        ]);

        nuxt.options.build.transpile.push(/@harlem\//);
    },
});
