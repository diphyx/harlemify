import { expect, test } from "./fixtures";

test.describe("projects page", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post("/api/_reset");
        await page.goto("/projects");
        await page.getByTestId("project-grid").waitFor();
    });

    test("loads and displays projects", async ({ page }) => {
        await expect(page.getByTestId("project-count")).toHaveText("2 projects");
        await expect(page.getByTestId("project-1").getByTestId("project-name")).toHaveText("Website Redesign");
        await expect(page.getByTestId("project-2").getByTestId("project-name")).toHaveText("Mobile App");
    });

    test("creates a project", async ({ page }) => {
        await page.getByTestId("add-project").click();
        await page.getByTestId("input-name").fill("New Project");
        await page.getByTestId("input-description").fill("A new project");
        await page.getByTestId("save-project").click();
        await expect(page.getByTestId("project-count")).toHaveText("3 projects");
    });

    test("selects a project", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await expect(page.getByTestId("project-detail")).toBeVisible();
        await expect(page.getByTestId("project-detail")).toContainText("Website Redesign");
    });

    test("deletes a project", async ({ page }) => {
        page.on("dialog", (dialog) => dialog.accept());
        await page.getByTestId("project-2").getByTestId("delete-project").click();
        await expect(page.getByTestId("project-count")).toHaveText("1 projects");
    });

    test("toggles project active state", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("toggle-active").click();
        await expect(page.getByTestId("project-1").getByTestId("project-status")).toHaveText("Inactive");
    });

    test("checks project via HEAD", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("check-project").click();
        await expect(page.getByTestId("status-check").locator(".action-chip-state")).toHaveText("success");
    });

    test("displays cloned sorted milestones view", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("load-milestones").click();
        await expect(page.getByTestId("status-milestones").locator(".action-chip-state")).toHaveText("success");
        const sorted = page.getByTestId("cloned-sorted-milestones");
        await expect(sorted).toContainText('"Design mockups"');
        await expect(sorted).toContainText('"Frontend development"');
        await expect(sorted).toContainText('"Testing & QA"');
    });

    test("loads milestones", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("load-milestones").click();
        await expect(page.getByTestId("project-state")).toContainText("milestones");
    });

    test("loads meta", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("load-meta").click();
        await expect(page.getByTestId("project-state")).toContainText("budget");
    });

    test("exports as JSON", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("export-json").click();
        await expect(page.getByTestId("export-result")).toBeVisible();
        await expect(page.getByTestId("export-result")).toContainText("exportedAt");
    });

    test("clears selection", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("clear-selection").click();
        await expect(page.getByTestId("project-detail")).not.toBeVisible();
    });

    test("concurrent block mode shows error", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("concurrent-select").selectOption("BLOCK");
        await page.getByTestId("slow-export").click();
        await page.getByTestId("slow-export").click();
        await expect(page.getByTestId("concurrent-error")).toBeVisible();
        await expect(page.getByTestId("concurrent-error")).toContainText("ActionConcurrentError");
    });

    test("transformer modifies response", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("transformed-export").click();
        await expect(page.getByTestId("transformer-result")).toBeVisible();
        await expect(page.getByTestId("transformer-result")).toContainText("[TRANSFORMED]");
    });

    test("error handling captures action error", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("trigger-error").click();
        await expect(page.getByTestId("error-result")).toBeVisible();
        await expect(page.getByTestId("error-result")).toContainText("ActionApiError");
    });

    test("loads options with deep patch", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("load-meta").click();
        await page.getByTestId("load-options").click();
        await expect(page.getByTestId("project-state")).toContainText("options");
    });

    test("exports as CSV", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("export-csv").click();
        await expect(page.getByTestId("export-result")).toBeVisible();
        await expect(page.getByTestId("export-result")).toContainText('"format": "csv"');
    });

    test("signal demo cancels request", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("cancellable-export").click();
        await page.getByTestId("cancel-export").click();
        await expect(page.getByTestId("signal-aborted")).toBeVisible();
        await expect(page.getByTestId("signal-aborted")).toHaveText("Request was aborted");
    });

    test("bind demo uses isolated status", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("bound-export").click();
        await expect(page.getByTestId("bound-status")).toContainText("success");
    });

    test("concurrent skip mode returns pending result", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("concurrent-select").selectOption("SKIP");
        await page.getByTestId("slow-export").click();
        await page.getByTestId("slow-export").click();
        await expect(page.getByTestId("concurrent-error")).not.toBeVisible();
    });

    test("concurrent cancel mode aborts previous", async ({ page }) => {
        await page.getByTestId("project-1").getByTestId("select-project").click();
        await page.getByTestId("project-detail").waitFor();
        await page.getByTestId("concurrent-select").selectOption("CANCEL");
        await page.getByTestId("slow-export").click();
        await page.getByTestId("slow-export").click();
        await expect(page.getByTestId("status-slowExport").locator(".action-chip-state")).not.toHaveText("idle");
    });

    test("action status updates after list", async ({ page }) => {
        await expect(page.getByTestId("status-list").locator(".action-chip-state")).toHaveText("success");
    });

    test("create modal opens with shape defaults (empty form)", async ({ page }) => {
        await page.getByTestId("add-project").click();
        await expect(page.getByTestId("input-name")).toHaveValue("");
        await expect(page.getByTestId("input-description")).toHaveValue("");
    });

    test("create modal resets to shape defaults after save", async ({ page }) => {
        await page.getByTestId("add-project").click();
        await page.getByTestId("input-name").fill("Temp Project");
        await page.getByTestId("input-description").fill("Temp desc");
        await page.getByTestId("save-project").click();
        await page.getByTestId("add-project").click();
        await expect(page.getByTestId("input-name")).toHaveValue("");
        await expect(page.getByTestId("input-description")).toHaveValue("");
    });
});
