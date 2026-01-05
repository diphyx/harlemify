# Harlemify

> Type-safe API state management for Nuxt powered by [Harlem](https://harlemjs.com/)

Harlemify simplifies building data-driven Nuxt applications by combining Zod schema validation with Harlem's reactive state management. Define your data models once with field metadata, and get automatic API integration, request status tracking, and unit caching out of the box.

## Features

- **Zod Schema Validation** - Define your data structure with full TypeScript support
- **Automatic API Client** - Built-in HTTP client with runtime configuration
- **CRUD Operations** - Complete endpoint status tracking for all operations
- **Lifecycle Hooks** - Execute code before/after every API operation
- **Abort Controller** - Cancel in-flight requests with signal support
- **SSR Support** - Server-side rendering via Harlem SSR plugin
- **Memory Management** - Reactive caching for units and collections

## Quick Start

```bash
npm install @diphyx/harlemify
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            url: "https://api.example.com",
            timeout: 10000,
        },
    },
});
```

## Why Harlemify?

- **Type-Safe**: Full TypeScript support with Zod schema inference
- **Declarative**: Define your data model once, use it everywhere
- **Reactive**: Powered by Vue's reactivity system through Harlem
- **Flexible**: Override API options per-store, dynamic headers support
- **Simple**: Minimal boilerplate, maximum productivity
