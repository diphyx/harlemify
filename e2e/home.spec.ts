import { test, expect } from "./fixtures";

test.describe("Home Page - Navigation", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("displays all navigation cards", async ({ page }) => {
        // Check header
        await expect(page.locator("h1")).toContainText("Harlemify");

        // Check all 4 navigation cards are present
        await expect(page.locator("text=Config")).toBeVisible();
        await expect(page.locator("text=Users")).toBeVisible();
        await expect(page.locator("text=Posts")).toBeVisible();
        await expect(page.locator("text=Projects")).toBeVisible();
    });

    test("navigates to Config page", async ({ page }) => {
        await page.locator("a", { hasText: "Config" }).click();
        await expect(page).toHaveURL("/config");
        await expect(page.locator("h1")).toContainText("Config");
    });

    test("navigates to Users page", async ({ page }) => {
        await page.locator("a", { hasText: "Users" }).click();
        await expect(page).toHaveURL("/users");
        await expect(page.locator("h1")).toContainText("Users");
    });

    test("navigates to Posts page", async ({ page }) => {
        await page.locator("a", { hasText: "Posts" }).click();
        await expect(page).toHaveURL("/posts");
        await expect(page.locator("h1")).toContainText("Posts");
    });

    test("navigates to Projects page", async ({ page }) => {
        await page.locator("a", { hasText: "Projects" }).click();
        await expect(page).toHaveURL("/projects");
        await expect(page.locator("h1")).toContainText("Projects");
    });

    test("back link returns to home", async ({ page }) => {
        // Navigate to a page
        await page.locator("a", { hasText: "Config" }).click();
        await expect(page).toHaveURL("/config");

        // Click back link
        await page.locator(".back").click();
        await expect(page).toHaveURL("/");
    });

    test("displays footer with GitHub link", async ({ page }) => {
        const footer = page.locator("footer a");
        await expect(footer).toBeVisible();
        await expect(footer).toHaveAttribute("href", "https://github.com/diphyx/harlemify");
    });
});

test.describe("Home Page - SSR", () => {
    test("page loads without JavaScript errors", async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));

        await page.goto("/");
        await expect(page.locator("h1")).toContainText("Harlemify");

        expect(errors).toHaveLength(0);
    });

    test("page has correct title", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/Harlemify/);
    });
});

test.describe("Home Page - Accessibility", () => {
    test("navigation cards are focusable", async ({ page }) => {
        await page.goto("/");

        // Tab through navigation cards
        await page.keyboard.press("Tab");
        const focusedElement = page.locator(":focus");
        await expect(focusedElement).toBeVisible();
    });

    test("all links have accessible names", async ({ page }) => {
        await page.goto("/");

        const links = page.locator("a");
        const count = await links.count();

        for (let i = 0; i < count; i++) {
            const link = links.nth(i);
            const text = await link.textContent();
            expect(text?.trim().length).toBeGreaterThan(0);
        }
    });
});
