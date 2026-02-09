import { expect, test } from "./fixtures";

test.describe("contacts page", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post("/api/_reset");
        await page.goto("/contacts");
        await page.getByTestId("contact-grid").waitFor();
    });

    test("loads and displays contacts", async ({ page }) => {
        await expect(page.getByTestId("contact-count")).toHaveText("3 contacts");
        await expect(page.getByTestId("contact-1").getByTestId("contact-name")).toHaveText("John Doe");
        await expect(page.getByTestId("contact-2").getByTestId("contact-name")).toHaveText("Jane Smith");
        await expect(page.getByTestId("contact-3").getByTestId("contact-name")).toHaveText("Bob Wilson");
    });

    test("creates a contact", async ({ page }) => {
        await page.getByTestId("add-contact").click();
        await page.getByTestId("input-first-name").fill("New");
        await page.getByTestId("input-last-name").fill("Contact");
        await page.getByTestId("input-email").fill("new@example.com");
        await page.getByTestId("save-contact").click();
        await expect(page.getByTestId("contact-count")).toHaveText("4 contacts");
    });

    test("edits a contact", async ({ page }) => {
        await page.getByTestId("contact-1").getByTestId("edit-contact").click();
        await page.getByTestId("input-first-name").fill("Johnny");
        await page.getByTestId("save-contact").click();
        await expect(page.getByTestId("contact-1").getByTestId("contact-name")).toHaveText("Johnny Doe");
    });

    test("deletes a contact", async ({ page }) => {
        page.on("dialog", (dialog) => dialog.accept());
        await page.getByTestId("contact-3").getByTestId("delete-contact").click();
        await expect(page.getByTestId("contact-count")).toHaveText("2 contacts");
    });

    test("selects and views a contact", async ({ page }) => {
        await page.getByTestId("contact-1").getByTestId("view-contact").click();
        await expect(page.getByTestId("selected-contact")).toBeVisible();
        await expect(page.getByTestId("selected-contact")).toContainText("first_name");
        await expect(page.getByTestId("selected-contact")).toContainText("John");
    });

    test("clears selection", async ({ page }) => {
        await page.getByTestId("contact-1").getByTestId("view-contact").click();
        await expect(page.getByTestId("selected-contact")).toBeVisible();
        await page.getByTestId("clear-contact").click();
        await expect(page.getByTestId("selected-contact")).not.toBeVisible();
    });

    test("selected contact shows snake_case keys (alias inbound)", async ({ page }) => {
        await page.getByTestId("contact-1").getByTestId("view-contact").click();
        const detail = page.getByTestId("selected-contact");
        await expect(detail).toContainText("first_name");
        await expect(detail).toContainText("last_name");
        await expect(detail).not.toContainText("first-name");
        await expect(detail).not.toContainText("last-name");
    });

    test("action status shows success after list", async ({ page }) => {
        await expect(page.getByTestId("status-list").locator(".monitor-state")).toHaveText("success");
    });

    test("create modal opens with shape defaults (empty form)", async ({ page }) => {
        await page.getByTestId("add-contact").click();
        await expect(page.getByTestId("input-first-name")).toHaveValue("");
        await expect(page.getByTestId("input-last-name")).toHaveValue("");
        await expect(page.getByTestId("input-email")).toHaveValue("");
    });
});
