import { z } from "zod";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useStoreAlias } from "../src/runtime/composables/use";
import { createStore } from "../src/runtime/core/store";
import { EndpointMethod, Endpoint } from "../src/runtime/utils/endpoint";

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
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
    email: z.email().meta({
        methods: [EndpointMethod.POST],
    }),
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

describe("useStoreAlias", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("entity aliases", () => {
        it("exposes singular entity name for unit", () => {
            const store = createStore("admin", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.admin).toBeDefined();
            expect(alias.admin.value).toBeNull();
        });

        it("exposes pluralized entity name for units", () => {
            const store = createStore("client", UserSchema, endpoints);
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

    describe("memory actions", () => {
        it("exposes set actions for unit and units", () => {
            const store = createStore("member", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.setMember).toBeInstanceOf(Function);
            expect(alias.setMembers).toBeInstanceOf(Function);
        });

        it("exposes edit actions for unit and units", () => {
            const store = createStore("customer", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.editCustomer).toBeInstanceOf(Function);
            expect(alias.editCustomers).toBeInstanceOf(Function);
        });

        it("exposes drop actions for unit and units", () => {
            const store = createStore("visitor", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.dropVisitor).toBeInstanceOf(Function);
            expect(alias.dropVisitors).toBeInstanceOf(Function);
        });

        it("setUnit sets the unit value", () => {
            const store = createStore("employee", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            const user: User = { id: 1, name: "John", email: "john@test.com" };
            alias.setEmployee(user);

            expect(alias.employee.value).toEqual(user);
        });

        it("setUnits sets the units value", () => {
            const store = createStore("manager", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            const users: User[] = [
                { id: 1, name: "John", email: "john@test.com" },
                { id: 2, name: "Jane", email: "jane@test.com" },
            ];
            alias.setManagers(users);

            expect(alias.managers.value).toEqual(users);
        });

        it("editUnit merges partial data into unit", () => {
            const store = createStore("developer", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            alias.setDeveloper({ id: 1, name: "John", email: "john@test.com" });
            alias.editDeveloper({ id: 1, name: "John Doe" });

            expect(alias.developer.value?.name).toBe("John Doe");
            expect(alias.developer.value?.email).toBe("john@test.com");
        });

        it("dropUnit removes unit when indicator matches", () => {
            const store = createStore("designer", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            alias.setDesigner({ id: 1, name: "John", email: "john@test.com" });
            alias.dropDesigner({ id: 1 });

            expect(alias.designer.value).toBeNull();
        });
    });

    describe("endpoint methods", () => {
        it("exposes GET methods", () => {
            const store = createStore("author", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.getAuthor).toBeInstanceOf(Function);
            expect(alias.getAuthors).toBeInstanceOf(Function);
        });

        it("exposes POST methods", () => {
            const store = createStore("editor", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.postEditor).toBeInstanceOf(Function);
            expect(alias.postEditors).toBeInstanceOf(Function);
        });

        it("exposes PUT methods", () => {
            const store = createStore("reviewer", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.putReviewer).toBeInstanceOf(Function);
            expect(alias.putReviewers).toBeInstanceOf(Function);
        });

        it("exposes PATCH methods", () => {
            const store = createStore("moderator", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.patchModerator).toBeInstanceOf(Function);
            expect(alias.patchModerators).toBeInstanceOf(Function);
        });

        it("exposes DELETE methods", () => {
            const store = createStore("subscriber", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.deleteSubscriber).toBeInstanceOf(Function);
            expect(alias.deleteSubscribers).toBeInstanceOf(Function);
        });

        it("getUnits fetches and stores data", async () => {
            mockFetch.mockResolvedValueOnce([{ id: 1, name: "John", email: "john@test.com" }]);

            const store = createStore("contact", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            await alias.getContacts();

            expect(alias.contacts.value).toHaveLength(1);
            expect(alias.contacts.value[0].name).toBe("John");
        });

        it("getUnit fetches and stores single item", async () => {
            mockFetch.mockResolvedValueOnce({
                id: 1,
                name: "John",
                email: "john@test.com",
            });

            const store = createStore("partner", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            await alias.getPartner({ id: 1 });

            expect(alias.partner.value?.id).toBe(1);
        });

        it("postUnits creates and adds to collection", async () => {
            mockFetch.mockResolvedValueOnce({ id: 100 });

            const store = createStore("vendor", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            await alias.postVendors([{ id: 0, name: "New", email: "new@test.com" }]);

            expect(alias.vendors.value).toHaveLength(1);
            expect(alias.vendors.value[0].id).toBe(100);
        });

        it("patchUnits updates items in collection", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1, name: "Updated" });

            const store = createStore("supplier", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            alias.setSuppliers([{ id: 1, name: "Original", email: "o@test.com" }]);
            await alias.patchSuppliers([{ id: 1, name: "Updated" }]);

            expect(alias.suppliers.value[0].name).toBe("Updated");
        });

        it("deleteUnits removes items from collection", async () => {
            mockFetch.mockResolvedValueOnce({});

            const store = createStore("tenant", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            alias.setTenants([
                { id: 1, name: "John", email: "j@test.com" },
                { id: 2, name: "Jane", email: "ja@test.com" },
            ]);
            await alias.deleteTenants([{ id: 1 }]);

            expect(alias.tenants.value).toHaveLength(1);
            expect(alias.tenants.value[0].id).toBe(2);
        });
    });

    describe("status flags", () => {
        it("exposes status flags for GET methods", () => {
            const store = createStore("agent", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.getAgentIsIdle).toBeDefined();
            expect(alias.getAgentIsPending).toBeDefined();
            expect(alias.getAgentIsSuccess).toBeDefined();
            expect(alias.getAgentIsFailed).toBeDefined();

            expect(alias.getAgentsIsIdle).toBeDefined();
            expect(alias.getAgentsIsPending).toBeDefined();
            expect(alias.getAgentsIsSuccess).toBeDefined();
            expect(alias.getAgentsIsFailed).toBeDefined();
        });

        it("exposes status flags for POST methods", () => {
            const store = createStore("broker", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.postBrokerIsIdle).toBeDefined();
            expect(alias.postBrokerIsPending).toBeDefined();
            expect(alias.postBrokersIsIdle).toBeDefined();
            expect(alias.postBrokersIsPending).toBeDefined();
        });

        it("exposes status flags for PUT methods", () => {
            const store = createStore("dealer", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.putDealerIsIdle).toBeDefined();
            expect(alias.putDealerIsPending).toBeDefined();
            expect(alias.putDealersIsIdle).toBeDefined();
            expect(alias.putDealersIsPending).toBeDefined();
        });

        it("exposes status flags for PATCH methods", () => {
            const store = createStore("merchant", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.patchMerchantIsIdle).toBeDefined();
            expect(alias.patchMerchantIsPending).toBeDefined();
            expect(alias.patchMerchantsIsIdle).toBeDefined();
            expect(alias.patchMerchantsIsPending).toBeDefined();
        });

        it("exposes status flags for DELETE methods", () => {
            const store = createStore("provider", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            expect(alias.deleteProviderIsIdle).toBeDefined();
            expect(alias.deleteProviderIsPending).toBeDefined();
            expect(alias.deleteProvidersIsIdle).toBeDefined();
            expect(alias.deleteProvidersIsPending).toBeDefined();
        });

        it("status flags reflect request state", async () => {
            mockFetch.mockResolvedValueOnce([]);

            const store = createStore("consumer", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            await alias.getConsumers();

            expect(alias.getConsumersIsSuccess.value).toBe(true);
            expect(alias.getConsumersIsPending.value).toBe(false);
        });

        it("status flags show failed state on error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            const store = createStore("guest", UserSchema, endpoints);
            const alias = useStoreAlias(store);

            await expect(alias.getGuests()).rejects.toThrow();

            expect(alias.getGuestsIsFailed.value).toBe(true);
        });
    });
});
