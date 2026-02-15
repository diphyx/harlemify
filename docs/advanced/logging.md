# Logging

Harlemify provides per-store debug logging via [Consola](https://github.com/unjs/consola) to help troubleshoot store operations.

## Enable Logging

Set the `logger` option in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
    harlemify: {
        logger: 999, // Enable all log levels
    },
});
```

## Log Levels

The `logger` value maps to Consola log levels:

| Level   | Value  | Description                  |
| ------- | ------ | ---------------------------- |
| Silent  | `-999` | No logging (default)         |
| Error   | `0`    | Errors only                  |
| Warn    | `1`    | Warnings and errors          |
| Info    | `3`    | Info, warnings, and errors   |
| Debug   | `4`    | All messages including debug |
| Verbose | `999`  | Everything                   |

## What Gets Logged

Each store creates a tagged logger with the format `harlemify:{storeName}`. The following operations are logged:

### Store Lifecycle

```
[harlemify:users] Creating store          (info)
[harlemify:users] Store created           (info)
```

### Model

```
[harlemify:users] Registering model       (debug)  { model: "current", type: "one" }
[harlemify:users] Registering model       (debug)  { model: "list", type: "many" }
[harlemify:users] Model mutation          (debug)  { model: "current", mutation: "set" }
[harlemify:users] Model mutation          (debug)  { model: "list", mutation: "add" }
```

### View

```
[harlemify:users] Registering view        (debug)  { view: "user", models: ["current"] }
[harlemify:users] Registering view        (debug)  { view: "summary", models: ["current", "list"] }
```

### Action

```
[harlemify:users] Registering action      (debug)  { action: "list", type: "api" }
[harlemify:users] Action API request      (debug)  { action: "list", method: "GET", url: "/users" }
[harlemify:users] Action API response received (debug)  { action: "list", method: "GET", url: "/users" }
[harlemify:users] Action handler phase    (debug)  { action: "toggle" }
[harlemify:users] Action commit phase     (debug)  { action: "list", target: ..., mode: "set" }
[harlemify:users] Action success          (debug)  { action: "list" }
```

### Compose

```
[harlemify:users] Registering compose action (debug)  { action: "loadAll" }
[harlemify:users] Compose action executing   (debug)  { action: "loadAll" }
[harlemify:users] Compose action success     (debug)  { action: "loadAll" }
```

### Errors

```
[harlemify:users] Action API error        (error)  { action: "list", error: "Server Error" }
[harlemify:users] Action handler error    (error)  { action: "toggle", error: "..." }
[harlemify:users] Action commit error     (error)  { action: "list", error: "..." }
[harlemify:users] Model pre hook error    (error)  { model: "current", error: ... }
```

### Concurrency

```
[harlemify:users] Action blocked by concurrent guard   (error)  { action: "create" }
[harlemify:users] Action skipped by concurrent guard   (warn)   { action: "list" }
[harlemify:users] Action cancelling previous execution (warn)   { action: "search" }
```

## Development Only

It's recommended to only enable logging in development:

```typescript
export default defineNuxtConfig({
    harlemify: {
        logger: process.env.NODE_ENV === "development" ? 999 : -999,
    },
});
```

## Filtering Stores

Since each store has a unique tag (e.g. `harlemify:users`, `harlemify:projects`), you can use browser console filtering to focus on specific stores.

## Next Steps

- [Concurrency](concurrency.md) — Control concurrent action execution
- [Lazy Store](lazy-store.md) — Deferred store initialization
