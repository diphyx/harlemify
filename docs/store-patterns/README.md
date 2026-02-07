# Store Patterns

Harlemify supports three main store patterns for different use cases.

## Pattern Comparison

| Pattern                     | Model                      | Use Case                           | Example                        |
| --------------------------- | -------------------------- | ---------------------------------- | ------------------------------ |
| [Collection](collection.md) | `many()`                   | Lists of items                     | Users, Products, Posts         |
| [Singleton](singleton.md)   | `one()`                    | Single entity                      | Config, Settings, Current User |
| [Nested](nested.md)         | `one()` with handle chains | Complex objects with sub-resources | Project with milestones        |

## Choosing a Pattern

### Use Collection When:

- Managing lists of similar items
- Need CRUD operations (Create, Read, Update, Delete)
- Items are identified by an ID

### Use Singleton When:

- Only one instance exists
- No list operations needed
- Examples: app config, authenticated user profile

### Use Nested When:

- Complex objects with sub-resources
- Need to load parts separately via different endpoints
- Deep object structures with lazy-loaded fields

## Quick Examples

**Collection:**

```typescript
model({ many }) {
    return {
        list: many(userShape),
    };
},
action({ api }) {
    return {
        list: api
            .get({
                url: "/users",
            })
            .commit("list", ActionManyMode.SET),
        create: api
            .post({
                url: "/users",
            })
            .commit("list", ActionManyMode.ADD),
    };
},
```

**Singleton:**

```typescript
model({ one }) {
    return {
        config: one(configShape),
    };
},
action({ api }) {
    return {
        get: api.get({ url: "/config" }).commit("config", ActionOneMode.SET),
        update: api.patch({ url: "/config" }).commit("config", ActionOneMode.PATCH),
    };
},
```

**Nested:**

```typescript
model({ one }) {
    return {
        current: one(projectShape),
    };
},
action({ api }) {
    return {
        get: api
            .get({
                url: "/projects/1",
            })
            .commit("current", ActionOneMode.SET),
        milestones: api
            .get({
                url: "/projects/1/milestones",
            })
            .handle(async ({ api, commit }) => {
                const milestones = await api();
                commit("current", ActionOneMode.PATCH, { milestones });
            }),
    };
},
```

## Next Steps

- [Collection Store](collection.md) - Full CRUD example
- [Singleton Store](singleton.md) - Config/settings example
- [Nested Store](nested.md) - Complex objects example
