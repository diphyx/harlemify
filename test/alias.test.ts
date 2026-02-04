import { z } from "zod";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useStoreAlias } from "../src/runtime/composables/alias";
import { createStore } from "../src/runtime/core/store";
import { Endpoint, EndpointStatus } from "../src/runtime/utils/endpoint";
import { Memory } from "../src/runtime/utils/memory";

vi.stubGlobal("useRuntimeConfig", () => ({
    public: { harlemify: { api: { url: "https://api.example.com" } } },
}));

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: ["create", "update"],
    }),
    email: z.email().meta({
        actions: ["create"],
    }),
});

type User = z.infer<typeof UserSchema>;

const actions = {
    get: {
        endpoint: Endpoint.get<User>((p) => `/users/${p.id}`),
        memory: Memory.unit(),
    },
    list: {
        endpoint: Endpoint.get("/users"),
        memory: Memory.units(),
    },
    create: {
        endpoint: Endpoint.post("/users"),
        memory: Memory.units().add(),
    },
    update: {
        endpoint: Endpoint.patch<User>((p) => `/users/${p.id}`),
        memory: Memory.units().edit(),
    },
    delete: {
        endpoint: Endpoint.delete<User>((p) => `/users/${p.id}`),
        memory: Memory.units().drop(),
    },
};

describe("useStoreAlias", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("entity aliases", () => {
        it("exposes singular entity name for unit", () => {
            const store = createStore("admin", UserSchema, actions);
            const alias = useStoreAlias(store);

            expect(alias.admin).toBeDefined();
            expect(alias.admin.value).toBeNull();
        });

        it("exposes pluralized entity name for units", () => {
            const store = createStore("client", UserSchema, actions);
            const alias = useStoreAlias(store);

            expect(alias.clients).toBeDefined();
            expect(alias.clients.value).toEqual([]);
        });

        it("handles entity names ending with consonant + y", () => {
            const CategorySchema = z.object({
                id: z.number().meta({ indicator: true }),
                name: z.string(),
            });
            const store = createStore("category", CategorySchema, {});
            const alias = useStoreAlias(store);

            expect(alias.category).toBeDefined();
            expect(alias.categories).toBeDefined();
        });

        it("handles entity names ending with s", () => {
            const StatusSchema = z.object({
                id: z.number().meta({ indicator: true }),
                label: z.string(),
            });
            const store = createStore("status", StatusSchema, {});
            const alias = useStoreAlias(store);

            expect(alias.status).toBeDefined();
            expect(alias.statuses).toBeDefined();
        });
    });

    describe("memory namespace", () => {
        it("exposes memory namespace with entity name", () => {
            const store = createStore("member", UserSchema, actions);
            const alias = useStoreAlias(store);

            expect(alias.memberMemory).toBeDefined();
            expect(alias.memberMemory.set).toBeInstanceOf(Function);
            expect(alias.memberMemory.edit).toBeInstanceOf(Function);
            expect(alias.memberMemory.drop).toBeInstanceOf(Function);
        });

        it("memory.set sets the unit value", () => {
            const store = createStore("employee", UserSchema, actions);
            const alias = useStoreAlias(store);

            const user: User = { id: 1, name: "John", email: "john@test.com" };
            alias.employeeMemory.set(user);

            expect(alias.employee.value).toEqual(user);
        });

        it("memory.set sets the units value when array", () => {
            const store = createStore("manager", UserSchema, actions);
            const alias = useStoreAlias(store);

            const users: User[] = [
                { id: 1, name: "John", email: "john@test.com" },
                { id: 2, name: "Jane", email: "jane@test.com" },
            ];
            alias.managerMemory.set(users);

            expect(alias.managers.value).toEqual(users);
        });

        it("memory.edit merges partial data into unit", () => {
            const store = createStore("developer", UserSchema, actions);
            const alias = useStoreAlias(store);

            alias.developerMemory.set({ id: 1, name: "John", email: "john@test.com" });
            alias.developerMemory.edit({ id: 1, name: "John Doe" });

            expect(alias.developer.value?.name).toBe("John Doe");
            expect(alias.developer.value?.email).toBe("john@test.com");
        });

        it("memory.drop removes unit when indicator matches", () => {
            const store = createStore("designer", UserSchema, actions);
            const alias = useStoreAlias(store);

            alias.designerMemory.set({ id: 1, name: "John", email: "john@test.com" });
            alias.designerMemory.drop({ id: 1 });

            expect(alias.designer.value).toBeNull();
        });
    });

    describe("action methods (entity prefixed)", () => {
        it("exposes actions with [action][Entity] naming", () => {
            const store = createStore("author", UserSchema, actions);
            const alias = useStoreAlias(store);

            expect(alias.getAuthor).toBeInstanceOf(Function);
            expect(alias.listAuthor).toBeInstanceOf(Function);
            expect(alias.createAuthor).toBeInstanceOf(Function);
            expect(alias.updateAuthor).toBeInstanceOf(Function);
            expect(alias.deleteAuthor).toBeInstanceOf(Function);
        });

        it("list fetches and stores data", async () => {
            mockFetch.mockResolvedValueOnce([{ id: 1, name: "John", email: "john@test.com" }]);

            const store = createStore("contact", UserSchema, actions);
            const alias = useStoreAlias(store);

            await alias.listContact();

            expect(alias.contacts.value).toHaveLength(1);
            expect(alias.contacts.value[0].name).toBe("John");
        });

        it("get fetches and stores single item", async () => {
            mockFetch.mockResolvedValueOnce({
                id: 1,
                name: "John",
                email: "john@test.com",
            });

            const store = createStore("partner", UserSchema, actions);
            const alias = useStoreAlias(store);

            await alias.getPartner({ id: 1 });

            expect(alias.partner.value?.id).toBe(1);
        });

        it("create adds to collection", async () => {
            mockFetch.mockResolvedValueOnce({ id: 100 });

            const store = createStore("vendor", UserSchema, actions);
            const alias = useStoreAlias(store);

            await alias.createVendor({ id: 0, name: "New", email: "new@test.com" });

            expect(alias.vendors.value).toHaveLength(1);
            expect(alias.vendors.value[0].id).toBe(100);
        });

        it("update updates items in collection", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1, name: "Updated" });

            const store = createStore("supplier", UserSchema, actions);
            const alias = useStoreAlias(store);

            alias.supplierMemory.set([{ id: 1, name: "Original", email: "o@test.com" }]);
            await alias.updateSupplier({ id: 1, name: "Updated" });

            expect(alias.suppliers.value[0].name).toBe("Updated");
        });

        it("delete removes items from collection", async () => {
            mockFetch.mockResolvedValueOnce({});

            const store = createStore("tenant", UserSchema, actions);
            const alias = useStoreAlias(store);

            alias.tenantMemory.set([
                { id: 1, name: "John", email: "j@test.com" },
                { id: 2, name: "Jane", email: "ja@test.com" },
            ]);
            await alias.deleteTenant({ id: 1 });

            expect(alias.tenants.value).toHaveLength(1);
            expect(alias.tenants.value[0].id).toBe(2);
        });
    });

    describe("monitor namespace", () => {
        it("exposes monitor namespace with entity name", () => {
            const store = createStore("agent", UserSchema, actions);
            const alias = useStoreAlias(store);

            expect(alias.agentMonitor).toBeDefined();
            expect(alias.agentMonitor.get).toBeDefined();
            expect(alias.agentMonitor.list).toBeDefined();
            expect(alias.agentMonitor.create).toBeDefined();
            expect(alias.agentMonitor.update).toBeDefined();
            expect(alias.agentMonitor.delete).toBeDefined();
        });

        it("monitor has status properties for each action", () => {
            const store = createStore("broker", UserSchema, actions);
            const alias = useStoreAlias(store);

            expect(alias.brokerMonitor.list.idle()).toBe(true);
            expect(alias.brokerMonitor.list.pending()).toBe(false);
            expect(alias.brokerMonitor.list.success()).toBe(false);
            expect(alias.brokerMonitor.list.failed()).toBe(false);
            expect(alias.brokerMonitor.list.current()).toBe(EndpointStatus.IDLE);
        });

        it("monitor reflects request state", async () => {
            mockFetch.mockResolvedValueOnce([]);

            const store = createStore("consumer", UserSchema, actions);
            const alias = useStoreAlias(store);

            await alias.listConsumer();

            expect(alias.consumerMonitor.list.success()).toBe(true);
            expect(alias.consumerMonitor.list.pending()).toBe(false);
        });

        it("monitor shows failed state on error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            const store = createStore("guest", UserSchema, actions);
            const alias = useStoreAlias(store);

            await expect(alias.listGuest()).rejects.toThrow();

            expect(alias.guestMonitor.list.failed()).toBe(true);
        });
    });

    describe("multiple stores", () => {
        it("different stores have different namespaces", () => {
            const userStore = createStore("user", UserSchema, actions);
            const postStore = createStore("post", UserSchema, actions);

            const userAlias = useStoreAlias(userStore);
            const postAlias = useStoreAlias(postStore);

            expect(userAlias.user).toBeDefined();
            expect(userAlias.userMemory).toBeDefined();
            expect(userAlias.userMonitor).toBeDefined();
            expect(userAlias.getUser).toBeDefined();

            expect(postAlias.post).toBeDefined();
            expect(postAlias.postMemory).toBeDefined();
            expect(postAlias.postMonitor).toBeDefined();
            expect(postAlias.getPost).toBeDefined();
        });
    });

    describe("collection pattern (posts page simulation)", () => {
        it("list then update with Memory.units().edit() updates the collection", async () => {
            const PostSchema = z.object({
                id: z.number().meta({ indicator: true }),
                title: z.string().meta({ actions: ["create", "update"] }),
                body: z.string().meta({ actions: ["create", "update"] }),
                userId: z.number().meta({ actions: ["create"] }),
            });

            const postStore = createStore("postTest", PostSchema, {
                list: {
                    endpoint: Endpoint.get("/posts"),
                    memory: Memory.units(),
                },
                update: {
                    endpoint: Endpoint.patch<z.infer<typeof PostSchema>>((p) => `/posts/${p.id}`),
                    memory: Memory.units().edit(),
                },
            });

            const alias = useStoreAlias(postStore);

            // Initial state
            expect(alias.postTests.value).toEqual([]);

            // Step 1: List posts (simulates onMounted)
            mockFetch.mockResolvedValueOnce([
                { id: 1, title: "Post 1", body: "Body 1", userId: 1 },
                { id: 2, title: "Post 2", body: "Body 2", userId: 1 },
                { id: 3, title: "Post 3", body: "Body 3", userId: 2 },
            ]);
            await alias.listPostTest();

            expect(alias.postTests.value).toHaveLength(3);
            expect(alias.postTests.value[0].title).toBe("Post 1");

            // Step 2: Update post (simulates edit and save)
            mockFetch.mockResolvedValueOnce({
                id: 1,
                title: "Updated Post 1",
                body: "Updated Body 1",
                userId: 1,
            });
            await alias.updatePostTest({ id: 1, title: "Updated Post 1", body: "Updated Body 1" });

            // Verify the state was updated
            expect(alias.postTests.value).toHaveLength(3);
            expect(alias.postTests.value[0].title).toBe("Updated Post 1");
            expect(alias.postTests.value[0].body).toBe("Updated Body 1");
            expect(alias.postTests.value[1].title).toBe("Post 2"); // Other posts unchanged
        });
    });

    describe("singleton pattern (config page simulation)", () => {
        it("get then update with Memory.unit().edit() updates the singleton", async () => {
            const ConfigSchema = z.object({
                id: z.number().meta({ indicator: true }),
                theme: z.enum(["light", "dark"]).meta({ actions: ["update"] }),
                language: z.string().meta({ actions: ["update"] }),
                notifications: z.boolean().meta({ actions: ["update"] }),
            });

            const configStore = createStore("configTest", ConfigSchema, {
                get: {
                    endpoint: Endpoint.get("/config"),
                    memory: Memory.unit(),
                },
                update: {
                    endpoint: Endpoint.patch("/config"),
                    memory: Memory.unit().edit(),
                },
            });

            const alias = useStoreAlias(configStore);

            // Initial state
            expect(alias.configTest.value).toBeNull();

            // Step 1: Get config (simulates onMounted)
            mockFetch.mockResolvedValueOnce({
                id: 1,
                theme: "dark",
                language: "en",
                notifications: true,
            });
            await alias.getConfigTest();

            expect(alias.configTest.value).toEqual({
                id: 1,
                theme: "dark",
                language: "en",
                notifications: true,
            });

            // Step 2: Update theme (simulates toggleTheme)
            mockFetch.mockResolvedValueOnce({
                id: 1,
                theme: "light",
                language: "en",
                notifications: true,
            });
            await alias.updateConfigTest({ id: 1, theme: "light" });

            // Verify the state was updated
            expect(alias.configTest.value?.theme).toBe("light");
            expect(alias.configTest.value?.language).toBe("en");
            expect(alias.configTest.value?.notifications).toBe(true);
        });
    });
});
