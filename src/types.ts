import "zod";
import "@nuxt/schema";

import type { RuntimeConfig } from "./runtime";

declare module "zod" {
    interface GlobalMeta {
        identifier?: boolean;
    }
}

declare module "@nuxt/schema" {
    interface PublicRuntimeConfig {
        harlemify: RuntimeConfig;
    }
}
