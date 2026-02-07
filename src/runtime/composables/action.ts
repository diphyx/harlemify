import { type Ref, ref } from "vue";

import { type ActionError, ActionStatus } from "../core/types/action";

export function useIsolatedActionStatus(): Ref<ActionStatus> {
    return ref<ActionStatus>(ActionStatus.IDLE);
}

export function useIsolatedActionError(): Ref<ActionError | null> {
    return ref<ActionError | null>(null);
}
