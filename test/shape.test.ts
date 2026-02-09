import { describe, it, expect } from "vitest";
import { z, ZodObject } from "zod";

import { shape } from "../src/runtime/core/layers/shape";
import { resolveShape, resolveAliasInbound, resolveAliasOutbound } from "../src/runtime/core/utils/shape";

// Shape

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

// Resolve

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

    it("extracts aliases from field meta", () => {
        const schema = shape((factory) => ({
            id: factory.number().meta({ identifier: true }),
            first_name: factory.string().meta({ alias: "first-name" }),
            last_name: factory.string().meta({ alias: "last-name" }),
        }));

        const meta = resolveShape(schema);

        expect(meta.aliases).toEqual({
            first_name: "first-name",
            last_name: "last-name",
        });
    });

    it("returns empty aliases when no aliases exist", () => {
        const schema = shape((factory) => ({
            id: factory.number(),
            name: factory.string(),
        }));

        const meta = resolveShape(schema);

        expect(meta.aliases).toEqual({});
    });

    it("extracts aliases alongside identifier", () => {
        const schema = shape((factory) => ({
            user_id: factory.number().meta({ identifier: true, alias: "userId" }),
            first_name: factory.string().meta({ alias: "firstName" }),
        }));

        const meta = resolveShape(schema);

        expect(meta.identifier).toBe("user_id");
        expect(meta.aliases).toEqual({
            user_id: "userId",
            first_name: "firstName",
        });
    });
});

// Alias

describe("resolveAliasInbound", () => {
    const aliases = { first_name: "first-name", last_name: "last-name" };

    it("remaps alias keys to shape keys for an object", () => {
        const data = { id: 1, "first-name": "John", "last-name": "Doe" };

        const result = resolveAliasInbound(data, aliases);

        expect(result).toEqual({ id: 1, first_name: "John", last_name: "Doe" });
    });

    it("remaps alias keys for an array of objects", () => {
        const data = [
            { id: 1, "first-name": "John" },
            { id: 2, "first-name": "Jane" },
        ];

        const result = resolveAliasInbound(data, aliases);

        expect(result).toEqual([
            { id: 1, first_name: "John" },
            { id: 2, first_name: "Jane" },
        ]);
    });

    it("returns non-object data as-is", () => {
        expect(resolveAliasInbound("hello", aliases)).toBe("hello");
        expect(resolveAliasInbound(42, aliases)).toBe(42);
        expect(resolveAliasInbound(null, aliases)).toBeNull();
    });

    it("returns data as-is when aliases is empty", () => {
        const data = { "first-name": "John" };

        expect(resolveAliasInbound(data, {})).toBe(data);
    });
});

describe("resolveAliasOutbound", () => {
    const aliases = { first_name: "first-name", last_name: "last-name" };

    it("remaps shape keys to alias keys for an object", () => {
        const data = { id: 1, first_name: "John", last_name: "Doe" };

        const result = resolveAliasOutbound(data, aliases);

        expect(result).toEqual({ id: 1, "first-name": "John", "last-name": "Doe" });
    });

    it("remaps shape keys for an array of objects", () => {
        const data = [
            { id: 1, first_name: "John" },
            { id: 2, first_name: "Jane" },
        ];

        const result = resolveAliasOutbound(data, aliases);

        expect(result).toEqual([
            { id: 1, "first-name": "John" },
            { id: 2, "first-name": "Jane" },
        ]);
    });

    it("returns non-object data as-is", () => {
        expect(resolveAliasOutbound("hello", aliases)).toBe("hello");
        expect(resolveAliasOutbound(42, aliases)).toBe(42);
        expect(resolveAliasOutbound(null, aliases)).toBeNull();
    });

    it("returns data as-is when aliases is empty", () => {
        const data = { first_name: "John" };

        expect(resolveAliasOutbound(data, {})).toBe(data);
    });
});

// Defaults

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
