import { describe, expect, it } from "vitest";
import {
  getC2DefaultMatrix,
  getDefaultMatrix,
  parseStoredMatrix,
  serializeStoredMatrix,
} from "../responsibilityMatrix";

const legacy = getDefaultMatrix("CRC").map((i) =>
  i.id === "site_prep_clearing" ? { ...i, assignedTo: "company" as const } : i,
);
const c2 = getC2DefaultMatrix("CRC").map((i) =>
  i.id === "foundation" ? { ...i, assignedTo: "company" as const } : i,
);

describe("parseStoredMatrix", () => {
  it("reads a legacy array (today's format) as legacy only", () => {
    expect(parseStoredMatrix(JSON.stringify(legacy))).toEqual({ legacy, c2: null });
  });

  it("reads an array of C.2 ids as c2 only", () => {
    expect(parseStoredMatrix(JSON.stringify(c2))).toEqual({ legacy: null, c2 });
  });

  it("reads the object form as both", () => {
    expect(parseStoredMatrix(JSON.stringify({ c2, legacy }))).toEqual({ legacy, c2 });
    expect(parseStoredMatrix(JSON.stringify({ c2 }))).toEqual({ legacy: null, c2 });
  });

  it("never puts C.2 rows in legacy, or legacy rows in c2", () => {
    expect(parseStoredMatrix(JSON.stringify({ c2: legacy, legacy: c2 }))).toEqual({ legacy: null, c2: null });
  });

  it.each([
    ["[null]", "[null]"],
    ["{}", "{}"],
    ["garbage", "garbage"],
    ["[]", "[]"],
    ["null", "null"],
    ["a number", "42"],
    ["items without an id", '[{"label":"x"}]'],
    ["a mixed array", JSON.stringify([...legacy, null])],
    ["object with non-array members", '{"c2":"x","legacy":{"a":1}}'],
    ["object with [null] members", '{"c2":[null],"legacy":[null]}'],
  ])("gives nulls without throwing for %s", (_name, raw) => {
    expect(parseStoredMatrix(raw)).toEqual({ legacy: null, c2: null });
  });

  it("gives nulls for an absent value", () => {
    expect(parseStoredMatrix(null)).toEqual({ legacy: null, c2: null });
    expect(parseStoredMatrix(undefined)).toEqual({ legacy: null, c2: null });
    expect(parseStoredMatrix("")).toEqual({ legacy: null, c2: null });
  });
});

describe("serializeStoredMatrix", () => {
  it("always writes the object form, carrying legacy unchanged", () => {
    const raw = serializeStoredMatrix(c2, legacy)!;
    expect(JSON.parse(raw)).toEqual({ c2, legacy });
    expect(parseStoredMatrix(raw)).toEqual({ legacy, c2 });
  });

  it("omits legacy when there is none", () => {
    expect(JSON.parse(serializeStoredMatrix(c2, null)!)).toEqual({ c2 });
  });

  it("writes nothing when there is nothing to keep", () => {
    expect(serializeStoredMatrix([], null)).toBeNull();
  });

  it("keeps legacy even before the C.2 editor has seeded", () => {
    expect(parseStoredMatrix(serializeStoredMatrix([], legacy))).toEqual({ legacy, c2: null });
  });
});
