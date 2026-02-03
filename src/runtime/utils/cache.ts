export interface Cache<K, V> {
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    delete(key: K): boolean;
    clear(): void;
    size(): number;
    has(key: K): boolean;
    entries(): IterableIterator<[K, V]>;
}

export function createCache<K, V>(): Cache<K, V> {
    const map = new Map<K, V>();

    return {
        get(key: K): V | undefined {
            return map.get(key);
        },
        set(key: K, value: V): void {
            map.set(key, value);
        },
        delete(key: K): boolean {
            return map.delete(key);
        },
        clear(): void {
            map.clear();
        },
        size(): number {
            return map.size;
        },
        has(key: K): boolean {
            return map.has(key);
        },
        entries(): IterableIterator<[K, V]> {
            return map.entries();
        },
    };
}
