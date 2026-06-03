import { type ComputedRef, type Ref, ref, computed } from "vue";

import {
    ActionStatus,
    type ActionCall,
    type ActionApiCall,
    type ActionHandlerCall,
    type ActionCallOptions,
    type ActionApiCallOptions,
    type ActionHandlerCallOptions,
    type ActionCallBaseOptions,
} from "../core/types/action";
import { snapshot } from "../core/utils/base";

// Options

export interface UseStoreActionOptions {
    isolated?: boolean;
}

// Return

type ResolveCallOptions<C> =
    C extends ActionHandlerCall<infer P, any>
        ? ActionHandlerCallOptions<P>
        : C extends ActionApiCall<any>
          ? ActionApiCallOptions
          : ActionCallOptions;

export type IsolatedActionCall<C> =
    C extends ActionHandlerCall<infer P, any>
        ? { payload: Readonly<Ref<P | undefined>> }
        : C extends ActionApiCall<any>
          ? {
                params: Readonly<Ref<Record<string, string | number> | undefined>>;
                query: Readonly<Ref<Record<string, unknown> | undefined>>;
            }
          : object;

export type UseStoreAction<T, O = ActionCallOptions> = {
    execute: (options?: Omit<O, "bind">) => Promise<T>;
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
    A extends Record<string, ActionCall<any>>,
    K extends keyof A & string,
    T = Awaited<ReturnType<A[K]>>,
>(
    store: { action: A },
    key: K,
    options: UseStoreActionOptions & { isolated: true },
): UseStoreAction<T, ResolveCallOptions<A[K]>> & IsolatedActionCall<A[K]>;

export function useStoreAction<
    A extends Record<string, ActionCall<any>>,
    K extends keyof A & string,
    T = Awaited<ReturnType<A[K]>>,
>(store: { action: A }, key: K, options?: UseStoreActionOptions): UseStoreAction<T, ResolveCallOptions<A[K]>>;

export function useStoreAction<
    A extends Record<string, ActionCall<any>>,
    K extends keyof A & string,
    T = Awaited<ReturnType<A[K]>>,
>(store: { action: A }, key: K, options?: UseStoreActionOptions): UseStoreAction<T, ResolveCallOptions<A[K]>> {
    const action = store.action[key] as unknown as ActionCall<T>;
    if (!action) {
        throw new Error(`Action "${key}" not found in store`);
    }

    const params = ref<Record<string, string | number>>();
    const query = ref<Record<string, unknown>>();
    const payload = ref<unknown>();

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

            params.value = undefined;
            query.value = undefined;
            payload.value = undefined;
        };
    } else {
        error = action.error;
        status = action.status;
        loading = action.loading;

        reset = action.reset;
    }

    function execute(callOptions: Omit<ActionCallOptions, "bind"> = {}): Promise<T> {
        if (options?.isolated) {
            (callOptions as ActionCallBaseOptions).bind = {
                status: status as Ref<ActionStatus>,
                error: error as Ref<Error | null>,
            };

            if (!loading.value) {
                const isolatedCall = callOptions as ActionApiCallOptions & ActionHandlerCallOptions;

                params.value = snapshot(isolatedCall.params);
                query.value = snapshot(isolatedCall.query);
                payload.value = snapshot(isolatedCall.payload);
            }
        }

        return (action as (options?: ActionCallOptions) => Promise<T>)(callOptions);
    }

    return {
        execute,
        error,
        status,
        loading,
        reset,
        params,
        query,
        payload,
    } as unknown as UseStoreAction<T, ResolveCallOptions<A[K]>>;
}
