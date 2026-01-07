import { defineNuxtModule, addPlugin, createResolver, addImportsDir, updateRuntimeConfig } from "@nuxt/kit";

import type { ApiOptions } from "./runtime";

export interface ModuleOptions {
    api?: Pick<ApiOptions, "url" | "timeout">;
}

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: "harlemify",
        configKey: "harlemify",
        compatibility: {
            nuxt: ">=3.0.0 || >=4.0.0",
        },
    },
    defaults: {
        api: {},
    },
    setup(options, _) {
        const { resolve } = createResolver(import.meta.url);

        addPlugin(resolve("./runtime", "plugin"));
        addImportsDir(resolve("./runtime", "core"));
        addImportsDir(resolve("./runtime", "composables"));
        addImportsDir(resolve("./runtime", "utils"));

        updateRuntimeConfig({
            public: {
                harlemify: options,
            },
            options: {
                build: {
                    transpile: [/@harlem\//],
                },
            },
        });
    },
});
