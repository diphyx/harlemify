# Harlemify

> Schema-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

Define your data schema once with Zod, and Harlemify handles the rest: type-safe API calls, reactive state, request monitoring, and automatic memory management. Your schema becomes the single source of truth for types, validation, and API payloads.

## Features

- **Schema-Driven** - Zod schema defines types, validation, and API payloads
- **Custom Adapters** - Pluggable HTTP adapters for custom request handling
- **Reactive Memory** - Unit and collection caching with Vue reactivity
- **Request Monitoring** - Track pending, success, and failed states
- **SSR Support** - Server-side rendering via Harlem SSR plugin

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
            adapter: {
                baseURL: "https://api.example.com",
                timeout: 10000,
            },
        },
    },
});
```

## Why Harlemify?

|                 |                                                   |
| --------------- | ------------------------------------------------- |
| **Type-Safe**   | Full TypeScript support with Zod schema inference |
| **Declarative** | Define schema once, derive everything else        |
| **Reactive**    | Powered by Vue's reactivity through Harlem        |
| **Extensible**  | Custom adapters for any HTTP requirement          |
