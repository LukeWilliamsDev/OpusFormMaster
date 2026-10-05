import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { releaseMeta } from "./lib/release-meta";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com https://api.postcodes.io https://api.geoapify.com https://cloudflareinsights.com https://*.cloudflareinsights.com; worker-src 'self' blob:",
};

const HASH_ROUTE_PREFIXES = [
  "/portal",
  "/submit-credentials",
  "/job-upload",
  "/privacy",
  "/cookies",
  "/modern-slavery",
  "/right-to-work",
];

function isLocalRequest(request: Request): boolean {
  const url = new URL(request.url);
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function isProbeRequest(request: Request, path: string): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return new URL(request.url).pathname === path;
}

function healthResponse(): Response {
  if (!isValidReleaseIdentity()) {
    return jsonResponse(
      { status: "not_ready", service: "opus-form", reason: "release_identity" },
      503,
    );
  }
  return jsonResponse({
    status: "ok",
    service: "opus-form",
    buildSha: releaseMeta.buildSha,
    buildTimestamp: releaseMeta.buildTimestamp,
    supabaseProjectId: releaseMeta.supabaseProjectId,
  });
}

function isValidReleaseIdentity(): boolean {
  return (
    Boolean(releaseMeta.buildSha) &&
    !["local", "unknown"].includes(releaseMeta.buildSha) &&
    Boolean(releaseMeta.supabaseProjectId) &&
    releaseMeta.approvedSupabaseProjectIds.includes(releaseMeta.supabaseProjectId)
  );
}

async function readinessResponse(): Promise<Response> {
  if (
    !isValidReleaseIdentity() ||
    !releaseMeta.supabaseUrl ||
    !releaseMeta.supabasePublishableKey
  ) {
    return jsonResponse(
      { status: "not_ready", dependency: "supabase", reason: "release_identity" },
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(`${releaseMeta.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: releaseMeta.supabasePublishableKey },
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as {
      name?: unknown;
      description?: unknown;
    } | null;
    if (!response.ok || payload?.name !== "GoTrue") {
      return jsonResponse(
        { status: "not_ready", dependency: "supabase", reason: "unavailable" },
        503,
      );
    }
    return jsonResponse({
      status: "ready",
      service: "opus-form",
      buildSha: releaseMeta.buildSha,
      dependencies: { supabase: "ok", supabaseProjectId: releaseMeta.supabaseProjectId },
    });
  } catch {
    return jsonResponse({ status: "not_ready", dependency: "supabase", reason: "timeout" }, 503);
  } finally {
    clearTimeout(timeout);
  }
}

function withSecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);

  if (new URL(request.url).protocol === "https:" && !isLocalRequest(request)) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function redirectDirectHashRoute(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (
    !HASH_ROUTE_PREFIXES.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }

  const target = new URL(url.origin);
  target.hash = `${url.pathname}${url.search}`;
  return Response.redirect(target.toString(), 308);
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.protocol === "http:" && !isLocalRequest(request)) {
        url.protocol = "https:";
        return Response.redirect(url.toString(), 308);
      }

      if (isProbeRequest(request, "/healthz"))
        return withSecurityHeaders(healthResponse(), request);
      if (isProbeRequest(request, "/readyz")) {
        return withSecurityHeaders(await readinessResponse(), request);
      }

      const hashRouteRedirect = redirectDirectHashRoute(request);
      if (hashRouteRedirect) return withSecurityHeaders(hashRouteRedirect, request);

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response), request);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request,
      );
    }
  },
};
