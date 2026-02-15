# Model

Models define the state containers in a store. The model factory provides `one` for single items and `many` for collections.

```typescript
model({ one, many }) {
    return {
        current: one(userShape),
        list: many(userShape),
        grouped: many(userShape, { kind: "record" }),
    };
},
```

## One

`one(shape)` creates a state container initialized to shape defaults:

```typescript
one(userShape);
one(userShape, { default: () => ({ id: 0, name: "" }) }); // Function default
```

### Mutations

```typescript
store.model.user.set(userData);
store.model.user.patch({ name: "Updated" });
store.model.user.patch({ meta: { role: "admin" } }, { deep: true });
store.model.user.reset();
```

| Method  | Description                                   |
| ------- | --------------------------------------------- |
| `set`   | Replace the entire value                      |
| `patch` | Shallow merge (or deep with `{ deep: true }`) |
| `reset` | Reset to default value                        |

> **Note:** State is always initialized to shape defaults (e.g. `{ id: 0, name: "" }`). Provide a custom `default` function to override the initial and reset values.

## Many (List)

`many(shape)` creates a collection initialized to `[]`:

```typescript
many(userShape);
many(userShape, { identifier: "uuid" }); // Override identifier field
many(userShape, { default: () => [defaultUser] }); // Function default
```

The `identifier` determines which field is used to match items in `patch` and `add` (with `unique`). If not set, it resolves from shape metadata or falls back to `id`. The `remove` method matches by any provided field automatically.

### Mutations

```typescript
store.model.users.set(usersArray);
store.model.users.add(newUser);
store.model.users.add(newUser, { prepend: true, unique: true });
store.model.users.patch({ id: 1, name: "Updated" });
store.model.users.patch({ email: "new@test.com" }, { by: "email", deep: true });
store.model.users.remove({ id: 1 });
store.model.users.remove([{ id: 1 }, { id: 2 }]);
store.model.users.remove({ email: "alice@test.com" });
store.model.users.reset();
```

| Method   | Description                                      |
| -------- | ------------------------------------------------ |
| `set`    | Replace the entire array                         |
| `add`    | Append (or prepend) items                        |
| `patch`  | Update matching items by identifier              |
| `remove` | Remove items matching by identifier or any field |
| `reset`  | Reset to default value                           |

## Many (Record)

`many(shape, { kind: "record" })` creates a keyed collection initialized to `{}`:

```typescript
many(userShape, { kind: "record" });
many(userShape, { kind: "record", default: () => ({ "team-a": [defaultUser] }) }); // Function default
```

### Mutations

```typescript
store.model.grouped.set({ "team-a": usersArray, "team-b": otherUsers });
store.model.grouped.patch({ "team-a": updatedUsers });
store.model.grouped.patch({ "team-c": newUsers }, { deep: true });
store.model.grouped.add({ key: "team-c", value: newUsers });
store.model.grouped.remove("team-a");
store.model.grouped.reset();
```

| Method   | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| `set`    | Replace the entire record                                        |
| `add`    | Add a key with its array value                                   |
| `patch`  | Merge keys into the record (or deep merge with `{ deep: true }`) |
| `remove` | Remove a key from the record                                     |
| `reset`  | Reset to default value                                           |

## Function Default

`default` must be a sync function that returns a fresh value each time. The function is called at store creation and again on every `reset()`:

```typescript
model({ one, many }) {
    return {
        config: one(configShape, {
            default: () => ({ theme: "dark", language: "en" }),
        }),
        users: many(userShape, {
            default: () => [createDefaultUser()],
        }),
        grouped: many(userShape, {
            kind: "record",
            default: () => ({ "team-a": [createDefaultUser()] }),
        }),
    };
},
```

This ensures each reset gets a fresh copy rather than sharing the same reference. It also enables proper SSR state isolation — defaults are re-evaluated per request. Combined with [Lazy Store](../advanced/lazy-store.md), function defaults can depend on Nuxt composables:

```typescript
export const configStore = createStore({
    name: "config",
    lazy: true,
    model({ one }) {
        const route = useRoute();

        return {
            config: one(configShape, {
                default: () => ({ theme: route.query.theme ?? "dark" }),
            }),
        };
    },
});
```

| Form                   | Behavior                                |
| ---------------------- | --------------------------------------- |
| `default: () => value` | Called fresh on creation and each reset |
| `reset()`              | Restores to default                     |

## Pre/Post Hooks

Attach `pre` and `post` hooks to any model. They fire before and after every mutation (`set`, `reset`, `patch`, `add`, `remove`):

```typescript
model({ one, many }) {
    return {
        session: one(sessionShape, {
            pre() {
                console.log("before mutation");
            },
            post() {
                console.log("after mutation");
            },
        }),
        users: many(userShape, {
            pre() {
                console.log("before mutation");
            },
            post() {
                console.log("after mutation");
            },
        }),
    };
},
```

Hooks are optional and safe — they cannot control the flow of the mutation. A `pre` hook runs before the mutation, not as a guard. Even if a hook throws, the error is caught and logged, and the mutation proceeds normally.

## Silent Option

Use `silent` to skip hooks on specific mutations. This is useful when you want to avoid side effects like cookie sync, analytics, or logging for certain operations:

```typescript
import { ModelSilent } from "@diphyx/harlemify/runtime";
```

| Value                      | Effect                 |
| -------------------------- | ---------------------- |
| `silent: true`             | Skip both pre and post |
| `silent: ModelSilent.PRE`  | Skip only pre          |
| `silent: ModelSilent.POST` | Skip only post         |

```typescript
store.model.session.set(value, { silent: true });
store.model.session.reset({ silent: ModelSilent.POST });
store.model.session.patch({ name: "Updated" }, { silent: ModelSilent.PRE });

store.model.users.add(user, { silent: true });
store.model.users.remove({ id: 1 }, { silent: ModelSilent.POST });

store.model.grouped.add({ key: "team-a", value: users }, { silent: true });
store.model.grouped.remove("team-a", { silent: ModelSilent.PRE });
```

The `silent` option works on all model types (`one`, `many` list, `many` record) and all mutation methods.

## Next Steps

- [View](view.md) — Create computed properties from model state
- [Action](action.md) — Define async operations that commit to models
