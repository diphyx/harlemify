import type { ConsolaInstance } from "consola";

import type { Shape, ShapeType } from "../types/shape";
import { wrapBaseDefinition } from "../utils/base";
import { resolveShapeIdentifier } from "../utils/shape";
import {
    type RuntimeModelConfig,
    type ModelDefaultIdentifier,
    type ModelDefinitionOptions,
    type ModelOneDefinition,
    type ModelManyDefinition,
    type ModelFactory,
    ModelType,
    ModelManyKind,
} from "../types/model";

export function createModelFactory(config?: RuntimeModelConfig, logger?: ConsolaInstance): ModelFactory {
    function one<S extends Shape>(
        shape: ShapeType<S>,
        options?: ModelDefinitionOptions & {
            default?: () => S;
        },
    ): ModelOneDefinition<S> {
        function defaultResolver() {
            if (options?.default) {
                return options.default();
            }

            if ("defaults" in shape && typeof shape.defaults === "function") {
                return shape.defaults() as S;
            }

            return {} as unknown as S;
        }

        return wrapBaseDefinition({
            shape,
            type: ModelType.ONE,
            default: defaultResolver,
            options: {
                pre: options?.pre,
                post: options?.post,
            },
            logger,
        } as ModelOneDefinition<S>);
    }

    function many<
        S extends Shape,
        I extends keyof S = ModelDefaultIdentifier<S>,
        T extends ModelManyKind = ModelManyKind.LIST,
    >(
        shape: ShapeType<S>,
        options?: ModelDefinitionOptions & {
            kind?: T;
            identifier?: [T] extends [ModelManyKind.LIST] ? I : never;
            default?: () => [T] extends [ModelManyKind.LIST] ? S[] : Record<string, S[]>;
        },
    ): ModelManyDefinition<S, I, T> {
        const kind = options?.kind ?? ModelManyKind.LIST;

        let identifier;
        if (kind === ModelManyKind.LIST) {
            identifier = resolveShapeIdentifier(shape, options?.identifier as string, config?.identifier);
        }

        function defaultResolver() {
            if (options?.default) {
                return options.default();
            }

            if (kind === ModelManyKind.LIST) {
                return [] as S[];
            }

            return {} as Record<string, S[]>;
        }

        return wrapBaseDefinition({
            shape,
            type: ModelType.MANY,
            kind,
            identifier,
            default: defaultResolver,
            options: {
                pre: options?.pre,
                post: options?.post,
            },
            logger,
        } as ModelManyDefinition<S, I, T>);
    }

    return {
        one,
        many,
    };
}
