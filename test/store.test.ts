import { z } from "zod";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { StoreMemoryPosition, createStore } from "../src/runtime/core/store";
import { EndpointMethod, Endpoint } from "../src/runtime/utils/endpoint";

vi.stubGlobal("useRuntimeConfig", () => ({
    public: { harlemify: { api: { url: "https://api.example.com" } } },
}));

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

const UserSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PUT, EndpointMethod.PATCH],
    }),
    email: z.string().meta({ methods: [EndpointMethod.POST] }),
    createdAt: z.string(),
});

type User = z.infer<typeof UserSchema>;

const endpoints = {
    [Endpoint.GET_UNIT]: {
        method: EndpointMethod.GET,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.GET_UNITS]: { method: EndpointMethod.GET, url: "/users" },
    [Endpoint.POST_UNIT]: { method: EndpointMethod.POST, url: "/users" },
    [Endpoint.POST_UNITS]: { method: EndpointMethod.POST, url: "/users" },
    [Endpoint.PUT_UNIT]: {
        method: EndpointMethod.PUT,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.PUT_UNITS]: {
        method: EndpointMethod.PUT,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.PATCH_UNIT]: {
        method: EndpointMethod.PATCH,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.PATCH_UNITS]: {
        method: EndpointMethod.PATCH,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.DELETE_UNIT]: {
        method: EndpointMethod.DELETE,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        method: EndpointMethod.DELETE,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
};

describe("createStore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates store with initial state and status getters", () => {
        const userStore = createStore("user1", UserSchema, endpoints);

        expect(userStore.unit.value).toBeNull();
        expect(userStore.units.value).toEqual([]);
        expect(userStore.monitor.getUnitIsIdle).toBeDefined();
        expect(userStore.monitor.getUnitsIsPending).toBeDefined();
    });

    describe("memory", () => {
        it("sets and clears unit", () => {
            const userStore = createStore("user2", UserSchema, endpoints);
            const user: User = {
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            };

            userStore.memory.setUnit(user);
            expect(userStore.unit.value).toEqual(user);

            userStore.memory.setUnit(null);
            expect(userStore.unit.value).toBeNull();
        });

        it("sets and clears units", () => {
            const userStore = createStore("user3", UserSchema, endpoints);
            const users: User[] = [
                {
                    id: 1,
                    name: "John",
                    email: "john@example.com",
                    createdAt: "2024-01-01",
                },
                {
                    id: 2,
                    name: "Jane",
                    email: "jane@example.com",
                    createdAt: "2024-01-02",
                },
            ];

            userStore.memory.setUnits(users);
            expect(userStore.units.value).toEqual(users);

            userStore.memory.setUnits([]);
            expect(userStore.units.value).toEqual([]);
        });

        it("edits unit by indicator", () => {
            const userStore = createStore("user4", UserSchema, endpoints);
            userStore.memory.setUnit({
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            });

            userStore.memory.editUnit({ id: 1, name: "John Doe" });
            expect(userStore.unit.value?.name).toBe("John Doe");

            // Non-matching indicator should not modify
            userStore.memory.editUnit({ id: 2, name: "Jane" });
            expect(userStore.unit.value?.name).toBe("John Doe");
        });

        it("edits units by indicator", () => {
            const userStore = createStore("user5", UserSchema, endpoints);
            userStore.memory.setUnits([
                {
                    id: 1,
                    name: "John",
                    email: "john@example.com",
                    createdAt: "2024-01-01",
                },
                {
                    id: 2,
                    name: "Jane",
                    email: "jane@example.com",
                    createdAt: "2024-01-02",
                },
            ]);

            userStore.memory.editUnits([
                { id: 1, name: "John Doe" },
                { id: 2, name: "Jane Doe" },
            ]);

            expect(userStore.units.value[0].name).toBe("John Doe");
            expect(userStore.units.value[1].name).toBe("Jane Doe");
        });

        it("drops unit by indicator", () => {
            const userStore = createStore("user6", UserSchema, endpoints);
            userStore.memory.setUnit({
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            });

            userStore.memory.dropUnit({ id: 2 });
            expect(userStore.unit.value).not.toBeNull();

            userStore.memory.dropUnit({ id: 1 });
            expect(userStore.unit.value).toBeNull();
        });

        it("drops units by indicator", () => {
            const userStore = createStore("user7", UserSchema, endpoints);
            userStore.memory.setUnits([
                {
                    id: 1,
                    name: "John",
                    email: "john@example.com",
                    createdAt: "2024-01-01",
                },
                {
                    id: 2,
                    name: "Jane",
                    email: "jane@example.com",
                    createdAt: "2024-01-02",
                },
                {
                    id: 3,
                    name: "Bob",
                    email: "bob@example.com",
                    createdAt: "2024-01-03",
                },
            ]);

            userStore.memory.dropUnits([{ id: 1 }, { id: 3 }]);

            expect(userStore.units.value).toHaveLength(1);
            expect(userStore.units.value[0].id).toBe(2);
        });
    });

    describe("custom indicator", () => {
        it("uses custom indicator from options", () => {
            const CustomSchema = z.object({
                uuid: z.string(),
                name: z.string(),
            });
            const customStore = createStore("custom", CustomSchema, {}, { indicator: "uuid" });

            customStore.memory.setUnits([{ uuid: "abc-123", name: "Item 1" }]);

            expect(customStore.units.value[0].uuid).toBe("abc-123");
        });
    });

    describe("lifecycle hooks", () => {
        it("calls before and after hooks on success", async () => {
            const beforeHook = vi.fn();
            const afterHook = vi.fn();
            mockFetch.mockResolvedValueOnce([]);

            const userStore = createStore("user10", UserSchema, endpoints, {
                hooks: { before: beforeHook, after: afterHook },
            });

            await userStore.endpoint.getUnits();

            expect(beforeHook).toHaveBeenCalledTimes(1);
            expect(afterHook).toHaveBeenCalledWith();
        });

        it("calls after hook with error on failure", async () => {
            const afterHook = vi.fn();
            const error = new Error("API Error");
            mockFetch.mockRejectedValueOnce(error);

            const userStore = createStore("user11", UserSchema, endpoints, {
                hooks: { after: afterHook },
            });

            await expect(userStore.endpoint.getUnits()).rejects.toThrow("API Error");
            expect(afterHook).toHaveBeenCalledWith(error);
        });
    });

    describe("endpoint", () => {
        it("getUnit fetches and stores single unit", async () => {
            const user = {
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            };
            mockFetch.mockResolvedValueOnce(user);

            const userStore = createStore("user12", UserSchema, endpoints);
            const result = await userStore.endpoint.getUnit({ id: 1 });

            expect(result).toEqual(user);
            expect(userStore.unit.value).toEqual(user);
        });

        it("getUnits fetches and stores multiple units", async () => {
            const users = [
                { id: 1, name: "John", email: "john@example.com" },
                { id: 2, name: "Jane", email: "jane@example.com" },
            ];
            mockFetch.mockResolvedValueOnce(users);

            const userStore = createStore("user13", UserSchema, endpoints);
            const result = await userStore.endpoint.getUnits();

            expect(result).toEqual(users);
            expect(userStore.units.value).toEqual(users);
        });

        it("postUnit creates and merges response into memory", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1, createdAt: "2024-01-01" });

            const userStore = createStore("user14", UserSchema, endpoints);
            await userStore.endpoint.postUnit({
                id: 0,
                name: "New",
                email: "new@example.com",
                createdAt: "",
            });

            expect(userStore.unit.value?.id).toBe(1);
            expect(userStore.unit.value?.name).toBe("New");
        });

        it("postUnits adds to beginning by default, end with LAST", async () => {
            mockFetch.mockResolvedValue({ id: 10 });

            const userStore = createStore("user15", UserSchema, endpoints);
            userStore.memory.setUnits([{ id: 1, name: "Existing", email: "e@e.com", createdAt: "" }]);

            await userStore.endpoint.postUnits([{ id: 0, name: "New", email: "n@n.com", createdAt: "" }]);
            expect(userStore.units.value[0].id).toBe(10);

            await userStore.endpoint.postUnits([{ id: 0, name: "Last", email: "l@l.com", createdAt: "" }], {
                position: StoreMemoryPosition.LAST,
            });
            expect(userStore.units.value[userStore.units.value.length - 1].name).toBe("Last");
        });

        it("patchUnit partially updates existing unit", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1, name: "Updated" });

            const userStore = createStore("user16", UserSchema, endpoints);
            userStore.memory.setUnit({
                id: 1,
                name: "Original",
                email: "test@e.com",
                createdAt: "",
            });

            await userStore.endpoint.patchUnit({ id: 1, name: "Updated" });

            expect(userStore.unit.value?.name).toBe("Updated");
            expect(userStore.unit.value?.email).toBe("test@e.com");
        });

        it("deleteUnit removes unit from memory", async () => {
            mockFetch.mockResolvedValueOnce({});

            const userStore = createStore("user17", UserSchema, endpoints);
            userStore.memory.setUnit({
                id: 1,
                name: "John",
                email: "j@e.com",
                createdAt: "",
            });

            await userStore.endpoint.deleteUnit({ id: 1 });

            expect(userStore.unit.value).toBeNull();
        });

        it("deleteUnits removes multiple units from memory", async () => {
            mockFetch.mockResolvedValue({});

            const userStore = createStore("user18", UserSchema, endpoints);
            userStore.memory.setUnits([
                { id: 1, name: "John", email: "j@e.com", createdAt: "" },
                { id: 2, name: "Jane", email: "ja@e.com", createdAt: "" },
            ]);

            await userStore.endpoint.deleteUnits([{ id: 1 }]);

            expect(userStore.units.value).toHaveLength(1);
            expect(userStore.units.value[0].id).toBe(2);
        });

        it("putUnit replaces unit entirely", async () => {
            mockFetch.mockResolvedValueOnce({
                id: 1,
                name: "Replaced",
                email: "replaced@e.com",
                createdAt: "2024-01-01",
            });

            const userStore = createStore("user23", UserSchema, endpoints);
            userStore.memory.setUnit({
                id: 1,
                name: "Original",
                email: "original@e.com",
                createdAt: "",
            });

            const result = await userStore.endpoint.putUnit({
                id: 1,
                name: "Replaced",
                email: "replaced@e.com",
                createdAt: "2024-01-01",
            });

            expect(result.name).toBe("Replaced");
            expect(userStore.unit.value?.name).toBe("Replaced");
        });

        it("putUnits replaces multiple units", async () => {
            mockFetch
                .mockResolvedValueOnce({ id: 1, name: "Updated1" })
                .mockResolvedValueOnce({ id: 2, name: "Updated2" });

            const userStore = createStore("user24", UserSchema, endpoints);
            userStore.memory.setUnits([
                { id: 1, name: "Original1", email: "o1@e.com", createdAt: "" },
                { id: 2, name: "Original2", email: "o2@e.com", createdAt: "" },
            ]);

            const results = await userStore.endpoint.putUnits([
                { id: 1, name: "Updated1", email: "u1@e.com", createdAt: "" },
                { id: 2, name: "Updated2", email: "u2@e.com", createdAt: "" },
            ]);

            expect(results).toHaveLength(2);
            expect(userStore.units.value[0].name).toBe("Updated1");
            expect(userStore.units.value[1].name).toBe("Updated2");
        });

        it("patchUnits partially updates multiple units", async () => {
            mockFetch
                .mockResolvedValueOnce({ id: 1, name: "Patched1" })
                .mockResolvedValueOnce({ id: 2, name: "Patched2" });

            const userStore = createStore("user25", UserSchema, endpoints);
            userStore.memory.setUnits([
                { id: 1, name: "Original1", email: "o1@e.com", createdAt: "" },
                { id: 2, name: "Original2", email: "o2@e.com", createdAt: "" },
            ]);

            const results = await userStore.endpoint.patchUnits([
                { id: 1, name: "Patched1" },
                { id: 2, name: "Patched2" },
            ]);

            expect(results).toHaveLength(2);
            expect(userStore.units.value[0].name).toBe("Patched1");
            expect(userStore.units.value[0].email).toBe("o1@e.com");
            expect(userStore.units.value[1].name).toBe("Patched2");
        });
    });

    describe("validation", () => {
        it("validates postUnit with validate option", async () => {
            const userStore = createStore("user26", UserSchema, endpoints);

            await expect(
                userStore.endpoint.postUnit(
                    { id: 0, name: 123 as any, email: "test@e.com", createdAt: "" },
                    { validate: true },
                ),
            ).rejects.toThrow();
        });

        it("validates putUnit with validate option", async () => {
            const userStore = createStore("user27", UserSchema, endpoints);

            await expect(
                userStore.endpoint.putUnit(
                    { id: 1, name: 123 as any, email: "test@e.com", createdAt: "" },
                    { validate: true },
                ),
            ).rejects.toThrow();
        });

        it("validates patchUnit with validate option", async () => {
            const userStore = createStore("user28", UserSchema, endpoints);

            await expect(
                userStore.endpoint.patchUnit({ id: 1, name: 123 as any }, { validate: true }),
            ).rejects.toThrow();
        });

        it("skips validation when validate is false or not set", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1 });

            const userStore = createStore("user29", UserSchema, endpoints);

            await expect(
                userStore.endpoint.postUnit({ id: 0, name: "Valid", email: "test@e.com", createdAt: "" }),
            ).resolves.toBeDefined();
        });
    });

    describe("monitor", () => {
        it("transitions to SUCCESS on success", async () => {
            mockFetch.mockResolvedValueOnce([]);
            const userStore = createStore("user19", UserSchema, endpoints);

            await userStore.endpoint.getUnits();

            expect(userStore.monitor.getUnitsIsSuccess.value).toBe(true);
        });

        it("transitions to FAILED on error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("API Error"));
            const userStore = createStore("user30", UserSchema, endpoints);

            await expect(userStore.endpoint.getUnits()).rejects.toThrow();

            expect(userStore.monitor.getUnitsIsFailed.value).toBe(true);
        });

        it("throws if endpoint is not configured", async () => {
            const userStore = createStore("user22", UserSchema, {});

            await expect(userStore.endpoint.getUnits()).rejects.toThrow('Endpoint "getUnits" is not configured');
        });
    });
});
