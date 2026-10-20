import { describe, expect, it } from "vitest";
import { extractNap } from "./listingNap";

describe("extractNap", () => {
  it("reads a LocalBusiness from JSON-LD, including @graph", () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"WebSite","name":"Yelp"},{"@type":"GlassContractor","name":"Keller Glass and Mirror","telephone":"+1 817-555-0100","address":{"streetAddress":"12065 Katy Rd","addressLocality":"Fort Worth","addressRegion":"TX","postalCode":"76244"}}]}</script>`;
    expect(extractNap(html)).toEqual({
      name: "Keller Glass and Mirror",
      address: "12065 Katy Rd, Fort Worth, TX, 76244",
      phone: "+1 817-555-0100",
    });
  });

  it("falls back to a tel: link", () => {
    expect(extractNap(`<a href="tel:8175550100">Call</a>`)).toEqual({
      name: null,
      address: null,
      phone: "8175550100",
    });
  });

  it("returns nulls for a page with nothing to read", () => {
    expect(extractNap("<html></html>")).toEqual({
      name: null,
      address: null,
      phone: null,
    });
  });
});
