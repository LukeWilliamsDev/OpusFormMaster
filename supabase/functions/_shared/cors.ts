const ALLOWED_ORIGINS = [
  "https://opusform.co.uk",
  "https://www.opusform.co.uk",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

// Write/send functions perform their own authorization; this header is the
// browser boundary that prevents an untrusted Origin from reading responses.
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
