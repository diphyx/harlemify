type IsVowel<C extends string> = C extends "a" | "e" | "i" | "o" | "u" ? true : false;

export type Pluralize<S extends string> = S extends `${infer Base}y`
    ? Base extends `${infer _Rest}${infer Last}`
        ? IsVowel<Last> extends true
            ? `${S}s`
            : `${Base}ies`
        : `${S}s`
    : S extends `${string}${"s" | "x" | "z"}`
      ? `${S}es`
      : S extends `${string}${"ch" | "sh"}`
        ? `${S}es`
        : `${S}s`;

const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const SIBILANTS = new Set(["s", "x", "z"]);
const SIBILANT_PAIRS = new Set(["ch", "sh"]);

export function pluralize<S extends string>(word: S): Pluralize<S> {
    if (!word) return word as unknown as Pluralize<S>;

    const lastChar = word.slice(-1).toLowerCase();
    const lastTwo = word.slice(-2).toLowerCase();
    const beforeLast = word.slice(-2, -1).toLowerCase();

    if (lastChar === "y" && !VOWELS.has(beforeLast)) {
        return (word.slice(0, -1) + "ies") as unknown as Pluralize<S>;
    }

    if (SIBILANTS.has(lastChar)) {
        return (word + "es") as unknown as Pluralize<S>;
    }

    if (SIBILANT_PAIRS.has(lastTwo)) {
        return (word + "es") as unknown as Pluralize<S>;
    }

    return (word + "s") as unknown as Pluralize<S>;
}

export type Capitalize<S extends string> = S extends `${infer F}${infer R}` ? `${Uppercase<F>}${R}` : S;

export function capitalize<S extends string>(str: S): Capitalize<S> {
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<S>;
}
