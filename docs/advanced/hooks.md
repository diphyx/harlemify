# Lifecycle Hooks

Execute code before and after every API operation in a store.

## Define Hooks

Pass hooks in store options:

```typescript
export const userStore = createStore("user", userSchema, userActions, {
    hooks: {
        before: async () => {
            // Called before every action
        },
        after: async (error) => {
            // Called after every action (success or failure)
        },
    },
});
```

## Hook Signatures

```typescript
interface StoreHooks {
    before?: () => Promise<void> | void;
    after?: (error?: Error) => Promise<void> | void;
}
```

## Use Cases

### Global Loading Indicator

```typescript
const loadingCount = ref(0);

export const userStore = createStore("user", userSchema, userActions, {
    hooks: {
        before: () => {
            loadingCount.value++;
        },
        after: () => {
            loadingCount.value--;
        },
    },
});

// In template
// <LoadingBar v-if="loadingCount > 0" />
```

### Error Logging

```typescript
export const userStore = createStore("user", userSchema, userActions, {
    hooks: {
        after: (error) => {
            if (error) {
                console.error("[UserStore Error]", error);
                // Or send to error tracking service
                // errorTracker.capture(error);
            }
        },
    },
});
```

### Toast Notifications

```typescript
import { useToast } from "~/composables/toast";

export const userStore = createStore("user", userSchema, userActions, {
    hooks: {
        after: (error) => {
            const toast = useToast();

            if (error) {
                toast.error("Operation failed");
            }
        },
    },
});
```

### Authentication Check

```typescript
export const userStore = createStore("user", userSchema, userActions, {
    hooks: {
        before: async () => {
            const auth = useAuth();

            if (!auth.isAuthenticated) {
                throw new Error("Not authenticated");
            }

            // Refresh token if needed
            if (auth.tokenExpiresSoon) {
                await auth.refreshToken();
            }
        },
    },
});
```

### Request Timing

```typescript
let startTime: number;

export const userStore = createStore("user", userSchema, userActions, {
    hooks: {
        before: () => {
            startTime = performance.now();
        },
        after: (error) => {
            const duration = performance.now() - startTime;
            console.log(`Request took ${duration.toFixed(2)}ms`);

            if (duration > 3000) {
                console.warn("Slow request detected");
            }
        },
    },
});
```

## Combining Multiple Concerns

```typescript
export const userStore = createStore("user", userSchema, userActions, {
    hooks: {
        before: async () => {
            // Check auth
            await ensureAuthenticated();

            // Start loading
            globalLoading.value = true;

            // Log
            console.log("[API] Request started");
        },
        after: (error) => {
            // Stop loading
            globalLoading.value = false;

            // Handle errors
            if (error) {
                console.error("[API] Request failed:", error);
                showErrorToast(error.message);
            } else {
                console.log("[API] Request completed");
            }
        },
    },
});
```

## Notes

- Hooks run for **every** action in the store
- `before` hook errors will prevent the request
- `after` hook receives the error (if any) as parameter
- Hooks can be async
