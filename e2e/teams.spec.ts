import { expect, test } from "./fixtures";

test.describe("teams page", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post("/api/_reset");
        await page.goto("/teams");
        await page.getByTestId("team-grid").waitFor();
    });

    test("loads and displays teams", async ({ page }) => {
        await expect(page.getByTestId("team-count")).toContainText("3 teams");
        await expect(page.getByTestId("team-count")).toContainText("5 members");
        await expect(page.getByTestId("team-frontend")).toBeVisible();
        await expect(page.getByTestId("team-backend")).toBeVisible();
        await expect(page.getByTestId("team-design")).toBeVisible();
    });

    test("displays team members", async ({ page }) => {
        const frontend = page.getByTestId("team-frontend");
        await expect(frontend.getByTestId("team-name")).toHaveText("frontend");
        await expect(frontend).toContainText("Alice");
        await expect(frontend).toContainText("Bob");
    });

    test("adds a new team", async ({ page }) => {
        await page.getByTestId("add-team").click();
        await page.getByTestId("input-team-name").fill("devops");
        await page.getByTestId("team-form").locator("input[placeholder='Name']").first().fill("Frank");
        await page.getByTestId("team-form").locator("input[placeholder='Role']").first().fill("engineer");
        await page.getByTestId("save-team").click();
        await expect(page.getByTestId("team-count")).toContainText("4 teams");
        await expect(page.getByTestId("team-devops")).toBeVisible();
    });

    test("removes a team", async ({ page }) => {
        page.on("dialog", (dialog) => dialog.accept());
        await page.getByTestId("team-design").getByTestId("remove-team").click();
        await expect(page.getByTestId("team-count")).toContainText("2 teams");
        await expect(page.getByTestId("team-design")).not.toBeVisible();
    });

    test("resets all teams", async ({ page }) => {
        await page.getByTestId("reset-all").click();
        await expect(page.getByTestId("team-count")).toContainText("0 teams");
    });

    test("reloads teams", async ({ page }) => {
        await page.getByTestId("reset-all").click();
        await expect(page.getByTestId("team-count")).toContainText("0 teams");
        await page.getByTestId("reload").click();
        await page.getByTestId("team-grid").waitFor();
        await expect(page.getByTestId("team-count")).toContainText("3 teams");
    });

    test("action status shows success after load", async ({ page }) => {
        await expect(page.getByTestId("status-load").locator(".action-chip-state")).toHaveText("success");
    });

    test("displays feature info", async ({ page }) => {
        const info = page.getByTestId("feature-info");
        await expect(info).toBeVisible();
        await expect(info).toContainText('many(shape, { kind: "record" })');
        await expect(info).toContainText("pre / post");
        await expect(info).toContainText("silent: ModelSilent.POST");
    });
});
