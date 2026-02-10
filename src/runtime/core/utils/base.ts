import type { BaseDefinition } from "../types/base";

// Base Definition

export function wrapBaseDefinition<T extends Omit<BaseDefinition, "key" | "setKey">>(
    definition: T,
): T & BaseDefinition {
    let key = "";

    return Object.defineProperties(definition, {
        key: {
            get() {
                return key;
            },
            enumerable: true,
            configurable: true,
        },
        setKey: {
            value(value: string) {
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

// Object

export function isObject(value: unknown): value is object {
    return value != null && typeof value === "object";
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!isObject(value)) {
        return false;
    }

    if (Array.isArray(value)) {
        return false;
    }

    return true;
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

// Proxy

type ReferenceProxy<T> = { value: T } & Record<string | symbol, unknown>;

export function toReactiveProxy<T>(reference: { value: T }): ReferenceProxy<T> {
    function get(_target: unknown, prop: string | symbol): unknown {
        if (prop === "value") {
            return reference.value;
        }

        if (!isObject(reference.value)) {
            return undefined;
        }

        return (reference.value as Record<string | symbol, unknown>)[prop];
    }

    function has(_target: unknown, prop: string | symbol): boolean {
        if (prop === "value") {
            return true;
        }

        if (!isObject(reference.value)) {
            return false;
        }

        return prop in (reference.value as object);
    }

    function ownKeys(): (string | symbol)[] {
        if (!isObject(reference.value)) {
            return [];
        }

        return Reflect.ownKeys(reference.value as object);
    }

    function getOwnPropertyDescriptor(_target: unknown, prop: string | symbol): PropertyDescriptor | undefined {
        if (!isObject(reference.value) || !(prop in (reference.value as object))) {
            return undefined;
        }

        return {
            configurable: true,
            enumerable: true,
            value: (reference.value as Record<string | symbol, unknown>)[prop],
        };
    }

    return new Proxy(
        {},
        {
            get,
            has,
            ownKeys,
            getOwnPropertyDescriptor,
        },
    ) as ReferenceProxy<T>;
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
