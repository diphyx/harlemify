# API Reference

Complete API documentation for harlemify.

## Core Functions

| Function | Description |
|----------|-------------|
| [createStore](create-store.md) | Create a new store with model, view, and action layers |
| [shape](shape.md) | Define a Zod-powered data shape |

## Types & Enums

| Category | Description |
|----------|-------------|
| [Types](types.md) | TypeScript interfaces, enums, and error classes |

## Import

```typescript
import {
    // Core
    createStore,

    // Shape
    shape,
    type ShapeInfer,

    // Model
    ModelKind,

    // Action Enums
    ActionOneMode,
    ActionManyMode,
    ActionStatus,
    ActionConcurrent,
    ActionApiMethod,

    // Action Types
    type Action,
    type ActionCallPayload,
    type ActionError,
    type ActionApiError,
    type ActionHandleError,
    type ActionCommitError,
    type ActionConcurrentError,

    // Store Types
    type Store,
    type StoreConfig,

    // Composables
    useIsolatedActionStatus,
    useIsolatedActionError,

    // Config
    type RuntimeConfig,
} from "@diphyx/harlemify";
```
