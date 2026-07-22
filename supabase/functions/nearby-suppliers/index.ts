import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Approved supplier list — results are restricted to these brands only.
// Grouped for the businessType label; group membership is cosmetic, the
// flat name match below is what actually gates inclusion.
const APPROVED_SUPPLIERS: [string, string][] = [
  ["Travis Perkins", "National Builders' Merchants"],
  ["Jewson", "National Builders' Merchants"],
  ["Selco Builders Warehouse", "National Builders' Merchants"],
  ["MKM Building Supplies", "National Builders' Merchants"],
  ["Buildbase", "National Builders' Merchants"],
  ["Huws Gray", "National Builders' Merchants"],
  ["Bradfords Building Supplies", "National Builders' Merchants"],
  ["Haldane Fisher", "National Builders' Merchants"],
  ["Ridgeons", "National Builders' Merchants"],
  ["LBS Builders Merchants", "National Builders' Merchants"],
  ["EH Smith", "National Builders' Merchants"],
  ["Gibbs & Dandy", "National Builders' Merchants"],
  ["Grant & Stone", "National Builders' Merchants"],
  ["Covers Timber & Builders Merchants", "National Builders' Merchants"],
  ["Sydenhams", "National Builders' Merchants"],
  ["RGB Building Supplies", "National Builders' Merchants"],
  ["Lawsons", "National Builders' Merchants"],
  ["Murdock Builders Merchants", "National Builders' Merchants"],
  ["JT Dove", "National Builders' Merchants"],
  ["Cowal Building & Plumbing Supplies", "National Builders' Merchants"],
  ["DTW Tools & Machinery", "Concrete & Groundwork Tools"],
  ["Multicrete Products", "Concrete & Groundwork Tools"],
  ["Red Band UK", "Concrete & Groundwork Tools"],
  ["SB Tools UK", "Concrete & Groundwork Tools"],
  ["Rhino Build", "Concrete & Groundwork Tools"],
  ["Designer Concrete Supplies", "Concrete & Groundwork Tools"],
  ["Speedy Services", "Concrete & Groundwork Tools"],
  ["Proworx Concrete Tools", "Concrete & Groundwork Tools"],
  ["Paragon Diamond Tools", "Concrete & Groundwork Tools"],
  ["Lesmac", "Concrete & Groundwork Tools"],
  ["Beton Tools UK", "Concrete & Groundwork Tools"],
  ["Concrete Tool Importers", "Concrete & Groundwork Tools"],
  ["Interpart", "Concrete & Groundwork Tools"],
  ["Hire Station", "Concrete & Groundwork Tools"],
  ["Brandon Hire Station", "Concrete & Groundwork Tools"],
  ["Apex Concrete Tools", "Concrete & Groundwork Tools"],
  ["Fairport Construction Equipment", "Concrete & Groundwork Tools"],
  ["Altrad Belle", "Concrete & Groundwork Tools"],
  ["Makinex UK", "Concrete & Groundwork Tools"],
  ["Crucial Concrete Supplies", "Concrete & Groundwork Tools"],
  ["Arco", "PPE & Site Safety"],
  ["Enfield Safety", "PPE & Site Safety"],
  ["Howcroft Industrial Supplies", "PPE & Site Safety"],
  ["Capfix", "PPE & Site Safety"],
  ["Site King", "PPE & Site Safety"],
  ["Thorncliffe Workwear", "PPE & Site Safety"],
  ["Ashbrook PPE", "PPE & Site Safety"],
  ["Greenham", "PPE & Site Safety"],
  ["Protec Direct", "PPE & Site Safety"],
  ["Lyreco Safety", "PPE & Site Safety"],
  ["Bunzl Safety", "PPE & Site Safety"],
  ["PK Safety", "PPE & Site Safety"],
  ["Anchor Safety", "PPE & Site Safety"],
  ["SMI Workwear", "PPE & Site Safety"],
  ["Knighton Janitorial & Safety", "PPE & Site Safety"],
  ["J&K Ross", "PPE & Site Safety"],
  ["Clad Safety", "PPE & Site Safety"],
  ["Ultimate Industrial", "PPE & Site Safety"],
  ["Bodyguard Workwear", "PPE & Site Safety"],
  ["Supertouch", "PPE & Site Safety"],
  ["Screwfix", "Big-Box Retailer"],
  ["Toolstation", "Big-Box Retailer"],
  ["TradePoint", "Big-Box Retailer"],
  ["Wickes", "Big-Box Retailer"],
  ["B&Q", "Big-Box Retailer"],
  ["Homebase", "Big-Box Retailer"],
  ["Robert Dyas", "Big-Box Retailer"],
  ["Machine Mart", "Big-Box Retailer"],
  ["Tooled-Up", "Big-Box Retailer"],
  ["FFX Tools", "Big-Box Retailer"],
];

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Matches "Travis Perkins - Openshaw" or "Travis Perkins Trading Co" against
// the "Travis Perkins" whitelist entry — either side containing the other,
// on normalized (lowercased, punctuation-stripped) text.
function matchApprovedSupplier(name: string): string | null {
  const n = normalize(name);
  for (const [brand] of APPROVED_SUPPLIERS) {
    const b = normalize(brand);
    if (n.includes(b) || b.includes(n)) return brand;
  }
  return null;
}

function approvedGroupFor(brand: string): string {
  return APPROVED_SUPPLIERS.find(([b]) => b === brand)?.[1] || "Approved Supplier";
}

// Geoapify Places — reliable hosted lookup (3000 free req/day, no shared
// public-instance rate limiting) instead of calling Overpass directly from
// the browser, which was timing out under IP-based slot throttling.
function mapFeature(f: any) {
  const p = f.properties;
  return {
    id: p.place_id,
    name: p.name || p.address_line1 || "Unnamed supplier",
    address: p.address_line2 || p.formatted || "Address unavailable",
    phone: p.contact?.phone || null,
    website: p.website || p.contact?.website || null,
    businessType: "Approved Supplier",
    distanceMeters: p.distance ?? null,
    coords: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { lat, lng, radiusMiles = 5 } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat and lng are required numbers" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEOAPIFY_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const radiusM = Math.round(radiusMiles * 1609.34);
    const filterAndBias = `&filter=circle:${lng},${lat},${radiusM}&bias=proximity:${lng},${lat}`;

    // Search by name per approved brand rather than by category — several
    // approved suppliers (PPE/workwear, specialist tool/plant hire) aren't
    // reliably tagged under Geoapify's hardware/DIY categories, so a
    // category-only search would silently miss them. "commercial" is
    // required alongside `name` by Geoapify's API.
    const brandSearches = APPROVED_SUPPLIERS.map(([brand]) => ({
      brand,
      url: `https://api.geoapify.com/v2/places?categories=commercial&name=${encodeURIComponent(brand)}${filterAndBias}&limit=10&apiKey=${apiKey}`,
    }));

    const brandResults = await Promise.all(
      brandSearches.map((s) => fetch(s.url).then((r) => (r.ok ? r.json() : null))),
    );

    const merged = new Map<string, ReturnType<typeof mapFeature>>();
    brandResults.forEach((geoData) => {
      for (const f of geoData?.features || []) {
        const mapped = mapFeature(f);
        // Safety net: Geoapify's `name` search is fuzzy and can return
        // near-matches — only keep results that actually match an approved
        // brand, and label with the matched brand's group.
        const matchedBrand = matchApprovedSupplier(mapped.name);
        if (!matchedBrand) continue;
        if (!merged.has(mapped.id)) {
          merged.set(mapped.id, { ...mapped, businessType: approvedGroupFor(matchedBrand) });
        }
      }
    });

    return new Response(JSON.stringify({ suppliers: Array.from(merged.values()) }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
