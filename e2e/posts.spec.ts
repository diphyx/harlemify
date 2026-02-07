import { test, expect } from "./fixtures";

/**
 * Posts Page E2E Tests
 *
 * Tests harlemify concepts demonstrated:
 * - Collection store pattern: model.many(shape) with ActionManyMode
 * - handle() without API: handle(async ({ view, commit }) => ...)
 * - view.merge(["current", "list"], resolver) - Multi-source merged view
 * - Call-time commit.mode override: action({ commit: { mode: ActionManyMode.ADD } })
 * - action.sort.data - Last successful result from action
 * - action.sort.reset() - Reset action state
 * - action({ body }) - Call-time payload with body data
 */

test.describe("Posts - Collection Store (model.many())", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });
    });

    test("loads collection data into many() state on mount", async ({ page }) => {
        // Verify posts are loaded as array
        const posts = page.locator(".list-item");
        const count = await posts.count();

        expect(count).toBeGreaterThan(0);

        // Toolbar shows count
        const countText = await page.locator(".toolbar h2").textContent();
        expect(countText).toContain("posts");
    });

    test("collection array is displayed in list layout", async ({ page }) => {
        const firstPost = page.locator(".list-item").first();

        await expect(firstPost.locator("h3")).toBeVisible(); // title
        await expect(firstPost.locator("p")).toBeVisible(); // body preview
    });

    test("list displays limited items (slice for performance)", async ({ page }) => {
        // Template uses posts.slice(0, 15)
        const posts = page.locator(".list-item");
        const count = await posts.count();

        expect(count).toBeLessThanOrEqual(15);
    });

    test("body text is truncated with ellipsis", async ({ page }) => {
        const firstPostBody = await page.locator(".list-item").first().locator("p").textContent();

        // Body should be truncated (ends with ...)
        expect(firstPostBody).toContain("...");
    });
});

test.describe("Posts - Add Mutation (ActionManyMode.ADD - default append)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });
    });

    test("new post is appended to end of list (default add position)", async ({ page }) => {
        // Get first post title before create
        const firstTitleBefore = await page.locator(".list-item").first().locator("h3").textContent();

        // Create new post
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        const newTitle = "New Post " + Date.now();
        await page.locator(".modal input").fill(newTitle);
        await page.locator(".modal textarea").fill("New post body content");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // First post should be unchanged (not prepended)
        const firstTitleAfter = await page.locator(".list-item").first().locator("h3").textContent();
        expect(firstTitleAfter).toBe(firstTitleBefore);
    });

    test("new post appears in list (appended)", async ({ page }) => {
        // Create new post with unique title
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        const uniqueTitle = "UniquePost" + Date.now();
        await page.locator(".modal input").fill(uniqueTitle);
        await page.locator(".modal textarea").fill("Body content");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // Verify post is in list
        const allTitles = page.locator(".list-item h3");
        const count = await allTitles.count();

        let found = false;
        for (let i = 0; i < count; i++) {
            const title = await allTitles.nth(i).textContent();
            if (title?.includes(uniqueTitle)) {
                found = true;
                break;
            }
        }

        expect(found).toBe(true);
    });

    test("count increases after add", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Create post
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").fill("Count Test Post");
        await page.locator(".modal textarea").fill("Body");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount + 1);
    });
});

test.describe("Posts - Edit Mutation (ActionManyMode.PATCH by identifier)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });
    });

    test("edit updates existing item in place", async ({ page }) => {
        // Get first post title before edit
        const originalTitle = await page.locator(".list-item").first().locator("h3").textContent();

        // Edit first post
        await page.locator(".list-item").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        const updatedTitle = "Edited " + Date.now();
        await page.locator(".modal input").fill(updatedTitle);
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // First post should have new title
        const newTitle = await page.locator(".list-item").first().locator("h3").textContent();
        expect(newTitle).toBe(updatedTitle);
        expect(newTitle).not.toBe(originalTitle);
    });

    test("edit preserves item position in list", async ({ page }) => {
        // Get second post title before edit
        const secondTitleBefore = await page.locator(".list-item").nth(1).locator("h3").textContent();

        // Edit first post
        await page.locator(".list-item").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").fill("Position Test");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // Second post should still be in second position
        const secondTitleAfter = await page.locator(".list-item").nth(1).locator("h3").textContent();
        expect(secondTitleAfter).toBe(secondTitleBefore);
    });

    test("edit preserves other items unchanged", async ({ page }) => {
        // Get all titles before edit
        const countBefore = await page.locator(".list-item").count();
        const titlesBefore: string[] = [];
        for (let i = 1; i < Math.min(countBefore, 5); i++) {
            titlesBefore.push((await page.locator(".list-item").nth(i).locator("h3").textContent()) || "");
        }

        // Edit first post
        await page.locator(".list-item").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").fill("Changed First");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // Other posts should be unchanged
        for (let i = 1; i < Math.min(countBefore, 5); i++) {
            const titleAfter = await page.locator(".list-item").nth(i).locator("h3").textContent();
            expect(titleAfter).toBe(titlesBefore[i - 1]);
        }
    });

    test("edit uses identifier (id) to find correct item", async ({ page }) => {
        // Edit second post
        const secondTitleBefore = await page.locator(".list-item").nth(1).locator("h3").textContent();

        await page.locator(".list-item").nth(1).locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        const updatedTitle = "Second Edited " + Date.now();
        await page.locator(".modal input").fill(updatedTitle);
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // Second post should be updated
        const secondTitleAfter = await page.locator(".list-item").nth(1).locator("h3").textContent();
        expect(secondTitleAfter).toBe(updatedTitle);
        expect(secondTitleAfter).not.toBe(secondTitleBefore);

        // First post should be unchanged
        const firstTitle = await page.locator(".list-item").first().locator("h3").textContent();
        expect(firstTitle).not.toBe(updatedTitle);
    });

    test("count remains unchanged after edit", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Edit first post
        await page.locator(".list-item").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").fill("Edit Count Test");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount);
    });
});

test.describe("Posts - Delete Mutation (ActionManyMode.REMOVE by identifier)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });
    });

    test("delete removes item from collection", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        page.on("dialog", (dialog) => dialog.accept());

        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount - 1);
    });

    test("deleted item no longer appears in list", async ({ page }) => {
        // Get initial count
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        const deletedTitle = await page.locator(".list-item").first().locator("h3").textContent();

        // Setup dialog handler before clicking
        page.once("dialog", (dialog) => dialog.accept());

        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();

        // Wait for first item to change (deleted item gone)
        await expect(page.locator(".list-item").first().locator("h3")).not.toHaveText(deletedTitle || "", {
            timeout: 10000,
        });

        // Count should have decreased
        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");
        expect(finalCount).toBeLessThan(initialCount);
    });

    test("delete uses identifier (id) to remove correct item", async ({ page }) => {
        // Get first two titles
        const firstTitle = await page.locator(".list-item").first().locator("h3").textContent();
        const secondTitle = await page.locator(".list-item").nth(1).locator("h3").textContent();

        // Setup dialog handler before clicking
        page.once("dialog", (dialog) => dialog.accept());

        // Delete first
        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();

        // Wait for second to become first
        await expect(page.locator(".list-item").first().locator("h3")).toHaveText(secondTitle || "", {
            timeout: 10000,
        });

        // Verify first item is gone
        const newFirstTitle = await page.locator(".list-item").first().locator("h3").textContent();
        expect(newFirstTitle).toBe(secondTitle);
        expect(newFirstTitle).not.toBe(firstTitle);
    });

    test("remaining items shift up after delete", async ({ page }) => {
        // Get initial count
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Get first item title (will be deleted)
        const firstTitle = await page.locator(".list-item").first().locator("h3").textContent();

        page.on("dialog", (dialog) => dialog.accept());

        // Delete first
        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();

        // Wait for count to decrease
        await expect(page.locator(".toolbar h2")).toContainText(`${initialCount - 1} posts`, { timeout: 10000 });

        // New first item should be different from the deleted one
        const newFirstTitle = await page.locator(".list-item").first().locator("h3").textContent();
        expect(newFirstTitle).not.toBe(firstTitle);

        // Count should have decreased
        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");
        expect(finalCount).toBe(initialCount - 1);
    });
});

test.describe("Posts - Action Status (action.*.status)", () => {
    test("loading state or content is visible on page load", async ({ page }) => {
        // Navigate to posts page
        await page.goto("/posts");

        // Wait for either loading or content to be visible
        await expect(page.locator(".loading, .list").first()).toBeVisible({ timeout: 10000 });
    });

    test("loading state disappears after successful fetch", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector("[data-testid='post-list']", { timeout: 10000 });

        await expect(page.locator(".loading")).not.toBeVisible();
        await expect(page.locator("[data-testid='post-list']")).toBeVisible();
    });

    test("action status section is visible", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator("[data-testid='action-status']")).toBeVisible();
    });

    test("list action shows success status after load", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        const listStatus = page.locator("[data-testid='status-list']");
        await expect(listStatus.locator("[data-status='success']")).toBeVisible();
    });

    test("create action shows idle status initially", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        const createStatus = page.locator("[data-testid='status-create']");
        await expect(createStatus.locator("[data-status='idle']")).toBeVisible();
    });

    test("create action transitions to success after creating post", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        // Create a new post
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").fill("Monitor Test Post");
        await page.locator(".modal textarea").fill("Testing action status");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });

        const createStatus = page.locator("[data-testid='status-create']");
        await expect(createStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("update action transitions to success after editing post", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        // Edit first post
        await page.locator(".list-item").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").fill("Updated for Status Test");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });

        const updateStatus = page.locator("[data-testid='status-update']");
        await expect(updateStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("delete action transitions to success after deleting post", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        page.on("dialog", (dialog) => dialog.accept());

        // Delete first post
        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        const deleteStatus = page.locator("[data-testid='status-delete']");
        await expect(deleteStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("each action has independent status state", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        // After page load: list=success, create=idle, update=idle, delete=idle
        const listStatus = page.locator("[data-testid='status-list']");
        const createStatus = page.locator("[data-testid='status-create']");
        const updateStatus = page.locator("[data-testid='status-update']");
        const deleteStatus = page.locator("[data-testid='status-delete']");

        await expect(listStatus.locator("[data-status='success']")).toBeVisible();
        await expect(createStatus.locator("[data-status='idle']")).toBeVisible();
        await expect(updateStatus.locator("[data-status='idle']")).toBeVisible();
        await expect(deleteStatus.locator("[data-status='idle']")).toBeVisible();
    });
});

test.describe("Posts - Store Destructured API ({ model, view, action })", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });
    });

    test("view.posts (many) state is available", async ({ page }) => {
        const posts = page.locator(".list-item");
        await expect(posts.first()).toBeVisible();
    });

    test("action.list is available", async ({ page }) => {
        // Page calls action.list on mount
        const countText = await page.locator(".toolbar h2").textContent();
        const count = parseInt(countText?.match(/\d+/)?.[0] || "0");

        expect(count).toBeGreaterThan(0);
    });

    test("action.create is available", async ({ page }) => {
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").fill("Create Action Test");
        await page.locator(".modal textarea").fill("Body");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // Verify post created
        const allTitles = await page.locator(".list-item h3").allTextContents();
        const found = allTitles.some((t) => t.includes("Create Action Test"));
        expect(found).toBe(true);
    });

    test("action.update is available", async ({ page }) => {
        const originalTitle = await page.locator(".list-item").first().locator("h3").textContent();

        await page.locator(".list-item").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal", { timeout: 10000 });

        const testTitle = "Updated Post " + Date.now();
        await page.locator(".modal input").fill(testTitle);
        await page.locator(".modal button[type='submit']").click();

        // Wait for title to change
        await expect(page.locator(".list-item").first().locator("h3")).not.toHaveText(originalTitle || "", {
            timeout: 10000,
        });

        await expect(page.locator(".list-item").first().locator("h3")).toContainText(testTitle);
    });

    test("action.delete is available", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        page.on("dialog", (dialog) => dialog.accept());

        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount - 1);
    });

    test("view.overview merged view is available", async ({ page }) => {
        // Merged view section should be visible
        await expect(page.locator("[data-testid='merged-overview']")).toBeVisible();

        const overviewData = await page.locator("[data-testid='merged-overview'] pre").textContent();
        const overview = JSON.parse(overviewData || "{}");

        expect(overview).toHaveProperty("selectedTitle");
        expect(overview).toHaveProperty("total");
        expect(overview).toHaveProperty("byUser");
    });
});

test.describe("Posts - Modal Behavior", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });
    });

    test("modal can be closed by clicking overlay", async ({ page }) => {
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal-overlay").click({ position: { x: 10, y: 10 } });

        await expect(page.locator(".modal")).not.toBeVisible();
    });

    test("modal can be closed by cancel button", async ({ page }) => {
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal button", { hasText: "Cancel" }).click();

        await expect(page.locator(".modal")).not.toBeVisible();
    });

    test("edit modal pre-fills form with current data", async ({ page }) => {
        const postTitle = await page.locator(".list-item").first().locator("h3").textContent();

        await page.locator(".list-item").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        const titleInput = page.locator(".modal input");
        await expect(titleInput).toHaveValue(postTitle || "");
    });

    test("create modal has empty form", async ({ page }) => {
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        const titleInput = page.locator(".modal input");
        const bodyTextarea = page.locator(".modal textarea");

        await expect(titleInput).toHaveValue("");
        await expect(bodyTextarea).toHaveValue("");
    });

    test("form validation prevents empty submission", async ({ page }) => {
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal button[type='submit']").click();

        await expect(page.locator(".modal")).toBeVisible();
    });
});

test.describe("Posts - Delete Confirmation", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });
    });

    test("canceling delete keeps post in list", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        page.on("dialog", (dialog) => dialog.dismiss());

        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(300);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount);
    });

    test("confirm dialog shows post title", async ({ page }) => {
        let dialogMessage = "";
        page.on("dialog", async (dialog) => {
            dialogMessage = dialog.message();
            await dialog.accept();
        });

        const postTitle = await page.locator(".list-item").first().locator("h3").textContent();

        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(100);

        expect(dialogMessage).toContain(postTitle || "");
    });
});

test.describe("Posts - Feature Info Verification", () => {
    test("documents model.many(shape) collection pattern", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("model.many(shape)");
    });

    test("documents handle() without API", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("handle(async");
    });

    test("documents view.merge for multi-source views", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText('view.merge(["current", "list"], resolver)');
    });

    test("documents call-time commit.mode override", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("commit:");
        await expect(page.locator(".feature-info")).toContainText("ActionManyMode.ADD");
    });

    test("documents action.sort.data", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("action.sort.data");
    });

    test("documents action.sort.reset()", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("action.sort.reset()");
    });

    test("documents action({ body }) call-time payload", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("action({ body })");
    });
});
