type IsVowel<C extends string> = C extends "a" | "e" | "i" | "o" | "u"
    ? true
    : false;

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

export function pluralize<S extends string>(word: S): Pluralize<S> {
    if (!word) return word as unknown as Pluralize<S>;

    const vowels = ["a", "e", "i", "o", "u"];
    const lastChar = word.slice(-1).toLowerCase();
    const lastTwo = word.slice(-2).toLowerCase();
    const beforeLast = word.slice(-2, -1).toLowerCase();

    if (lastChar === "y" && !vowels.includes(beforeLast)) {
        return (word.slice(0, -1) + "ies") as unknown as Pluralize<S>;
    }

    if (["s", "x", "z"].includes(lastChar)) {
        return (word + "es") as unknown as Pluralize<S>;
    }

    if (["ch", "sh"].includes(lastTwo)) {
        return (word + "es") as unknown as Pluralize<S>;
    }

    return (word + "s") as unknown as Pluralize<S>;
}

export type Capitalize<S extends string> = S extends `${infer F}${infer R}`
    ? `${Uppercase<F>}${R}`
    : S;

export function capitalize<S extends string>(str: S): Capitalize<S> {
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<S>;
}
