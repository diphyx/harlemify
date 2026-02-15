import { expect, test } from "./fixtures";

test.describe("config page", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post("/api/_reset");
        await page.goto("/config");
        await page.getByTestId("config-content").waitFor();
        await expect(page.getByTestId("status-get").locator(".action-chip-state")).toHaveText("success");
    });

    test("lazy store loads and displays config", async ({ page }) => {
        await expect(page.getByTestId("theme-value")).toHaveText("dark");
        await expect(page.getByTestId("notifications-value")).toHaveText("on");
    });

    test("toggles theme", async ({ page }) => {
        await page.getByTestId("toggle-theme").click();
        await expect(page.getByTestId("theme-value")).toHaveText("light");
    });

    test("updates language", async ({ page }) => {
        await page.getByTestId("language-input").fill("de");
        await page.getByTestId("update-language").click();
        await expect(page.getByTestId("raw-data")).toContainText('"language": "de"');
    });

    test("toggles notifications", async ({ page }) => {
        await page.getByTestId("toggle-notifications").click();
        await expect(page.getByTestId("notifications-value")).toHaveText("off");
    });

    test("replaces config via reset", async ({ page }) => {
        await page.getByTestId("toggle-theme").click();
        await expect(page.getByTestId("theme-value")).toHaveText("light");
        await page.getByTestId("reset-config").click();
        await expect(page.getByTestId("theme-value")).toHaveText("dark");
    });

    test("action status updates after load", async ({ page }) => {
        await expect(page.getByTestId("status-get").locator(".action-chip-state")).toHaveText("success");
    });

    test("reset restores shape defaults with overrides", async ({ page }) => {
        await page.getByTestId("toggle-theme").click();
        await expect(page.getByTestId("theme-value")).toHaveText("light");
        await page.getByTestId("toggle-notifications").click();
        await expect(page.getByTestId("notifications-value")).toHaveText("off");
        await page.getByTestId("reset-config").click();
        await expect(page.getByTestId("theme-value")).toHaveText("dark");
        await expect(page.getByTestId("notifications-value")).toHaveText("on");
    });

    test("default reset restores function default values", async ({ page }) => {
        await page.getByTestId("toggle-theme").click();
        await expect(page.getByTestId("theme-value")).toHaveText("light");
        await page.getByTestId("default-reset").click();
        await expect(page.getByTestId("theme-value")).toHaveText("dark");
        await expect(page.getByTestId("notifications-value")).toHaveText("on");
    });

    test("silent reset restores defaults without hooks", async ({ page }) => {
        await page.getByTestId("toggle-theme").click();
        await expect(page.getByTestId("theme-value")).toHaveText("light");
        await page.getByTestId("silent-reset").click();
        await expect(page.getByTestId("theme-value")).toHaveText("dark");
    });

    test("silent update patches language without post hook", async ({ page }) => {
        await page.getByTestId("silent-update").click();
        await expect(page.getByTestId("raw-data")).toContainText('"language": "fr"');
    });

    test("lazy store supports multiple sequential operations", async ({ page }) => {
        await page.getByTestId("toggle-theme").click();
        await expect(page.getByTestId("theme-value")).toHaveText("light");
        await page.getByTestId("toggle-notifications").click();
        await expect(page.getByTestId("notifications-value")).toHaveText("off");
        await page.getByTestId("language-input").fill("de");
        await page.getByTestId("update-language").click();
        await expect(page.getByTestId("raw-data")).toContainText('"language": "de"');
    });

    test("lazy store feature is listed", async ({ page }) => {
        await expect(page.getByTestId("feature-info")).toContainText("lazy: true");
    });

    test("function default feature is listed", async ({ page }) => {
        await expect(page.getByTestId("feature-info")).toContainText("default: () => (...)");
    });
});
