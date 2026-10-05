import process from "node:process";
import { writeFileSync } from "node:fs";
import puppeteer from "puppeteer";

const baseUrl = (process.env.PRODUCTION_URL || "https://opusform.co.uk").replace(/\/$/, "");
const smokeEmail = process.env.SMOKE_EMAIL;
const smokePassword = process.env.SMOKE_PASSWORD;
const expectedSupabaseProjectId =
  process.env.EXPECTED_SUPABASE_PROJECT_ID || "fgpthpxmiroyebrzjdzo";
let observedBuildSha = "unknown";
const smokeRoutes = (
  process.env.SMOKE_ROUTES || "#/portal/dashboard,#/portal/ledger,#/portal/roster"
)
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
const failures = [];

class WatchdogFailure extends Error {
  constructor(category, message) {
    super(message);
    this.category = category;
  }
}

function getSmokeAccounts() {
  if (process.env.SMOKE_ACCOUNTS_JSON) {
    let accounts;
    try {
      accounts = JSON.parse(process.env.SMOKE_ACCOUNTS_JSON);
    } catch {
      throw new Error("SMOKE_ACCOUNTS_JSON is not valid JSON");
    }
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error("SMOKE_ACCOUNTS_JSON must contain at least one account");
    }
    return accounts.map((account, index) => {
      if (!account?.email || !account?.password) {
        throw new Error(`SMOKE_ACCOUNTS_JSON account ${index + 1} is missing credentials`);
      }
      return {
        name: account.name || `account-${index + 1}`,
        email: account.email,
        password: account.password,
        routes:
          Array.isArray(account.routes) && account.routes.length > 0 ? account.routes : smokeRoutes,
      };
    });
  }
  if (!smokeEmail || !smokePassword) {
    throw new Error(
      "SMOKE_EMAIL and SMOKE_PASSWORD are required; refusing to pass without login coverage",
    );
  }
  return [{ name: "default", email: smokeEmail, password: smokePassword, routes: smokeRoutes }];
}

async function fetchJson(path) {
  const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(10_000) });
  const body = await response.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`${path} returned non-JSON content`);
  }
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return json;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchReleaseHealth() {
  let lastError = new Error("healthz did not become available");
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const health = await fetchJson("/healthz");
      if (
        health.status !== "ok" ||
        !health.buildSha ||
        health.buildSha === "unknown" ||
        health.buildSha === "local" ||
        health.supabaseProjectId !== expectedSupabaseProjectId
      ) {
        throw new Error("healthz is missing a valid build identity");
      }
      observedBuildSha = health.buildSha;
      if (process.env.EXPECTED_BUILD_SHA && observedBuildSha !== process.env.EXPECTED_BUILD_SHA) {
        throw new Error(
          `healthz build ${observedBuildSha} does not match expected ${process.env.EXPECTED_BUILD_SHA}`,
        );
      }
      return health;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 6) await wait(2_000);
    }
  }
  throw new WatchdogFailure("frontend", lastError.message);
}

async function checkPublicSurface() {
  const health = await fetchReleaseHealth();

  let readiness;
  try {
    readiness = await fetchJson("/readyz");
  } catch (error) {
    throw new WatchdogFailure("supabase", error instanceof Error ? error.message : String(error));
  }
  if (
    readiness.status !== "ready" ||
    readiness.dependencies?.supabaseProjectId !== expectedSupabaseProjectId
  ) {
    throw new WatchdogFailure("supabase", "readyz did not report ready");
  }

  try {
    const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(10_000) });
    const html = await response.text();
    if (!response.ok) throw new Error(`homepage returned HTTP ${response.status}`);
    if (!html.includes("<html") || !html.includes("<script"))
      throw new Error("homepage shell is incomplete");
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(
      (match) => match[1],
    );
    for (const asset of assets) {
      const assetResponse = await fetch(new URL(asset, `${baseUrl}/`), {
        signal: AbortSignal.timeout(10_000),
      });
      const contentType = assetResponse.headers.get("content-type") || "";
      const assetBody = await assetResponse.text();
      if (!assetResponse.ok) throw new Error(`${asset} returned HTTP ${assetResponse.status}`);
      if (asset.endsWith(".js") && !contentType.includes("javascript")) {
        throw new Error(`${asset} returned ${contentType || "no content type"}, not JavaScript`);
      }
      if (asset.endsWith(".css") && !contentType.includes("css")) {
        throw new Error(`${asset} returned ${contentType || "no content type"}, not CSS`);
      }
      if (/^\s*<!doctype html|<html[\s>]/i.test(assetBody)) {
        throw new Error(`${asset} returned the HTML fallback instead of its asset`);
      }
    }
  } catch (error) {
    if (error instanceof WatchdogFailure) throw error;
    throw new WatchdogFailure("frontend", error instanceof Error ? error.message : String(error));
  }
  return health.buildSha;
}

async function checkAuthenticatedScreens() {
  let accounts;
  try {
    accounts = getSmokeAccounts();
  } catch (error) {
    throw new WatchdogFailure(
      "monitor_configuration",
      error instanceof Error ? error.message : String(error),
    );
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (error) {
    throw new WatchdogFailure(
      "monitor_configuration",
      `Browser smoke could not start: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    for (const account of accounts) {
      const page = await browser.newPage();
      const browserFailures = [];
      page.on("pageerror", (error) => browserFailures.push(`pageerror: ${error.message}`));
      page.on("requestfailed", (request) => {
        if (/\.(?:js|css)(?:\?|$)/i.test(request.url()))
          browserFailures.push(`asset: ${request.url()}`);
      });
      page.on("console", (message) => {
        if (message.type() === "error") browserFailures.push(`console: ${message.text()}`);
      });

      try {
        try {
          await page.goto(`${baseUrl}/#/portal`, {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
          await page.waitForSelector("#login-email", { timeout: 15_000 });
          await page.type("#login-email", account.email);
          await page.type("#login-password", account.password);
          await page.click('button[type="submit"]');
          await page.waitForSelector("#main-content", { timeout: 30_000 });
          if (!page.url().includes("#/portal/")) {
            throw new Error(`${account.name} login did not reach a portal route: ${page.url()}`);
          }
          if (await page.$("#login-email")) {
            throw new Error(`${account.name} login form remained visible after sign-in`);
          }
        } catch (error) {
          const loginFormVisible = Boolean(await page.$("#login-email").catch(() => null));
          const loginAlertVisible = Boolean(await page.$('[role="alert"]').catch(() => null));
          const frontendFailure =
            browserFailures.length > 0 && !loginFormVisible && !loginAlertVisible;
          throw new WatchdogFailure(
            frontendFailure ? "frontend" : "auth",
            error instanceof Error ? error.message : String(error),
          );
        }

        try {
          for (const route of account.routes) {
            await page.goto(`${baseUrl}/${route.replace(/^\//, "")}`, {
              waitUntil: "domcontentloaded",
              timeout: 30_000,
            });
            try {
              await page.waitForSelector("#main-content", { timeout: 20_000 });
            } catch (error) {
              const currentHash = new URL(page.url()).hash;
              if (currentHash === "#/portal" || (await page.$("#login-email"))) {
                throw new WatchdogFailure(
                  "auth",
                  `${account.name} lost its authenticated session while opening ${route}`,
                );
              }
              throw error;
            }
            const expectedHash = route.startsWith("#") ? route : `#${route}`;
            if (new URL(page.url()).hash !== expectedHash) {
              throw new WatchdogFailure(
                "auth",
                `${account.name} was redirected away from ${expectedHash}: ${page.url()}`,
              );
            }
            const bodyText = await page.evaluate(() => document.body?.innerText || "");
            if (
              /This page didn’t load|This page didn't load|Something went wrong on our end/i.test(
                bodyText,
              )
            ) {
              throw new Error(`${account.name} rendered an error screen for ${route}`);
            }
          }
        } catch (error) {
          if (error instanceof WatchdogFailure) throw error;
          throw new WatchdogFailure(
            "frontend",
            error instanceof Error ? error.message : String(error),
          );
        }
      } finally {
        await page.close();
      }

      if (browserFailures.length > 0) {
        throw new WatchdogFailure(
          "frontend",
          `${account.name} browser failures:\n${browserFailures.join("\n")}`,
        );
      }
    }
  } finally {
    await browser.close();
  }
}

try {
  const buildSha = await checkPublicSurface();
  try {
    await checkAuthenticatedScreens();
  } catch (error) {
    if (error instanceof WatchdogFailure) throw error;
    throw new WatchdogFailure("auth", error instanceof Error ? error.message : String(error));
  }
  const result = { status: "ok", baseUrl, buildSha };
  if (process.env.WATCHDOG_RESULT_FILE) {
    writeFileSync(process.env.WATCHDOG_RESULT_FILE, `${JSON.stringify(result)}\n`);
  }
  console.log(JSON.stringify(result));
} catch (error) {
  const category = error instanceof WatchdogFailure ? error.category : "unknown";
  failures.push(error instanceof Error ? error.message : String(error));
  const result = {
    status: "failed",
    category,
    baseUrl,
    buildSha: observedBuildSha,
    expectedBuildSha: process.env.EXPECTED_BUILD_SHA || "unknown",
    failures,
  };
  if (process.env.WATCHDOG_RESULT_FILE) {
    writeFileSync(process.env.WATCHDOG_RESULT_FILE, `${JSON.stringify(result)}\n`);
  }
  console.error(JSON.stringify(result));
  process.exit(1);
}
