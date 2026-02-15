import type { ConsolaInstance } from "consola";
import { ref, readonly } from "vue";

import type { ComposeCallback, ComposeCall, ComposeDefinitions, StoreCompose } from "../types/compose";

// Create Compose Action

function createComposeAction<A extends any[]>(
    key: string,
    callback: ComposeCallback<A>,
    logger?: ConsolaInstance,
): ComposeCall<A> {
    logger?.debug("Registering compose action", {
        action: key,
    });

    const active = ref(false);

    async function execute(...args: A): Promise<void> {
        active.value = true;

        try {
            logger?.debug("Compose action executing", {
                action: key,
            });

            await callback(...args);

            logger?.debug("Compose action success", {
                action: key,
            });
        } finally {
            active.value = false;
        }
    }

    return Object.assign(execute, {
        get active() {
            return readonly(active);
        },
    });
}

// Create Store Compose

export function createStoreCompose<CD extends ComposeDefinitions>(
    composeConfig: ((...args: any[]) => CD) | undefined,
    context: Record<string, unknown>,
    logger?: ConsolaInstance,
): StoreCompose<CD> {
    const output = {} as StoreCompose<CD>;
    if (!composeConfig) {
        return output;
    }

    const composeDefinitions = composeConfig(context);

    for (const [key, callback] of Object.entries(composeDefinitions)) {
        (output as Record<string, unknown>)[key] = createComposeAction(key, callback, logger);
    }

    return output;
}
