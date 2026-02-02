import { z } from "zod";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
    email: z.email().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
});

export type User = z.infer<typeof UserSchema>;

// Custom adapter with logging (demo purpose)
const loggingAdapter = defineApiAdapter({
    baseURL: "/api",
    timeout: 5000,
});

// Custom adapter for specific endpoint with different timeout
const detailAdapter: ApiAdapter<User> = async (request) => {
    console.log(`[DetailAdapter] Fetching user: ${request.url}`);
    const start = Date.now();

    const data = await $fetch<User>(request.url, {
        baseURL: "/api",
        method: request.method,
        headers: request.headers as HeadersInit,
        query: request.query,
        timeout: 15000, // Longer timeout for detail requests
    });

    console.log(`[DetailAdapter] Completed in ${Date.now() - start}ms`);
    return { data };
};

// Collection store with GET_UNIT for detail view
export const userStore = createStore(
    "user",
    UserSchema,
    {
        // Uses custom endpoint-level adapter
        [Endpoint.GET_UNIT]: {
            method: EndpointMethod.GET,
            url: (params) => `/users/${params.id}`,
            adapter: detailAdapter,
        },
        // Uses store-level adapter (loggingAdapter)
        [Endpoint.GET_UNITS]: {
            method: EndpointMethod.GET,
            url: "/users",
        },
        [Endpoint.POST_UNITS]: {
            method: EndpointMethod.POST,
            url: "/users",
        },
        [Endpoint.PATCH_UNITS]: {
            method: EndpointMethod.PATCH,
            url: (params) => `/users/${params.id}`,
        },
        [Endpoint.DELETE_UNITS]: {
            method: EndpointMethod.DELETE,
            url: (params) => `/users/${params.id}`,
        },
    },
    {
        // Store-level adapter (used when endpoint doesn't have its own)
        adapter: loggingAdapter,
    },
);
