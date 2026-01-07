import { createConfigForNuxt } from "@nuxt/eslint-config/flat";

export default createConfigForNuxt({})
    .override("nuxt/typescript/rules", {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/consistent-type-imports": "off",
        },
    })
    .override("nuxt/vue/rules", {
        rules: {
            "vue/multi-word-component-names": "off",
        },
    });
