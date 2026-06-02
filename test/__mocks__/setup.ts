import { vi, beforeEach } from "vitest";

vi.mock("#build/harlemify.config", () => {
    return {
        default: {
            model: {},
            view: {},
            action: {},
            logger: -999,
        },
    };
});

vi.stubGlobal("$fetch", vi.fn());

beforeEach(() => {
    vi.clearAllMocks();
});
