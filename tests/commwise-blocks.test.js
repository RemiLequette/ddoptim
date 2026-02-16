import { describe, expect, it } from "vitest";
import { parseBlockFilename, serializeBlockFilename } from "../src/commwise-blocks.js";

describe("commwise block filenames", () => {
  it("parse un nom valide", () => {
    const parsed = parseBlockFilename("script.00120.js");
    expect(parsed).toEqual({ code_type: "script", position: 120, extension: "js" });
  });

  it("retourne null si invalide", () => {
    expect(parseBlockFilename("index.js")).toBeNull();
  });

  it("sérialise correctement", () => {
    expect(serializeBlockFilename("style", 7)).toBe("style.00007.css");
  });
});
