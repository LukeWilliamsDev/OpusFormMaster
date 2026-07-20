import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Geoapify Places — reliable hosted lookup (3000 free req/day, no shared
// public-instance rate limiting) instead of calling Overpass directly from
// the browser, which was timing out under IP-based slot throttling.
const CATEGORIES =
  "commercial.houseware_and_hardware.hardware_and_tools," +
  "commercial.houseware_and_hardware.doityourself," +
  "commercial.houseware_and_hardware.building_materials";

// Geoapify's category taxonomy has no dedicated categories for plant/tool/
// pump/lighting hire or ready-mix concrete — those are trade/hire services,
// not retail store types. A name search (paired with a broad "commercial"
// category, which Geoapify requires alongside `name`) catches businesses
// whose name signals what they actually do, to cover what category search
// alone can't.
const NAME_SEARCH_TERMS: [string, string][] = [
  ["concrete", "Concrete Supplier"],
  ["tool hire", "Tool Hire"],
  ["plant hire", "Plant Hire"],
  ["pump hire", "Pump Hire"],
  ["lighting hire", "Lighting Hire"],
];
const FALLBACK_LABEL = "Trade Supplier";

// Most-specific-first: pick the first of these present in a place's own
// matched categories, so the label reflects what Geoapify actually tagged it
// as rather than the caller having to guess from the name/address alone.
const CATEGORY_LABELS: [string, string][] = [
  ["commercial.houseware_and_hardware.building_materials", "Building Materials"],
  ["commercial.houseware_and_hardware.doityourself", "DIY / Home Improvement"],
  ["commercial.houseware_and_hardware.hardware_and_tools", "Hardware & Tools"],
  ["commercial.houseware_and_hardware", "Hardware & Trade Supplier"],
];

function deriveBusinessType(categories: string[] | undefined): string {
  if (!categories) return FALLBACK_LABEL;
  for (const [slug, label] of CATEGORY_LABELS) {
    if (categories.includes(slug)) return label;
  }
  return FALLBACK_LABEL;
}

function mapFeature(f: any) {
  const p = f.properties;
  return {
    id: p.place_id,
    name: p.name || p.address_line1 || "Unnamed supplier",
    address: p.address_line2 || p.formatted || "Address unavailable",
    phone: p.contact?.phone || null,
    website: p.website || p.contact?.website || null,
    businessType: deriveBusinessType(p.categories),
    distanceMeters: p.distance ?? null,
    coords: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lat, lng, radiusMiles = 5 } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat and lng are required numbers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEOAPIFY_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const radiusM = Math.round(radiusMiles * 1609.34);
    const filterAndBias = `&filter=circle:${lng},${lat},${radiusM}&bias=proximity:${lng},${lat}`;

    // limit=50: the circle filter already bounds results to the radius —
    // this just needs to be high enough not to truncate a genuinely full
    // list of everything within it (Geoapify's own cap is 500 for places).
    const categoryUrl =
      `https://api.geoapify.com/v2/places?categories=${CATEGORIES}${filterAndBias}&limit=50&apiKey=${apiKey}`;

    const nameSearches = NAME_SEARCH_TERMS.map(([term, label]) => ({
      label,
      url: `https://api.geoapify.com/v2/places?categories=commercial&name=${encodeURIComponent(term)}${filterAndBias}&limit=20&apiKey=${apiKey}`,
    }));

    const [categoryData, ...nameResults] = await Promise.all(
      [categoryUrl, ...nameSearches.map((s) => s.url)].map((url) =>
        fetch(url).then((r) => (r.ok ? r.json() : null)),
      ),
    );

    const merged = new Map<string, ReturnType<typeof mapFeature>>();
    for (const f of categoryData?.features || []) {
      const mapped = mapFeature(f);
      if (!merged.has(mapped.id)) merged.set(mapped.id, mapped);
    }

    // Keyword-matched results get their businessType overridden to the term
    // it matched on — Geoapify's own categories are absent or generic for
    // these (tool/plant/pump/lighting hire, ready-mix concrete), so the
    // keyword itself is the more accurate label. A place the category search
    // already tagged with something real keeps that label, not the keyword.
    nameResults.forEach((geoData, i) => {
      const { label } = nameSearches[i];
      for (const f of geoData?.features || []) {
        const mapped = mapFeature(f);
        const existing = merged.get(mapped.id);
        if (!existing) {
          merged.set(mapped.id, { ...mapped, businessType: label });
        } else if (existing.businessType === FALLBACK_LABEL) {
          existing.businessType = label;
        }
      }
    });

    return new Response(JSON.stringify({ suppliers: Array.from(merged.values()) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
