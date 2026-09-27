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

try {
  await page.goto(`${baseUrl}/#/portal`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#login-email", { timeout: 30_000 });
  await page.type("#login-email", email);
  await page.type("#login-password", password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.hash.includes("/portal/third-party"), {
    timeout: 30_000,
  });
  await assertText("Portal home", "third-party login");

  await page.goto(`${baseUrl}/#/portal/help`, { waitUntil: "networkidle2" });
  await assertText("Know what needs doing", "Help page");
  await assertText("Pending review", "Help status glossary");

  await page.goto(`${baseUrl}/#/portal/contact`, { waitUntil: "networkidle2" });
  await assertText("Contact IT", "Contact page");
  await page.waitForSelector("#contact-category", { timeout: 10_000 });

  await page.goto(`${baseUrl}/#/portal/legal`, { waitUntil: "networkidle2" });
  await assertText("LEGAL & PRIVACY", "Legal hub");

  await page.goto(`${baseUrl}/#/portal/third-party/jobs`, { waitUntil: "networkidle2" });
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
