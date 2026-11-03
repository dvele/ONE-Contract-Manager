import { describe, expect, it } from "vitest";
import { toDeliveryModel, DELIVERY_MODEL_LABELS, billsShipping, billsOnsite } from "../deliveryModel";

describe("toDeliveryModel", () => {
  it.each([
    ["FOB", "FOB"], ["fob", "FOB"], ["CMOS", "CMOS"], ["cmos", "CMOS"],
    ["CRC", "CRC"], [null, "CRC"], [undefined, "CRC"], ["", "CRC"], ["garbage", "CRC"],
  ])("%s → %s", (raw, expected) => expect(toDeliveryModel(raw as any)).toBe(expected));
});

it("labels match the agreement", () => {
  expect(DELIVERY_MODEL_LABELS).toEqual({ FOB: "FOB Factory", CRC: "Delivered to Site", CMOS: "Dvele GC" });
});

it("only FOB omits shipping; only Dvele GC bills on-site", () => {
  expect([billsShipping("FOB"), billsShipping("CRC"), billsShipping("CMOS")]).toEqual([false, true, true]);
  expect([billsOnsite("FOB"), billsOnsite("CRC"), billsOnsite("CMOS")]).toEqual([false, false, true]);
});
