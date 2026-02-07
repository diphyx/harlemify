import { describe, it, expect } from "vitest";
import { createStore } from "@harlem/core";

import { shape } from "../src/runtime/core/layers/shape";
import { createModelFactory } from "../src/runtime/core/layers/model";
import { initializeState, createMutations, createCommitter } from "../src/runtime/core/utils/model";
import { ModelKind } from "../src/runtime/core/types/model";
import { ActionOneMode } from "../src/runtime/core/types/action";
import type { ShapeInfer } from "../src/runtime/core/types/shape";

const UserShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
        email: factory.string(),
    };
});

type User = ShapeInfer<typeof UserShape>;

describe("createModelFactory", () => {
    const factory = createModelFactory();

    it("one() creates object definition", () => {
        const definition = factory.one(UserShape);

        expect(definition.kind).toBe(ModelKind.OBJECT);
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

    it("many() creates array definition", () => {
        const definition = factory.many(UserShape);

        expect(definition.kind).toBe(ModelKind.ARRAY);
        expect(definition.shape).toBe(UserShape);
        expect(definition.options).toEqual({ identifier: undefined });
    });

    it("many() accepts options", () => {
        const definition = factory.many(UserShape, { identifier: "email" });

        expect(definition.options?.identifier).toBe("email");
    });
});

describe("initializeState", () => {
    const factory = createModelFactory();

    it("returns null for one-models", () => {
        const model = {
            user: factory.one(UserShape),
        };

        const state = initializeState(model);

        expect(state.user).toBeNull();
    });

    it("returns empty array for many-models", () => {
        const model = {
            users: factory.many(UserShape),
        };

        const state = initializeState(model);

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

        const state = initializeState(model);

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

        const state = initializeState(model);

        expect(state.users).toEqual(defaultUsers);
    });

    it("handles mixed model types", () => {
        const model = {
            current: factory.one(UserShape),
            list: factory.many(UserShape),
        };

        const state = initializeState(model);

        expect(state.current).toBeNull();
        expect(state.list).toEqual([]);
    });
});

describe("createMutations", () => {
    const factory = createModelFactory();

    describe("one mutations", () => {
        function setup() {
            const model = {
                user: factory.one(UserShape),
            };

            const state = initializeState(model);
            const source = createStore("test-one-" + Math.random(), state);
            const mutations = createMutations(source, model);

            return {
                source,
                mutations,
            };
        }

        it("set assigns value", () => {
            const { source, mutations } = setup();
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };

            mutations.user.set(user);

            expect(source.state.user).toEqual(user);
        });

        it("reset restores to null", () => {
            const { source, mutations } = setup();
            mutations.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            mutations.user.reset();

            expect(source.state.user).toBeNull();
        });

        it("patch merges shallow by default", () => {
            const { source, mutations } = setup();
            mutations.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            mutations.user.patch({ name: "Bob" });

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

            const model = {
                settings: factory.one(NestedShape),
            };

            const state = initializeState(model);
            const source = createStore("test-deep-" + Math.random(), state);
            const mutations = createMutations(source, model);

            mutations.settings.set({
                id: 1,
                config: {
                    theme: "dark",
                    notifications: true,
                },
            });
            mutations.settings.patch({ config: { theme: "light" } } as any, { deep: true });

            expect((source.state.settings as any).config.theme).toBe("light");
            expect((source.state.settings as any).config.notifications).toBe(true);
        });

        it("patch does nothing when value is null", () => {
            const { source, mutations } = setup();

            mutations.user.patch({ name: "Bob" });

            expect(source.state.user).toBeNull();
        });
    });

    describe("many mutations", () => {
        function setup() {
            const model = {
                users: factory.many(UserShape),
            };

            const state = initializeState(model);
            const source = createStore("test-many-" + Math.random(), state);
            const mutations = createMutations(source, model);

            return {
                source,
                mutations,
            };
        }

        it("set assigns array", () => {
            const { source, mutations } = setup();
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

            mutations.users.set(users);

            expect(source.state.users).toEqual(users);
        });

        it("reset restores to empty array", () => {
            const { source, mutations } = setup();
            mutations.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            mutations.users.reset();

            expect(source.state.users).toEqual([]);
        });

        it("patch updates matching items by id", () => {
            const { source, mutations } = setup();
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

            mutations.users.patch({
                id: 1,
                name: "Alice Updated",
            } as Partial<User>);

            expect((source.state.users as User[])[0].name).toBe("Alice Updated");
            expect((source.state.users as User[])[1].name).toBe("Bob");
        });

        it("patch updates multiple items", () => {
            const { source, mutations } = setup();
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

            mutations.users.patch([
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
            const { source, mutations } = setup();
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

            mutations.users.remove({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("remove deletes multiple items", () => {
            const { source, mutations } = setup();
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
                {
                    id: 3,
                    name: "Charlie",
                    email: "charlie@test.com",
                },
            ]);

            mutations.users.remove([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 3,
                    name: "Charlie",
                    email: "charlie@test.com",
                },
            ]);

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("add appends items", () => {
            const { source, mutations } = setup();
            mutations.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            mutations.users.add({
                id: 2,
                name: "Bob",
                email: "bob@test.com",
            });

            expect(source.state.users).toHaveLength(2);
            expect((source.state.users as User[])[1].id).toBe(2);
        });

        it("add with prepend inserts at beginning", () => {
            const { source, mutations } = setup();
            mutations.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            mutations.users.add(
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
            const { source, mutations } = setup();
            mutations.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            mutations.users.add(
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
            const { source, mutations } = setup();
            mutations.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            mutations.users.add(
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
            const { source, mutations } = setup();
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

            mutations.users.patch(
                {
                    email: "alice@test.com",
                    name: "Alice Updated",
                } as Partial<User>,
                { by: "email" },
            );

            expect((source.state.users as User[])[0].name).toBe("Alice Updated");
            expect((source.state.users as User[])[1].name).toBe("Bob");
        });

        it("remove with custom by option matches by field", () => {
            const { source, mutations } = setup();
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

            mutations.users.remove(
                {
                    id: 999,
                    name: "irrelevant",
                    email: "alice@test.com",
                },
                { by: "email" },
            );

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].name).toBe("Bob");
        });

        it("add with unique and custom by option", () => {
            const { source, mutations } = setup();
            mutations.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            mutations.users.add(
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
    });
});

describe("createCommitter", () => {
    const factory = createModelFactory();

    it("delegates to executeCommit", () => {
        const model = {
            user: factory.one(UserShape),
        };

        const state = initializeState(model);
        const source = createStore("test-committer-" + Math.random(), state);
        const mutations = createMutations(source, model);
        const committer = createCommitter(mutations);

        const user: User = {
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        };
        committer("user", ActionOneMode.SET, user);

        expect(source.state.user).toEqual(user);
    });

    it("handles reset mode", () => {
        const model = {
            user: factory.one(UserShape),
        };

        const state = initializeState(model);
        const source = createStore("test-committer-reset-" + Math.random(), state);
        const mutations = createMutations(source, model);
        const committer = createCommitter(mutations);

        committer("user", ActionOneMode.SET, {
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        });
        committer("user", ActionOneMode.RESET);

        expect(source.state.user).toBeNull();
    });
});
