const ALLOWED_ORIGINS = [
  "https://opusform.co.uk",
  "https://www.opusform.co.uk",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Every function already requires a valid Bearer JWT, so a wrong Origin can't
// read/write anything on its own — this is the second layer: it stops a
// malicious page from riding a logged-in user's browser session at all.
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin":
      origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
