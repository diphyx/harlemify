import { describe, it, expect } from "vitest";

import { shape, ZodObject } from "../src/runtime/core/layers/shape";
import { resolveShape } from "../src/runtime/core/utils/shape";

describe("shape", () => {
    it("creates a zod object schema", () => {
        const schema = shape((field) => {
            return {
                id: field.number(),
                name: field.string(),
            };
        });

        expect(schema).toBeInstanceOf(ZodObject);
    });
});

describe("resolveShape", () => {
    it("extracts fields from schema", () => {
        const schema = shape((field) => {
            return {
                id: field.number(),
                name: field.string(),
                email: field.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.fields).toEqual(["id", "name", "email"]);
    });

    it("returns undefined when no id or _id field exists", () => {
        const schema = shape((field) => {
            return {
                uid: field.string(),
                name: field.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBeUndefined();
    });

    it("falls back to id field", () => {
        const schema = shape((field) => {
            return {
                id: field.number(),
                name: field.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBe("id");
    });

    it("falls back to _id field", () => {
        const schema = shape((field) => {
            return {
                _id: field.string(),
                name: field.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBe("_id");
    });

    it("prefers id over _id", () => {
        const schema = shape((field) => {
            return {
                id: field.number(),
                _id: field.string(),
                name: field.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBe("id");
    });

    it("returns undefined identifier when no id field exists", () => {
        const schema = shape((field) => {
            return {
                name: field.string(),
                email: field.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBeUndefined();
    });

    it("id field used even when other fields have meta", () => {
        const schema = shape((field) => {
            return {
                id: field.number(),
                slug: field.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.identifier).toBe("id");
    });

    it("extracts static default values", () => {
        const schema = shape((field) => {
            return {
                id: field.number(),
                name: field.string().default("unnamed"),
                active: field.boolean().default(true),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.defaults).toEqual({
            name: "unnamed",
            active: true,
        });
    });

    it("extracts function default values", () => {
        const schema = shape((field) => {
            return {
                id: field.number(),
                tags: field.array(field.string()).default(() => ["default"]),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.defaults.tags).toEqual(["default"]);
    });

    it("returns empty defaults when no defaults exist", () => {
        const schema = shape((field) => {
            return {
                id: field.number(),
                name: field.string(),
            };
        });

        const meta = resolveShape(schema);

        expect(meta.defaults).toEqual({});
    });
});
