import { describe, it, expect } from "vitest";

import { assignValueByPath, mergeValueByPath } from "../src/runtime/utils/nested";

describe("assignValueByPath", () => {
    it("does nothing when path is empty", () => {
        const object = { a: 1 };

        assignValueByPath(object, [], "value");

        expect(object).toEqual({ a: 1 });
    });

    it("assigns value at single-level path", () => {
        const object = { a: 1 };

        assignValueByPath(object, ["b"], 2);

        expect(object).toEqual({ a: 1, b: 2 });
    });

    it("overwrites existing value at single-level path", () => {
        const object = { a: 1 };

        assignValueByPath(object, ["a"], 2);

        expect(object).toEqual({ a: 2 });
    });

    it("assigns value at nested path", () => {
        const object = { a: { b: 1 } };

        assignValueByPath(object, ["a", "c"], 2);

        expect(object).toEqual({ a: { b: 1, c: 2 } });
    });

    it("creates intermediate objects when path does not exist", () => {
        const object = {};

        assignValueByPath(object, ["a", "b", "c"], "value");

        expect(object).toEqual({ a: { b: { c: "value" } } });
    });

    it("assigns array value", () => {
        const object = { items: [] };

        assignValueByPath(object, ["items"], [1, 2, 3]);

        expect(object).toEqual({ items: [1, 2, 3] });
    });

    it("assigns object value", () => {
        const object = { data: null };

        assignValueByPath(object, ["data"], { name: "test", value: 42 });

        expect(object).toEqual({ data: { name: "test", value: 42 } });
    });

    it("assigns null value", () => {
        const object = { a: { b: "value" } };

        assignValueByPath(object, ["a", "b"], null);

        expect(object).toEqual({ a: { b: null } });
    });

    it("assigns value at deeply nested path", () => {
        const object = { a: { b: { c: { d: 1 } } } };

        assignValueByPath(object, ["a", "b", "c", "d"], 2);

        expect(object).toEqual({ a: { b: { c: { d: 2 } } } });
    });

    it("creates deep structure from empty object", () => {
        const object = {};

        assignValueByPath(object, ["level1", "level2", "level3", "level4"], "deep");

        expect(object).toEqual({
            level1: {
                level2: {
                    level3: {
                        level4: "deep",
                    },
                },
            },
        });
    });
});

describe("mergeValueByPath", () => {
    it("does nothing when path is empty", () => {
        const object = { a: 1 };

        mergeValueByPath(object, [], { b: 2 });

        expect(object).toEqual({ a: 1 });
    });

    it("does nothing when intermediate path does not exist", () => {
        const object = { a: 1 };

        mergeValueByPath(object, ["b", "c"], "value");

        expect(object).toEqual({ a: 1 });
    });

    it("assigns value when target key does not exist", () => {
        const object = { a: {} };

        mergeValueByPath(object, ["a", "b"], "value");

        expect(object).toEqual({ a: { b: "value" } });
    });

    it("merges object with Object.assign by default", () => {
        const object = { a: { name: "old", value: 1 } };

        mergeValueByPath(object, ["a"], { name: "new" });

        expect(object).toEqual({ a: { name: "new", value: 1 } });
    });

    it("deep merges object when deep option is true", () => {
        const object = {
            config: {
                settings: {
                    theme: "dark",
                    language: "en",
                },
                version: 1,
            },
        };

        mergeValueByPath(object, ["config"], { settings: { theme: "light" } }, true);

        expect(object).toEqual({
            config: {
                settings: {
                    theme: "light",
                    language: "en",
                },
                version: 1,
            },
        });
    });

    it("merges at nested path", () => {
        const object = { a: { b: { x: 1, y: 2 } } };

        mergeValueByPath(object, ["a", "b"], { y: 3, z: 4 });

        expect(object).toEqual({ a: { b: { x: 1, y: 3, z: 4 } } });
    });

    it("deep merges at nested path", () => {
        const object = {
            data: {
                user: {
                    profile: {
                        name: "John",
                        settings: {
                            notify: true,
                            theme: "dark",
                        },
                    },
                },
            },
        };

        mergeValueByPath(object, ["data", "user", "profile"], { settings: { theme: "light" } }, true);

        expect(object).toEqual({
            data: {
                user: {
                    profile: {
                        name: "John",
                        settings: {
                            notify: true,
                            theme: "light",
                        },
                    },
                },
            },
        });
    });

    it("handles array merge with Object.assign", () => {
        const object = { items: [1, 2, 3] };

        mergeValueByPath(object, ["items"], [4, 5]);

        expect(object).toEqual({ items: [4, 5, 3] });
    });

    it("deep merge with defu on arrays results in empty object", () => {
        const object = { items: [1, 2, 3] };

        mergeValueByPath(object, ["items"], [4, 5], true);

        // defu behavior with arrays - results in empty object
        expect(object).toEqual({ items: {} });
    });

    it("assigns primitive value when target is undefined", () => {
        const object = { a: {} };

        mergeValueByPath(object, ["a", "count"], 42);

        expect(object).toEqual({ a: { count: 42 } });
    });

    it("does not create intermediate objects", () => {
        const object = { a: 1 };

        mergeValueByPath(object, ["b", "c", "d"], "value");

        expect(object).toEqual({ a: 1 });
    });
});
