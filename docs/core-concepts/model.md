# Model

Models define the state containers. The model factory provides `one` for single items and `many` for collections.

```typescript
model({ one, many }) {
    return {
        current: one(userShape),   // User | null
        list: many(userShape),     // User[]
    };
},
```

## One (Single Item)

`one(shape)` creates a state container initialized to `null`:

```typescript
one(userShape)
one(userShape, { default: { id: 0, name: "" } }) // Custom default
```

### One Mutations

```typescript
store.model.user.set(userData);
store.model.user.patch({ name: "Updated" });
store.model.user.patch({ meta: { role: "admin" } }, { deep: true });
store.model.user.reset();
```

| Method  | Description                                 |
| ------- | ------------------------------------------- |
| `set`   | Replace the entire value                    |
| `patch` | Shallow merge (or deep with `{ deep: true }`) |
| `reset` | Reset to default (`null` or custom default) |

> **Note:** `patch` on a `null` state does nothing silently. Set a value first before patching.

## Many (Collection)

`many(shape)` creates a collection initialized to `[]`:

```typescript
many(userShape)
many(userShape, { identifier: "uuid" })       // Override identifier field
many(userShape, { default: [defaultUser] })   // Custom default
```

The `identifier` determines which field is used to match items in `patch`, `remove`, and `add` (with `unique`). If not set, it resolves from shape metadata or falls back to `id` / `_id`.

### Many Mutations

```typescript
store.model.users.set(usersArray);
store.model.users.add(newUser);
store.model.users.add(newUser, { prepend: true, unique: true });
store.model.users.patch({ id: 1, name: "Updated" });
store.model.users.patch({ email: "new@test.com" }, { by: "email", deep: true });
store.model.users.remove({ id: 1, name: "Alice", email: "a@b.c" });
store.model.users.remove(user, { by: "email" });
store.model.users.reset();
```

| Method   | Description                               |
| -------- | ----------------------------------------- |
| `set`    | Replace the entire array                  |
| `add`    | Append (or prepend) items                 |
| `patch`  | Update matching items by identifier       |
| `remove` | Remove matching items by identifier       |
| `reset`  | Reset to default (`[]` or custom default) |

## Next Steps

- [View](view.md) - Create computed properties from model state
- [Action](action.md) - Define async operations that commit to models
