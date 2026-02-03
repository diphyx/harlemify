import { test, expect } from "./fixtures";

/**
 * Users Page E2E Tests
 *
 * Tests harlemify concepts demonstrated:
 * - Collection store pattern (Memory.units())
 * - Unit state for single selection (Memory.unit())
 * - Custom adapters (Endpoint.withAdapter(detailAdapter))
 * - Store-level adapter (createStore(..., { adapter }))
 * - Memory API direct mutation (userMemory.set(null))
 * - Collection mutations: add, edit, drop
 * - useStoreAlias composable
 */

test.describe("Users - Collection Store Pattern (Memory.units())", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("loads collection data into units state on mount", async ({ page }) => {
        // Verify users are loaded as array (units), not single object
        const cards = page.locator(".grid .card");
        const count = await cards.count();

        expect(count).toBeGreaterThan(0);

        // Toolbar shows count
        const countText = await page.locator(".toolbar h2").textContent();
        expect(countText).toContain(`${count} users`);
    });

    test("each item in units has required schema fields", async ({ page }) => {
        // Select first user to see detailed data
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");

        const rawData = await page.locator(".detail pre").textContent();
        const user = JSON.parse(rawData || "{}");

        // User should have all schema-defined fields
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("email");
        expect(typeof user.id).toBe("number");
        expect(typeof user.name).toBe("string");
        expect(typeof user.email).toBe("string");
    });

    test("units state is displayed in grid layout", async ({ page }) => {
        // All cards should display user info from units array
        const firstCard = page.locator(".card").first();

        await expect(firstCard.locator("h3")).toBeVisible(); // name
        await expect(firstCard.locator(".subtitle")).toBeVisible(); // email
    });
});

test.describe("Users - Unit State for Selection (Memory.unit())", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("unit state is null initially (no selection)", async ({ page }) => {
        // Detail section should not be visible when no user selected
        await expect(page.locator(".detail")).not.toBeVisible();
    });

    test("selecting user populates unit state", async ({ page }) => {
        // Click View on first user
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");

        // Detail should show selected user
        const rawData = await page.locator(".detail pre").textContent();
        const user = JSON.parse(rawData || "{}");

        expect(user.id).toBeDefined();
        expect(user.name).toBeDefined();
    });

    test("selecting different user updates unit state", async ({ page }) => {
        // Select first user
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail", { timeout: 10000 });

        const firstUserData = await page.locator(".detail pre").textContent();
        const firstUser = JSON.parse(firstUserData || "{}");
        const firstUserId = firstUser.id;

        // Get second user's email (more unique than name which might have been edited)
        const secondUserEmail = await page.locator(".card").nth(1).locator(".subtitle").textContent();

        // Select second user
        await page.locator(".card").nth(1).locator("button", { hasText: "View" }).click();

        // Wait for the detail to show the second user's email
        await expect(page.locator(".detail pre")).toContainText(secondUserEmail || "", { timeout: 10000 });

        const secondUserData = await page.locator(".detail pre").textContent();
        const secondUser = JSON.parse(secondUserData || "{}");

        // Should be different users
        expect(secondUser.id).not.toBe(firstUserId);
    });

    test("unit and units are independent states", async ({ page }) => {
        // Get initial units count
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Select a user (populates unit)
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");

        // Units count should be unchanged
        const countAfterSelect = await page.locator(".toolbar h2").textContent();
        const countAfter = parseInt(countAfterSelect?.match(/\d+/)?.[0] || "0");

        expect(countAfter).toBe(initialCount);
    });
});

test.describe("Users - Memory API Direct Mutation (userMemory.set)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("userMemory.set(null) clears unit state", async ({ page }) => {
        // Select a user first
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");

        // Click Clear button (calls userMemory.set(null))
        await page.locator(".detail button", { hasText: "Clear" }).click();

        // Detail should be hidden (unit is null)
        await expect(page.locator(".detail")).not.toBeVisible();
    });

    test("clearing unit does not affect units array", async ({ page }) => {
        // Get initial count
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Select and clear
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");
        await page.locator(".detail button", { hasText: "Clear" }).click();

        // Count should be unchanged
        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount);
    });
});

test.describe("Users - Collection Mutations (Memory.units().add/edit/drop)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("Memory.units().add() - create adds new item to collection", async ({ page }) => {
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

    test("Memory.units().add() - new item appears in grid", async ({ page }) => {
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

    test("Memory.units().edit() - update modifies existing item", async ({ page }) => {
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

    test("Memory.units().edit() - preserves other items unchanged", async ({ page }) => {
        // Get second user's name before edit
        const secondUserName = await page.locator(".card").nth(1).locator("h3").textContent();

        // Edit first user
        await page.locator(".card").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal", { timeout: 10000 });

        const newFirstName = "Changed First " + Date.now();
        await page.locator(".modal input").first().fill(newFirstName);
        await page.locator(".modal button[type='submit']").click();

        // Wait for first card to update (more reliable than waiting for modal to close)
        await expect(page.locator(".card").first().locator("h3")).toContainText(newFirstName, { timeout: 10000 });

        // Second user should be unchanged
        const secondUserNameAfter = await page.locator(".card").nth(1).locator("h3").textContent();
        expect(secondUserNameAfter).toBe(secondUserName);
    });

    test("Memory.units().drop() - delete removes item from collection", async ({ page }) => {
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

    test("Memory.units().drop() - deleted item no longer in grid", async ({ page }) => {
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
});

test.describe("Users - Custom Adapters (Endpoint.withAdapter)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("get action uses detailAdapter (endpoint-level adapter)", async ({ page }) => {
        // The detailAdapter logs to console - verify the action works
        // This tests that endpoint-level adapter is applied via .withAdapter()
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");

        // Data should be fetched successfully via detailAdapter
        const rawData = await page.locator(".detail pre").textContent();
        const user = JSON.parse(rawData || "{}");

        expect(user.id).toBeDefined();
        expect(user.name).toBeDefined();
    });

    test("list action uses store-level loggingAdapter", async ({ page }) => {
        // The loggingAdapter is set at store level
        // List action should use it (since no endpoint-level adapter)
        // Verify list worked correctly
        const cards = page.locator(".grid .card");
        const count = await cards.count();

        expect(count).toBeGreaterThan(0);
    });

    test("create action inherits store-level adapter", async ({ page }) => {
        // Create should use store-level loggingAdapter
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").first().fill("Adapter Test User");
        await page.locator(".modal input[type='email']").fill("adapter@test.com");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // User should be created (adapter worked)
        await expect(page.locator(".card h3", { hasText: "Adapter Test User" })).toBeVisible();
    });
});

test.describe("Users - useStoreAlias Composable", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("user (unit) state is available", async ({ page }) => {
        // Select a user to populate unit
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");

        // user state should be displayed
        await expect(page.locator(".detail pre")).toBeVisible();
    });

    test("users (units) state is available", async ({ page }) => {
        // Grid displays users from units array
        const cards = page.locator(".grid .card");
        await expect(cards.first()).toBeVisible();
    });

    test("getUser action is available", async ({ page }) => {
        // View button calls getUser
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");

        // Action should populate unit
        await expect(page.locator(".detail pre")).toContainText('"id":');
    });

    test("listUser action is available", async ({ page }) => {
        // Page calls listUser on mount - verify it worked
        const countText = await page.locator(".toolbar h2").textContent();
        const count = parseInt(countText?.match(/\d+/)?.[0] || "0");

        expect(count).toBeGreaterThan(0);
    });

    test("createUser action is available", async ({ page }) => {
        // Add User form calls createUser
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").first().fill("Create Action Test");
        await page.locator(".modal input[type='email']").fill("create@test.com");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        await expect(page.locator(".card h3", { hasText: "Create Action Test" })).toBeVisible();
    });

    test("updateUser action is available", async ({ page }) => {
        // Get first user's current email for more reliable identification
        const originalEmail = await page.locator(".card").first().locator(".subtitle").textContent();

        // Edit calls updateUser
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

    test("deleteUser action is available", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        page.on("dialog", (dialog) => dialog.accept());
        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount - 1);
    });

    test("userMemory namespace is available", async ({ page }) => {
        // Clear button calls userMemory.set(null)
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();

        // Wait for detail to appear with user data
        await expect(page.locator(".detail pre")).toContainText('"id":', { timeout: 10000 });

        // userMemory.set(null) should work
        await page.locator(".detail button", { hasText: "Clear" }).click();
        await expect(page.locator(".detail")).not.toBeVisible({ timeout: 10000 });
    });

    test("userMonitor namespace is available", async ({ page }) => {
        // Monitor is used for loading state - page shows grid after loading
        // This verifies userMonitor.list.pending works
        await expect(page.locator(".grid")).toBeVisible();
    });

    test("monitor status section is visible", async ({ page }) => {
        await expect(page.locator("[data-testid='monitor-status']")).toBeVisible();
    });

    test("list action shows success status after load", async ({ page }) => {
        // Check that list monitor shows success state
        const listMonitor = page.locator(".monitor-item").filter({ hasText: "list" });
        await expect(listMonitor.locator("[data-status='success']")).toBeVisible();
        await expect(listMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("get action shows idle status initially", async ({ page }) => {
        // Check that get monitor shows idle state (no get performed yet)
        const getMonitor = page.locator(".monitor-item").filter({ hasText: "get" });
        await expect(getMonitor.locator("[data-status='idle']")).toBeVisible();
        await expect(getMonitor.locator("[data-flag='idle']")).toBeVisible();
    });

    test("get action transitions to success after viewing user", async ({ page }) => {
        // View first user
        await page.locator(".card").first().locator("button", { hasText: "View" }).click();
        await page.waitForSelector(".detail");

        // Check that get monitor shows success state
        const getMonitor = page.locator(".monitor-item").filter({ hasText: "get" });
        await expect(getMonitor.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
        await expect(getMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("create action transitions to success after creating user", async ({ page }) => {
        // Create a new user
        await page.locator("button", { hasText: "Add User" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").first().fill("Monitor Test User");
        await page.locator(".modal input[type='email']").fill("monitor@test.com");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });

        // Check that create monitor shows success state
        const createMonitor = page.locator(".monitor-item").filter({ hasText: "create" });
        await expect(createMonitor.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
        await expect(createMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("update action transitions to success after editing user", async ({ page }) => {
        // Edit first user
        await page.locator(".card").first().locator("button", { hasText: "Edit" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").first().fill("Updated Monitor User");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });

        // Check that update monitor shows success state
        const updateMonitor = page.locator(".monitor-item").filter({ hasText: "update" });
        await expect(updateMonitor.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
        await expect(updateMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("delete action transitions to success after deleting user", async ({ page }) => {
        page.on("dialog", (dialog) => dialog.accept());

        // Delete first user
        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();
        await page.waitForTimeout(500);

        // Check that delete monitor shows success state
        const deleteMonitor = page.locator(".monitor-item").filter({ hasText: "delete" });
        await expect(deleteMonitor.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
        await expect(deleteMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("each action has independent monitor state", async ({ page }) => {
        // After page load: list=success, get=idle, create=idle, update=idle, delete=idle
        const listMonitor = page.locator(".monitor-item").filter({ hasText: "list" });
        const getMonitor = page.locator(".monitor-item").filter({ hasText: "get" });
        const createMonitor = page.locator(".monitor-item").filter({ hasText: "create" });
        const updateMonitor = page.locator(".monitor-item").filter({ hasText: "update" });
        const deleteMonitor = page.locator(".monitor-item").filter({ hasText: "delete" });

        await expect(listMonitor.locator("[data-status='success']")).toBeVisible();
        await expect(getMonitor.locator("[data-status='idle']")).toBeVisible();
        await expect(createMonitor.locator("[data-status='idle']")).toBeVisible();
        await expect(updateMonitor.locator("[data-status='idle']")).toBeVisible();
        await expect(deleteMonitor.locator("[data-status='idle']")).toBeVisible();
    });

    test("monitor current value matches the active flag", async ({ page }) => {
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
    test("documents Endpoint.withAdapter for custom adapters", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("Endpoint.withAdapter");
    });

    test("documents createStore adapter option", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("createStore");
        await expect(page.locator(".feature-info")).toContainText("adapter");
    });

    test("documents getSchemaFields", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("getSchemaFields(schema)");
    });

    test("documents getFieldsForAction", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("getFieldsForAction(schema, action)");
    });

    test("documents schema meta indicator", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("meta({ indicator: true })");
    });

    test("documents userMemory.set(null)", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("userMemory.set(null)");
    });

    test("documents userMonitor.[action].current()", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("userMonitor.[action].current()");
    });

    test("documents userMonitor.[action].idle()/pending()/success()/failed()", async ({ page }) => {
        await page.goto("/users");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText(
            "userMonitor.[action].idle()/pending()/success()/failed()",
        );
    });
});
