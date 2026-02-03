import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "list",
    timeout: 15000,
    expect: {
        timeout: 5000,
    },
    use: {
        baseURL: "http://localhost:3000",
        trace: "off",
        video: "off",
        screenshot: "off",
        actionTimeout: 5000,
        navigationTimeout: 10000,
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],
    webServer: {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
