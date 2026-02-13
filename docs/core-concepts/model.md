# Model

Models define the state containers. The model factory provides `one` for single items and `many` for collections.

```typescript
model({ one, many }) {
    return {
        current: one(userShape),
        list: many(userShape),
        grouped: many(userShape, { kind: "record" }),
    };
},
```

## One (Single Item)

`one(shape)` creates a state container initialized to `null`:

```typescript
one(userShape);
one(userShape, { default: { id: 0, name: "" } }); // Custom default
```

### One Mutations

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
| `reset` | Reset to default (`null` or custom default)   |

> **Note:** `patch` on a `null` state does nothing silently. Set a value first before patching.

## Many List

`many(shape)` creates a collection initialized to `[]`:

```typescript
many(userShape);
many(userShape, { identifier: "uuid" }); // Override identifier field
many(userShape, { default: [defaultUser] }); // Custom default
```

The `identifier` determines which field is used to match items in `patch` and `add` (with `unique`). If not set, it resolves from shape metadata or falls back to `id` / `_id`. The `remove` method matches by any provided field automatically.

### List Mutations

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
| `reset`  | Reset to default (`[]` or custom default)        |

## Many Record

`many(shape, { kind: "record" })` creates a keyed collection initialized to `{}`:

```typescript
many(userShape, { kind: "record" });
many(userShape, { kind: "record", default: { "team-a": [defaultUser] } });
```

### Record Mutations

```typescript
store.model.grouped.set({ "team-a": usersArray, "team-b": otherUsers });
store.model.grouped.reset();
store.model.grouped.patch({ "team-a": updatedUsers });
store.model.grouped.patch({ "team-c": newUsers }, { deep: true });
store.model.grouped.add("team-c", newUsers);
store.model.grouped.remove("team-a");
```

| Method   | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| `set`    | Replace the entire record                                        |
| `reset`  | Clear the entire record to `{}` (or default)                     |
| `patch`  | Merge keys into the record (or deep merge with `{ deep: true }`) |
| `add`    | Add a key with its array value                                   |
| `remove` | Remove a key from the record                                     |

## Pre/Post Hooks

You can attach `pre` and `post` hooks to any model. They fire before and after every mutation (set, reset, patch, add, remove):

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

Hooks are optional.

> **Note:** Hooks are safe and cannot control the flow of the mutation. A `pre` hook is simply called before the mutation, not a guard that can prevent it. Even if a hook throws, the error is caught and logged, and the mutation proceeds normally.

## Silent Option

Use `silent` to skip hooks on specific mutations. This is useful when you want to avoid side effects like cookie sync, analytics, or logging for certain operations.

```typescript
import { ModelSilent } from "@diphyx/harlemify";
```

| Value                | Effect                 |
| -------------------- | ---------------------- |
| `silent: true`       | Skip both pre and post |
| `silent: ModelSilent.PRE`  | Skip only pre          |
| `silent: ModelSilent.POST` | Skip only post         |

### One Model

```typescript
store.model.session.set(value, { silent: true });
store.model.session.reset({ silent: ModelSilent.POST });
store.model.session.patch({ name: "Updated" }, { silent: ModelSilent.PRE });
```

### Many List

```typescript
store.model.users.set(users, { silent: true });
store.model.users.reset({ silent: true });
store.model.users.add(user, { silent: ModelSilent.PRE });
store.model.users.remove({ id: 1 }, { silent: ModelSilent.POST });
store.model.users.patch({ id: 1, name: "Updated" }, { silent: true });
```

### Many Record

```typescript
store.model.grouped.set(data, { silent: true });
store.model.grouped.reset({ silent: true });
store.model.grouped.add("team-a", users, { silent: ModelSilent.POST });
store.model.grouped.remove("team-a", { silent: ModelSilent.PRE });
store.model.grouped.patch({ "team-a": updated }, { silent: true });
```

## Next Steps

- [View](view.md) - Create computed properties from model state
- [Action](action.md) - Define async operations that commit to models
