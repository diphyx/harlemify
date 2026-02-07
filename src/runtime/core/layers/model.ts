import type { Shape, ShapeType } from "../types/shape";
import {
    type RuntimeModelConfig,
    type ModelOneOptions,
    type ModelManyOptions,
    type ModelOneDefinition,
    type ModelManyDefinition,
    type ModelFactory,
    ModelKind,
} from "../types/model";

export function createModelFactory(config?: RuntimeModelConfig): ModelFactory {
    function one<S extends Shape>(shape: ShapeType<S>, options?: ModelOneOptions<S>): ModelOneDefinition<S> {
        return {
            shape,
            kind: ModelKind.OBJECT,
            options: {
                identifier: config?.identifier,
                ...options,
            },
        };
    }

    function many<S extends Shape>(shape: ShapeType<S>, options?: ModelManyOptions<S>): ModelManyDefinition<S> {
        return {
            shape,
            kind: ModelKind.ARRAY,
            options: {
                identifier: config?.identifier,
                ...options,
            },
        };
    }

    return {
        one,
        many,
    };
}
