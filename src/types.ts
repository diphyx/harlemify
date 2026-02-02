import "zod";
import "@nuxt/schema";

import type { SchemaMeta, SharedConfig } from "./runtime";

declare module "zod" {
    interface GlobalMeta extends SchemaMeta {}
}

declare module "@nuxt/schema" {
    interface PublicRuntimeConfig {
        harlemify: SharedConfig;
    }
}
