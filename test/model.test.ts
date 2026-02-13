import { describe, it, expect, vi } from "vitest";
import { createStore } from "@harlem/core";

import { shape } from "../src/runtime/core/layers/shape";
import { createModelFactory } from "../src/runtime/core/layers/model";
import { createStoreState, createStoreModel } from "../src/runtime/core/utils/store";
import { ModelType, ModelManyKind, ModelOneMode, ModelSilent } from "../src/runtime/core/types/model";
import type { ShapeInfer } from "../src/runtime/core/types/shape";

// Setup

const UserShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
        email: factory.string(),
    };
});

type User = ShapeInfer<typeof UserShape>;

// Factory

describe("createModelFactory", () => {
    const factory = createModelFactory();

    it("one() creates object definition", () => {
        const definition = factory.one(UserShape);

        expect(definition.type).toBe(ModelType.ONE);
        expect(definition.shape).toBe(UserShape);
        expect(definition.options).toEqual({ identifier: undefined });
    });

    it("one() accepts options", () => {
        const defaultUser: User = {
            id: 1,
            name: "test",
            email: "test@test.com",
        };
        const definition = factory.one(UserShape, {
            default: defaultUser,
            identifier: "email",
        });

        expect(definition.options?.default).toEqual(defaultUser);
        expect(definition.options?.identifier).toBe("email");
    });

    it("one() accepts pre/post hooks", () => {
        const pre = () => {};
        const post = () => {};
        const definition = factory.one(UserShape, { pre, post });

        expect(definition.options?.pre).toBe(pre);
        expect(definition.options?.post).toBe(post);
    });

    it("many() creates array definition", () => {
        const definition = factory.many(UserShape);

        expect(definition.type).toBe(ModelType.MANY);
        expect(definition.shape).toBe(UserShape);
        expect(definition.options).toEqual({ identifier: undefined });
    });

    it("many() accepts options", () => {
        const definition = factory.many(UserShape, { identifier: "email" });

        expect(definition.options?.identifier).toBe("email");
    });

    it("many() accepts pre/post hooks", () => {
        const pre = () => {};
        const post = () => {};
        const definition = factory.many(UserShape, { pre, post });

        expect(definition.options?.pre).toBe(pre);
        expect(definition.options?.post).toBe(post);
    });

    it("many() accepts kind option", () => {
        const definition = factory.many(UserShape, { kind: ModelManyKind.RECORD });

        expect(definition.options?.kind).toBe("record");
    });

    it("many() defaults kind to undefined (list)", () => {
        const definition = factory.many(UserShape);

        expect(definition.options?.kind).toBeUndefined();
    });
});

// State

describe("createStoreState", () => {
    const factory = createModelFactory();

    it("returns null for one-models", () => {
        const model = {
            user: factory.one(UserShape),
        };

        const state = createStoreState(model);

        expect(state.user).toBeNull();
    });

    it("returns empty array for many-models", () => {
        const model = {
            users: factory.many(UserShape),
        };

        const state = createStoreState(model);

        expect(state.users).toEqual([]);
    });

    it("uses custom default for one-model", () => {
        const defaultUser: User = {
            id: 1,
            name: "default",
            email: "default@test.com",
        };
        const model = {
            user: factory.one(UserShape, { default: defaultUser }),
        };

        const state = createStoreState(model);

        expect(state.user).toEqual(defaultUser);
    });

    it("uses custom default for many-model", () => {
        const defaultUsers: User[] = [
            {
                id: 1,
                name: "test",
                email: "test@test.com",
            },
        ];
        const model = {
            users: factory.many(UserShape, { default: defaultUsers }),
        };

        const state = createStoreState(model);

        expect(state.users).toEqual(defaultUsers);
    });

    it("returns empty object for record many-models", () => {
        const model = {
            grouped: factory.many(UserShape, { kind: ModelManyKind.RECORD }),
        };

        const state = createStoreState(model);

        expect(state.grouped).toEqual({});
    });

    it("handles mixed model types", () => {
        const model = {
            current: factory.one(UserShape),
            list: factory.many(UserShape),
        };

        const state = createStoreState(model);

        expect(state.current).toBeNull();
        expect(state.list).toEqual([]);
    });
});

// Model

describe("createStoreModel", () => {
    const factory = createModelFactory();

    describe("one mutations", () => {
        function setup() {
            const modelDefs = {
                user: factory.one(UserShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-one-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return {
                source,
                model,
            };
        }

        it("set assigns value", () => {
            const { source, model } = setup();
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };

            model.user.set(user);

            expect(source.state.user).toEqual(user);
        });

        it("reset restores to null", () => {
            const { source, model } = setup();
            model.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            model.user.reset();

            expect(source.state.user).toBeNull();
        });

        it("patch merges shallow by default", () => {
            const { source, model } = setup();
            model.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            model.user.patch({ name: "Bob" });

            expect(source.state.user).toEqual({
                id: 1,
                name: "Bob",
                email: "alice@test.com",
            });
        });

        it("patch with deep option uses defu", () => {
            const NestedShape = shape((factory) => {
                return {
                    id: factory.number(),
                    config: factory.object({
                        theme: factory.string(),
                        notifications: factory.boolean(),
                    }),
                };
            });

            const modelDefs = {
                settings: factory.one(NestedShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-deep-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.settings.set({
                id: 1,
                config: {
                    theme: "dark",
                    notifications: true,
                },
            });
            model.settings.patch({ config: { theme: "light" } } as any, { deep: true });

            expect((source.state.settings as any).config.theme).toBe("light");
            expect((source.state.settings as any).config.notifications).toBe(true);
        });

        it("patch does nothing when value is null", () => {
            const { source, model } = setup();

            model.user.patch({ name: "Bob" });

            expect(source.state.user).toBeNull();
        });
    });

    describe("many mutations", () => {
        function setup() {
            const modelDefs = {
                users: factory.many(UserShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-many-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return {
                source,
                model,
            };
        }

        it("set assigns array", () => {
            const { source, model } = setup();
            const users: User[] = [
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
            ];

            model.users.set(users);

            expect(source.state.users).toEqual(users);
        });

        it("reset restores to empty array", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.reset();

            expect(source.state.users).toEqual([]);
        });

        it("patch updates matching items by id", () => {
            const { source, model } = setup();
            model.users.set([
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

            model.users.patch({
                id: 1,
                name: "Alice Updated",
            } as Partial<User>);

            expect((source.state.users as User[])[0].name).toBe("Alice Updated");
            expect((source.state.users as User[])[1].name).toBe("Bob");
        });

        it("patch updates multiple items", () => {
            const { source, model } = setup();
            model.users.set([
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

            model.users.patch([
                {
                    id: 1,
                    name: "Alice2",
                } as Partial<User>,
                {
                    id: 2,
                    name: "Bob2",
                } as Partial<User>,
            ]);

            expect((source.state.users as User[])[0].name).toBe("Alice2");
            expect((source.state.users as User[])[1].name).toBe("Bob2");
        });

        it("remove deletes matching items", () => {
            const { source, model } = setup();
            model.users.set([
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

            model.users.remove({ id: 1 });

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("remove deletes multiple items", () => {
            const { source, model } = setup();
            model.users.set([
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
                {
                    id: 3,
                    name: "Charlie",
                    email: "charlie@test.com",
                },
            ]);

            model.users.remove([{ id: 1 }, { id: 3 }]);

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("remove accepts identifier-only object", () => {
            const { source, model } = setup();
            model.users.set([
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

            model.users.remove({ id: 1 });

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("remove accepts multiple identifier-only objects", () => {
            const { source, model } = setup();
            model.users.set([
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
                {
                    id: 3,
                    name: "Charlie",
                    email: "charlie@test.com",
                },
            ]);

            model.users.remove([{ id: 1 }, { id: 3 }]);

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("add appends items", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add({
                id: 2,
                name: "Bob",
                email: "bob@test.com",
            });

            expect(source.state.users).toHaveLength(2);
            expect((source.state.users as User[])[1].id).toBe(2);
        });

        it("add with prepend inserts at beginning", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add(
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
                { prepend: true },
            );

            expect(source.state.users).toHaveLength(2);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("add with unique skips duplicates", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add(
                {
                    id: 1,
                    name: "Alice Dup",
                    email: "dup@test.com",
                },
                { unique: true },
            );

            expect(source.state.users).toHaveLength(1);
        });

        it("add with unique allows new items", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add(
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
                { unique: true },
            );

            expect(source.state.users).toHaveLength(2);
        });

        it("patch with custom by option matches by field", () => {
            const { source, model } = setup();
            model.users.set([
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

            model.users.patch(
                {
                    email: "alice@test.com",
                    name: "Alice Updated",
                } as Partial<User>,
                { by: "email" },
            );

            expect((source.state.users as User[])[0].name).toBe("Alice Updated");
            expect((source.state.users as User[])[1].name).toBe("Bob");
        });

        it("remove matches by any field", () => {
            const { source, model } = setup();
            model.users.set([
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

            model.users.remove({ email: "alice@test.com" });

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].name).toBe("Bob");
        });

        it("remove matches by multiple fields", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Alice",
                    email: "bob@test.com",
                },
            ]);

            model.users.remove({ name: "Alice", email: "alice@test.com" });

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].email).toBe("bob@test.com");
        });

        it("add with unique and custom by option", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add(
                {
                    id: 2,
                    name: "Alice Dup",
                    email: "alice@test.com",
                },
                {
                    unique: true,
                    by: "email",
                },
            );

            expect(source.state.users).toHaveLength(1);
        });

        it("patch with deep option uses defu", () => {
            const NestedItemShape = shape((factory) => {
                return {
                    id: factory.number(),
                    config: factory.object({
                        theme: factory.string(),
                        notifications: factory.boolean(),
                    }),
                };
            });

            const modelDefs = {
                items: factory.many(NestedItemShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-many-deep-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.items.set([
                {
                    id: 1,
                    config: {
                        theme: "dark",
                        notifications: true,
                    },
                },
            ]);

            model.items.patch({ id: 1, config: { theme: "light" } } as any, { deep: true });

            expect((source.state.items as any[])[0].config.theme).toBe("light");
            expect((source.state.items as any[])[0].config.notifications).toBe(true);
        });

        it("uses custom identifier option", () => {
            const modelDefs = {
                users: factory.many(UserShape, { identifier: "email" }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-custom-id-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.users.set([
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

            model.users.patch({
                email: "alice@test.com",
                name: "Alice Updated",
            } as Partial<User>);

            expect((source.state.users as User[])[0].name).toBe("Alice Updated");
            expect((source.state.users as User[])[1].name).toBe("Bob");
        });
    });

    describe("many mutations without identifier", () => {
        const NoIdShape = shape((factory) => {
            return {
                name: factory.string(),
                email: factory.string(),
            };
        });

        type NoIdItem = ShapeInfer<typeof NoIdShape>;

        function setup() {
            const modelDefs = {
                items: factory.many(NoIdShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-no-id-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return {
                source,
                model,
            };
        }

        it("set and reset work without identifier", () => {
            const { source, model } = setup();
            const items: NoIdItem[] = [
                { name: "Alice", email: "alice@test.com" },
                { name: "Bob", email: "bob@test.com" },
            ];

            model.items.set(items);
            expect(source.state.items).toEqual(items);

            model.items.reset();
            expect(source.state.items).toEqual([]);
        });

        it("add works without identifier", () => {
            const { source, model } = setup();
            model.items.set([{ name: "Alice", email: "alice@test.com" }]);

            model.items.add({ name: "Bob", email: "bob@test.com" });

            expect(source.state.items).toHaveLength(2);
        });

        it("patch matches by custom by option without identifier", () => {
            const { source, model } = setup();
            model.items.set([
                { name: "Alice", email: "alice@test.com" },
                { name: "Bob", email: "bob@test.com" },
            ]);

            model.items.patch({ email: "alice@test.com", name: "Alice Updated" } as Partial<NoIdItem>, {
                by: "email",
            });

            expect((source.state.items as NoIdItem[])[0].name).toBe("Alice Updated");
            expect((source.state.items as NoIdItem[])[1].name).toBe("Bob");
        });

        it("remove matches by field without identifier", () => {
            const { source, model } = setup();
            model.items.set([
                { name: "Alice", email: "alice@test.com" },
                { name: "Bob", email: "bob@test.com" },
            ]);

            model.items.remove({ email: "alice@test.com" });

            expect(source.state.items).toHaveLength(1);
            expect((source.state.items as NoIdItem[])[0].name).toBe("Bob");
        });

        it("add with unique uses custom by option without identifier", () => {
            const { source, model } = setup();
            model.items.set([{ name: "Alice", email: "alice@test.com" }]);

            model.items.add({ name: "Alice Dup", email: "alice@test.com" }, { unique: true, by: "email" });

            expect(source.state.items).toHaveLength(1);
        });
    });

    describe("commit method", () => {
        it("commits value to state", () => {
            const modelDefs = {
                user: factory.one(UserShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-commit-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };
            model.user.commit(ModelOneMode.SET, user);

            expect(source.state.user).toEqual(user);
        });

        it("handles reset mode", () => {
            const modelDefs = {
                user: factory.one(UserShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-commit-reset-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.user.commit(ModelOneMode.SET, {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });
            model.user.commit(ModelOneMode.RESET);

            expect(source.state.user).toBeNull();
        });
    });

    describe("record mutations", () => {
        function setup() {
            const modelDefs = {
                grouped: factory.many(UserShape, { kind: ModelManyKind.RECORD }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-record-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return {
                source,
                model,
            };
        }

        it("initializes with empty object", () => {
            const { source } = setup();

            expect(source.state.grouped).toEqual({});
        });

        it("set replaces entire record", () => {
            const { source, model } = setup();
            const grouped: Record<string, User[]> = {
                "team-a": [
                    { id: 1, name: "Alice", email: "alice@test.com" },
                    { id: 2, name: "Bob", email: "bob@test.com" },
                ],
            };

            model.grouped.set(grouped);

            expect(source.state.grouped).toEqual(grouped);
        });

        it("set replaces with multiple keys", () => {
            const { source, model } = setup();
            const grouped: Record<string, User[]> = {
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            };

            model.grouped.set(grouped);

            expect(Object.keys(source.state.grouped as Record<string, User[]>)).toHaveLength(2);
            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toHaveLength(1);
        });

        it("set overwrites previous record", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            model.grouped.set({
                "team-c": [{ id: 3, name: "Charlie", email: "charlie@test.com" }],
            });

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toBeUndefined();
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toBeUndefined();
            expect((source.state.grouped as Record<string, User[]>)["team-c"]).toHaveLength(1);
        });

        it("reset clears entire record", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            model.grouped.reset();

            expect(source.state.grouped).toEqual({});
        });

        it("patch merges keys into record", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.patch({
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toHaveLength(1);
        });

        it("patch overwrites existing key", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.patch({
                "team-a": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Bob");
        });

        it("remove deletes key from record", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            model.grouped.remove("team-a");

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toBeUndefined();
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toHaveLength(1);
        });

        it("remove does nothing for missing key", () => {
            const { source, model } = setup();

            model.grouped.remove("missing");

            expect(source.state.grouped).toEqual({});
        });

        it("add adds key to record", () => {
            const { source, model } = setup();

            model.grouped.add("team-a", [{ id: 1, name: "Alice", email: "alice@test.com" }]);

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
        });

        it("add preserves existing keys", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.add("team-b", [{ id: 2, name: "Bob", email: "bob@test.com" }]);

            expect(Object.keys(source.state.grouped as Record<string, User[]>)).toHaveLength(2);
        });

        it("patch with deep option uses defu", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.patch(
                {
                    "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
                },
                { deep: true },
            );

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Alice");
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-b"][0].name).toBe("Bob");
        });

        it("add overwrites existing key", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.add("team-a", [{ id: 2, name: "Bob", email: "bob@test.com" }]);

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Bob");
        });

        it("remove last key leaves empty object", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.remove("team-a");

            expect(source.state.grouped).toEqual({});
        });

        it("reset restores custom default", () => {
            const modelDefs = {
                grouped: factory.many(UserShape, {
                    kind: ModelManyKind.RECORD,
                    default: {
                        "team-a": [{ id: 1, name: "Default", email: "default@test.com" }],
                    },
                }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-record-default-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.grouped.set({
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            model.grouped.reset();

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Default");
        });

        it("uses custom default", () => {
            const modelDefs = {
                grouped: factory.many(UserShape, {
                    kind: ModelManyKind.RECORD,
                    default: {
                        "team-a": [{ id: 1, name: "Default", email: "default@test.com" }],
                    },
                }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);

            expect((state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Default");
        });
    });

    describe("one pre/post hooks", () => {
        function setup(hooks: { pre?: () => void; post?: () => void }) {
            const modelDefs = {
                user: factory.one(UserShape, hooks),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-one-hooks-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return { source, model };
        }

        it("pre is called on set", () => {
            const pre = vi.fn();
            const { model } = setup({ pre });

            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });

            expect(pre).toHaveBeenCalledOnce();
        });

        it("post is called on set", () => {
            const post = vi.fn();
            const { model } = setup({ post });

            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });

            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on reset", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });
            pre.mockClear();
            post.mockClear();

            model.user.reset();

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on patch", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });
            pre.mockClear();
            post.mockClear();

            model.user.patch({ name: "Bob" });

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("pre is called before post", () => {
            const callOrder: string[] = [];
            const pre = vi.fn(() => callOrder.push("pre"));
            const post = vi.fn(() => callOrder.push("post"));
            const { model } = setup({ pre, post });

            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });

            expect(callOrder).toEqual(["pre", "post"]);
        });

        it("hooks are optional", () => {
            const modelDefs = {
                user: factory.one(UserShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-no-hooks-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            expect(() => {
                model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });
                model.user.patch({ name: "Bob" });
                model.user.reset();
            }).not.toThrow();
        });

        it("throwing hook does not break mutation", () => {
            const pre = vi.fn(() => {
                throw new Error("pre error");
            });
            const post = vi.fn(() => {
                throw new Error("post error");
            });
            const { source, model } = setup({ pre, post });
            const user: User = { id: 1, name: "Alice", email: "alice@test.com" };

            model.user.set(user);

            expect(source.state.user).toEqual(user);
        });
    });

    describe("one silent option", () => {
        function setup() {
            const pre = vi.fn();
            const post = vi.fn();
            const modelDefs = {
                user: factory.one(UserShape, { pre, post }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-one-silent-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return { source, model, pre, post };
        }

        it("silent: true skips both pre and post on set", () => {
            const { model, pre, post } = setup();

            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" }, { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both pre and post on reset", () => {
            const { model, pre, post } = setup();
            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });
            pre.mockClear();
            post.mockClear();

            model.user.reset({ silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both pre and post on patch", () => {
            const { model, pre, post } = setup();
            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });
            pre.mockClear();
            post.mockClear();

            model.user.patch({ name: "Bob" }, { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: 'pre' skips only pre", () => {
            const { model, pre, post } = setup();

            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" }, { silent: ModelSilent.PRE });

            expect(pre).not.toHaveBeenCalled();
            expect(post).toHaveBeenCalledOnce();
        });

        it("silent: 'post' skips only post", () => {
            const { model, pre, post } = setup();

            model.user.set({ id: 1, name: "Alice", email: "alice@test.com" }, { silent: ModelSilent.POST });

            expect(pre).toHaveBeenCalledOnce();
            expect(post).not.toHaveBeenCalled();
        });

        it("mutation still applies when silent", () => {
            const { source, model } = setup();
            const user: User = { id: 1, name: "Alice", email: "alice@test.com" };

            model.user.set(user, { silent: true });

            expect(source.state.user).toEqual(user);
        });
    });

    describe("many list pre/post hooks", () => {
        function setup(hooks: { pre?: () => void; post?: () => void }) {
            const modelDefs = {
                users: factory.many(UserShape, hooks),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-many-hooks-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return { source, model };
        }

        it("hooks fire on set", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });

            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }]);

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on reset", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }]);
            pre.mockClear();
            post.mockClear();

            model.users.reset();

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on add", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            pre.mockClear();
            post.mockClear();

            model.users.add({ id: 1, name: "Alice", email: "alice@test.com" });

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on remove", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }]);
            pre.mockClear();
            post.mockClear();

            model.users.remove({ id: 1 });

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on patch", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }]);
            pre.mockClear();
            post.mockClear();

            model.users.patch({ id: 1, name: "Alice Updated" } as Partial<User>);

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("throwing hook does not break mutation", () => {
            const pre = vi.fn(() => {
                throw new Error("pre error");
            });
            const post = vi.fn(() => {
                throw new Error("post error");
            });
            const { source, model } = setup({ pre, post });
            const users: User[] = [{ id: 1, name: "Alice", email: "alice@test.com" }];

            model.users.set(users);

            expect(source.state.users).toEqual(users);
        });
    });

    describe("many list silent option", () => {
        function setup() {
            const pre = vi.fn();
            const post = vi.fn();
            const modelDefs = {
                users: factory.many(UserShape, { pre, post }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-many-silent-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return { source, model, pre, post };
        }

        it("silent: true skips both hooks on set", () => {
            const { model, pre, post } = setup();

            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }], { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both hooks on reset", () => {
            const { model, pre, post } = setup();
            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }]);
            pre.mockClear();
            post.mockClear();

            model.users.reset({ silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both hooks on add", () => {
            const { model, pre, post } = setup();
            pre.mockClear();
            post.mockClear();

            model.users.add({ id: 1, name: "Alice", email: "alice@test.com" }, { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both hooks on remove", () => {
            const { model, pre, post } = setup();
            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }]);
            pre.mockClear();
            post.mockClear();

            model.users.remove({ id: 1 }, { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both hooks on patch", () => {
            const { model, pre, post } = setup();
            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }]);
            pre.mockClear();
            post.mockClear();

            model.users.patch({ id: 1, name: "Updated" } as Partial<User>, { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: 'pre' skips only pre", () => {
            const { model, pre, post } = setup();

            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }], { silent: ModelSilent.PRE });

            expect(pre).not.toHaveBeenCalled();
            expect(post).toHaveBeenCalledOnce();
        });

        it("silent: 'post' skips only post", () => {
            const { model, pre, post } = setup();

            model.users.set([{ id: 1, name: "Alice", email: "alice@test.com" }], { silent: ModelSilent.POST });

            expect(pre).toHaveBeenCalledOnce();
            expect(post).not.toHaveBeenCalled();
        });
    });

    describe("many record pre/post hooks", () => {
        function setup(hooks: { pre?: () => void; post?: () => void }) {
            const modelDefs = {
                grouped: factory.many(UserShape, { kind: ModelManyKind.RECORD, ...hooks }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-record-hooks-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return { source, model };
        }

        it("hooks fire on set", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });

            model.grouped.set({ "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] });

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on reset", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            model.grouped.set({ "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] });
            pre.mockClear();
            post.mockClear();

            model.grouped.reset();

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on add", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            pre.mockClear();
            post.mockClear();

            model.grouped.add("team-a", [{ id: 1, name: "Alice", email: "alice@test.com" }]);

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on remove", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });
            pre.mockClear();
            post.mockClear();

            model.grouped.remove("team-a");

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("hooks fire on patch", () => {
            const pre = vi.fn();
            const post = vi.fn();
            const { model } = setup({ pre, post });
            model.grouped.set({ "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] });
            pre.mockClear();
            post.mockClear();

            model.grouped.patch({ "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }] });

            expect(pre).toHaveBeenCalledOnce();
            expect(post).toHaveBeenCalledOnce();
        });

        it("throwing hook does not break mutation", () => {
            const pre = vi.fn(() => {
                throw new Error("pre error");
            });
            const post = vi.fn(() => {
                throw new Error("post error");
            });
            const { source, model } = setup({ pre, post });
            const data = { "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] };

            model.grouped.set(data);

            expect(source.state.grouped).toEqual(data);
        });
    });

    describe("many record silent option", () => {
        function setup() {
            const pre = vi.fn();
            const post = vi.fn();
            const modelDefs = {
                grouped: factory.many(UserShape, { kind: ModelManyKind.RECORD, pre, post }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-record-silent-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return { source, model, pre, post };
        }

        it("silent: true skips both hooks on set", () => {
            const { model, pre, post } = setup();

            model.grouped.set({ "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] }, { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both hooks on reset", () => {
            const { model, pre, post } = setup();
            model.grouped.set({ "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] });
            pre.mockClear();
            post.mockClear();

            model.grouped.reset({ silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both hooks on add", () => {
            const { model, pre, post } = setup();
            pre.mockClear();
            post.mockClear();

            model.grouped.add("team-a", [{ id: 1, name: "Alice", email: "alice@test.com" }], { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both hooks on remove", () => {
            const { model, pre, post } = setup();
            model.grouped.set({ "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] });
            pre.mockClear();
            post.mockClear();

            model.grouped.remove("team-a", { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: true skips both hooks on patch", () => {
            const { model, pre, post } = setup();
            model.grouped.set({ "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] });
            pre.mockClear();
            post.mockClear();

            model.grouped.patch({ "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }] }, { silent: true });

            expect(pre).not.toHaveBeenCalled();
            expect(post).not.toHaveBeenCalled();
        });

        it("silent: 'pre' skips only pre", () => {
            const { model, pre, post } = setup();

            model.grouped.set(
                { "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] },
                { silent: ModelSilent.PRE },
            );

            expect(pre).not.toHaveBeenCalled();
            expect(post).toHaveBeenCalledOnce();
        });

        it("silent: 'post' skips only post", () => {
            const { model, pre, post } = setup();

            model.grouped.set(
                { "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }] },
                { silent: ModelSilent.POST },
            );

            expect(pre).toHaveBeenCalledOnce();
            expect(post).not.toHaveBeenCalled();
        });
    });
});
