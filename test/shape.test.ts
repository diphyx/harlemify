import { describe, it, expect } from "vitest";
import { ZodObject } from "zod";

import { shape } from "../src/runtime/core/layers/shape";
import { resolveShape } from "../src/runtime/core/utils/shape";

describe("shape", () => {
    it("creates a zod object schema", () => {
        const schema = shape((factory) => {
            return {
                id: factory.number(),
                name: factory.string(),
            };
        });

        expect(schema).toBeInstanceOf(ZodObject);
    });
});

describe("resolveShape", () => {
    it("extracts fields from schema", () => {
        const schema = shape((factory) => {
            return {
                id: factory.number(),
                name: factory.string(),
                email: factory.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.fields).toEqual(["id", "name", "email"]);
    });

    it("returns undefined when no id or _id field exists", () => {
        const schema = shape((factory) => {
            return {
                uid: factory.string(),
                name: factory.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBeUndefined();
    });

    it("falls back to id field", () => {
        const schema = shape((factory) => {
            return {
                id: factory.number(),
                name: factory.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBe("id");
    });

    it("falls back to _id field", () => {
        const schema = shape((factory) => {
            return {
                _id: factory.string(),
                name: factory.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBe("_id");
    });

    it("prefers id over _id", () => {
        const schema = shape((factory) => {
            return {
                id: factory.number(),
                _id: factory.string(),
                name: factory.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBe("id");
    });

    it("returns undefined identifier when no id field exists", () => {
        const schema = shape((factory) => {
            return {
                name: factory.string(),
                email: factory.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBeUndefined();
    });

    it("id field used even when other fields have meta", () => {
        const schema = shape((factory) => {
            return {
                id: factory.number(),
                slug: factory.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBe("id");
    });

    it("extracts static default values", () => {
        const schema = shape((factory) => {
            return {
                id: factory.number(),
                name: factory.string().default("unnamed"),
                active: factory.boolean().default(true),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.defaults).toEqual({
            name: "unnamed",
            active: true,
        });
    });

    it("extracts function default values", () => {
        const schema = shape((factory) => {
            return {
                id: factory.number(),
                tags: factory.array(factory.string()).default(() => ["default"]),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.defaults.tags).toEqual(["default"]);
    });

    it("returns empty defaults when no defaults exist", () => {
        const schema = shape((factory) => {
            return {
                id: factory.number(),
                name: factory.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.defaults).toEqual({});
    });
});
