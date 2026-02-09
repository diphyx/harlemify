import { type ComputedRef, type Ref, ref, computed } from "vue";

import { ActionStatus, type ActionCall, type ActionCallOptions } from "../core/types/action";

// Options

export interface UseStoreActionOptions {
    isolated?: boolean;
}

// Return

export type UseStoreAction<T> = {
    execute: (options?: ActionCallOptions) => Promise<T>;
    error: Readonly<Ref<Error | null>>;
    status: Readonly<Ref<ActionStatus>>;
    loading: ComputedRef<boolean>;
    reset: () => void;
};

// Composable

export function useIsolatedActionError(): Ref<Error | null> {
    return ref<Error | null>(null);
}

export function useIsolatedActionStatus(): Ref<ActionStatus> {
    return ref<ActionStatus>(ActionStatus.IDLE);
}

export function useStoreAction<
    A extends Record<string, ActionCall>,
    K extends keyof A & string,
    T = Awaited<ReturnType<A[K]>>,
>(store: { action: A }, key: K, options?: UseStoreActionOptions): UseStoreAction<T> {
    const action = store.action[key] as unknown as ActionCall<T>;
    if (!action) {
        throw new Error(`Action "${key}" not found in store`);
    }

    let error: Readonly<Ref<Error | null>>;
    let status: Readonly<Ref<ActionStatus>>;
    let loading: ComputedRef<boolean>;

    let reset: () => void;

    if (options?.isolated) {
        const isolatedError = useIsolatedActionError();
        const isolatedStatus = useIsolatedActionStatus();

        error = isolatedError;
        status = isolatedStatus;
        loading = computed(() => {
            return isolatedStatus.value === ActionStatus.PENDING;
        });

        reset = () => {
            isolatedStatus.value = ActionStatus.IDLE;
            isolatedError.value = null;
        };
    } else {
        error = action.error;
        status = action.status;
        loading = action.loading;

        reset = action.reset;
    }

    function execute(callOptions: Omit<ActionCallOptions, "bind"> = {}): Promise<T> {
        if (options?.isolated) {
            (callOptions as ActionCallOptions).bind = {
                status: status as Ref<ActionStatus>,
                error: error as Ref<Error | null>,
            };
        }

        return action(callOptions);
    }

    return {
        execute,
        error,
        status,
        loading,
        reset,
    };
}
