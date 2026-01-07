import { describe, it, expect } from "vitest";

import {
    EndpointMethod,
    Endpoint,
    EndpointStatus,
    makeEndpointStatusFlag,
    makeEndpointStatusName,
    getEndpoint,
    resolveEndpointUrl,
} from "../src/runtime/utils/endpoint";
import type { EndpointDefinition } from "../src/runtime/utils/endpoint";

describe("makeEndpointStatusFlag", () => {
    it("creates correct status flag for IDLE", () => {
        expect(makeEndpointStatusFlag(EndpointStatus.IDLE)).toBe("IsIdle");
    });

    it("creates correct status flag for PENDING", () => {
        expect(makeEndpointStatusFlag(EndpointStatus.PENDING)).toBe("IsPending");
    });

    it("creates correct status flag for SUCCESS", () => {
        expect(makeEndpointStatusFlag(EndpointStatus.SUCCESS)).toBe("IsSuccess");
    });

    it("creates correct status flag for FAILED", () => {
        expect(makeEndpointStatusFlag(EndpointStatus.FAILED)).toBe("IsFailed");
    });
});

describe("makeEndpointStatusName", () => {
    it("creates correct status names", () => {
        expect(makeEndpointStatusName(Endpoint.GET_UNIT, EndpointStatus.IDLE)).toBe("getUnitIsIdle");
        expect(makeEndpointStatusName(Endpoint.GET_UNITS, EndpointStatus.PENDING)).toBe("getUnitsIsPending");
        expect(makeEndpointStatusName(Endpoint.POST_UNIT, EndpointStatus.SUCCESS)).toBe("postUnitIsSuccess");
        expect(makeEndpointStatusName(Endpoint.DELETE_UNITS, EndpointStatus.FAILED)).toBe("deleteUnitsIsFailed");
    });

    it("capitalizes status correctly", () => {
        const name = makeEndpointStatusName(Endpoint.PATCH_UNIT, EndpointStatus.PENDING);
        expect(name).toBe("patchUnitIsPending");
        expect(name).toContain("IsPending");
    });
});

describe("getEndpoint", () => {
    const endpoints: Partial<Record<Endpoint, EndpointDefinition>> = {
        [Endpoint.GET_UNIT]: {
            method: EndpointMethod.GET,
            url: "/users/:id",
        },
        [Endpoint.GET_UNITS]: {
            method: EndpointMethod.GET,
            url: "/users",
        },
    };

    it("returns endpoint when it exists", () => {
        const endpoint = getEndpoint(endpoints, Endpoint.GET_UNIT);
        expect(endpoint).toEqual({
            method: EndpointMethod.GET,
            url: "/users/:id",
        });
    });

    it("throws error when endpoint is not configured", () => {
        expect(() => getEndpoint(endpoints, Endpoint.PUT_UNIT)).toThrow('Endpoint "putUnit" is not configured');
    });

    it("throws error when endpoints is undefined", () => {
        expect(() => getEndpoint(undefined, Endpoint.GET_UNIT)).toThrow('Endpoint "getUnit" is not configured');
    });
});

describe("resolveEndpointUrl", () => {
    it("returns static url", () => {
        const endpoint: EndpointDefinition = {
            method: EndpointMethod.GET,
            url: "/users",
        };
        expect(resolveEndpointUrl(endpoint)).toBe("/users");
    });

    it("calls url function with params", () => {
        const endpoint: EndpointDefinition<{ id: number }> = {
            method: EndpointMethod.GET,
            url: (params) => `/users/${params.id}`,
        };
        expect(resolveEndpointUrl(endpoint, { id: 42 })).toBe("/users/42");
    });

    it("handles multiple params", () => {
        const endpoint: EndpointDefinition<{
            orgId: number;
            userId: number;
        }> = {
            method: EndpointMethod.GET,
            url: (params) => `/orgs/${params.orgId}/users/${params.userId}`,
        };
        expect(resolveEndpointUrl(endpoint, { orgId: 1, userId: 5 })).toBe("/orgs/1/users/5");
    });
});
