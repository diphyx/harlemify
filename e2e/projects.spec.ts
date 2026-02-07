import { test, expect } from "./fixtures";

/**
 * Projects Page E2E Tests
 *
 * Tests harlemify concepts demonstrated:
 * - Full action chain: api.get().handle().commit()
 * - Custom handle with nested commit: handle(async ({ api, commit, view }) => ...)
 * - Nested field update: commit("current", ActionOneMode.PATCH, { milestones })
 * - Deep merge: commit(..., { deep: true })
 * - Prepend on add: ActionManyMode.ADD, { prepend: true }
 * - Action without memory: export returns data without committing to model
 * - Call-time payload: action({ query, headers })
 * - ActionConcurrent modes: BLOCK/SKIP/CANCEL/ALLOW
 * - Call-time transformer: action({ transformer: fn })
 * - Cancellable requests: action({ signal: abortController.signal })
 * - Isolated status/error: action({ bind: { status, error } })
 * - Error handling: action.error reactive state with typed ActionError
 */

test.describe("Projects - Nested Field Updates (handle + commit)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        // Select first project
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");
        // Wait for the project data to load
        await expect(page.locator(".state-section pre")).toContainText('"id":', { timeout: 5000 });
    });

    test("handle + commit loads milestones into nested field", async ({ page }) => {
        // Click Load Milestones
        await page.locator("button", { hasText: "Load Milestones" }).click();
        // Wait for milestones to load
        await expect(page.locator(".state-section pre")).toContainText('"done":', { timeout: 5000 });

        // Verify milestones field is populated
        const rawData = await page.locator(".state-section pre").textContent();
        const project = JSON.parse(rawData || "{}");

        expect(project.milestones).toBeDefined();
        expect(Array.isArray(project.milestones)).toBe(true);
        expect(project.milestones.length).toBeGreaterThan(0);

        // Each milestone should have expected structure
        const milestone = project.milestones[0];
        expect(milestone).toHaveProperty("id");
        expect(milestone).toHaveProperty("name");
        expect(milestone).toHaveProperty("done");
    });

    test("nested commit preserves other project fields", async ({ page }) => {
        // Get initial state
        const initialRawData = await page.locator(".state-section pre").textContent();
        const initialProject = JSON.parse(initialRawData || "{}");

        // Load milestones
        await page.locator("button", { hasText: "Load Milestones" }).click();
        await page.waitForTimeout(500);

        // Get updated state
        const updatedRawData = await page.locator(".state-section pre").textContent();
        const updatedProject = JSON.parse(updatedRawData || "{}");

        // Other fields should be preserved
        expect(updatedProject.id).toBe(initialProject.id);
        expect(updatedProject.name).toBe(initialProject.name);
        expect(updatedProject.description).toBe(initialProject.description);
        expect(updatedProject.active).toBe(initialProject.active);
    });

    test("handle + commit loads meta nested object into field", async ({ page }) => {
        // Click Load Meta
        await page.locator("button", { hasText: "Load Meta" }).click();
        await page.waitForTimeout(500);

        // Verify meta field is populated
        const rawData = await page.locator(".state-section pre").textContent();
        const project = JSON.parse(rawData || "{}");

        expect(project.meta).toBeDefined();
        expect(typeof project.meta).toBe("object");
        expect(project.meta).toHaveProperty("deadline");
        expect(project.meta).toHaveProperty("budget");
        expect(project.meta).toHaveProperty("options");
    });

    test("sequential handle + commit preserves previously loaded fields", async ({ page }) => {
        // Load milestones first
        await page.locator("button", { hasText: "Load Milestones" }).click();
        await page.waitForTimeout(500);

        const afterMilestones = await page.locator(".state-section pre").textContent();
        const projectAfterMilestones = JSON.parse(afterMilestones || "{}");
        const milestonesCount = projectAfterMilestones.milestones?.length;

        // Load meta
        await page.locator("button", { hasText: "Load Meta" }).click();
        await page.waitForTimeout(500);

        // Milestones should still be there
        const afterMeta = await page.locator(".state-section pre").textContent();
        const projectAfterMeta = JSON.parse(afterMeta || "{}");

        expect(projectAfterMeta.milestones).toBeDefined();
        expect(projectAfterMeta.milestones.length).toBe(milestonesCount);
    });
});

test.describe("Projects - Deep Merge (commit with { deep: true })", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        // Select first project
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");
    });

    test("deep patch loads options into meta.options path", async ({ page }) => {
        // First load meta to have the parent structure
        await page.locator("button", { hasText: "Load Meta" }).click();
        await page.waitForTimeout(500);

        // Then load options (uses deep: true)
        await page.locator("button", { hasText: "Load Options" }).click();
        await page.waitForTimeout(500);

        // Verify options is populated within meta
        const rawData = await page.locator(".state-section pre").textContent();
        const project = JSON.parse(rawData || "{}");

        expect(project.meta).toBeDefined();
        expect(project.meta.options).toBeDefined();
        expect(project.meta.options).toHaveProperty("notify");
        expect(project.meta.options).toHaveProperty("priority");
        expect(typeof project.meta.options.notify).toBe("boolean");
        expect(typeof project.meta.options.priority).toBe("number");
    });

    test("deep patch preserves sibling fields in meta", async ({ page }) => {
        // Load meta first
        await page.locator("button", { hasText: "Load Meta" }).click();
        await page.waitForTimeout(500);

        const afterMeta = await page.locator(".state-section pre").textContent();
        const projectAfterMeta = JSON.parse(afterMeta || "{}");
        const deadline = projectAfterMeta.meta?.deadline;
        const budget = projectAfterMeta.meta?.budget;

        // Load options (deep patch nested in meta)
        await page.locator("button", { hasText: "Load Options" }).click();
        await page.waitForTimeout(500);

        // Verify deadline and budget are preserved
        const afterOptions = await page.locator(".state-section pre").textContent();
        const projectAfterOptions = JSON.parse(afterOptions || "{}");

        expect(projectAfterOptions.meta.deadline).toBe(deadline);
        expect(projectAfterOptions.meta.budget).toBe(budget);
    });

    test("deep patch updates only target field, not entire object", async ({ page }) => {
        // Load meta
        await page.locator("button", { hasText: "Load Meta" }).click();
        await page.waitForTimeout(500);

        // Get project name before loading options
        const beforeOptions = await page.locator(".state-section pre").textContent();
        const projectBefore = JSON.parse(beforeOptions || "{}");
        const nameBefore = projectBefore.name;

        // Load options
        await page.locator("button", { hasText: "Load Options" }).click();
        await page.waitForTimeout(500);

        // Project name should be unchanged
        const afterOptions = await page.locator(".state-section pre").textContent();
        const projectAfter = JSON.parse(afterOptions || "{}");

        expect(projectAfter.name).toBe(nameBefore);
    });
});

test.describe("Projects - Add with Prepend (ActionManyMode.ADD, { prepend: true })", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("new project is prepended to list", async ({ page }) => {
        // Get first project name before create
        const firstNameBefore = await page.locator(".card").first().locator("h3").textContent();

        // Create new project
        await page.locator("button", { hasText: "Add Project" }).click();
        await page.waitForSelector(".modal");

        const newName = "First Project " + Date.now();
        await page.locator(".modal input").first().fill(newName);
        await page.locator(".modal input").nth(1).fill("Test description");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // New project should be FIRST in list
        const firstNameAfter = await page.locator(".card").first().locator("h3").textContent();

        expect(firstNameAfter).toBe(newName);
        expect(firstNameAfter).not.toBe(firstNameBefore);
    });

    test("multiple creates prepend in correct order", async ({ page }) => {
        // Create first project
        await page.locator("button", { hasText: "Add Project" }).click();
        await page.waitForSelector(".modal");
        await page.locator(".modal input").first().fill("Project A");
        await page.locator(".modal input").nth(1).fill("Desc A");
        await page.locator(".modal button[type='submit']").click();
        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(300);

        // Create second project
        await page.locator("button", { hasText: "Add Project" }).click();
        await page.waitForSelector(".modal");
        await page.locator(".modal input").first().fill("Project B");
        await page.locator(".modal input").nth(1).fill("Desc B");
        await page.locator(".modal button[type='submit']").click();
        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(300);

        // Project B should be first (most recently added)
        // Project A should be second
        const firstName = await page.locator(".card").first().locator("h3").textContent();
        const secondName = await page.locator(".card").nth(1).locator("h3").textContent();

        expect(firstName).toBe("Project B");
        expect(secondName).toBe("Project A");
    });

    test("existing projects shift down when new project added", async ({ page }) => {
        // Get current first two project names
        const originalFirst = await page.locator(".card").first().locator("h3").textContent();
        const originalSecond = await page.locator(".card").nth(1).locator("h3").textContent();

        // Create new project
        await page.locator("button", { hasText: "Add Project" }).click();
        await page.waitForSelector(".modal");
        await page.locator(".modal input").first().fill("New First");
        await page.locator(".modal button[type='submit']").click();
        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        // Original first should now be second
        // Original second should now be third
        const newSecond = await page.locator(".card").nth(1).locator("h3").textContent();
        const newThird = await page.locator(".card").nth(2).locator("h3").textContent();

        expect(newSecond).toBe(originalFirst);
        expect(newThird).toBe(originalSecond);
    });
});

test.describe("Projects - Action Without Memory (Export)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        // Select first project
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");
        // Wait for the project data to load in the pre element
        await expect(page.locator(".state-section pre")).toContainText('"id":', { timeout: 5000 });
    });

    test("export action returns data without storing in model", async ({ page }) => {
        // Get project state before export (id and name should not change)
        const stateBefore = await page.locator(".state-section pre").first().textContent();
        const projectBefore = JSON.parse(stateBefore || "{}");

        // Click Export JSON (uses call-time options)
        await page.locator("button", { hasText: "Export JSON" }).click();
        await page.waitForSelector(".export-result", { timeout: 10000 });

        // Project model state should be unchanged (same id, name, active)
        const stateAfter = await page.locator(".state-section pre").first().textContent();
        const projectAfter = JSON.parse(stateAfter || "{}");
        expect(projectAfter.id).toBe(projectBefore.id);
        expect(projectAfter.name).toBe(projectBefore.name);
        expect(projectAfter.active).toBe(projectBefore.active);
    });

    test("export result is displayed separately from model state", async ({ page }) => {
        // Export
        await page.locator("button", { hasText: "Export JSON" }).click();
        await page.waitForSelector(".export-result", { timeout: 5000 });

        // Both sections should be visible
        await expect(page.locator(".state-section pre").first()).toBeVisible();
        await expect(page.locator(".export-result pre")).toBeVisible();

        // They should contain different data
        const unitState = await page.locator(".state-section pre").first().textContent();
        const exportResult = await page.locator(".export-result pre").textContent();

        expect(unitState).not.toBe(exportResult);
    });

    test("export result has expected structure with call-time query and headers", async ({ page }) => {
        // Export JSON (uses call-time query and headers)
        await page.locator("button", { hasText: "Export JSON" }).click();
        await page.waitForSelector(".export-result", { timeout: 10000 });

        // Parse export result
        const exportData = await page.locator(".export-result pre").textContent();
        const result = JSON.parse(exportData || "{}");

        // Should have export-specific fields
        expect(result).toHaveProperty("exportedAt");
        expect(result).toHaveProperty("format");
        expect(result).toHaveProperty("summary");
        expect(result.format).toBe("json");
        expect(result.summary).toHaveProperty("id");
        expect(result.summary).toHaveProperty("name");
        // Verify call-time options were used
        expect(result).toHaveProperty("requestedBy");
        expect(result.requestedBy).toBe("playground-demo");
        // Stats should be included because includeStats=true was passed
        expect(result).toHaveProperty("stats");
        expect(result.stats).toHaveProperty("completionRate");
    });

    test("export CSV uses different format via call-time query", async ({ page }) => {
        // Export CSV
        await page.locator("button", { hasText: "Export CSV" }).click();
        await page.waitForSelector(".export-result", { timeout: 5000 });

        // Parse export result
        const exportData = await page.locator(".export-result pre").textContent();
        const result = JSON.parse(exportData || "{}");

        // Should have CSV format
        expect(result.format).toBe("csv");
    });

    test("export does not affect model state", async ({ page }) => {
        // Get project ID before any operations
        const stateBefore = await page.locator(".state-section pre").first().textContent();
        const projectBefore = JSON.parse(stateBefore || "{}");
        const projectId = projectBefore.id;
        const projectName = projectBefore.name;

        // Export
        await page.locator("button", { hasText: "Export JSON" }).click();
        await page.waitForSelector(".export-result", { timeout: 10000 });

        // Verify model state is preserved (id and name unchanged)
        const stateAfter = await page.locator(".state-section pre").first().textContent();
        const projectAfter = JSON.parse(stateAfter || "{}");

        expect(projectAfter.id).toBe(projectId);
        expect(projectAfter.name).toBe(projectName);
    });

    test("clearing selection also clears export result", async ({ page }) => {
        // Export
        await page.locator("button", { hasText: "Export JSON" }).click();
        await page.waitForSelector(".export-result", { timeout: 5000 });

        // Clear selection
        await page.locator(".detail-header button", { hasText: "Clear" }).click();

        // Export result should be hidden
        await expect(page.locator(".export-result")).not.toBeVisible();
    });
});

test.describe("Projects - Toggle (ActionOneMode.PATCH + ActionManyMode.PATCH)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        // Select first project
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");
    });

    test("toggle action changes active state", async ({ page }) => {
        // Get initial active state
        const initialData = await page.locator(".state-section pre").textContent();
        const initialProject = JSON.parse(initialData || "{}");
        const initialActive = initialProject.active;

        // Toggle
        const toggleButton = page.locator(".action-buttons button").first();
        await toggleButton.click();
        await page.waitForTimeout(500);

        // Verify active toggled
        const updatedData = await page.locator(".state-section pre").textContent();
        const updatedProject = JSON.parse(updatedData || "{}");

        expect(updatedProject.active).toBe(!initialActive);
    });

    test("toggle preserves other project fields", async ({ page }) => {
        // Get initial state
        const initialData = await page.locator(".state-section pre").textContent();
        const initialProject = JSON.parse(initialData || "{}");

        // Toggle
        await page.locator(".action-buttons button").first().click();
        await page.waitForTimeout(500);

        // Verify other fields preserved
        const updatedData = await page.locator(".state-section pre").textContent();
        const updatedProject = JSON.parse(updatedData || "{}");

        expect(updatedProject.id).toBe(initialProject.id);
        expect(updatedProject.name).toBe(initialProject.name);
        expect(updatedProject.description).toBe(initialProject.description);
    });

    test("toggle button text reflects current state", async ({ page }) => {
        const data = await page.locator(".state-section pre").textContent();
        const project = JSON.parse(data || "{}");
        const isActive = project.active;

        const buttonText = await page.locator(".action-buttons button").first().textContent();

        if (isActive) {
            expect(buttonText).toContain("Deactivate");
        } else {
            expect(buttonText).toContain("Activate");
        }
    });

    test("toggle updates button text", async ({ page }) => {
        const initialButtonText = await page.locator(".action-buttons button").first().textContent();

        // Toggle
        await page.locator(".action-buttons button").first().click();
        await page.waitForTimeout(500);

        const newButtonText = await page.locator(".action-buttons button").first().textContent();

        expect(newButtonText).not.toBe(initialButtonText);
    });

    test("toggle updates status badge in grid", async ({ page }) => {
        // The first card should be the selected one
        const selectedCard = page.locator(".card.card-selected");
        const initialBadge = await selectedCard.locator(".status-badge").textContent();
        const expectedNewBadge = initialBadge === "Active" ? "Inactive" : "Active";

        // Toggle
        await page.locator(".action-buttons button").first().click();

        // Wait for badge to change on the selected card
        await expect(selectedCard.locator(".status-badge")).toHaveText(expectedNewBadge, {
            timeout: 10000,
        });
    });
});

test.describe("Projects - Collection Operations", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("loads projects into many() state", async ({ page }) => {
        const cards = page.locator(".grid .card");
        const count = await cards.count();

        expect(count).toBeGreaterThan(0);

        const countText = await page.locator(".toolbar h2").textContent();
        expect(countText).toContain(`${count} projects`);
    });

    test("delete removes project from collection", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        page.on("dialog", (dialog) => dialog.accept());

        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();

        // Wait for count to decrease
        await expect(page.locator(".toolbar h2")).toContainText(`${initialCount - 1} projects`, { timeout: 10000 });
    });

    test("deleting selected project clears selection", async ({ page }) => {
        // Get initial count
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        // Select first project
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail", { timeout: 10000 });

        page.on("dialog", (dialog) => dialog.accept());

        // Delete the selected project
        await page.locator(".card.card-selected").locator("button", { hasText: "Delete" }).click();

        // Wait for count to decrease (indicates delete completed)
        await expect(page.locator(".toolbar h2")).toContainText(`${initialCount - 1} projects`, { timeout: 10000 });

        // Detail should be hidden
        await expect(page.locator(".detail")).not.toBeVisible();
    });
});

test.describe("Projects - Selection State", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("selected card has visual indicator", async ({ page }) => {
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");

        await expect(page.locator(".card").first()).toHaveClass(/card-selected/);
    });

    test("selecting different project updates selection", async ({ page }) => {
        // Select first
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");

        const firstName = await page.locator(".detail-header h3").textContent();

        // Select second
        await page.locator(".card").nth(1).locator("button", { hasText: "Select" }).click();
        await page.waitForTimeout(500);

        const secondName = await page.locator(".detail-header h3").textContent();

        expect(secondName).not.toBe(firstName);
    });

    test("clearing selection removes card highlight", async ({ page }) => {
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");

        await page.locator(".detail-header button", { hasText: "Clear" }).click();

        const selectedCards = page.locator(".card.card-selected");
        await expect(selectedCards).toHaveCount(0);
    });
});

test.describe("Projects - Store Destructured API ({ model, view, action })", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("view.project (one) state is available", async ({ page }) => {
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");

        await expect(page.locator(".state-section pre")).toBeVisible();
    });

    test("view.projects (many) state is available", async ({ page }) => {
        const cards = page.locator(".grid .card");
        await expect(cards.first()).toBeVisible();
    });

    test("all action buttons are available", async ({ page }) => {
        // Select to see actions
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");

        // Verify action buttons exist
        await expect(page.locator("button", { hasText: "Load Milestones" })).toBeVisible();
        await expect(page.locator("button", { hasText: "Load Meta" })).toBeVisible();
        await expect(page.locator("button", { hasText: "Load Options" })).toBeVisible();
        await expect(page.locator("button", { hasText: "Export JSON" })).toBeVisible();
        await expect(page.locator("button", { hasText: "Export CSV" })).toBeVisible();
    });

    test("model() direct mutation clears selection", async ({ page }) => {
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");

        // Clear uses model("current", ActionOneMode.RESET)
        await page.locator(".detail-header button", { hasText: "Clear" }).click();
        await expect(page.locator(".detail")).not.toBeVisible();
    });

    test("action status section is visible", async ({ page }) => {
        await expect(page.locator("[data-testid='action-status']")).toBeVisible();
    });

    test("list action shows success status after load", async ({ page }) => {
        const listStatus = page.locator("[data-testid='status-list']");
        await expect(listStatus.locator("[data-status='success']")).toBeVisible();
    });

    test("get action shows idle status initially", async ({ page }) => {
        const getStatus = page.locator("[data-testid='status-get']");
        await expect(getStatus.locator("[data-status='idle']")).toBeVisible();
    });

    test("get action transitions to success after selecting project", async ({ page }) => {
        // Select first project
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");

        const getStatus = page.locator("[data-testid='status-get']");
        await expect(getStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("create action transitions to success after creating project", async ({ page }) => {
        // Create a new project
        await page.locator("button", { hasText: "Add Project" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").first().fill("Status Test Project");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });

        const createStatus = page.locator("[data-testid='status-create']");
        await expect(createStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("toggle action transitions to success after toggling project", async ({ page }) => {
        // Select first project
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");

        // Toggle project
        await page.locator(".action-buttons button").first().click();
        await page.waitForTimeout(500);

        const toggleStatus = page.locator("[data-testid='status-toggle']");
        await expect(toggleStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("export action transitions to success after exporting", async ({ page }) => {
        // Select first project
        await page.locator(".card").first().locator("button", { hasText: "Select" }).click();
        await page.waitForSelector(".detail");

        // Export project
        await page.locator("button", { hasText: "Export JSON" }).click();
        await page.waitForSelector(".export-result", { timeout: 10000 });

        const exportStatus = page.locator("[data-testid='status-export']");
        await expect(exportStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("delete action transitions to success after deleting project", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        page.on("dialog", (dialog) => dialog.accept());

        // Delete first project
        await page.locator(".card").first().locator("button", { hasText: "Delete" }).click();

        // Wait for delete to complete
        await expect(page.locator(".toolbar h2")).toContainText(`${initialCount - 1} projects`, { timeout: 10000 });

        const deleteStatus = page.locator("[data-testid='status-delete']");
        await expect(deleteStatus.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
    });

    test("each action has independent status state", async ({ page }) => {
        // After page load: list=success, others=idle
        const listStatus = page.locator("[data-testid='status-list']");
        const getStatus = page.locator("[data-testid='status-get']");
        const createStatus = page.locator("[data-testid='status-create']");
        const deleteStatus = page.locator("[data-testid='status-delete']");
        const toggleStatus = page.locator("[data-testid='status-toggle']");
        const exportStatus = page.locator("[data-testid='status-export']");

        await expect(listStatus.locator("[data-status='success']")).toBeVisible();
        await expect(getStatus.locator("[data-status='idle']")).toBeVisible();
        await expect(createStatus.locator("[data-status='idle']")).toBeVisible();
        await expect(deleteStatus.locator("[data-status='idle']")).toBeVisible();
        await expect(toggleStatus.locator("[data-status='idle']")).toBeVisible();
        await expect(exportStatus.locator("[data-status='idle']")).toBeVisible();
    });
});

test.describe("Projects - Modal Behavior", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });
    });

    test("modal can be closed by clicking overlay", async ({ page }) => {
        await page.locator("button", { hasText: "Add Project" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal-overlay").click({ position: { x: 10, y: 10 } });

        await expect(page.locator(".modal")).not.toBeVisible();
    });

    test("modal can be closed by cancel button", async ({ page }) => {
        await page.locator("button", { hasText: "Add Project" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal button", { hasText: "Cancel" }).click();

        await expect(page.locator(".modal")).not.toBeVisible();
    });

    test("form requires name field", async ({ page }) => {
        await page.locator("button", { hasText: "Add Project" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal button[type='submit']").click();

        await expect(page.locator(".modal")).toBeVisible();
    });

    test("description field is optional", async ({ page }) => {
        const initialCountText = await page.locator(".toolbar h2").textContent();
        const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

        await page.locator("button", { hasText: "Add Project" }).click();
        await page.waitForSelector(".modal");

        await page.locator(".modal input").first().fill("Name Only Project");
        await page.locator(".modal button[type='submit']").click();

        await page.waitForSelector(".modal", { state: "hidden" });
        await page.waitForTimeout(500);

        const finalCountText = await page.locator(".toolbar h2").textContent();
        const finalCount = parseInt(finalCountText?.match(/\d+/)?.[0] || "0");

        expect(finalCount).toBe(initialCount + 1);
    });
});

test.describe("Projects - Feature Info Verification", () => {
    test("documents api.get().handle().commit() full action chain", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("api.get().handle().commit()");
    });

    test("documents handle with nested commit", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("handle(async");
    });

    test("documents commit with deep option", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("{ deep: true }");
    });

    test("documents prepend option on add", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("{ prepend: true }");
    });

    test("documents action without memory", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("without memory");
    });

    test("documents ActionConcurrent modes", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("ActionConcurrent.BLOCK/SKIP/CANCEL/ALLOW");
    });

    test("documents call-time transformer", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("transformer");
    });

    test("documents call-time signal", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("signal");
    });

    test("documents call-time bind", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("bind");
    });

    test("documents useIsolatedActionStatus composable", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("useIsolatedActionStatus()");
    });

    test("documents action.error reactive state", async ({ page }) => {
        await page.goto("/projects");
        await page.waitForSelector(".grid .card", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("action.error");
    });
});
