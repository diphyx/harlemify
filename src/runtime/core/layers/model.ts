import type { Shape, ShapeDefinition } from "../types/shape";
import {
    type ModelOneOptions,
    type ModelManyOptions,
    type ModelOneDefinition,
    type ModelManyDefinition,
    type ModelFactory,
    ModelKind,
} from "../types/model";

export function createModelFactory(): ModelFactory {
    function one<S extends Shape>(shape: ShapeDefinition, options?: ModelOneOptions<S>): ModelOneDefinition<S> {
        return {
            shape,
            kind: ModelKind.OBJECT,
            options,
        };
    }

    function many<S extends Shape>(shape: ShapeDefinition, options?: ModelManyOptions<S>): ModelManyDefinition<S> {
        return {
            shape,
            kind: ModelKind.ARRAY,
            options,
        };
    }

    return {
        one,
        many,
    };
}
