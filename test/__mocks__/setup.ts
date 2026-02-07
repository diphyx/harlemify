import { vi, beforeEach } from "vitest";

vi.mock("#build/harlemify.config", () => {
    return {
        default: {
            model: {},
            view: {},
            action: {},
        },
    };
});

vi.stubGlobal("$fetch", vi.fn());

beforeEach(() => {
    vi.clearAllMocks();
});
