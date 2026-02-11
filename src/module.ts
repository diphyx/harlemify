import {
    defineNuxtModule,
    addPlugin,
    addTemplate,
    createResolver,
    addImports,
    addImportsDir,
    useLogger,
} from "@nuxt/kit";

import type { RuntimeConfig } from "./runtime";

const logger = useLogger("harlemify");

export default defineNuxtModule<RuntimeConfig>({
    meta: {
        name: "harlemify",
        configKey: "harlemify",
        compatibility: {
            nuxt: "^3.14.0 || ^4.0.0",
        },
    },
    defaults: {},
    setup(options, nuxt) {
        const { resolve } = createResolver(import.meta.url);

        const template = addTemplate({
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

        logger.success(`Module registered, config template: ${template.dst}`);
    },
});
