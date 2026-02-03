import { z } from "zod";
import { describe, it, expect } from "vitest";

import { getMeta, getSchemaFields, resolveSchema } from "../src/runtime/utils/schema";

describe("getSchemaFields", () => {
    const TestSchema = z.object({
        id: z.number().meta({ indicator: true }),
        name: z.string().meta({ actions: ["create", "update"] }),
        email: z.string().meta({ actions: ["create"] }),
        createdAt: z.string(),
    });

    it("returns all field info from schema", () => {
        const fields = getSchemaFields(TestSchema);

        expect(fields).toHaveLength(4);
        expect(fields.map((f) => f.name)).toEqual(["id", "name", "email", "createdAt"]);
    });

    it("detects indicator field", () => {
        const fields = getSchemaFields(TestSchema);
        const idField = fields.find((f) => f.name === "id");

        expect(idField?.indicator).toBe(true);
    });

    it("extracts actions from meta", () => {
        const fields = getSchemaFields(TestSchema);
        const nameField = fields.find((f) => f.name === "name");
        const emailField = fields.find((f) => f.name === "email");

        expect(nameField?.actions).toEqual(["create", "update"]);
        expect(emailField?.actions).toEqual(["create"]);
    });

    it("returns empty actions for fields without meta", () => {
        const fields = getSchemaFields(TestSchema);
        const createdAtField = fields.find((f) => f.name === "createdAt");

        expect(createdAtField?.actions).toEqual([]);
        expect(createdAtField?.indicator).toBe(false);
    });

    it("returns cached result on subsequent calls", () => {
        const fields1 = getSchemaFields(TestSchema);
        const fields2 = getSchemaFields(TestSchema);

        expect(fields1).toBe(fields2);
    });

    it("caches different schemas separately", () => {
        const OtherSchema = z.object({
            uuid: z.string().meta({ indicator: true }),
            title: z.string(),
        });

        const testFields = getSchemaFields(TestSchema);
        const otherFields = getSchemaFields(OtherSchema);

        expect(testFields).not.toBe(otherFields);
        expect(testFields).toHaveLength(4);
        expect(otherFields).toHaveLength(2);
    });
});

describe("getMeta", () => {
    it("returns undefined for field without meta", () => {
        expect(getMeta(z.string())).toBeUndefined();
        expect(getMeta(z.number())).toBeUndefined();
    });

    it("returns meta with indicator", () => {
        const field = z.number().meta({ indicator: true });
        expect(getMeta(field)).toEqual({ indicator: true });
    });

    it("returns meta with actions", () => {
        const field = z.string().meta({
            actions: ["create", "update"],
        });
        expect(getMeta(field)).toEqual({
            actions: ["create", "update"],
        });
    });

    it("returns meta with both indicator and actions", () => {
        const field = z.number().meta({
            indicator: true,
            actions: ["get"],
        });
        expect(getMeta(field)).toEqual({
            indicator: true,
            actions: ["get"],
        });
    });
});

describe("resolveSchema", () => {
    const UserSchema = z.object({
        id: z.number().meta({ indicator: true }),
        name: z.string().meta({
            actions: ["create", "update"],
        }),
        email: z.string().meta({
            actions: ["create"],
        }),
        createdAt: z.string(),
    });

    const SimpleSchema = z.object({
        uid: z.number(),
        title: z.string(),
    });

    describe("indicator resolution", () => {
        it("returns default indicator 'id' when no meta", () => {
            const result = resolveSchema(SimpleSchema);
            expect(result.indicator).toBe("id");
        });

        it("detects indicator from schema meta", () => {
            const result = resolveSchema(UserSchema);
            expect(result.indicator).toBe("id");
        });

        it("uses custom indicator from options when no meta", () => {
            const result = resolveSchema(SimpleSchema, { indicator: "uid" });
            expect(result.indicator).toBe("uid");
        });

        it("schema meta indicator overrides options", () => {
            const result = resolveSchema(UserSchema, { indicator: "email" });
            expect(result.indicator).toBe("id");
        });
    });

    describe("keys extraction", () => {
        it("returns empty keys when no action", () => {
            const result = resolveSchema(UserSchema);
            expect(result.keys).toEqual({});
        });

        it("extracts keys for create action", () => {
            const result = resolveSchema(UserSchema, {
                action: "create",
            });
            expect(result.keys).toEqual({ name: true, email: true });
        });

        it("extracts keys for update action", () => {
            const result = resolveSchema(UserSchema, {
                action: "update",
            });
            expect(result.keys).toEqual({ name: true });
        });

        it("returns empty keys for get action", () => {
            const result = resolveSchema(UserSchema, {
                action: "get",
            });
            expect(result.keys).toEqual({});
        });
    });

    describe("values extraction", () => {
        it("returns empty values when no unit", () => {
            const result = resolveSchema(UserSchema, {
                action: "create",
            });
            expect(result.values).toEqual({});
        });

        it("extracts values for matching keys", () => {
            const result = resolveSchema(UserSchema, {
                action: "create",
                unit: { id: 1, name: "John", email: "john@example.com" },
            });
            expect(result.values).toEqual({
                name: "John",
                email: "john@example.com",
            });
        });

        it("excludes fields without matching action", () => {
            const result = resolveSchema(UserSchema, {
                action: "update",
                unit: { id: 1, name: "John", email: "john@example.com" },
            });
            expect(result.values).toEqual({ name: "John" });
        });

        it("only includes values for fields in unit", () => {
            const result = resolveSchema(UserSchema, {
                action: "create",
                unit: { id: 1, name: "John" },
            });
            expect(result.values).toEqual({ name: "John" });
        });
    });
});
