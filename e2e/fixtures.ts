import { test as base } from "@playwright/test";

// Extend the base test to reset data before each test
export const test = base.extend({
    page: async ({ page }, use) => {
        // Reset server data before each test
        await page.request.post("http://localhost:3000/api/_reset");
        await use(page);
    },
});

export { expect } from "@playwright/test";
