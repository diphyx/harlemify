# Core Concepts

Harlemify is built around four core concepts that work together to provide factory-driven state management.

## Architecture Overview

```
Shape (Zod)
    ↓
createStore({ name, model, view, action })
    ↓
┌─────────────────────────────────────┐
│  Store                              │
│  ├── Model  → State (one / many)    │
│  ├── View   → Computed (from/merge) │
│  └── Action → API + Handle + Commit │
└─────────────────────────────────────┘
    ↓
store.model / store.view / store.action
    ↓
Component (Vue)
```

## The Four Pillars

### [Shape](shape.md)

Define your data structure using Zod via the `shape` helper:

```typescript
const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
    };
});
```

### [Model](model.md)

Models define state containers using factory functions:

```typescript
model({ one, many }) {
    return {
        current: one(userShape),   // Single item (User | null)
        list: many(userShape),     // Collection (User[])
    };
},
```

### [View](view.md)

Views create reactive computed properties from model state:

```typescript
view({ from, merge }) {
    return {
        user: from("current"),
        users: from("list"),
        count: from("list", (model) => {
            return model.length;
        }),
        summary: merge(["current", "list"], (current, list) => {
            return {
                name: current?.name,
                total: list.length,
            };
        }),
    };
},
```

### [Action](action.md)

Actions define async operations with chainable builders:

```typescript
action({ api, commit }) {
    return {
        fetch: api
            .get({
                url: "/users",
            })
            .commit("list", ActionManyMode.SET),
        clear: commit("list", ActionManyMode.RESET),
    };
},
```

## How They Connect

```typescript
// 1. Shape defines the data structure
const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
    };
});

// 2. Store brings model, view, and action together
const userStore = createStore({
    name: "users",
    model({ one, many }) {
        return {
            current: one(userShape),
            list: many(userShape),
        };
    },
    view({ from }) {
        return {
            users: from("list"),
        };
    },
    action({ api }) {
        return {
            list: api
                .get({
                    url: "/users",
                })
                .commit("list", ActionManyMode.SET),
        };
    },
});

// 3. Use in components
const { model, view, action } = userStore;

await action.list();                          // Fetch and commit to state
view.users.value;                             // Reactive computed list
model("list", ActionManyMode.RESET);          // Direct mutation
```

## Next Steps

- [Shape](shape.md) - Define your data structure
- [Model](model.md) - Configure state containers
- [View](view.md) - Create computed properties
- [Action](action.md) - Define async operations
