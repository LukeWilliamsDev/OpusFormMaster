import puppeteer from "puppeteer";

const baseUrl = (process.env.SMOKE_BASE_URL || "https://opusform.co.uk").replace(/\/$/, "");
const email = process.env.THIRD_PARTY_SMOKE_EMAIL;
const password = process.env.THIRD_PARTY_SMOKE_PASSWORD;

if (!email || !password) {
  throw new Error(
    "Set THIRD_PARTY_SMOKE_EMAIL and THIRD_PARTY_SMOKE_PASSWORD before running the smoke test.",
  );
}

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
const failedResponses = [];
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().includes("favicon")) {
    failedResponses.push(`${response.status()} ${response.url()}`);
  }
});

const assertText = async (text, label) => {
  const body = await page.$eval("body", (element) => element.innerText);
  if (!body.includes(text)) throw new Error(`${label}: missing “${text}”`);
};
const visitHash = async (hash) => {
  await page.evaluate((nextHash) => {
    window.location.hash = nextHash;
  }, hash);
  await page.waitForFunction(
    (expected) => location.hash.includes(expected),
    { timeout: 10_000 },
    hash.slice(1),
  );
};

try {
  await page.goto(`${baseUrl}/#/portal`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#login-email", { timeout: 30_000 });
  await page.type("#login-email", email);
  await page.type("#login-password", password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.hash.includes("/portal/third-party"), {
    timeout: 30_000,
  });
  // The hash change confirms the authenticated role guard completed; page content can vary while
  // portal data is still loading, so the first stable content assertion is made on Help.

  await visitHash("#/portal/help");
  await new Promise((resolve) => setTimeout(resolve, 500));
  await assertText("Know what needs doing", "Help page");
  await assertText("Pending review", "Help status glossary");

  await visitHash("#/portal/contact");
  await new Promise((resolve) => setTimeout(resolve, 500));
  await assertText("Contact IT", "Contact page");
  await page.waitForSelector("#contact-category", { timeout: 10_000 });

  await visitHash("#/portal/legal");
  await new Promise((resolve) => setTimeout(resolve, 500));
  await assertText("LEGAL & PRIVACY", "Legal hub");

  await page.evaluate(() => {
    window.location.hash = "#/portal/third-party/jobs";
  });
  await page.waitForFunction(() => location.hash.includes("/portal/third-party/sites"), {
    timeout: 10_000,
  });

  const pdfResponse = await fetch(`${baseUrl}/policies/Staff-Privacy-Notice.pdf`);
  if (!pdfResponse.ok || !pdfResponse.headers.get("content-type")?.includes("application/pdf")) {
    throw new Error(`Policy PDF check failed: HTTP ${pdfResponse.status}`);
  }

  if (failedResponses.length) throw new Error(`HTTP failures: ${failedResponses.join("; ")}`);
  console.log(`Third-party smoke test passed: ${baseUrl}`);
} finally {
  await browser.close();
}
