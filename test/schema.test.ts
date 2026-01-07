import { z } from "zod";
import { describe, it, expect } from "vitest";

import { getMeta, resolveSchema } from "../src/runtime/utils/schema";
import { EndpointMethod } from "../src/runtime/utils/endpoint";

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
            methods: [EndpointMethod.POST, EndpointMethod.PUT],
        });
        expect(getMeta(field)).toEqual({
            methods: [EndpointMethod.POST, EndpointMethod.PUT],
        });
    });

    it("returns meta with both indicator and actions", () => {
        const field = z.number().meta({
            indicator: true,
            methods: [EndpointMethod.GET],
        });
        expect(getMeta(field)).toEqual({
            indicator: true,
            methods: [EndpointMethod.GET],
        });
    });
});

describe("resolveSchema", () => {
    const UserSchema = z.object({
        id: z.number().meta({ indicator: true }),
        name: z.string().meta({
            methods: [EndpointMethod.POST, EndpointMethod.PUT, EndpointMethod.PATCH],
        }),
        email: z.string().meta({
            methods: [EndpointMethod.POST],
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
        it("returns empty keys when no endpoint", () => {
            const result = resolveSchema(UserSchema);
            expect(result.keys).toEqual({});
        });

        it("extracts keys for POST action", () => {
            const result = resolveSchema(UserSchema, {
                endpoint: { method: EndpointMethod.POST, url: "/users" },
            });
            expect(result.keys).toEqual({ name: true, email: true });
        });

        it("extracts keys for PATCH action", () => {
            const result = resolveSchema(UserSchema, {
                endpoint: { method: EndpointMethod.PATCH, url: "/users" },
            });
            expect(result.keys).toEqual({ name: true });
        });

        it("returns empty keys for GET action", () => {
            const result = resolveSchema(UserSchema, {
                endpoint: { method: EndpointMethod.GET, url: "/users" },
            });
            expect(result.keys).toEqual({});
        });
    });

    describe("values extraction", () => {
        it("returns empty values when no unit", () => {
            const result = resolveSchema(UserSchema, {
                endpoint: { method: EndpointMethod.POST, url: "/users" },
            });
            expect(result.values).toEqual({});
        });

        it("extracts values for matching keys", () => {
            const result = resolveSchema(UserSchema, {
                endpoint: { method: EndpointMethod.POST, url: "/users" },
                unit: { id: 1, name: "John", email: "john@example.com" },
            });
            expect(result.values).toEqual({
                name: "John",
                email: "john@example.com",
            });
        });

        it("excludes fields without matching action", () => {
            const result = resolveSchema(UserSchema, {
                endpoint: { method: EndpointMethod.PATCH, url: "/users" },
                unit: { id: 1, name: "John", email: "john@example.com" },
            });
            expect(result.values).toEqual({ name: "John" });
        });

        it("only includes values for fields in unit", () => {
            const result = resolveSchema(UserSchema, {
                endpoint: { method: EndpointMethod.POST, url: "/users" },
                unit: { id: 1, name: "John" },
            });
            expect(result.values).toEqual({ name: "John" });
        });
    });
});
