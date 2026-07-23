import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Category groups to search — each group is OR'd internally (Geoapify's
// categories param takes comma-separated values as OR), and all groups are
// combined into one query. Order matters for labeling: first group whose
// categories appear in a place's own tags wins the businessType label.
const CATEGORY_GROUPS: [string, string[]][] = [
  [
    "National Builders Merchants",
    ["commercial.building_materials", "construction.builders_merchant"],
  ],
  [
    "Concrete Finishing & Groundwork Specialists",
    ["commercial.tools_machinery", "industrial.machinery"],
  ],
  [
    "Construction PPE & Site Safety Specialists",
    ["industrial.safety_equipment", "commercial.workwear"],
  ],
  ["DIY & Trade Hardware Chains", ["commercial.hardware", "commercial.diy"]],
];

const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(([, cats]) => cats).join(",");

function deriveBusinessType(categories: string[] | undefined): string {
  if (!categories) return "Trade Supplier";
  for (const [label, groupCats] of CATEGORY_GROUPS) {
    if (groupCats.some((c) => categories.includes(c))) return label;
  }
  return "Trade Supplier";
}

// Geoapify Places — reliable hosted lookup (3000 free req/day, no shared
// public-instance rate limiting) instead of calling Overpass directly from
// the browser, which was timing out under IP-based slot throttling.
interface GeoapifyFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    place_id: string;
    name?: string;
    address_line1?: string;
    address_line2?: string;
    formatted?: string;
    contact?: { phone?: string; website?: string };
    website?: string;
    categories?: string[];
    distance?: number;
  };
}

function mapFeature(f: GeoapifyFeature) {
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

    // limit=50: the circle filter already bounds results to the radius —
    // this just needs to be high enough not to truncate a genuinely full
    // list of everything within it (Geoapify's own cap is 500 for places).
    const url = `https://api.geoapify.com/v2/places?categories=${ALL_CATEGORIES}${filterAndBias}&limit=50&apiKey=${apiKey}`;

    const res = await fetch(url);
    const data = res.ok ? await res.json() : null;

    const merged = new Map<string, ReturnType<typeof mapFeature>>();
    for (const f of data?.features || []) {
      const mapped = mapFeature(f);
      if (!merged.has(mapped.id)) merged.set(mapped.id, mapped);
    }

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
