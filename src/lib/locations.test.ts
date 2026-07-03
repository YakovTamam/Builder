import { describe, expect, it } from "vitest";
import {
  emptyLocations,
  formatLocation,
  sanitizeLocations,
  sanitizeStringList,
  sanitizeTaskLocation,
} from "./locations";

describe("sanitizeStringList", () => {
  it("returns an empty array for non-array input", () => {
    expect(sanitizeStringList(undefined)).toEqual([]);
    expect(sanitizeStringList(null)).toEqual([]);
    expect(sanitizeStringList("not an array")).toEqual([]);
    expect(sanitizeStringList({ 0: "a" })).toEqual([]);
  });

  it("trims whitespace and drops empty strings", () => {
    expect(sanitizeStringList(["  בניין A  ", "", "   ", "קומה 2"])).toEqual(["בניין A", "קומה 2"]);
  });

  it("drops non-string entries and de-duplicates, preserving first-seen order", () => {
    expect(sanitizeStringList(["A", 5, null, "B", "A", "B"])).toEqual(["A", "B"]);
  });
});

describe("sanitizeLocations", () => {
  it("defaults every list to empty for missing or non-object input", () => {
    expect(sanitizeLocations(undefined)).toEqual(emptyLocations());
    expect(sanitizeLocations(null)).toEqual(emptyLocations());
  });

  it("sanitizes each list independently", () => {
    expect(
      sanitizeLocations({ buildings: ["A", " ", "A"], floors: ["1"], units: "not-an-array" }),
    ).toEqual({ buildings: ["A"], floors: ["1"], units: [] });
  });
});

describe("sanitizeTaskLocation", () => {
  it("returns undefined for non-object or empty input", () => {
    expect(sanitizeTaskLocation(undefined)).toBeUndefined();
    expect(sanitizeTaskLocation(null)).toBeUndefined();
    expect(sanitizeTaskLocation("x")).toBeUndefined();
    expect(sanitizeTaskLocation({})).toBeUndefined();
  });

  it("returns undefined when every field is blank", () => {
    expect(sanitizeTaskLocation({ building: "  ", floor: "", unit: null })).toBeUndefined();
  });

  it("trims and keeps only the non-blank fields", () => {
    expect(sanitizeTaskLocation({ building: " בניין A ", floor: "", unit: undefined })).toEqual({
      building: "בניין A",
      floor: undefined,
      unit: undefined,
    });
  });
});

describe("formatLocation", () => {
  it("returns an empty string for no location", () => {
    expect(formatLocation(undefined)).toBe("");
    expect(formatLocation(null)).toBe("");
  });

  it("joins only the present parts with a middle dot", () => {
    expect(formatLocation({ building: "A", floor: "3", unit: "12" })).toBe("A · 3 · 12");
    expect(formatLocation({ building: "A" })).toBe("A");
    expect(formatLocation({ floor: "3", unit: "12" })).toBe("3 · 12");
  });
});
