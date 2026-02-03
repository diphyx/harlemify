export interface Cache<K, V> {
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    delete(key: K): boolean;
    clear(): void;
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
    };
}
