import { expect, test } from "./fixtures";

test.describe("home page", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("has heading", async ({ page }) => {
        await expect(page.getByRole("heading", { name: "Harlemify", level: 1 })).toBeVisible();
    });

    test("has navigation cards", async ({ page }) => {
        await expect(page.getByRole("link", { name: /Config/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /Users/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /Posts/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /Contacts/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /Projects/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /Composables/ })).toBeVisible();
    });

    test("navigates to config page", async ({ page }) => {
        await page.getByRole("link", { name: /Config/ }).click();
        await expect(page).toHaveURL("/config");
    });

    test("navigates to users page", async ({ page }) => {
        await page.getByRole("link", { name: /Users/ }).click();
        await expect(page).toHaveURL("/users");
    });

    test("navigates to posts page", async ({ page }) => {
        await page.getByRole("link", { name: /Posts/ }).click();
        await expect(page).toHaveURL("/posts");
    });

    test("navigates to contacts page", async ({ page }) => {
        await page.getByRole("link", { name: /Contacts/ }).click();
        await expect(page).toHaveURL("/contacts");
    });

    test("navigates to projects page", async ({ page }) => {
        await page.getByRole("link", { name: /Projects/ }).click();
        await expect(page).toHaveURL("/projects");
    });

    test("navigates to composables page", async ({ page }) => {
        await page.getByRole("link", { name: /Composables/ }).click();
        await expect(page).toHaveURL("/composables");
    });
});
