import { expect, test } from "./fixtures";

test.describe("posts page", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post("/api/_reset");
        await page.goto("/posts");
        await page.getByTestId("post-list").waitFor();
    });

    test("loads and displays posts", async ({ page }) => {
        await expect(page.getByTestId("post-count")).toHaveText("3 posts");
        await expect(page.getByTestId("post-1").getByTestId("post-title")).toHaveText("First Post");
        await expect(page.getByTestId("post-2").getByTestId("post-title")).toHaveText("Second Post");
        await expect(page.getByTestId("post-3").getByTestId("post-title")).toHaveText("Hello World");
    });

    test("creates a post", async ({ page }) => {
        await page.getByTestId("add-post").click();
        await page.getByTestId("input-title").fill("New Post");
        await page.getByTestId("input-body").fill("New content");
        await page.getByTestId("save-post").click();
        await expect(page.getByTestId("post-count")).toHaveText("4 posts");
    });

    test("edits a post", async ({ page }) => {
        await page.getByTestId("post-1").getByTestId("edit-post").click();
        await page.getByTestId("input-title").fill("Updated Title");
        await page.getByTestId("save-post").click();
        await expect(page.getByTestId("post-1").getByTestId("post-title")).toHaveText("Updated Title");
    });

    test("deletes a post", async ({ page }) => {
        page.on("dialog", (dialog) => dialog.accept());
        await page.getByTestId("post-3").getByTestId("delete-post").click();
        await expect(page.getByTestId("post-count")).toHaveText("2 posts");
    });

    test("sorts posts", async ({ page }) => {
        await page.getByTestId("sort-posts").click();
        const first = page.getByTestId("post-list").locator(".list-item").first();
        await expect(first.getByTestId("post-title")).toHaveText("First Post");
    });

    test("displays merged overview view", async ({ page }) => {
        const overview = page.getByTestId("merged-overview");
        await expect(overview).toBeVisible();
        await expect(overview).toContainText('"total": 3');
    });

    test("displays 3-model editor view", async ({ page }) => {
        const editor = page.getByTestId("merged-editor");
        await expect(editor).toBeVisible();
        await expect(editor).toContainText('"hasSelection": false');
        await expect(editor).toContainText('"totalPosts": 3');
    });

    test("appends posts from server", async ({ page }) => {
        await page.getByTestId("append-posts").click();
        await expect(page.getByTestId("post-count")).toHaveText("6 posts");
    });

    test("resets sort action status", async ({ page }) => {
        await page.getByTestId("sort-posts").click();
        await expect(page.getByTestId("status-sort").locator(".monitor-state")).toHaveText("success");
        await page.getByTestId("reset-sort").click();
        await expect(page.getByTestId("status-sort").locator(".monitor-state")).toHaveText("idle");
    });

    test("action status shows success after list", async ({ page }) => {
        await expect(page.getByTestId("status-list").locator(".monitor-state")).toHaveText("success");
    });
});
