# API Reference

Complete API documentation for harlemify.

## Core Functions

| Function | Description |
|----------|-------------|
| [createStore](create-store.md) | Create a new store with API integration |
| [useStoreAlias](use-store-alias.md) | Access store with entity-prefixed names |

## Builders

| Builder | Description |
|---------|-------------|
| [Endpoint](builders.md#endpoint-builder) | Define HTTP endpoints |
| [Memory](builders.md#memory-builder) | Define state storage targets |

## Types & Errors

| Category | Description |
|----------|-------------|
| [Types](types.md) | TypeScript interfaces and types |
| [Errors](types.md#error-classes) | Error classes for handling failures |

## Import

```typescript
import {
    // Core
    createStore,
    useStoreAlias,

    // Builders
    Endpoint,
    Memory,

    // Adapters
    defineApiAdapter,
    createApi,

    // Types
    type ApiAdapter,
    type ActionOptions,
    type StoreOptions,

    // Errors
    ApiError,
    ApiRequestError,
    ApiResponseError,

    // Enums
    EndpointMethod,
    EndpointStatus,
} from "@diphyx/harlemify";
```
