import { ref, computed } from "vue";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ApiErrorSource, ApiError, ApiRequestError, ApiResponseError, createApi } from "../src/runtime/core/api";

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

describe("ApiError classes", () => {
    it("creates ApiError with all properties", () => {
        const error = new ApiError({
            source: ApiErrorSource.REQUEST,
            method: "GET",
            url: "/users",
            message: "Network error",
        });

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("ApiError");
        expect(error.source).toBe(ApiErrorSource.REQUEST);
        expect(error.method).toBe("GET");
        expect(error.url).toBe("/users");
        expect(error.message).toBe("Network error");
    });

    it("uses default message when not provided", () => {
        const error = new ApiError({
            source: ApiErrorSource.RESPONSE,
            method: "POST",
            url: "/users",
        });

        expect(error.message).toBe("Unknown error");
    });

    it("ApiRequestError has REQUEST source", () => {
        const error = new ApiRequestError({
            method: "GET",
            url: "/users",
            message: "Timeout",
        });

        expect(error).toBeInstanceOf(ApiError);
        expect(error.source).toBe(ApiErrorSource.REQUEST);
    });

    it("ApiResponseError has RESPONSE source", () => {
        const error = new ApiResponseError({
            method: "POST",
            url: "/users",
            message: "Not Found",
        });

        expect(error).toBeInstanceOf(ApiError);
        expect(error.source).toBe(ApiErrorSource.RESPONSE);
    });
});

describe("createApi", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates api client with all HTTP methods", () => {
        const api = createApi();

        expect(api.get).toBeInstanceOf(Function);
        expect(api.post).toBeInstanceOf(Function);
        expect(api.put).toBeInstanceOf(Function);
        expect(api.patch).toBeInstanceOf(Function);
        expect(api.del).toBeInstanceOf(Function);
    });

    it("makes GET request with query params", async () => {
        mockFetch.mockResolvedValueOnce({ data: "test" });

        const api = createApi({ url: "https://api.example.com" });
        const result = await api.get("/users", { query: { page: 1 } });

        expect(mockFetch).toHaveBeenCalledWith(
            "/users",
            expect.objectContaining({
                method: "get",
                baseURL: "https://api.example.com",
                query: { page: 1 },
            }),
        );
        expect(result).toEqual({ data: "test" });
    });

    it("makes POST request with body", async () => {
        mockFetch.mockResolvedValueOnce({ id: 1 });

        const api = createApi();
        await api.post("/users", { body: { name: "John" } });

        expect(mockFetch).toHaveBeenCalledWith(
            "/users",
            expect.objectContaining({
                method: "post",
                body: { name: "John" },
            }),
        );
    });

    it("makes PUT, PATCH, DELETE requests", async () => {
        mockFetch.mockResolvedValue({});

        const api = createApi();

        await api.put("/users/1", { body: { name: "Updated" } });
        expect(mockFetch).toHaveBeenCalledWith("/users/1", expect.objectContaining({ method: "put" }));

        await api.patch("/users/1", { body: { name: "Patched" } });
        expect(mockFetch).toHaveBeenCalledWith("/users/1", expect.objectContaining({ method: "patch" }));

        await api.del("/users/1");
        expect(mockFetch).toHaveBeenCalledWith("/users/1", expect.objectContaining({ method: "delete" }));
    });

    it("request options override global options", async () => {
        mockFetch.mockResolvedValueOnce({});

        const api = createApi({ timeout: 5000 });
        await api.get("/test", { timeout: 10000 });

        expect(mockFetch).toHaveBeenCalledWith("/test", expect.objectContaining({ timeout: 10000 }));
    });

    it("passes retry and signal options", async () => {
        mockFetch.mockResolvedValueOnce({});

        const controller = new AbortController();
        const api = createApi();
        await api.get("/test", {
            retry: 3,
            retryDelay: 1000,
            retryStatusCodes: [500, 502],
            signal: controller.signal,
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "/test",
            expect.objectContaining({
                retry: 3,
                retryDelay: 1000,
                retryStatusCodes: [500, 502],
                signal: controller.signal,
            }),
        );
    });

    it("merges global and request headers", async () => {
        mockFetch.mockResolvedValueOnce({});

        const api = createApi({ headers: { "X-Global": "global" } });
        await api.get("/test", { headers: { "X-Request": "request" } });

        expect(mockFetch).toHaveBeenCalledWith(
            "/test",
            expect.objectContaining({
                headers: expect.objectContaining({
                    "X-Global": "global",
                    "X-Request": "request",
                }),
            }),
        );
    });

    it("request headers override global headers", async () => {
        mockFetch.mockResolvedValueOnce({});

        const api = createApi({ headers: { "X-Header": "global" } });
        await api.get("/test", { headers: { "X-Header": "request" } });

        expect(mockFetch).toHaveBeenCalledWith(
            "/test",
            expect.objectContaining({
                headers: expect.objectContaining({ "X-Header": "request" }),
            }),
        );
    });

    it("supports reactive headers with ref", async () => {
        mockFetch.mockResolvedValueOnce({});

        const headersRef = ref({ Authorization: "Bearer token" });
        const api = createApi({ headers: headersRef });
        await api.get("/test");

        expect(mockFetch).toHaveBeenCalled();
    });

    it("supports computed headers", async () => {
        mockFetch.mockResolvedValueOnce({});

        const token = ref("abc");
        const headers = computed(() => ({
            Authorization: `Bearer ${token.value}`,
        }));

        const api = createApi({ headers });
        await api.get("/test");

        expect(mockFetch).toHaveBeenCalled();
    });

    it("throws ApiRequestError on request failure", async () => {
        const networkError = new Error("Network error");
        mockFetch.mockImplementationOnce((url, options) => {
            if (options.onRequestError) {
                options.onRequestError({
                    request: url,
                    options,
                    error: networkError,
                });
            }
            return Promise.reject(networkError);
        });

        const api = createApi();
        await expect(api.get("/test")).rejects.toThrow(ApiRequestError);
    });

    it("throws ApiResponseError on response failure", async () => {
        const responseError = new Error("Server error");
        mockFetch.mockImplementationOnce((url, options) => {
            if (options.onResponseError) {
                options.onResponseError({
                    request: url,
                    options,
                    error: responseError,
                });
            }
            return Promise.reject(responseError);
        });

        const api = createApi();
        await expect(api.get("/test")).rejects.toThrow(ApiResponseError);
    });

    it("returns typed response", async () => {
        interface User {
            id: number;
            name: string;
        }

        mockFetch.mockResolvedValueOnce({ id: 1, name: "John" });

        const api = createApi();
        const result = await api.get<User>("/users/1");

        expect(result.id).toBe(1);
        expect(result.name).toBe("John");
    });

    it("handles different body types", async () => {
        mockFetch.mockResolvedValue({});

        const api = createApi();

        await api.post("/json", { body: { name: "John" } });
        expect(mockFetch).toHaveBeenCalledWith("/json", expect.objectContaining({ body: { name: "John" } }));

        await api.post("/raw", { body: "raw string" });
        expect(mockFetch).toHaveBeenCalledWith("/raw", expect.objectContaining({ body: "raw string" }));

        const formData = new FormData();
        formData.append("file", "test");
        await api.post("/upload", { body: formData });
        expect(mockFetch).toHaveBeenCalledWith("/upload", expect.objectContaining({ body: formData }));
    });
});
