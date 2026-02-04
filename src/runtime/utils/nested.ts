import { defu } from "defu";

export function assignValueByPath(object: any, path: string[], value: any): void {
    if (!path.length) {
        return;
    }

    let current = object;

    for (let index = 0; index < path.length - 1; index++) {
        if (current[path[index]] === undefined) {
            current[path[index]] = {};
        }

        current = current[path[index]];
    }

    current[path[path.length - 1]] = value;
}

export function mergeValueByPath(object: any, path: string[], value: any, deep?: boolean): void {
    if (!path.length) {
        return;
    }

    let current = object;

    for (let index = 0; index < path.length - 1; index++) {
        if (current[path[index]] === undefined) {
            return;
        }

        current = current[path[index]];
    }

    const key = path[path.length - 1];

    if (current[key] === undefined) {
        current[key] = value;

        return;
    }

    if (deep) {
        current[key] = defu(value, current[key]);

        return;
    }

    Object.assign(current[key], value);
}
