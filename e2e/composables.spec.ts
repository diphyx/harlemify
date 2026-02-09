import { expect, test } from "./fixtures";

test.describe("composables page", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post("/api/_reset");
        await page.goto("/composables");
        await page.getByTestId("todo-list").waitFor();
    });

    // Todo List

    test("loads and displays todos", async ({ page }) => {
        await expect(page.getByTestId("todo-count")).toHaveText("3 todos");
        await expect(page.getByTestId("todo-1").getByTestId("todo-title")).toHaveText("Buy groceries");
        await expect(page.getByTestId("todo-2").getByTestId("todo-title")).toHaveText("Write tests");
        await expect(page.getByTestId("todo-3").getByTestId("todo-title")).toHaveText("Deploy app");
    });

    test("selects a todo", async ({ page }) => {
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("view-data-title")).toHaveText("Buy groceries");
        await expect(page.getByTestId("todo-1")).toHaveClass(/list-item-selected/);
    });

    test("toggles a todo", async ({ page }) => {
        await page.getByTestId("todo-1").getByTestId("toggle-todo").click();
        await expect(page.getByTestId("todo-1")).toContainText("Done");
    });

    test("deletes a todo", async ({ page }) => {
        await page.getByTestId("todo-3").getByTestId("delete-todo").click();
        await expect(page.getByTestId("todo-count")).toHaveText("2 todos");
    });

    test("reload button refreshes list", async ({ page }) => {
        await page.getByTestId("todo-3").getByTestId("delete-todo").click();
        await expect(page.getByTestId("todo-count")).toHaveText("2 todos");
        await page.getByTestId("reload").click();
        await expect(page.getByTestId("todo-count")).toHaveText("2 todos");
    });

    test("clear selection button resets current", async ({ page }) => {
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("view-data-title")).toHaveText("Buy groceries");
        await page.getByTestId("clear-selection").click();
        await expect(page.getByTestId("view-data-value")).toHaveText("null");
    });

    // useStoreAction

    test("action destructured: shows status, loading, and error", async ({ page }) => {
        await expect(page.getByTestId("action-status")).toHaveText("success");
        await expect(page.getByTestId("action-loading")).toHaveText("false");
        await expect(page.getByTestId("action-error")).toHaveText("null");
    });

    test("action destructured: reset clears status", async ({ page }) => {
        await page.getByTestId("action-reset").click();
        await expect(page.getByTestId("action-status")).toHaveText("idle");
    });

    test("action destructured: execute reloads data", async ({ page }) => {
        await page.getByTestId("action-reset").click();
        await page.getByTestId("action-execute").click();
        await expect(page.getByTestId("action-status")).toHaveText("success");
    });

    test("action non-destructured: isolated status independent from global", async ({ page }) => {
        await expect(page.getByTestId("isolated-status")).toHaveText("idle");
        await expect(page.getByTestId("isolated-loading")).toHaveText("false");
        await page.getByTestId("action-reset").click();
        await expect(page.getByTestId("global-status")).toHaveText("idle");
        await page.getByTestId("isolated-execute").click();
        await expect(page.getByTestId("isolated-status")).toHaveText("success");
        await expect(page.getByTestId("isolated-loading")).toHaveText("false");
        await expect(page.getByTestId("global-status")).toHaveText("idle");
    });

    test("action non-destructured: isolated reset clears status", async ({ page }) => {
        await page.getByTestId("isolated-execute").click();
        await expect(page.getByTestId("isolated-status")).toHaveText("success");
        await page.getByTestId("isolated-reset").click();
        await expect(page.getByTestId("isolated-status")).toHaveText("idle");
    });

    // useStoreModel

    test("model destructured: setCurrent sets value", async ({ page }) => {
        await page.getByTestId("model-set").click();
        await expect(page.getByTestId("model-current-value")).toContainText("Set via composable");
        await expect(page.getByTestId("model-log")).toContainText("[set] setCurrent");
    });

    test("model destructured: patchCurrent patches value", async ({ page }) => {
        await page.getByTestId("model-set").click();
        await page.getByTestId("model-patch").click();
        await expect(page.getByTestId("model-current-value")).toContainText("Patched title");
        await expect(page.getByTestId("model-log")).toContainText("[patch] patchCurrent");
    });

    test("model destructured: resetCurrent clears value", async ({ page }) => {
        await page.getByTestId("model-set").click();
        await page.getByTestId("model-reset").click();
        await expect(page.getByTestId("model-current-value")).toHaveText("null");
        await expect(page.getByTestId("model-log")).toContainText("[reset] resetCurrent");
    });

    test("model destructured: addList adds item", async ({ page }) => {
        await page.getByTestId("model-add").click();
        await expect(page.getByTestId("todo-count")).toHaveText("4 todos");
        await expect(page.getByTestId("model-log")).toContainText("[add] addList");
    });

    test("model destructured: removeList removes item", async ({ page }) => {
        await page.getByTestId("model-remove").click();
        await expect(page.getByTestId("todo-count")).toHaveText("2 todos");
        await expect(page.getByTestId("model-log")).toContainText("[remove] removeList");
    });

    test("model non-destructured: debounced set delays update", async ({ page }) => {
        await page.getByTestId("model-debounce").click();
        await expect(page.getByTestId("model-log")).toContainText("[debounce] debouncedModel.set()");
        await expect(page.getByTestId("model-current-value")).toHaveText("null");
        await page.waitForTimeout(600);
        await expect(page.getByTestId("model-current-value")).toContainText("Debounced");
    });

    test("model non-destructured: throttled set applies immediately", async ({ page }) => {
        await page.getByTestId("model-throttle").click();
        await expect(page.getByTestId("model-current-value")).toContainText("Throttled");
        await expect(page.getByTestId("model-log")).toContainText("[throttle] throttledModel.set()");
    });

    // useStoreView

    test("view non-destructured: data proxy shows null when no selection", async ({ page }) => {
        await expect(page.getByTestId("view-data-value")).toHaveText("null");
        await expect(page.getByTestId("view-data-title")).toHaveText("undefined");
        await expect(page.getByTestId("view-data-done")).toHaveText("undefined");
    });

    test("view non-destructured: data proxy reflects selection", async ({ page }) => {
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("view-data-title")).toHaveText("Buy groceries");
        await expect(page.getByTestId("view-data-done")).toHaveText("false");
    });

    test("view non-destructured: proxy access matches .value access", async ({ page }) => {
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        const json = await page.getByTestId("view-data-value").textContent();
        const parsed = JSON.parse(json!);
        await expect(page.getByTestId("view-data-title")).toHaveText(parsed.title);
        await expect(page.getByTestId("view-data-done")).toHaveText(String(parsed.done));
    });

    test("view non-destructured: clear selection button uses proxy", async ({ page }) => {
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("clear-selection")).toBeVisible();
        await page.getByTestId("clear-selection").click();
        await expect(page.getByTestId("view-data-title")).toHaveText("undefined");
        await expect(page.getByTestId("clear-selection")).not.toBeVisible();
    });

    test("view non-destructured: selected highlight uses proxy", async ({ page }) => {
        await page.getByTestId("todo-2").getByTestId("select-todo").click();
        await expect(page.getByTestId("todo-2")).toHaveClass(/list-item-selected/);
        await expect(page.getByTestId("todo-1")).not.toHaveClass(/list-item-selected/);
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("todo-1")).toHaveClass(/list-item-selected/);
        await expect(page.getByTestId("todo-2")).not.toHaveClass(/list-item-selected/);
    });

    test("view non-destructured: default value shown when no selection", async ({ page }) => {
        await expect(page.getByTestId("view-default-title")).toHaveText("No todo selected");
        await expect(page.getByTestId("view-default-value")).toContainText("No todo selected");
    });

    test("view non-destructured: default replaced by actual value on selection", async ({ page }) => {
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("view-default-title")).toHaveText("Buy groceries");
    });

    test("view without proxy: shows null when no selection", async ({ page }) => {
        await expect(page.getByTestId("view-computed-value")).toHaveText("null");
        await expect(page.getByTestId("view-computed-title")).toHaveText("undefined");
    });

    test("view without proxy: reflects selection via .value", async ({ page }) => {
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("view-computed-title")).toHaveText("Buy groceries");
        await expect(page.getByTestId("view-computed-value")).toContainText("Buy groceries");
    });

    test("view destructured: pending data shows incomplete todos", async ({ page }) => {
        await expect(page.getByTestId("view-pending")).toContainText("Buy groceries");
        await expect(page.getByTestId("view-pending")).toContainText("Deploy app");
        await expect(page.getByTestId("view-pending")).not.toContainText("Write tests");
    });

    test("view destructured: pending data updates after toggle", async ({ page }) => {
        await expect(page.getByTestId("view-pending")).toContainText("Buy groceries");
        await page.getByTestId("todo-1").getByTestId("toggle-todo").click();
        await expect(page.getByTestId("view-pending")).not.toContainText("Buy groceries");
    });

    test("sections are visible", async ({ page }) => {
        await expect(page.getByTestId("action-section")).toBeVisible();
        await expect(page.getByTestId("model-section")).toBeVisible();
        await expect(page.getByTestId("view-section")).toBeVisible();
    });

    test("view track: starts and logs changes", async ({ page }) => {
        await page.getByTestId("track-start").click();
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("track-log")).toContainText("[track] Buy groceries");
    });

    test("view track: logs multiple sequential changes", async ({ page }) => {
        await page.getByTestId("track-start").click();
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("track-log")).toContainText("[track] Buy groceries");
        await page.getByTestId("todo-2").getByTestId("select-todo").click();
        await expect(page.getByTestId("track-log")).toContainText("[track] Write tests");
        await page.getByTestId("todo-3").getByTestId("select-todo").click();
        await expect(page.getByTestId("track-log")).toContainText("[track] Deploy app");
    });

    test("view track: stop handle prevents further logs", async ({ page }) => {
        await page.getByTestId("track-start").click();
        await page.getByTestId("todo-1").getByTestId("select-todo").click();
        await expect(page.getByTestId("track-log")).toContainText("[track] Buy groceries");
        await page.getByTestId("track-stop").click();
        await page.getByTestId("todo-2").getByTestId("select-todo").click();
        await expect(page.getByTestId("track-log")).not.toContainText("Write tests");
    });

    test("view track: buttons disabled state toggles correctly", async ({ page }) => {
        await expect(page.getByTestId("track-start")).toBeEnabled();
        await expect(page.getByTestId("track-stop")).toBeDisabled();
        await page.getByTestId("track-start").click();
        await expect(page.getByTestId("track-start")).toBeDisabled();
        await expect(page.getByTestId("track-stop")).toBeEnabled();
        await page.getByTestId("track-stop").click();
        await expect(page.getByTestId("track-start")).toBeEnabled();
        await expect(page.getByTestId("track-stop")).toBeDisabled();
    });

    test("feature info is visible", async ({ page }) => {
        await expect(page.getByTestId("feature-info")).toBeVisible();
        await expect(page.getByTestId("feature-info")).toContainText("useStoreAction");
        await expect(page.getByTestId("feature-info")).toContainText("useStoreModel");
        await expect(page.getByTestId("feature-info")).toContainText("useStoreView");
    });

    test("back link navigates to home", async ({ page }) => {
        await page.getByTestId("back-link").click();
        await expect(page).toHaveURL("/");
    });
});
