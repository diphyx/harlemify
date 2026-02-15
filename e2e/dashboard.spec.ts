import { expect, test } from "./fixtures";

test.describe("dashboard page", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post("/api/_reset");
        await page.goto("/dashboard");
        await expect(page.getByTestId("summary-users")).toHaveText("3");
    });

    test("loads and displays summary", async ({ page }) => {
        await expect(page.getByTestId("summary-users")).toHaveText("3");
        await expect(page.getByTestId("summary-todos")).toHaveText("3");
        await expect(page.getByTestId("summary-pending")).toHaveText("2");
        await expect(page.getByTestId("summary-done")).toHaveText("1");
    });

    test("loads and displays users", async ({ page }) => {
        const list = page.getByTestId("user-list");
        await expect(list).toContainText("John Doe");
        await expect(list).toContainText("Jane Smith");
        await expect(list).toContainText("Bob Wilson");
    });

    test("loads and displays todos", async ({ page }) => {
        const list = page.getByTestId("todo-list");
        await expect(list).toContainText("Buy groceries");
        await expect(list).toContainText("Write tests");
        await expect(list).toContainText("Deploy app");
    });

    test("select user via compose", async ({ page }) => {
        await page.getByTestId("user-1").getByTestId("select-user").click();
        await expect(page.getByTestId("selected-user")).toBeVisible();
        await expect(page.getByTestId("selected-user")).toContainText("John Doe");
    });

    test("clear user selection", async ({ page }) => {
        await page.getByTestId("user-1").getByTestId("select-user").click();
        await expect(page.getByTestId("selected-user")).toBeVisible();
        await page.getByTestId("clear-selection").click();
        await expect(page.getByTestId("selected-user")).not.toBeVisible();
    });

    test("toggle todo", async ({ page }) => {
        const todo = page.getByTestId("todo-1");
        await expect(todo).toContainText("Pending");
        await todo.getByTestId("toggle-todo").click();
        await expect(todo).toContainText("Done");
        await expect(page.getByTestId("summary-pending")).toHaveText("1");
        await expect(page.getByTestId("summary-done")).toHaveText("2");
    });

    test("complete all todos via compose", async ({ page }) => {
        await page.getByTestId("complete-all").click();
        await expect(page.getByTestId("summary-pending")).toHaveText("0");
        await expect(page.getByTestId("summary-done")).toHaveText("3");
    });

    test("reset all via compose", async ({ page }) => {
        await page.getByTestId("reset-all").click();
        await expect(page.getByTestId("summary-users")).toHaveText("0");
        await expect(page.getByTestId("summary-todos")).toHaveText("0");
    });

    test("load all after reset via compose", async ({ page }) => {
        await page.getByTestId("reset-all").click();
        await expect(page.getByTestId("summary-users")).toHaveText("0");
        await page.getByTestId("load-all").click();
        await page.getByTestId("user-list").waitFor();
        await expect(page.getByTestId("summary-users")).toHaveText("3");
        await expect(page.getByTestId("summary-todos")).toHaveText("3");
    });

    test("quick add via compose with typed args", async ({ page }) => {
        await page.getByTestId("input-user-name").fill("Alice");
        await page.getByTestId("input-todo-title").fill("Review PR");
        await page.getByTestId("quick-add").click();
        await expect(page.getByTestId("input-user-name")).toHaveValue("");
        await expect(page.getByTestId("user-list")).toContainText("Alice");
        await expect(page.getByTestId("todo-list")).toContainText("Review PR");
        await expect(page.getByTestId("summary-users")).toHaveText("4");
        await expect(page.getByTestId("summary-todos")).toHaveText("4");
    });

    test("delete user updates summary", async ({ page }) => {
        await page.getByTestId("user-1").getByTestId("delete-user").click();
        await expect(page.getByTestId("summary-users")).toHaveText("2");
    });

    test("compose active states are false after load", async ({ page }) => {
        await expect(page.getByTestId("active-load-all")).toHaveText("false");
        await expect(page.getByTestId("active-quick-add")).toHaveText("false");
        await expect(page.getByTestId("active-reset-all")).toHaveText("false");
        await expect(page.getByTestId("active-complete-all")).toHaveText("false");
        await expect(page.getByTestId("active-select-user")).toHaveText("false");
    });

    test("displays feature info", async ({ page }) => {
        const info = page.getByTestId("feature-info");
        await expect(info).toBeVisible();
        await expect(info).toContainText("compose");
        await expect(info).toContainText("useStoreCompose");
        await expect(info).toContainText("active");
    });
});
