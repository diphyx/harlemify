# API Reference

Complete API documentation for harlemify.

## Core Functions

| Function                       | Description                                            |
| ------------------------------ | ------------------------------------------------------ |
| [createStore](create-store.md) | Create a new store with model, view, and action layers |
| [shape](shape.md)              | Define a Zod-powered data shape                        |

## Types & Enums

| Category          | Description                                     |
| ----------------- | ----------------------------------------------- |
| [Types](types.md) | TypeScript interfaces, enums, and error classes |

## Exports

```typescript
import {
    // Core
    createStore,
    type Store,
    type StoreConfig,

    // Shape
    shape,
    type ShapeInfer,

    // Model
    ModelKind,
    ModelOneMode,
    ModelManyMode,
    type ModelOneCommitOptions,
    type ModelManyCommitOptions,

    // Action
    ActionStatus,
    ActionConcurrent,
    ActionApiMethod,
    type ActionCall,
    type ActionCallOptions,
    type ActionCallTransformerOptions,
    type ActionCallBindOptions,
    type ActionCallCommitOptions,
    type ActionResolvedApi,

    // Error Classes
    ActionApiError,
    ActionHandlerError,
    ActionCommitError,
    ActionConcurrentError,

    // Composables
    useIsolatedActionStatus,
    useIsolatedActionError,

    // Config
    type RuntimeConfig,
} from "@diphyx/harlemify";
```
