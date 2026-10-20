import { describe, expect, it } from "vitest";
import { compareNap } from "./nap";

const reference = {
  name: "Keller Glass and Mirror",
  address: "12065 Katy Rd, Fort Worth, TX 76244",
  phone: "(817) 555-0100",
};

describe("compareNap", () => {
  it("matches the same details formatted differently", () => {
    expect(
      compareNap(reference, {
        name: "Keller Glass & Mirror, LLC",
        address: "12065 Katy Road, Fort Worth, Texas 76244",
        phone: "+1 817-555-0100",
      }),
    ).toEqual({
      name: "match",
      address: "match",
      phone: "match",
      status: "match",
    });
  });

  it("flags a wrong phone, street and zip", () => {
    const result = compareNap(reference, {
      name: "Keller Glass and Mirror",
      address: "500 Main St, Fort Worth, TX 76102",
      phone: "817-555-9999",
    });
    expect(result).toMatchObject({
      name: "match",
      address: "mismatch",
      phone: "mismatch",
      status: "mismatch",
    });
  });

  it("flags the same street with a different zip", () => {
    expect(
      compareNap(reference, {
        name: null,
        address: "12065 Katy Rd, Fort Worth, TX 76240",
        phone: null,
      }).address,
    ).toBe("mismatch");
  });

  it("is partial when a detail is missing and unreadable when all are", () => {
    expect(
      compareNap(reference, {
        name: "Keller Glass and Mirror",
        address: null,
        phone: "8175550100",
      }).status,
    ).toBe("partial");
    expect(
      compareNap(reference, { name: null, address: null, phone: null }).status,
    ).toBe("unreadable");
  });
});
