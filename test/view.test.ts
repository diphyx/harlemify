import { describe, it, expect } from "vitest";
import { createStore } from "@harlem/core";

import { shape } from "../src/runtime/core/layers/shape";
import { createModelFactory } from "../src/runtime/core/layers/model";
import { createViewFactory } from "../src/runtime/core/layers/view";
import { initializeState, createMutations } from "../src/runtime/core/utils/model";
import { createView } from "../src/runtime/core/utils/view";
import type { ShapeInfer } from "../src/runtime/core/types/shape";

const UserShape = shape((field) => {
    return {
        id: field.number(),
        name: field.string(),
        email: field.string(),
    };
});

type User = ShapeInfer<typeof UserShape>;

describe("createViewFactory", () => {
    const modelFactory = createModelFactory();

    const model = {
        user: modelFactory.one(UserShape),
        users: modelFactory.many(UserShape),
    };

    const viewFactory = createViewFactory(model);

    it("from() creates single-source definition", () => {
        const definition = viewFactory.from("user");

        expect(definition.sources).toEqual(["user"]);
        expect(definition.resolver).toBeUndefined();
    });

    it("from() with resolver", () => {
        const resolver = (user: User | null) => {
            return user?.name ?? "unknown";
        };

        const definition = viewFactory.from("user", resolver);

        expect(definition.sources).toEqual(["user"]);
        expect(definition.resolver).toBe(resolver);
    });

    it("merge() creates multi-source definition", () => {
        const resolver = (user: User | null, users: User[]) => {
            return {
                current: user,
                total: users?.length ?? 0,
            };
        };

        const definition = viewFactory.merge(["user", "users"], resolver);

        expect(definition.sources).toEqual(["user", "users"]);
        expect(definition.resolver).toBe(resolver);
    });
});

describe("createView", () => {
    function setup() {
        const modelFactory = createModelFactory();
        const model = {
            user: modelFactory.one(UserShape),
            users: modelFactory.many(UserShape),
        };

        const viewFactory = createViewFactory(model);

        const state = initializeState(model);
        const source = createStore("test-view-" + Math.random(), state);
        const mutations = createMutations(source, model);

        return {
            source,
            model,
            mutations,
            viewFactory,
        };
    }

    it("creates view from single source", () => {
        const { source, viewFactory } = setup();

        const definitions = {
            user: viewFactory.from("user"),
        };

        const view = createView(source, definitions);

        expect(view.user).toBeDefined();
        expect(view.user.value).toBeNull();
    });

    it("view reflects state changes", () => {
        const { source, mutations, viewFactory } = setup();

        const definitions = {
            user: viewFactory.from("user"),
        };

        const view = createView(source, definitions);
        const user: User = {
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        };

        mutations.user.set(user);

        expect(view.user.value).toEqual(user);
    });

    it("view with resolver transforms data", () => {
        const { source, mutations, viewFactory } = setup();

        const definitions = {
            userName: viewFactory.from("user", (user: User | null) => {
                return user?.name ?? "unknown";
            }),
        };

        const view = createView(source, definitions);

        expect(view.userName.value).toBe("unknown");

        mutations.user.set({
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        });

        expect(view.userName.value).toBe("Alice");
    });

    it("merge view combines multiple sources", () => {
        const { source, mutations, viewFactory } = setup();

        const definitions = {
            summary: viewFactory.merge(["user", "users"], (user: User | null, users: User[]) => {
                return {
                    current: user?.name ?? "none",
                    total: users?.length ?? 0,
                };
            }),
        };

        const view = createView(source, definitions);

        expect(view.summary.value).toEqual({
            current: "none",
            total: 0,
        });

        mutations.user.set({
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        });
        mutations.users.set([
            {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            },
            {
                id: 2,
                name: "Bob",
                email: "bob@test.com",
            },
        ]);

        expect(view.summary.value).toEqual({
            current: "Alice",
            total: 2,
        });
    });
});
