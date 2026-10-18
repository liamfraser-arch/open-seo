import { describe, expect, it } from "vitest";
import { hasOwnWebsite, scoreProspect } from "./prospects";

const strong = {
  rank: 1,
  reviewsCount: 500,
  rating: 4.8,
  photosCount: 120,
  hasWebsite: true,
  isClaimed: true,
};

describe("scoreProspect", () => {
  it("scores a strong, busy business at zero", () => {
    expect(scoreProspect(strong)).toEqual({ score: 0, reasons: [] });
  });

  it("lists the biggest problems first", () => {
    const result = scoreProspect({
      ...strong,
      rank: 14,
      reviewsCount: 20,
      photosCount: 3,
    });
    expect(result.reasons).toEqual([
      "Ranks #14 on Google Maps",
      "Only 20 reviews",
      "Almost no photos",
    ]);
    expect(result.score).toBe(42);
  });

  it("scores an abandoned listing low, not high", () => {
    expect(
      scoreProspect({
        rank: 30,
        reviewsCount: 1,
        rating: 5,
        photosCount: 0,
        hasWebsite: false,
        isClaimed: false,
      }),
    ).toEqual({ score: 10, reasons: ["Listing looks inactive"] });
  });

  it("scores a real business with every weakness highest", () => {
    expect(
      scoreProspect({
        rank: 12,
        reviewsCount: 16,
        rating: 3.1,
        photosCount: 0,
        hasWebsite: false,
        isClaimed: false,
      }).score,
    ).toBe(84);
  });
});

describe("hasOwnWebsite", () => {
  it("does not count a directory or social page as their website", () => {
    expect(hasOwnWebsite("www.brabys.com", "https://www.brabys.com/x")).toBe(
      false,
    );
    expect(hasOwnWebsite("m.facebook.com", "https://m.facebook.com/x")).toBe(
      false,
    );
    expect(hasOwnWebsite("acme.co.za", "https://acme.co.za")).toBe(true);
    expect(hasOwnWebsite(null, null)).toBe(false);
  });
});
