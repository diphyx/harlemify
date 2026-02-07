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

vi.mock("consola", () => {
    const noop = () => {};
    const logger = {
        debug: noop,
        info: noop,
        warn: noop,
        error: noop,
    };

    return {
        createConsola: () => logger,
    };
});

vi.stubGlobal("$fetch", vi.fn());

beforeEach(() => {
    vi.clearAllMocks();
});
