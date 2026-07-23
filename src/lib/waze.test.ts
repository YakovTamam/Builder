import { describe, expect, it } from "vitest";
import { wazeUrl } from "./waze";

describe("wazeUrl", () => {
  it("returns null when there is no address or coordinates", () => {
    expect(wazeUrl({})).toBeNull();
    expect(wazeUrl({ address: "   " })).toBeNull();
    expect(wazeUrl({ address: null, lat: null, lng: null })).toBeNull();
  });

  it("prefers coordinates when both lat and lng are finite numbers", () => {
    expect(wazeUrl({ address: "כתובת כלשהי", lat: 32.0853, lng: 34.7818 })).toBe(
      "https://waze.com/ul?ll=32.0853%2C34.7818&navigate=yes",
    );
  });

  it("falls back to the address when coordinates are incomplete", () => {
    expect(wazeUrl({ address: "רחוב הרצל 1, תל אביב", lat: 32.0853 })).toBe(
      "https://waze.com/ul?q=%D7%A8%D7%97%D7%95%D7%91%20%D7%94%D7%A8%D7%A6%D7%9C%201%2C%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91&navigate=yes",
    );
  });

  it("ignores non-finite coordinates", () => {
    expect(wazeUrl({ address: "כתובת", lat: NaN, lng: Infinity })).toBe(
      "https://waze.com/ul?q=%D7%9B%D7%AA%D7%95%D7%91%D7%AA&navigate=yes",
    );
  });

  it("trims the address before encoding", () => {
    expect(wazeUrl({ address: "  תל אביב  " })).toBe(
      "https://waze.com/ul?q=%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91&navigate=yes",
    );
  });
});
