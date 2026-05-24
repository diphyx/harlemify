import { createStore, shape, type ShapeInfer } from "../../src/runtime";

export const scopeProbeShape = shape((factory) => {
    return {
        value: factory.string(),
        mutations: factory.number(),
    };
});

export type ScopeProbe = ShapeInfer<typeof scopeProbeShape>;

export const scopeProbeStore = createStore({
    name: "scope-probe",
    lazy: true,
    model({ one }) {
        return {
            state: one(scopeProbeShape, {
                default: () => ({ value: "initial", mutations: 0 }),
            }),
        };
    },
    view({ from }) {
        return {
            state: from("state"),
            value: from("state", (s) => s.value),
            mutations: from("state", (s) => s.mutations),
        };
    },
    action({ handler }) {
        return {
            bump: handler<string>(async ({ model, view, payload }) => {
                model.state.patch({
                    value: payload,
                    mutations: view.state.value.mutations + 1,
                });
            }),
        };
    },
});
