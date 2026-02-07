import { test, expect } from "./fixtures";

/**
 * Users Page E2E Tests
 *
 * Tests harlemify concepts demonstrated:
 * - Collection store pattern: model.many(shape) with ActionManyMode
 * - Singleton state for selection: model.one(shape) with ActionOneMode
 * - Direct model mutation: model("current", ActionOneMode.SET, user)
 * - Collection mutations: ActionManyMode.ADD / PATCH / REMOVE / RESET
 * - Merged views: view.merge(["current", "list"], resolver)
 * - Standalone commit: commit("list", ActionManyMode.RESET)
 * - Commit options: { unique: true }, { by: "email" }
 * - Action properties: action.list.data, action.list.reset()
 * - Store destructured API: { model, view, action }
 */

test.describe("Users - Collection Store (model.many())", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("loads collection data into many() state on mount", async ({ page }) => {
        // Verify users are loaded as array (many), not single object
        const cards = page.locator(".grid .card");
        const count = await cards.count();

        expect(count).toBeGreaterThan(0);

        // Toolbar shows count
        const countText = await page.locator(".toolbar h2").textContent();
        expect(countText).toContain(`${count} users`);
    });

    test("each item has required schema fields", async ({ page }) => {
        // Select first user to see detailed data
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");

        const rawData = await page.locator("[data-testid='selected-user'] pre").textContent();
        const user = JSON.parse(rawData || "{}");

        // User should have all schema-defined fields
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("email");
        expect(typeof user.id).toBe("number");
        expect(typeof user.name).toBe("string");
        expect(typeof user.email).toBe("string");
    });

    test("collection state is displayed in grid layout", async ({ page }) => {
        // All cards should display user info from many() array
        const firstCard = page.locator(".card").first();

        await expect(firstCard.locator("h3")).toBeVisible(); // name
        await expect(firstCard.locator(".subtitle")).toBeVisible(); // email
    });
});

test.describe("Users - Singleton State for Selection (model.one())", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("one() state is null initially (no selection)", async ({ page }) => {
        // Detail section should not be visible when no user selected
        await expect(page.locator("[data-testid='selected-user']")).not.toBeVisible();
    });

    test("selecting user populates one() state via action.get", async ({ page }) => {
        // Click View on first user
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector("[data-testid='selected-user']");

        // Detail should show selected user
        const rawData = await page.locator("[data-testid='selected-user'] pre").textContent();
        const user = JSON.parse(rawData || "{}");

        expect(user.id).toBeDefined();
        expect(user.name).toBeDefined();
    });

    test("selecting different user updates one() state", async ({ page }) => {
        // Select first user
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector("[data-testid='selected-user']", { timeout: 10000 });

        const firstUserData = await page.locator("[data-testid='selected-user'] pre").textContent();
        const firstUser = JSON.parse(firstUserData || "{}");
        const firstUserId = firstUser.id;

        // Get second user's email
        const secondUserEmail = await page.locator(".card").nth(1).locator(".subtitle").textContent();

        // Select second user
        await page.locator(".card").nth(1).locator("button", { hasText: "View" }).click();

        // Wait for the detail to show the second user's email
        await expect(page.locator("[data-testid='selected-user'] pre")).toContainText(secondUserEmail || "", {
            timeout: 10000,
        });

        const secondUserData = await page.locator("[data-testid='selected-user'] pre").textContent();
        const secondUser = JSON.parse(secondUserData || "{}");

        // Should be different users
        expect(secondUser.id).not.toBe(firstUserId);
    });

    test("one() and many() are independent states", async ({ page }) => {
        // Get initial count
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Select a user (populates one)
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector("[data-testid='selected-user']");

        // Collection count should be unchanged
        const countAfterSelect = await page.locator(".toolbar h2").textContent();
        const countAfter = parseInt(countAfterSelect?.match(/\d+/)?.[0] || "0");

        expect(countAfter).toBe(initialCount);
    });
});

test.describe("Users - Direct Model Mutation (model('current', ActionOneMode.RESET))", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("model reset clears one() state", async ({ page }) => {
        // Select a user first
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector("[data-testid='selected-user']");

        // Click Clear button (calls model("current", ActionOneMode.RESET))
        await page.locator("[data-testid='selected-user'] button", { hasText: "Clear" }).click();

        // Detail should be hidden (one() is null)
        await expect(page.locator("[data-testid='selected-user']")).not.toBeVisible();
    });

    test("clearing one() does not affect many() array", async ({ page }) => {
        // Get initial count
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Select and clear
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector("[data-testid='selected-user']");
        await page.locator("[data-testid='selected-user'] button", { hasText: "Clear" }).click();

        // Count should be unchanged
        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount);
    });
});

test.describe("Users - Collection Mutations (ActionManyMode.ADD/PATCH/REMOVE)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("ActionManyMode.ADD - create adds new item to collection", async ({ page }) => {
        // Get initial count
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Create new user
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        const newName = "E2E User " + Date.now();
        const newEmail = `e2e-${Date.now()}@test.com`;

        await page.locator(".modal input").first().fill(newName);
        await page.locator(".modal input[type='email']").fill(newEmail);
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // Count should increase
        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount + 1);
    });

    test("ActionManyMode.ADD - new item appears in grid", async ({ page }) => {
        // Create new user with unique name
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        const uniqueName = "UniqueUser" + Date.now();
        await page.locator(".modal input").first().fill(uniqueName);
        await page.locator(".modal input[type='email']").fill("unique@test.com");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // New user should be visible in grid
        await expect(page.locator(".card h3", { hasText: uniqueName })).toBeVisible();
    });

    test("ActionManyMode.PATCH - update modifies existing item", async ({ page }) => {
        // Get first user's current name
        const originalName = await page.locator(".card").first().locator("h3").textContent();

        // Edit first user
        await page.locator(".card").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        const updatedName = "Updated " + Date.now();
        await page.locator(".modal input").first().fill(updatedName);
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // First card should show updated name
        const newName = await page.locator(".card").first().locator("h3").textContent();
        expect(newName).toBe(updatedName);
        expect(newName).not.toBe(originalName);
    });

    test("ActionManyMode.PATCH - preserves other items unchanged", async ({ page }) => {
        // Get second user's name before edit
        const secondUserName = await page.locator(".card").nth(1).locator("h3").textContent();

        // Edit first user
        await page.locator(".card").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal", { timeout: 10000 });

        const newFirstName = "Changed First " + Date.now();
        await page.locator(".modal input").first().fill(newFirstName);
        await page.locator(".modal button[type='submit']").click();

        // Wait for first card to update
        await expect(page.locator(".card").first().locator("h3")).toContainText(newFirstName, { timeout: 10000 });

        // Second user should be unchanged
        const secondUserNameAfter = await page.locator(".card").nth(1).locator("h3").textContent();
        expect(secondUserNameAfter).toBe(secondUserName);
    });

    test("ActionManyMode.REMOVE - delete removes item from collection", async ({ page }) => {
        // Get initial count
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Handle confirm dialog
        page.on("dialog", (dialog) => dialog.accept());

        // Delete first user
        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        // Count should decrease
        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount - 1);
    });

    test("ActionManyMode.REMOVE - deleted item no longer in grid", async ({ page }) => {
        // Get initial count and first user's name
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");
        const deletedUserName = await page.locator(".card").first().locator("h3").textContent();

        // Handle confirm dialog
        page.on("dialog", (dialog) => dialog.accept());

        // Delete first user
        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();

        // Wait for count to decrease
        await expect(page.locator(".toolbar h2")).toContainText(`${initialCount - 1} users`, { timeout: 10000 });

        // First card should now show a different user
        const newFirstUserName = await page.locator(".card").first().locator("h3").textContent();
        expect(newFirstUserName).not.toBe(deletedUserName);
    });

    test("ActionManyMode.RESET - clear all empties the collection", async ({ page }) => {
        // Click Clear All button (calls action.clear which commits RESET)
        await page.locator("button", { hasText: "Clear All" }).click();
        await page.waitForTimeout(500);

        // Count should be 0
        const countText = await page.locator(".toolbar h2").textContent();
        expect(countText).toContain("0 users");
    });
});

test.describe("Users - Store Destructured API ({ model, view, action })", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("view.user (one) state is available", async ({ page }) => {
        // Select a user to populate one()
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector("[data-testid='selected-user']");

        // user state should be displayed
        await expect(page.locator("[data-testid='selected-user'] pre")).toBeVisible();
    });

    test("view.users (many) state is available", async ({ page }) => {
        // Grid displays users from many() array
        const cards = page.locator(".grid .card");
        await expect(cards.first()).toBeVisible();
    });

    test("action.get is available", async ({ page }) => {
        // View button calls action.get
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector("[data-testid='selected-user']");

        // Action should populate one()
        await expect(page.locator("[data-testid='selected-user'] pre")).toContainText('"id":');
    });

    test("action.list is available", async ({ page }) => {
        // Page calls action.list on mount - verify it worked
        const countText = await page.locator(".toolbar h2").textContent();
        const count = parseInt(countText?.match(/\d+/)?.[0] || "0");

        expect(count).toBeGreaterThan(0);
    });

    test("action.create is available", async ({ page }) => {
        // Add User form calls action.create
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").first().fill("Create Action Test");
        await page.locator(".modal input[type='email']").fill("create@test.com");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        await expect(page.locator(".card h3", { hasText: "Create Action Test" })).toBeVisible();
    });

    test("action.update is available", async ({ page }) => {
        // Get first user's current email for reliable identification
        const originalEmail = await page.locator(".card").first().locator(".subtitle").textContent();

        // Edit calls action.update
        await page.locator(".card").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal", { timeout: 15000 });

        const testName = "UpdatedUser" + Date.now();
        await page.locator(".modal input").first().clear();
        await page.locator(".modal input").first().fill(testName);
        await page.locator(".modal button[type='submit']").click();

        // Wait for the card with same email to have new name
        const cardWithEmail = page.locator(".card", { has: page.locator(`.subtitle:text("${originalEmail}")`) });
        await expect(cardWithEmail.locator("h3")).toHaveText(testName, { timeout: 15000 });
    });

    test("action.delete is available", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        page.on("dialog", (dialog) => dialog.accept());
        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount - 1);
    });

    test("model() direct mutation is available", async ({ page }) => {
        // Clear button calls model("current", ActionOneMode.RESET)
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();

        // Wait for detail to appear with user data
        await expect(page.locator("[data-testid='selected-user'] pre")).toContainText('"id":', { timeout: 10000 });

        // model reset should work
        await page.locator("[data-testid='selected-user'] button", { hasText: "Clear" }).click();
        await expect(page.locator("[data-testid='selected-user']")).not.toBeVisible({ timeout: 10000 });
    });

    test("view.summary merged view is available", async ({ page }) => {
        // Merged view section should be visible
        await expect(page.locator("[data-testid='merged-summary']")).toBeVisible();

        const summaryData = await page.locator("[data-testid='merged-summary'] pre").textContent();
        const summary = JSON.parse(summaryData || "{}");

        expect(summary).toHaveProperty("selected");
        expect(summary).toHaveProperty("total");
        expect(summary).toHaveProperty("emails");
    });

    test("action status section is visible", async ({ page }) => {
        await expect(page.locator("[data-testid='action-status']")).toBeVisible();
    });

    test("list action shows success status after load", async ({ page }) => {
        // Check that list action shows success state
        const listStatus = page.locator("[data-testid='status-list']");
        await expect(listStatus.locator("[data-status='success']")).toBeVisible();
    });

    test("get action shows idle status initially", async ({ page }) => {
        // Check that get action shows idle state (no get performed yet)
        const getStatus = page.locator("[data-testid='status-get']");
        await expect(getStatus.locator("[data-status='idle']")).toBeVisible();
    });

    test("get action transitions to success after viewing user", async ({ page }) => {
        // View first user
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector("[data-testid='selected-user']");

        // Check that get action shows success state
        const getStatus = page.locator("[data-testid='status-get']");
        await expect(getStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("create action transitions to success after creating user", async ({ page }) => {
        // Create a new user
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").first().fill("Monitor Test User");
        await page.locator(".modal input[type='email']").fill("monitor@test.com");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });

        // Check that create action shows success state
        const createStatus = page.locator("[data-testid='status-create']");
        await expect(createStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("update action transitions to success after editing user", async ({ page }) => {
        // Edit first user
        await page.locator(".card").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").first().fill("Updated Monitor User");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });

        // Check that update action shows success state
        const updateStatus = page.locator("[data-testid='status-update']");
        await expect(updateStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("delete action transitions to success after deleting user", async ({ page }) => {
        page.on("dialog", (dialog) => dialog.accept());

        // Delete first user
        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        // Check that delete action shows success state
        const deleteStatus = page.locator("[data-testid='status-delete']");
        await expect(deleteStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("each action has independent status state", async ({ page }) => {
        // After page load: list=success, get=idle, create=idle, update=idle, delete=idle
        const listStatus = page.locator("[data-testid='status-list']");
        const getStatus = page.locator("[data-testid='status-get']");
        const createStatus = page.locator("[data-testid='status-create']");
        const updateStatus = page.locator("[data-testid='status-update']");
        const deleteStatus = page.locator("[data-testid='status-delete']");

        await expect(listStatus.locator("[data-status='success']")).toBeVisible();
        await expect(getStatus.locator("[data-status='idle']")).toBeVisible();
        await expect(createStatus.locator("[data-status='idle']")).toBeVisible();
        await expect(updateStatus.locator("[data-status='idle']")).toBeVisible();
        await expect(deleteStatus.locator("[data-status='idle']")).toBeVisible();
    });
});

test.describe("Users - Modal Behavior", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("modal can be closed by clicking overlay", async ({ page }) => {
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal-overlay").click({ position: { x: 10, y: 10 } });

        await expect(page.locator(".modal")).not.toBeVisible();
    });

    test("modal can be closed by cancel button", async ({ page }) => {
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal button", { hasText: "Cancel" }).click();

        await expect(page.locator(".modal")).not.toBeVisible();
    });

    test("edit modal pre-fills form with current data", async ({ page }) => {
        const userName = await page.locator(".card").first().locator("h3").textContent();
        const userEmail = await page.locator(".card").first().locator(".subtitle").textContent();

        await page.locator(".card").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        const nameInput = page.locator(".modal input").first();
        const emailInput = page.locator(".modal input[type='email']");

        await expect(nameInput).toHaveValue(userName || "");
        await expect(emailInput).toHaveValue(userEmail || "");
    });

    test("create modal has empty form", async ({ page }) => {
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        const nameInput = page.locator(".modal input").first();
        const emailInput = page.locator(".modal input[type='email']");

        await expect(nameInput).toHaveValue("");
        await expect(emailInput).toHaveValue("");
    });

    test("form validation prevents empty submission", async ({ page }) => {
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal button[type='submit']").click();

        // Modal should still be open
        await expect(page.locator(".modal")).toBeVisible();
    });
});

test.describe("Users - Delete Confirmation", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("canceling delete keeps user in list", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        page.on("dialog", (dialog) => dialog.dismiss());

        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(300);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount);
    });

    test("confirm dialog shows user name", async ({ page }) => {
        let dialogMessage = "";
        page.on("dialog", async (dialog) => {
            dialogMessage = dialog.message();
            await dialog.accept();
        });

        const userName = await page.locator(".card").first().locator("h3").textContent();

        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(100);

        expect(dialogMessage).toContain(userName || "");
    });
});

test.describe("Users - Feature Info Verification", () => {
    test("documents model.many(shape) collection pattern", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("model.many(shape)");
    });

    test("documents ActionManyMode.SET", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("ActionManyMode.SET");
    });

    test("documents ActionManyMode.ADD", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("ActionManyMode.ADD");
    });

    test("documents ActionManyMode.PATCH", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("ActionManyMode.PATCH");
    });

    test("documents ActionManyMode.REMOVE", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("ActionManyMode.REMOVE");
    });

    test("documents ActionManyMode.RESET", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("ActionManyMode.RESET");
    });

    test("documents direct model mutation", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText('model("current", ActionOneMode.SET, user)');
    });

    test("documents view.merge for multi-source views", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText('view.merge(["current", "list"], resolver)');
    });

    test("documents commit with unique option", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("{ unique: true }");
    });

    test("documents commit with by option", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText('{ by: "email" }');
    });

    test("documents action.list.data", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("action.list.data");
    });

    test("documents action.list.reset()", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("action.list.reset()");
    });
});
