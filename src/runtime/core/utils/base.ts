import { objectClone, typeIsObject } from "@harlem/utilities";

import type { BaseDefinition } from "../types/base";

// Clone

export function snapshot<T>(value: T): T {
    return objectClone(value) as T;
}

// Base Definition

export function wrapBaseDefinition<T extends Omit<BaseDefinition, "key">>(definition: T): T & BaseDefinition {
    let key = "";

    return Object.defineProperties(definition, {
        key: {
            get() {
                return key;
            },
            set(value: string) {
                key = value;
            },
            enumerable: true,
            configurable: true,
        },
    }) as T & BaseDefinition;
}

// String

export function trimStart(value: string, char: string): string {
    return value.replace(new RegExp(`^${char}+`), "");
}

export function trimEnd(value: string, char: string): string {
    return value.replace(new RegExp(`${char}+$`), "");
}

// Array

export function ensureArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
}

// Object

export function isObject(value: unknown): value is object {
    return typeIsObject(value);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return isObject(value);
}

export function isEmptyRecord(record: Record<string, unknown> | undefined): record is undefined {
    if (!record) {
        return true;
    }

    if (Object.keys(record).length === 0) {
        return true;
    }

    return false;
}

// Merge

export function merge<T>(priority: unknown, base: T): T {
    if (!isPlainObject(priority) || !isPlainObject(base)) {
        return priority as T;
    }

    const output: Record<string, unknown> = { ...base };
    for (const key of Object.keys(priority)) {
        const value = priority[key];
        if (value === null || value === undefined) {
            continue;
        }

        output[key] = merge(value, output[key]);
    }

    return output as T;
}

// Timing

export function debounce<T extends (...args: any[]) => any>(callback: T, delay: number): T {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return ((...args: unknown[]) => {
        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => {
            timer = null;

            callback(...args);
        }, delay);
    }) as T;
}

export function throttle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
    let lastCall = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    return ((...args: unknown[]) => {
        const now = Date.now();
        const remaining = delay - (now - lastCall);

        if (remaining <= 0) {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            lastCall = now;
            callback(...args);

            return;
        }

        if (timer) {
            return;
        }

        timer = setTimeout(() => {
            lastCall = Date.now();
            timer = null;

            callback(...args);
        }, remaining);
    }) as T;
}
