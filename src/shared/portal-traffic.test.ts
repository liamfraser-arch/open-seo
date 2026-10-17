import { describe, expect, it } from "vitest";
import {
  percentChange,
  shiftDate,
  summarizeTraffic,
  type TrafficDay,
} from "./portal-traffic";

const run = (from: string, count: number, clicks: number): TrafficDay[] =>
  Array.from({ length: count }, (_, i) => ({
    date: shiftDate(from, i),
    clicks,
    impressions: clicks * 10,
  }));

describe("summarizeTraffic", () => {
  const endDate = "2026-10-14";
  // 91 days at 2 clicks, then 91 days at 5 clicks, ending on endDate.
  const days = [
    ...run(shiftDate(endDate, -181), 91, 2),
    ...run(shiftDate(endDate, -90), 91, 5),
  ];

  it("compares the last 3 months with the 3 months before", () => {
    const { threeMonths } = summarizeTraffic({
      days,
      yearAgoDays: [],
      endDate,
    });
    expect(threeMonths).toMatchObject({ clicks: 455, prevClicks: 182 });
    expect(percentChange(threeMonths.clicks, threeMonths.prevClicks)).toBe(150);
  });

  it("compares with the same window a year earlier when there is data", () => {
    const yearAgoDays = run(shiftDate(endDate, -364 - 90), 91, 1);
    const { yearOnYear } = summarizeTraffic({ days, yearAgoDays, endDate });
    expect(yearOnYear).toMatchObject({ clicks: 455, prevClicks: 91 });
  });

  it("has no year-on-year figure without last year's data", () => {
    expect(
      summarizeTraffic({ days, yearAgoDays: [], endDate }).yearOnYear,
    ).toBeNull();
  });

  it("gives nothing to compare against when the earlier period is empty", () => {
    expect(percentChange(50, 0)).toBeNull();
  });
});
