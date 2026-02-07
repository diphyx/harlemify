# Model

Models define the state containers in your store. The model factory provides two methods: `one` for single items and `many` for collections.

## Model Factory

The model factory is destructured from the first parameter of the `model` function:

```typescript
model({ one, many }) {
    return {
        current: one(userShape),   // User | null
        list: many(userShape),     // User[]
    };
},
```

## One (Single Item)

`one(shape)` creates a single-item state container initialized to `null`:

```typescript
model({ one }) {
    return {
        user: one(userShape),
    };
},
// State: { user: null }
```

### One Options

```typescript
one(userShape, {
    identifier: "uuid", // Override identifier field
    default: { id: 0, name: "" }, // Custom default value (instead of null)
});
```

### One Mutations

One-models support three mutation modes:

| Mode                  | Description                                 |
| --------------------- | ------------------------------------------- |
| `ActionOneMode.SET`   | Replace the entire value                    |
| `ActionOneMode.RESET` | Reset to default (`null` or custom default) |
| `ActionOneMode.PATCH` | Shallow merge into existing value           |

```typescript
// Via model committer
store.model("user", ActionOneMode.SET, userData);
store.model("user", ActionOneMode.PATCH, { name: "Updated" });
store.model("user", ActionOneMode.RESET);

// Deep patch
store.model("user", ActionOneMode.PATCH, { meta: { role: "admin" } }, { deep: true });
```

## Many (Collection)

`many(shape)` creates a collection state container initialized to `[]`:

```typescript
model({ many }) {
    return {
        users: many(userShape),
    };
},
// State: { users: [] }
```

### Many Options

```typescript
many(userShape, {
    identifier: "uuid", // Override identifier field
    default: [defaultUser], // Custom default value (instead of [])
});
```

### Many Mutations

Many-models support five mutation modes:

| Mode                    | Description                               |
| ----------------------- | ----------------------------------------- |
| `ActionManyMode.SET`    | Replace the entire array                  |
| `ActionManyMode.RESET`  | Reset to default (`[]` or custom default) |
| `ActionManyMode.PATCH`  | Update matching items by identifier       |
| `ActionManyMode.REMOVE` | Remove matching items by identifier       |
| `ActionManyMode.ADD`    | Append items to the array                 |

```typescript
// Via model committer
store.model("users", ActionManyMode.SET, usersArray);
store.model("users", ActionManyMode.ADD, newUser);
store.model("users", ActionManyMode.PATCH, { id: 1, name: "Updated" });
store.model("users", ActionManyMode.REMOVE, { id: 1, name: "Alice", email: "a@b.c" });
store.model("users", ActionManyMode.RESET);
```

### Many Mutation Options

```typescript
// Add to beginning instead of end
store.model("users", ActionManyMode.ADD, newUser, { prepend: true });

// Add only if not already present (by identifier)
store.model("users", ActionManyMode.ADD, newUser, { unique: true });

// Match by a different field
store.model("users", ActionManyMode.PATCH, { email: "new@test.com" }, { by: "email" });

// Deep merge nested objects
store.model("users", ActionManyMode.PATCH, { id: 1, meta: { role: "admin" } }, { deep: true });
```

## Combining Models

A store can have any number of model definitions:

```typescript
model({ one, many }) {
    return {
        current: one(projectShape),
        list: many(projectShape),
        config: one(configShape),
    };
},
```

Each model key becomes a separate state container with its own mutations.

## Next Steps

- [View](view.md) - Create computed properties from model state
- [Action](action.md) - Define async operations that commit to models
