export default defineNuxtConfig({
    compatibilityDate: "2026-01-05",
    modules: ["../src/module"],
    css: ["~/assets/style.css"],
    harlemify: {
        action: {
            endpoint: "/api",
            timeout: 10000,
        },
        logger: 999,
    },
    app: {
        head: {
            title: "Harlemify Playground",
            meta: [
                {
                    name: "description",
                    content: "Interactive demo of Harlemify - API state management for Nuxt 3+",
                },
            ],
        },
    },
    devtools: {
        enabled: false,
    },
});
