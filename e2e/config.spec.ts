import { expect, test } from "./fixtures";

test.describe("config page", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post("/api/_reset");
        await page.goto("/config");
        await page.getByTestId("config-content").waitFor();
    });

    test("loads and displays config", async ({ page }) => {
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
        await expect(page.getByTestId("status-get").locator(".monitor-state")).toHaveText("success");
    });
});
