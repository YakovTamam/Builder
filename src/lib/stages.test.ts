import { describe, expect, it } from "vitest";
import { STAGES, stageOptions } from "./stages";

describe("stageOptions", () => {
  it("returns the standard list unchanged when there is no current value", () => {
    expect(stageOptions()).toEqual(STAGES);
    expect(stageOptions(undefined)).toEqual(STAGES);
    expect(stageOptions(null)).toEqual(STAGES);
  });

  it("returns the standard list unchanged when the current value is already in it", () => {
    expect(stageOptions("שלד")).toEqual(STAGES);
  });

  it("prepends a legacy free-text stage that isn't in the standard list", () => {
    expect(stageOptions("שלב מותאם אישית")).toEqual(["שלב מותאם אישית", ...STAGES]);
  });
});
