import { expect, test } from "./fixtures";

test.describe("users page", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post("/api/_reset");
        await page.goto("/users");
        await page.getByTestId("user-grid").waitFor();
    });

    test("loads and displays users", async ({ page }) => {
        await expect(page.getByTestId("user-count")).toHaveText("3 users");
        await expect(page.getByTestId("user-1").getByTestId("user-name")).toHaveText("John Doe");
        await expect(page.getByTestId("user-2").getByTestId("user-name")).toHaveText("Jane Smith");
        await expect(page.getByTestId("user-3").getByTestId("user-name")).toHaveText("Bob Wilson");
    });

    test("creates a user", async ({ page }) => {
        await page.getByTestId("add-user").click();
        await page.getByTestId("input-name").fill("New User");
        await page.getByTestId("input-email").fill("new@example.com");
        await page.getByTestId("save-user").click();
        await expect(page.getByTestId("user-count")).toHaveText("4 users");
    });

    test("edits a user", async ({ page }) => {
        await page.getByTestId("user-1").getByTestId("edit-user").click();
        await page.getByTestId("input-name").fill("John Updated");
        await page.getByTestId("save-user").click();
        await expect(page.getByTestId("user-1").getByTestId("user-name")).toHaveText("John Updated");
    });

    test("deletes a user", async ({ page }) => {
        page.on("dialog", (dialog) => dialog.accept());
        await page.getByTestId("user-3").getByTestId("delete-user").click();
        await expect(page.getByTestId("user-count")).toHaveText("2 users");
    });

    test("selects and views a user", async ({ page }) => {
        await page.getByTestId("user-1").getByTestId("view-user").click();
        await expect(page.getByTestId("selected-user")).toBeVisible();
        await expect(page.getByTestId("selected-user")).toContainText("John Doe");
    });

    test("clears selection", async ({ page }) => {
        await page.getByTestId("user-1").getByTestId("view-user").click();
        await expect(page.getByTestId("selected-user")).toBeVisible();
        await page.getByTestId("clear-user").click();
        await expect(page.getByTestId("selected-user")).not.toBeVisible();
    });

    test("clears all users", async ({ page }) => {
        await page.getByTestId("clear-all-users").click();
        await expect(page.getByTestId("user-count")).toHaveText("0 users");
    });

    test("displays merged summary view", async ({ page }) => {
        const summary = page.getByTestId("merged-summary");
        await expect(summary).toBeVisible();
        await expect(summary).toContainText('"total": 3');
    });

    test("add unique user prevents duplicates", async ({ page }) => {
        const countBefore = await page.getByTestId("user-count").textContent();
        await page.getByTestId("add-unique-user").click();
        await expect(page.getByTestId("user-count")).toHaveText(countBefore!);
    });

    test("patch by email updates user", async ({ page }) => {
        await page.getByTestId("user-1").getByTestId("view-user").click();
        await expect(page.getByTestId("selected-user")).toBeVisible();
        await page.getByTestId("patch-by-email").click();
        await expect(page.getByTestId("user-1").getByTestId("user-name")).toContainText("(by email)");
    });

    test("reset action resets list status", async ({ page }) => {
        await expect(page.getByTestId("status-list").locator(".monitor-state")).toHaveText("success");
        await page.getByTestId("reset-list-action").click();
        await expect(page.getByTestId("status-list").locator(".monitor-state")).toHaveText("idle");
    });

    test("action status shows success after list", async ({ page }) => {
        await expect(page.getByTestId("status-list").locator(".monitor-state")).toHaveText("success");
    });

    test("create modal opens with shape defaults (empty form)", async ({ page }) => {
        await page.getByTestId("add-user").click();
        await expect(page.getByTestId("input-name")).toHaveValue("");
        await expect(page.getByTestId("input-email")).toHaveValue("");
    });

    test("create modal resets to shape defaults after save", async ({ page }) => {
        await page.getByTestId("add-user").click();
        await page.getByTestId("input-name").fill("Temp User");
        await page.getByTestId("input-email").fill("temp@example.com");
        await page.getByTestId("save-user").click();
        await page.getByTestId("add-user").click();
        await expect(page.getByTestId("input-name")).toHaveValue("");
        await expect(page.getByTestId("input-email")).toHaveValue("");
    });
});
