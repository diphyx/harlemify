import { describe, it, expect, expectTypeOf } from "vitest";

import { pluralize, capitalize } from "../src/runtime/utils/transform";
import type { Pluralize, Capitalize } from "../src/runtime/utils/transform";

describe("pluralize", () => {
    it("adds s for regular words", () => {
        expect(pluralize("post")).toBe("posts");
        expect(pluralize("user")).toBe("users");
        expect(pluralize("product")).toBe("products");
    });

    it("adds ies for consonant + y", () => {
        expect(pluralize("category")).toBe("categories");
        expect(pluralize("city")).toBe("cities");
        expect(pluralize("country")).toBe("countries");
    });

    it("adds s for vowel + y", () => {
        expect(pluralize("key")).toBe("keys");
        expect(pluralize("day")).toBe("days");
        expect(pluralize("toy")).toBe("toys");
    });

    it("adds es for s, x, z endings", () => {
        expect(pluralize("bus")).toBe("buses");
        expect(pluralize("box")).toBe("boxes");
        expect(pluralize("quiz")).toBe("quizes");
    });

    it("adds es for ch, sh endings", () => {
        expect(pluralize("match")).toBe("matches");
        expect(pluralize("bush")).toBe("bushes");
        expect(pluralize("watch")).toBe("watches");
    });

    it("handles empty string", () => {
        expect(pluralize("")).toBe("");
    });

    describe("types", () => {
        it("infers correct type for regular words", () => {
            expectTypeOf(pluralize("post")).toEqualTypeOf<"posts">();
            expectTypeOf(pluralize("user")).toEqualTypeOf<"users">();
        });

        it("infers correct type for consonant + y", () => {
            expectTypeOf(pluralize("category")).toEqualTypeOf<"categories">();
            expectTypeOf(pluralize("city")).toEqualTypeOf<"cities">();
        });

        it("infers correct type for vowel + y", () => {
            expectTypeOf(pluralize("key")).toEqualTypeOf<"keys">();
            expectTypeOf(pluralize("day")).toEqualTypeOf<"days">();
        });

        it("infers correct type for s, x, z endings", () => {
            expectTypeOf(pluralize("bus")).toEqualTypeOf<"buses">();
            expectTypeOf(pluralize("box")).toEqualTypeOf<"boxes">();
        });

        it("infers correct type for ch, sh endings", () => {
            expectTypeOf(pluralize("match")).toEqualTypeOf<"matches">();
            expectTypeOf(pluralize("bush")).toEqualTypeOf<"bushes">();
        });

        it("Pluralize type works correctly", () => {
            expectTypeOf<Pluralize<"post">>().toEqualTypeOf<"posts">();
            expectTypeOf<Pluralize<"category">>().toEqualTypeOf<"categories">();
            expectTypeOf<Pluralize<"box">>().toEqualTypeOf<"boxes">();
        });
    });
});

describe("capitalize", () => {
    it("capitalizes first letter", () => {
        expect(capitalize("post")).toBe("Post");
        expect(capitalize("user")).toBe("User");
        expect(capitalize("category")).toBe("Category");
    });

    it("keeps rest of string unchanged", () => {
        expect(capitalize("postItems")).toBe("PostItems");
        expect(capitalize("userName")).toBe("UserName");
    });

    it("handles single character", () => {
        expect(capitalize("a")).toBe("A");
        expect(capitalize("z")).toBe("Z");
    });

    it("handles already capitalized", () => {
        expect(capitalize("Post")).toBe("Post");
        expect(capitalize("USER")).toBe("USER");
    });

    it("handles empty string", () => {
        expect(capitalize("")).toBe("");
    });

    describe("types", () => {
        it("infers correct type for lowercase words", () => {
            expectTypeOf(capitalize("post")).toEqualTypeOf<"Post">();
            expectTypeOf(capitalize("user")).toEqualTypeOf<"User">();
        });

        it("infers correct type for camelCase", () => {
            expectTypeOf(capitalize("postItems")).toEqualTypeOf<"PostItems">();
            expectTypeOf(capitalize("userName")).toEqualTypeOf<"UserName">();
        });

        it("infers correct type for single char", () => {
            expectTypeOf(capitalize("a")).toEqualTypeOf<"A">();
        });

        it("Capitalize type works correctly", () => {
            expectTypeOf<Capitalize<"post">>().toEqualTypeOf<"Post">();
            expectTypeOf<Capitalize<"userName">>().toEqualTypeOf<"UserName">();
        });
    });
});
