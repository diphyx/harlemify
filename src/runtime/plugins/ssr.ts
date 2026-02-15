import type { HarlemPlugin, InternalStores, EventBus } from "@harlem/core";

// Types

interface ServerSideRenderingContext {
    hooks: { hook: (name: "app:rendered", fn: () => void) => void };
    payload: Record<string, unknown>;
}

type HarlemState = Record<string, Record<string, unknown>>;

// Server

function handleServer(nuxtApp: ServerSideRenderingContext, stores: InternalStores): void {
    for (const store of stores.values()) {
        const mutations = store.registrations["mutations"];
        if (!mutations) {
            continue;
        }

        for (const [name, registration] of mutations) {
            if (!name.endsWith(":reset")) {
                continue;
            }

            (registration.producer() as (payload: unknown) => void)({});
        }
    }

    nuxtApp.hooks.hook("app:rendered", () => {
        const snapshot: HarlemState = {};
        for (const store of stores.values()) {
            snapshot[store.name] = store.state;
        }

        nuxtApp.payload.harlemifyState = snapshot;
    });
}

// Client

function handleClient(nuxtApp: ServerSideRenderingContext, eventEmitter: EventBus, stores: InternalStores): void {
    const harlemifyState = nuxtApp.payload.harlemifyState as HarlemState | undefined;
    if (!harlemifyState) {
        return;
    }

    eventEmitter.on("ssr:init:client", (payload) => {
        if (!payload) {
            return;
        }

        const store = stores.get(payload.store);
        if (!store) {
            return;
        }

        const snapshot = harlemifyState[store.name];
        if (!snapshot) {
            return;
        }

        store.write("harlemify:ssr:init", "harlemify", (state) => {
            Object.assign(state, snapshot);
        });
    });
}

// Server Side Rendering Plugin

export function createServerSideRenderingPlugin(nuxtApp: ServerSideRenderingContext): HarlemPlugin {
    return (app, eventEmitter, stores) => {
        if (import.meta.server) {
            handleServer(nuxtApp, stores);
        }

        if (import.meta.client) {
            handleClient(nuxtApp, eventEmitter, stores);
        }
    };
}
