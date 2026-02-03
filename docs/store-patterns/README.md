# Store Patterns

Harlemify supports three main store patterns for different use cases.

## Pattern Comparison

| Pattern | Memory | Use Case | Example |
|---------|--------|----------|---------|
| [Collection](collection.md) | `Memory.units()` | Lists of items | Users, Products, Posts |
| [Singleton](singleton.md) | `Memory.unit()` | Single entity | Config, Settings, Current User |
| [Nested](nested.md) | `Memory.unit("field")` | Complex objects | Project with milestones |

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
- Need to load parts separately
- Deep object structures

## Quick Examples

**Collection:**
```typescript
const userActions = {
    list: {
        endpoint: Endpoint.get("/users"),
        memory: Memory.units(),
    },
};
```

**Singleton:**
```typescript
const configActions = {
    get: {
        endpoint: Endpoint.get("/config"),
        memory: Memory.unit(),
    },
};
```

**Nested:**
```typescript
const projectActions = {
    milestones: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/milestones`),
        memory: Memory.unit("milestones"),
    },
};
```

## Next Steps

- [Collection Store](collection.md) - Full CRUD example
- [Singleton Store](singleton.md) - Config/settings example
- [Nested Schema](nested.md) - Complex objects example
