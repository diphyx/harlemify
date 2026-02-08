import { describe, it, expect } from "vitest";
import { z, ZodObject } from "zod";

import { shape } from "../src/runtime/core/layers/shape";
import { resolveShape } from "../src/runtime/core/utils/shape";

describe("shape", () => {
    it("creates a zod object schema from factory callback", () => {
        const schema = shape((factory) => {
            return {
                id: factory.number(),
                name: factory.string(),
            };
        });

        expect(schema).toBeInstanceOf(ZodObject);
    });

    it("creates a zod object schema from raw object", () => {
        const schema = shape({
            id: z.number(),
            name: z.string(),
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

describe("defaults", () => {
    it("generates zero values for primitive types", () => {
        const schema = shape((factory) => ({
            name: factory.string(),
            age: factory.number(),
            active: factory.boolean(),
        }));

        expect(schema.defaults()).toEqual({
            name: "",
            age: 0,
            active: false,
        });
    });

    it("generates zero values for bigint and date", () => {
        const schema = shape((factory) => ({
            big: factory.bigint(),
            created: factory.date(),
        }));

        const result = schema.defaults();

        expect(result.big).toBe(BigInt(0));
        expect(result.created).toEqual(new Date(0));
    });

    it("generates empty string for string format types", () => {
        const schema = shape((factory) => ({
            email: factory.email(),
            url: factory.url(),
            uuid: factory.uuid(),
        }));

        expect(schema.defaults()).toEqual({
            email: "",
            url: "",
            uuid: "",
        });
    });

    it("generates zero values for collection types", () => {
        const schema = shape((factory) => ({
            tags: factory.array(factory.string()),
            meta: factory.record(factory.string(), factory.string()),
        }));

        expect(schema.defaults()).toEqual({
            tags: [],
            meta: {},
        });
    });

    it("generates zero values for map and set", () => {
        const schema = shape((factory) => ({
            lookup: factory.map(factory.string(), factory.number()),
            unique: factory.set(factory.string()),
        }));

        const result = schema.defaults();

        expect(result.lookup).toEqual(new Map());
        expect(result.unique).toEqual(new Set());
    });

    it("generates zero values for tuple", () => {
        const schema = shape((factory) => ({
            pair: factory.tuple([factory.string(), factory.number(), factory.boolean()]),
        }));

        expect(schema.defaults()).toEqual({
            pair: ["", 0, false],
        });
    });

    it("generates first value for enum", () => {
        const schema = shape((factory) => ({
            theme: factory.enum(["light", "dark"]),
        }));

        expect(schema.defaults()).toEqual({
            theme: "light",
        });
    });

    it("generates literal value", () => {
        const schema = shape((factory) => ({
            version: factory.literal("v1"),
        }));

        expect(schema.defaults()).toEqual({
            version: "v1",
        });
    });

    it("generates zero value of first union option", () => {
        const schema = shape((factory) => ({
            value: factory.union([factory.string(), factory.number()]),
        }));

        expect(schema.defaults()).toEqual({
            value: "",
        });
    });

    it("recursively generates defaults for nested objects", () => {
        const schema = shape((factory) => ({
            id: factory.number(),
            meta: factory.object({
                deadline: factory.string(),
                budget: factory.number(),
                options: factory.object({
                    notify: factory.boolean(),
                    priority: factory.number(),
                }),
            }),
        }));

        expect(schema.defaults()).toEqual({
            id: 0,
            meta: {
                deadline: "",
                budget: 0,
                options: {
                    notify: false,
                    priority: 0,
                },
            },
        });
    });

    it("resolves through optional wrapper", () => {
        const schema = shape((factory) => ({
            name: factory.optional(factory.string()),
        }));

        expect(schema.defaults()).toEqual({
            name: "",
        });
    });

    it("resolves through nullable wrapper", () => {
        const schema = shape((factory) => ({
            name: factory.nullable(factory.string()),
        }));

        expect(schema.defaults()).toEqual({
            name: "",
        });
    });

    it("uses Zod default value when present", () => {
        const schema = shape((factory) => ({
            name: factory.string().default("unnamed"),
            active: factory.boolean().default(true),
        }));

        expect(schema.defaults()).toEqual({
            name: "unnamed",
            active: true,
        });
    });

    it("uses Zod function default value when present", () => {
        const schema = shape((factory) => ({
            tags: factory.array(factory.string()).default(() => ["default"]),
        }));

        expect(schema.defaults()).toEqual({
            tags: ["default"],
        });
    });

    it("applies partial overrides", () => {
        const schema = shape((factory) => ({
            id: factory.number(),
            name: factory.string(),
            active: factory.boolean(),
        }));

        expect(schema.defaults({ active: true, name: "John" })).toEqual({
            id: 0,
            name: "John",
            active: true,
        });
    });

    it("works with real-world user shape", () => {
        const userShape = shape((factory) => ({
            id: factory.number().meta({ identifier: true }),
            name: factory.string(),
            email: factory.email(),
        }));

        expect(userShape.defaults()).toEqual({
            id: 0,
            name: "",
            email: "",
        });
    });

    it("works with real-world config shape", () => {
        const configShape = shape((factory) => ({
            theme: factory.enum(["light", "dark"]),
            language: factory.string(),
            notifications: factory.boolean(),
        }));

        expect(configShape.defaults()).toEqual({
            theme: "light",
            language: "",
            notifications: false,
        });
    });

    it("works as method on shape instance", () => {
        const schema = shape((factory) => ({
            id: factory.number(),
            name: factory.string(),
            active: factory.boolean(),
        }));

        expect(schema.defaults()).toEqual({
            id: 0,
            name: "",
            active: false,
        });
    });

    it("works as method on shape instance with overrides", () => {
        const schema = shape((factory) => ({
            id: factory.number(),
            name: factory.string(),
            active: factory.boolean(),
        }));

        expect(schema.defaults({ active: true, name: "John" })).toEqual({
            id: 0,
            name: "John",
            active: true,
        });
    });

    it("works with real-world project shape with nested objects and arrays", () => {
        const projectShape = shape((factory) => ({
            id: factory.number().meta({ identifier: true }),
            name: factory.string(),
            active: factory.boolean(),
            milestones: factory.array(
                factory.object({
                    id: factory.number(),
                    name: factory.string(),
                    done: factory.boolean(),
                }),
            ),
            meta: factory.object({
                deadline: factory.string(),
                budget: factory.number(),
                options: factory.object({
                    notify: factory.boolean(),
                    priority: factory.number(),
                }),
            }),
        }));

        expect(projectShape.defaults()).toEqual({
            id: 0,
            name: "",
            active: false,
            milestones: [],
            meta: {
                deadline: "",
                budget: 0,
                options: {
                    notify: false,
                    priority: 0,
                },
            },
        });
    });
});
