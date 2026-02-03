import { test, expect } from "./fixtures";

/**
 * Config Page E2E Tests
 *
 * Tests harlemify concepts demonstrated:
 * - Singleton store pattern (Memory.unit())
 * - Partial update/merge (Memory.unit().edit())
 * - Monitor states (configMonitor.get.pending)
 * - Schema meta with actions
 * - useStoreAlias composable
 */

test.describe("Config - Singleton Store Pattern (Memory.unit())", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });
    });

    test("loads singleton data into unit state on mount", async ({ page }) => {
        // Verify config is loaded as a single object (unit), not array
        const rawData = await page.locator(".detail pre").textContent();
        const config = JSON.parse(rawData || "{}");

        // Unit should have all required fields
        expect(config).toHaveProperty("id");
        expect(config).toHaveProperty("theme");
        expect(config).toHaveProperty("language");
        expect(config).toHaveProperty("notifications");

        // Verify it's an object, not array (singleton pattern)
        expect(Array.isArray(config)).toBe(false);
        expect(typeof config).toBe("object");
    });

    test("unit state reflects in multiple UI bindings simultaneously", async ({ page }) => {
        // Get displayed values
        const themeDisplay = await page.locator(".config-item").first().locator(".value").textContent();
        const notificationsDisplay = await page.locator(".config-item").nth(2).locator(".value").textContent();

        // Get raw data values
        const rawData = await page.locator(".detail pre").textContent();
        const config = JSON.parse(rawData || "{}");

        // UI bindings should match raw state
        expect(themeDisplay).toBe(config.theme);
        expect(notificationsDisplay).toBe(config.notifications ? "on" : "off");
    });

    test("singleton state is reactive across component", async ({ page }) => {
        // Change theme
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(300);

        // Both display and raw data should update reactively
        const themeDisplay = await page.locator(".config-item").first().locator(".value").textContent();
        const rawData = await page.locator(".detail pre").textContent();
        const config = JSON.parse(rawData || "{}");

        expect(themeDisplay).toBe(config.theme);
    });
});

test.describe("Config - Partial Update (Memory.unit().edit())", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });
    });

    test("theme toggle preserves other fields (partial merge)", async ({ page }) => {
        // Get initial state
        const initialRawData = await page.locator(".detail pre").textContent();
        const initialConfig = JSON.parse(initialRawData || "{}");

        // Toggle theme (PATCH request with Memory.unit().edit())
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(500);

        // Get updated state
        const updatedRawData = await page.locator(".detail pre").textContent();
        const updatedConfig = JSON.parse(updatedRawData || "{}");

        // Theme should change
        expect(updatedConfig.theme).not.toBe(initialConfig.theme);

        // Other fields should be preserved (edit merges, doesn't replace)
        expect(updatedConfig.id).toBe(initialConfig.id);
        expect(updatedConfig.language).toBe(initialConfig.language);
        expect(updatedConfig.notifications).toBe(initialConfig.notifications);
    });

    test("language update preserves theme and notifications", async ({ page }) => {
        // Get initial state
        const initialRawData = await page.locator(".detail pre").textContent();
        const initialConfig = JSON.parse(initialRawData || "{}");

        // Update language with a unique value
        const newLanguage = "lang" + Date.now().toString().slice(-6);
        await page.locator(".config-input input").clear();
        await page.locator(".config-input input").fill(newLanguage);
        await page.locator(".config-input button[type='submit']").click();

        // Wait for the language to update in raw data
        await expect(page.locator(".detail pre")).toContainText(`"language": "${newLanguage}"`, { timeout: 15000 });

        // Get updated state
        const updatedRawData = await page.locator(".detail pre").textContent();
        const updatedConfig = JSON.parse(updatedRawData || "{}");

        // Language should change
        expect(updatedConfig.language).toBe(newLanguage);

        // Other fields preserved
        expect(updatedConfig.theme).toBe(initialConfig.theme);
        expect(updatedConfig.notifications).toBe(initialConfig.notifications);
    });

    test("notifications toggle preserves theme and id", async ({ page }) => {
        // Get initial state
        const initialRawData = await page.locator(".detail pre").textContent();
        const initialConfig = JSON.parse(initialRawData || "{}");

        // Toggle notifications
        await page.locator(".config-item").nth(2).locator("button", { hasText: "Toggle" }).click();

        // Wait for notifications to change
        const expectedNotifications = !initialConfig.notifications;
        await expect(page.locator(".detail pre")).toContainText(`"notifications": ${expectedNotifications}`, {
            timeout: 5000,
        });

        // Get updated state
        const updatedRawData = await page.locator(".detail pre").textContent();
        const updatedConfig = JSON.parse(updatedRawData || "{}");

        // Notifications should toggle
        expect(updatedConfig.notifications).toBe(expectedNotifications);

        // ID and theme preserved (language may be changed by other tests)
        expect(updatedConfig.id).toBe(initialConfig.id);
        expect(updatedConfig.theme).toBe(initialConfig.theme);
    });

    test("multiple sequential edits all preserve unmodified fields", async ({ page }) => {
        // Get initial state
        const initialRawData = await page.locator(".detail pre").textContent();
        const initialConfig = JSON.parse(initialRawData || "{}");
        const expectedNewTheme = initialConfig.theme === "dark" ? "light" : "dark";

        // Edit 1: Toggle theme
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        // Wait for theme to update
        await expect(page.locator(".detail pre")).toContainText(`"theme": "${expectedNewTheme}"`, { timeout: 5000 });

        // Edit 2: Update language with unique value
        const newLang = "es" + Date.now().toString().slice(-4);
        await page.locator(".config-input input").fill(newLang);
        await page.locator(".config-input button[type='submit']").click();
        // Wait for language to update
        await expect(page.locator(".detail pre")).toContainText(newLang, { timeout: 5000 });

        // Edit 3: Toggle notifications
        const expectedNotifications = !initialConfig.notifications;
        await page.locator(".config-item").nth(2).locator("button", { hasText: "Toggle" }).click();
        // Wait for notifications to update
        await expect(page.locator(".detail pre")).toContainText(`"notifications": ${expectedNotifications}`, {
            timeout: 5000,
        });

        // Get final state
        const finalRawData = await page.locator(".detail pre").textContent();
        const finalConfig = JSON.parse(finalRawData || "{}");

        // All fields should have changed as expected
        expect(finalConfig.theme).toBe(expectedNewTheme);
        expect(finalConfig.language).toBe(newLang);
        expect(finalConfig.notifications).toBe(expectedNotifications);

        // ID should always be preserved
        expect(finalConfig.id).toBe(initialConfig.id);
    });
});

test.describe("Config - Monitor States (configMonitor)", () => {
    test("shows loading state during data fetch", async ({ page }) => {
        // Navigate and immediately check for loading
        await page.goto("/config");

        // Either loading or content should be visible (loading may be brief)
        const hasLoading = await page
            .locator(".loading")
            .isVisible()
            .catch(() => false);
        const hasContent = await page
            .locator(".config-list")
            .isVisible()
            .catch(() => false);

        expect(hasLoading || hasContent).toBe(true);
    });

    test("loading state disappears after successful fetch", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        // After data loads, loading should not be visible
        await expect(page.locator(".loading")).not.toBeVisible();

        // Content should be visible
        await expect(page.locator(".config-list")).toBeVisible();
    });

    test("monitor reflects success state after load", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        // After successful load, we should see config data
        // This indirectly verifies configMonitor.get.success is true
        // (the template shows .config-list only when data is loaded)
        const rawData = await page.locator(".detail pre").textContent();
        expect(rawData).toBeTruthy();
        expect(() => JSON.parse(rawData || "")).not.toThrow();
    });

    test("monitor status section is visible", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        await expect(page.locator("[data-testid='monitor-status']")).toBeVisible();
    });

    test("get action shows success status after load", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        // Check that get monitor shows success state
        const getMonitor = page.locator(".monitor-item").filter({ hasText: "get" });
        await expect(getMonitor.locator("[data-status='success']")).toBeVisible();
        await expect(getMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("update action shows idle status initially", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        // Check that update monitor shows idle state (no update performed yet)
        const updateMonitor = page.locator(".monitor-item").filter({ hasText: "update" });
        await expect(updateMonitor.locator("[data-status='idle']")).toBeVisible();
        await expect(updateMonitor.locator("[data-flag='idle']")).toBeVisible();
    });

    test("update action transitions to success after toggling theme", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        // Toggle theme
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(500);

        // Check that update monitor shows success state
        const updateMonitor = page.locator(".monitor-item").filter({ hasText: "update" });
        await expect(updateMonitor.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
        await expect(updateMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("update action transitions to success after updating language", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        // Update language
        const newLang = "test" + Date.now().toString().slice(-4);
        await page.locator(".config-input input").fill(newLang);
        await page.locator(".config-input button[type='submit']").click();
        await page.waitForTimeout(500);

        // Check that update monitor shows success state
        const updateMonitor = page.locator(".monitor-item").filter({ hasText: "update" });
        await expect(updateMonitor.locator("[data-status='success']")).toBeVisible({ timeout: 5000 });
        await expect(updateMonitor.locator("[data-flag='success']")).toBeVisible();
    });

    test("get and update have independent monitor states", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        // After page load: get=success, update=idle
        const getMonitor = page.locator(".monitor-item").filter({ hasText: "get" });
        const updateMonitor = page.locator(".monitor-item").filter({ hasText: "update" });

        await expect(getMonitor.locator("[data-status='success']")).toBeVisible();
        await expect(updateMonitor.locator("[data-status='idle']")).toBeVisible();
    });

    test("monitor current value matches the active flag", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        // Get should show success in both current value and flag
        const getMonitor = page.locator(".monitor-item").filter({ hasText: "get" });
        const currentValue = await getMonitor.locator(".monitor-state").textContent();

        expect(currentValue).toBe("success");
        await expect(getMonitor.locator("[data-flag='success']")).toBeVisible();
        await expect(getMonitor.locator("[data-flag='idle']")).not.toBeVisible();
        await expect(getMonitor.locator("[data-flag='pending']")).not.toBeVisible();
        await expect(getMonitor.locator("[data-flag='failed']")).not.toBeVisible();
    });
});

test.describe("Config - useStoreAlias Composable", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });
    });

    test("config (unit) is reactive computed ref", async ({ page }) => {
        // Initial state
        const initialTheme = await page.locator(".config-item").first().locator(".value").textContent();

        // Trigger mutation via action
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(300);

        // State should reactively update
        const updatedTheme = await page.locator(".config-item").first().locator(".value").textContent();
        expect(updatedTheme).not.toBe(initialTheme);
    });

    test("getConfig action fetches and populates unit state", async ({ page }) => {
        // Page calls getConfig() on mount - verify it worked
        const rawData = await page.locator(".detail pre").textContent();
        const config = JSON.parse(rawData || "{}");

        // Should have fetched config with all required fields
        expect(config.id).toBeDefined();
        expect(config.theme).toMatch(/^(light|dark)$/);
        expect(typeof config.language).toBe("string");
        expect(typeof config.notifications).toBe("boolean");
    });

    test("updateConfig action sends partial data and merges response", async ({ page }) => {
        // Get initial full state
        const initialRawData = await page.locator(".detail pre").textContent();
        const initialConfig = JSON.parse(initialRawData || "{}");

        // Update only theme via toggle
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(500);

        // Get updated state
        const updatedRawData = await page.locator(".detail pre").textContent();
        const updatedConfig = JSON.parse(updatedRawData || "{}");

        // Should be a complete config object (merged), not just the updated field
        expect(Object.keys(updatedConfig)).toEqual(Object.keys(initialConfig));
    });
});

test.describe("Config - Theme Cycling", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });
    });

    test("theme cycles between light and dark", async ({ page }) => {
        const currentTheme = await page.locator(".config-item").first().locator(".value").textContent();

        // Toggle
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(300);

        const newTheme = await page.locator(".config-item").first().locator(".value").textContent();

        if (currentTheme === "dark") {
            expect(newTheme).toBe("light");
        } else {
            expect(newTheme).toBe("dark");
        }
    });

    test("double toggle returns to original theme", async ({ page }) => {
        const originalTheme = await page.locator(".config-item").first().locator(".value").textContent();

        // Toggle twice
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(300);
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(300);

        const finalTheme = await page.locator(".config-item").first().locator(".value").textContent();
        expect(finalTheme).toBe(originalTheme);
    });

    test("theme is applied to document attribute", async ({ page }) => {
        const displayedTheme = await page.locator(".config-item").first().locator(".value").textContent();
        const documentTheme = await page.locator("html").getAttribute("data-theme");

        expect(documentTheme).toBe(displayedTheme);
    });

    test("toggling theme updates document attribute", async ({ page }) => {
        const initialDocTheme = await page.locator("html").getAttribute("data-theme");

        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(300);

        const newDocTheme = await page.locator("html").getAttribute("data-theme");
        expect(newDocTheme).not.toBe(initialDocTheme);
    });
});

test.describe("Config - Language Input Behavior", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });
    });

    test("language input is pre-filled from state", async ({ page }) => {
        const rawData = await page.locator(".detail pre").textContent();
        const config = JSON.parse(rawData || "{}");

        const inputValue = await page.locator(".config-input input").inputValue();
        expect(inputValue).toBe(config.language);
    });

    test("empty language submission is prevented", async ({ page }) => {
        const initialRawData = await page.locator(".detail pre").textContent();

        // Clear and try to submit
        await page.locator(".config-input input").fill("");
        await page.locator(".config-input button[type='submit']").click();
        await page.waitForTimeout(300);

        // State should be unchanged
        const finalRawData = await page.locator(".detail pre").textContent();
        expect(finalRawData).toBe(initialRawData);
    });

    test("whitespace-only language is trimmed and rejected", async ({ page }) => {
        const initialRawData = await page.locator(".detail pre").textContent();

        // Submit whitespace
        await page.locator(".config-input input").fill("   ");
        await page.locator(".config-input button[type='submit']").click();
        await page.waitForTimeout(300);

        // State should be unchanged
        const finalRawData = await page.locator(".detail pre").textContent();
        expect(finalRawData).toBe(initialRawData);
    });

    test("valid language update succeeds", async ({ page }) => {
        const newLang = "fr";

        await page.locator(".config-input input").fill(newLang);
        await page.locator(".config-input button[type='submit']").click();
        await page.waitForTimeout(500);

        const rawData = await page.locator(".detail pre").textContent();
        const config = JSON.parse(rawData || "{}");

        expect(config.language).toBe(newLang);
    });
});

test.describe("Config - Notifications Toggle", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });
    });

    test("notifications displays boolean as on/off text", async ({ page }) => {
        const display = await page.locator(".config-item").nth(2).locator(".value").textContent();
        expect(display === "on" || display === "off").toBe(true);
    });

    test("notifications toggle cycles on/off", async ({ page }) => {
        const initial = await page.locator(".config-item").nth(2).locator(".value").textContent();

        await page.locator(".config-item").nth(2).locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(300);

        const toggled = await page.locator(".config-item").nth(2).locator(".value").textContent();

        if (initial === "on") {
            expect(toggled).toBe("off");
        } else {
            expect(toggled).toBe("on");
        }
    });

    test("notifications boolean in raw data matches display", async ({ page }) => {
        const display = await page.locator(".config-item").nth(2).locator(".value").textContent();
        const rawData = await page.locator(".detail pre").textContent();
        const config = JSON.parse(rawData || "{}");

        if (display === "on") {
            expect(config.notifications).toBe(true);
        } else {
            expect(config.notifications).toBe(false);
        }
    });
});

test.describe("Config - Raw Data Display", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });
    });

    test("raw data shows complete config object", async ({ page }) => {
        const rawData = page.locator(".detail pre");

        await expect(rawData).toContainText('"id":');
        await expect(rawData).toContainText('"theme":');
        await expect(rawData).toContainText('"language":');
        await expect(rawData).toContainText('"notifications":');
    });

    test("raw data is valid JSON", async ({ page }) => {
        const rawData = await page.locator(".detail pre").textContent();
        expect(() => JSON.parse(rawData || "")).not.toThrow();
    });

    test("raw data updates in real-time after mutations", async ({ page }) => {
        // Toggle theme
        await page.locator(".config-item").first().locator("button", { hasText: "Toggle" }).click();
        await page.waitForTimeout(300);

        // Raw data and display should be in sync
        const displayedTheme = await page.locator(".config-item").first().locator(".value").textContent();
        const rawData = await page.locator(".detail pre").textContent();

        expect(rawData).toContain(`"theme": "${displayedTheme}"`);
    });
});

test.describe("Config - Feature Info Verification", () => {
    test("documents Memory.unit() singleton pattern", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("Memory.unit()");
    });

    test("documents Memory.unit().edit() partial update", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("Memory.unit().edit()");
    });

    test("documents configMonitor.[action].current()", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText("configMonitor.[action].current()");
    });

    test("documents configMonitor.[action].idle()/pending()/success()/failed()", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText(
            "configMonitor.[action].idle()/pending()/success()/failed()",
        );
    });

    test("documents schema meta actions", async ({ page }) => {
        await page.goto("/config");
        await page.waitForSelector(".config-list", { timeout: 10000 });

        await expect(page.locator(".feature-info")).toContainText(".meta({ actions:");
    });
});
