# Isolated Status

By default, each action has a single shared `status` and `error` ref. Use isolated status to track the same action independently in different contexts.

## Problem

When the same action is called from multiple places, they share status:

```typescript
// Both buttons show loading when either is clicked
store.action.fetch.loading.value  // Shared across all callers
```

## Solution

Use `useIsolatedActionStatus` and `useIsolatedActionError` to create independent tracking refs, then pass them via the `bind` option:

```typescript
import { useIsolatedActionStatus, useIsolatedActionError } from "@diphyx/harlemify";

const status = useIsolatedActionStatus();
const error = useIsolatedActionError();

await store.action.fetch({
    bind: { status, error },
});

// These reflect only this specific call
status.value   // ActionStatus.SUCCESS
error.value    // null
```

## Use Cases

### Independent Loading States

Show separate loading indicators for the same action called from different UI sections:

```vue
<script setup lang="ts">
import { useIsolatedActionStatus } from "@diphyx/harlemify";
import { ActionStatus } from "@diphyx/harlemify";
import { userStore } from "~/stores/user";

const { action } = userStore;

const headerStatus = useIsolatedActionStatus();
const sidebarStatus = useIsolatedActionStatus();

async function refreshFromHeader() {
    await action.list({ bind: { status: headerStatus } });
}

async function refreshFromSidebar() {
    await action.list({ bind: { status: sidebarStatus } });
}
</script>

<template>
    <header>
        <button @click="refreshFromHeader" :disabled="headerStatus === ActionStatus.PENDING">
            {{ headerStatus === ActionStatus.PENDING ? "Refreshing..." : "Refresh" }}
        </button>
    </header>

    <aside>
        <button @click="refreshFromSidebar" :disabled="sidebarStatus === ActionStatus.PENDING">
            {{ sidebarStatus === ActionStatus.PENDING ? "Loading..." : "Reload" }}
        </button>
    </aside>
</template>
```

### Independent Error Tracking

Track errors separately for different call contexts:

```vue
<script setup lang="ts">
import { useIsolatedActionStatus, useIsolatedActionError } from "@diphyx/harlemify";
import { userStore } from "~/stores/user";

const { action } = userStore;

const createStatus = useIsolatedActionStatus();
const createError = useIsolatedActionError();

async function handleCreate(userData: unknown) {
    try {
        await action.create({
            body: userData,
            bind: { status: createStatus, error: createError },
        });
    } catch {
        // Error is captured in createError ref
    }
}
</script>

<template>
    <form @submit.prevent="handleCreate(formData)">
        <!-- form fields -->
        <p v-if="createError">{{ createError.message }}</p>
        <button type="submit">Create</button>
    </form>
</template>
```

## API

### useIsolatedActionStatus

```typescript
function useIsolatedActionStatus(): Ref<ActionStatus>
```

Returns a `Ref<ActionStatus>` initialized to `ActionStatus.IDLE`.

### useIsolatedActionError

```typescript
function useIsolatedActionError(): Ref<ActionError | null>
```

Returns a `Ref<ActionError | null>` initialized to `null`.

### bind Option

Pass isolated refs via the `bind` property in action call payload:

```typescript
interface ActionCallBind {
    status?: Ref<ActionStatus>;
    error?: Ref<ActionError | null>;
}
```

When `bind` is provided, the action updates the bound refs instead of the global ones. The global `action.status` and `action.error` remain unchanged.
