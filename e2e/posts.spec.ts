import { test, expect } from "./fixtures";

/**
 * Posts Page E2E Tests
 *
 * Tests harlemify concepts demonstrated:
 * - Collection store pattern (Memory.units())
 * - Add mutation default position (Memory.units().add() - last)
 * - Edit mutation by indicator (Memory.units().edit())
 * - Drop mutation by indicator (Memory.units().drop())
 * - Monitor states (postMonitor.list.pending)
 * - Schema meta with actions
 * - useStoreAlias composable
 */

test.describe("Posts - Collection Store Pattern (Memory.units())", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });
    });

    test("loads collection data into units state on mount", async ({ page }) => {
        // Verify posts are loaded as array
        const posts = page.locator(".list-item");
        const count = await posts.count();

        expect(count).toBeGreaterThan(0);

        // Toolbar shows count
        const countText = await page.locator(".toolbar h2").textContent();
        expect(countText).toContain("posts");
    });

    test("units array is displayed in list layout", async ({ page }) => {
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

test.describe("Posts - Add Mutation Default Position (Memory.units().add())", () => {
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

test.describe("Posts - Edit Mutation by Indicator (Memory.units().edit())", () => {
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

    test("edit uses indicator (id) to find correct item", async ({ page }) => {
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

test.describe("Posts - Drop Mutation by Indicator (Memory.units().drop())", () => {
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

    test("delete uses indicator (id) to remove correct item", async ({ page }) => {
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

test.describe("Posts - Monitor States (postMonitor)", () => {
    test("loading state or content is visible on page load", async ({ page }) => {
        // Navigate to posts page
        await page.goto("/posts");

        // Wait for either loading or content to be visible
        await expect(page.locator(".loading, .list").first()).toBeVisible({ timeout: 10000 });
    });

    test("loading state disappears after successful fetch", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".loading")).not.toBeVisible();
        await expect(page.locator(".list")).toBeVisible();
    });

    test("monitor status section is visible", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator("[data-testid='monitor-status']")).toBeVisible();
    });

    test("list action shows success status after load", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        // Check that list monitor shows success state
        const listMonitor = page.locator(".monitor-item").filter({ hasText: "list" });
        await expect(listMonitor.locator("[data-status='success']")).toBeVisible();
        await expect(listMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("create action shows idle status initially", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        // Check that create monitor shows idle state (no create performed yet)
        const createMonitor = page.locator(".monitor-item").filter({ hasText: "create" });
        await expect(createMonitor.locator("[data-status='idle']")).toBeVisible();
        await expect(createMonitor.locator("[data-flag='idle']")).toBeVisible();
    });

    test("create action transitions to success after creating post", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        // Create a new post
        await page.locator("button", { hasText: "Add Post" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").fill("Monitor Test Post");
        await page.locator(".modal textarea").fill("Testing monitor state");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });

        // Check that create monitor shows success state
        const createMonitor = page.locator(".monitor-item").filter({ hasText: "create" });
        await expect(createMonitor.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
        await expect(createMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("update action transitions to success after editing post", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        // Edit first post
        await page.locator(".list-item").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").fill("Updated for Monitor Test");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });

        // Check that update monitor shows success state
        const updateMonitor = page.locator(".monitor-item").filter({ hasText: "update" });
        await expect(updateMonitor.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
        await expect(updateMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("delete action transitions to success after deleting post", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        page.on("dialog", (dialog) => dialog.accept());

        // Delete first post
        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        // Check that delete monitor shows success state
        const deleteMonitor = page.locator(".monitor-item").filter({ hasText: "delete" });
        await expect(deleteMonitor.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
        await expect(deleteMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("each action has independent monitor state", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        // After page load: list=success, create=idle, update=idle, delete=idle
        const listMonitor = page.locator(".monitor-item").filter({ hasText: "list" });
        const createMonitor = page.locator(".monitor-item").filter({ hasText: "create" });
        const updateMonitor = page.locator(".monitor-item").filter({ hasText: "update" });
        const deleteMonitor = page.locator(".monitor-item").filter({ hasText: "delete" });

        await expect(listMonitor.locator("[data-status='success']")).toBeVisible();
        await expect(createMonitor.locator("[data-status='idle']")).toBeVisible();
        await expect(updateMonitor.locator("[data-status='idle']")).toBeVisible();
        await expect(deleteMonitor.locator("[data-status='idle']")).toBeVisible();
    });

    test("monitor current value matches the active flag", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        // List should show success in both current value and flag
        const listMonitor = page.locator(".monitor-item").filter({ hasText: "list" });
        const currentValue = await listMonitor.locator(".monitor-state").textContent();

        expect(currentValue).toBe("success");
        await expect(listMonitor.locator("[data-flag='success']")).toBeVisible();
        await expect(listMonitor.locator("[data-flag='idle']")).not.toBeVisible();
        await expect(listMonitor.locator("[data-flag='pending']")).not.toBeVisible();
        await expect(listMonitor.locator("[data-flag='failed']")).not.toBeVisible();
    });
});

test.describe("Posts - useStoreAlias Composable", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });
    });

    test("posts (units) state is available", async ({ page }) => {
        const posts = page.locator(".list-item");
        await expect(posts.first()).toBeVisible();
    });

    test("listPost action is available", async ({ page }) => {
        // Page calls listPost on mount
        const countText = await page.locator(".toolbar h2").textContent();
        const count = parseInt(countText?.match(/\d+/)?.[0] || "0");

        expect(count).toBeGreaterThan(0);
    });

    test("createPost action is available", async ({ page }) => {
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

    test("updatePost action is available", async ({ page }) => {
        const originalTitle = await page.locator(".list-item").first().locator("h3").textContent();

        await page.locator(".list-item").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal", { timeout: 10000 });

        const testTitle = "Updated Post " + Date.now();
        await page.locator(".modal input").fill(testTitle);
        await page.locator(".modal button[type='submit']").click();

        // Wait for title to change (more reliable than waiting for modal)
        await expect(page.locator(".list-item").first().locator("h3")).not.toHaveText(originalTitle || "", {
            timeout: 10000,
        });

        await expect(page.locator(".list-item").first().locator("h3")).toContainText(testTitle);
    });

    test("deletePost action is available", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        page.on("dialog", (dialog) => dialog.accept());

        await page.locator(".list-item").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount - 1);
    });

    test("postMonitor namespace is available", async ({ page }) => {
        // Monitor is used for loading state - list is shown after loading
        await expect(page.locator(".list")).toBeVisible();
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
    test("documents Memory.units() collection pattern", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("Memory.units()");
    });

    test("documents Memory.units().add() append mutation", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("Memory.units().add()");
    });

    test("documents Memory.units().edit() update mutation", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("Memory.units().edit()");
    });

    test("documents Memory.units().drop() remove mutation", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("Memory.units().drop()");
    });

    test("documents postMonitor.[action].current()", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("postMonitor.[action].current()");
    });

    test("documents postMonitor.[action].idle()/pending()/success()/failed()", async ({ page }) => {
        await page.goto("/posts");
        await page.waitForSelector(".list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText(
            "postMonitor.[action].idle()/pending()/success()/failed()",
        );
    });
});
