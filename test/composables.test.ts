import { describe, it, expect } from "vitest";

import { useIsolatedActionStatus, useIsolatedActionError } from "../src/runtime/composables/action";
import { ActionStatus } from "../src/runtime/core/types/action";
import { ActionApiError } from "../src/runtime/core/utils/error";

describe("useIsolatedActionStatus", () => {
    it("returns ref with IDLE status", () => {
        const status = useIsolatedActionStatus();

        expect(status.value).toBe(ActionStatus.IDLE);
    });

    it("returns independent refs", () => {
        const status1 = useIsolatedActionStatus();
        const status2 = useIsolatedActionStatus();

        status1.value = ActionStatus.PENDING;

        expect(status1.value).toBe(ActionStatus.PENDING);
        expect(status2.value).toBe(ActionStatus.IDLE);
    });

    it("is writable", () => {
        const status = useIsolatedActionStatus();

        status.value = ActionStatus.SUCCESS;

        expect(status.value).toBe(ActionStatus.SUCCESS);
    });
});

describe("useIsolatedActionError", () => {
    it("returns ref with null", () => {
        const error = useIsolatedActionError();

        expect(error.value).toBeNull();
    });

    it("returns independent refs", () => {
        const error1 = useIsolatedActionError();
        const error2 = useIsolatedActionError();

        const apiError = new ActionApiError(new Error("test"));

        error1.value = apiError;

        expect(error1.value).toBeDefined();
        expect(error2.value).toBeNull();
    });

    it("is writable", () => {
        const error = useIsolatedActionError();
        const cause = Object.assign(new Error("Not Found"), {
            status: 404,
            statusText: "Not Found",
        });
        const apiError = new ActionApiError(cause);

        error.value = apiError;

        expect(error.value).toEqual(apiError);
        expect((error.value as ActionApiError).status).toBe(404);
    });
});
