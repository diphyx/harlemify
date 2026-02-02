export default defineNuxtConfig({
    compatibilityDate: "2026-01-05",
    modules: ["../src/module"],
    css: ["~/assets/style.css"],
    harlemify: {
        api: {
            adapter: {
                baseURL: "/api",
                timeout: 10000,
            },
        },
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
