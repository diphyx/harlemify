import { describe, it, expect } from "vitest";

import { createCache } from "../src/runtime/utils/cache";

describe("createCache", () => {
    it("creates empty cache", () => {
        const cache = createCache<string, number>();

        expect(cache.get("key")).toBeUndefined();
    });

    it("sets and gets value", () => {
        const cache = createCache<string, number>();

        cache.set("key", 42);

        expect(cache.get("key")).toBe(42);
    });

    it("overwrites existing value", () => {
        const cache = createCache<string, number>();

        cache.set("key", 1);
        cache.set("key", 2);

        expect(cache.get("key")).toBe(2);
    });

    it("deletes value", () => {
        const cache = createCache<string, number>();

        cache.set("key", 42);
        const deleted = cache.delete("key");

        expect(deleted).toBe(true);
        expect(cache.get("key")).toBeUndefined();
    });

    it("returns false when deleting non-existent key", () => {
        const cache = createCache<string, number>();

        const deleted = cache.delete("nonexistent");

        expect(deleted).toBe(false);
    });

    it("clears all values", () => {
        const cache = createCache<string, number>();

        cache.set("a", 1);
        cache.set("b", 2);
        cache.set("c", 3);
        cache.clear();

        expect(cache.get("a")).toBeUndefined();
        expect(cache.get("b")).toBeUndefined();
        expect(cache.get("c")).toBeUndefined();
    });

    it("works with number keys", () => {
        const cache = createCache<number, string>();

        cache.set(1, "one");
        cache.set(2, "two");

        expect(cache.get(1)).toBe("one");
        expect(cache.get(2)).toBe("two");
    });

    it("works with object values", () => {
        const cache = createCache<string, { name: string; value: number }>();
        const obj = { name: "test", value: 42 };

        cache.set("key", obj);

        expect(cache.get("key")).toBe(obj);
    });

    it("returns size of cache", () => {
        const cache = createCache<string, number>();

        expect(cache.size()).toBe(0);

        cache.set("a", 1);
        cache.set("b", 2);

        expect(cache.size()).toBe(2);
    });

    it("checks if key exists", () => {
        const cache = createCache<string, number>();

        cache.set("key", 42);

        expect(cache.has("key")).toBe(true);
        expect(cache.has("nonexistent")).toBe(false);
    });

    it("iterates over entries", () => {
        const cache = createCache<string, number>();

        cache.set("a", 1);
        cache.set("b", 2);
        cache.set("c", 3);

        const entries = Array.from(cache.entries());

        expect(entries).toEqual([
            ["a", 1],
            ["b", 2],
            ["c", 3],
        ]);
    });

    it("handles large number of entries", () => {
        const cache = createCache<string, number>();

        for (let i = 0; i < 100; i++) {
            cache.set(`key${i}`, i);
        }

        expect(cache.size()).toBe(100);
        expect(cache.get("key0")).toBe(0);
        expect(cache.get("key99")).toBe(99);
    });
});
