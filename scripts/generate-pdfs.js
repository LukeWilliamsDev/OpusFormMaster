// Converts Opus Form Ltd's UK-compliant policy Markdown files into branded, print-ready PDFs.
// Layout matches the approved "controlled document" mockup: letterhead, document-control
// block, numbered sections, running footer with page numbers, and a sign-off block.
// Usage: node generate-pdfs.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_DIR =
  'C:\\Users\\Luke\\.gemini\\antigravity-ide\\brain\\b941d7a6-eee2-48ac-aee3-9dda6fa1c3c9';

const LOGO_SVG_PATH = path.join(__dirname, '..', 'public', 'opus-form-primary-light.svg');

// Only the final, terminology-aligned suite of 6 policies (per walkthrough.md).
// Deliberately hardcoded rather than globbed so bundle/scratch files in the
// source folder (opus_form_policies.md, task.md, walkthrough.md, etc.) are never picked up.
// `reference` is a stable document-control code; `kind` is the eyebrow label above the title.
const POLICIES = [
  { source: 'Anti_Bribery_Policy.md', outputName: 'Anti-Bribery-Policy', reference: 'OF-POL-01', kind: 'Company Policy' },
  { source: 'Health_and_Safety_Policy.md', outputName: 'Health-and-Safety-Policy', reference: 'OF-POL-02', kind: 'Company Policy' },
  { source: 'Modern_Slavery_Statement.md', outputName: 'Modern-Slavery-Statement', reference: 'OF-POL-03', kind: 'Statutory & Voluntary Disclosure' },
  { source: 'Quality_Management_Policy.md', outputName: 'Quality-Management-Policy', reference: 'OF-POL-04', kind: 'Company Policy' },
  { source: 'Responsible_Sourcing_Policy.md', outputName: 'Responsible-Sourcing-Policy', reference: 'OF-POL-05', kind: 'Company Policy' },
  { source: 'Sustainability_Policy.md', outputName: 'Sustainability-Policy', reference: 'OF-POL-06', kind: 'Company Policy' },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'policies');

const COMPANY_NAME = 'Opus Form Ltd';
const COMPANY_NUMBER = '17228356';

// Dark Industrial brand palette (see src/styles.css) — warm cream/charcoal, burnt-orange accent.
const INK = '#2B2F33';
const BODY_TEXT = '#4A4640';
const MUTED = '#7A756C';
const MUTED_2 = '#9B958A';
const ACCENT = '#B5651D';
const ACCENT_DEEP = '#8F4F16';
const LINE = '#D9D3C7';
const WASH = '#EAE5DC';

// Matches the site's type system (src/routes/__root.tsx Google Fonts link + src/styles.css vars).
const SANS_STACK = `'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`;
const DISPLAY_STACK = `'Archivo', ${SANS_STACK}`;
const MONO_STACK = `'JetBrains Mono', ui-monospace, 'SFMono-Regular', Consolas, monospace`;
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Public+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');`;

const SMALL_WORDS = new Set(['and', 'of', 'the', 'in', 'on', 'for', 'to', 'a', 'an', '&']);

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (i !== 0 && SMALL_WORDS.has(word)) return word;
      return word
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
    })
    .join(' ');
}

// Embeds the actual brand asset (public/opus-form-primary-light.svg) rather than
// approximating it — guarantees the print lockup is pixel-identical to the real wordmark.
// The source viewBox (0 0 480 120) has wide side margins for the app's hero banners;
// cropped here to a tight bounding box around the glyphs for a compact letterhead.
function printLogo({ height }) {
  const raw = fs.readFileSync(LOGO_SVG_PATH, 'utf8');
  const inner = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
  return `<svg viewBox="30 20 405 65" height="${height}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

// Strips the "# TITLE" / **Company:** / **Managing Director:** / **Date:** preamble
// (replaced by the letterhead + document-control block) and returns the remaining
// markdown body plus the extracted metadata.
function extractMeta(markdown) {
  const lines = markdown.split(/\r?\n/);
  let title = '';
  let director = '';
  let issued = '';
  let bodyStartIndex = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!title && line.startsWith('# ')) {
      title = toTitleCase(line.slice(2).trim());
      continue;
    }
    const dirMatch = line.match(/^\*\*Managing Director:\*\*\s*(.+)$/);
    if (dirMatch) {
      director = dirMatch[1].trim();
      continue;
    }
    const dateMatch = line.match(/^\*\*Date:\*\*\s*(.+)$/);
    if (dateMatch) {
      issued = dateMatch[1].trim();
      continue;
    }
    if (line.startsWith('## ') || line.startsWith('### ')) {
      bodyStartIndex = i;
      break;
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n');
  return { title, director, issued, body };
}

function nextYear(dateStr) {
  const match = dateStr.match(/(\d{4})/);
  if (!match) return dateStr;
  return dateStr.replace(match[1], String(Number(match[1]) + 1));
}

// Marked renderer: headings written as "## 1. Section Title" get a mono section-number
// badge; headings without a leading number (e.g. "## Part 1 - Policy Statements") just
// keep the plain steel-blue rule from PRINT_CSS.
const renderer = {
  heading({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const match = text.match(/^(\d+)\.\s*(.*)$/);
    if ((depth === 2 || depth === 3) && match) {
      const num = match[1].padStart(2, '0');
      return `<h${depth}><span class="num">${num}</span> ${match[2]}</h${depth}>\n`;
    }
    return `<h${depth}>${text}</h${depth}>\n`;
  },
};
marked.use({ renderer });

const PRINT_CSS = `
  ${FONT_IMPORT}

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #FFFFFF;
    color: ${BODY_TEXT};
    font-family: ${SANS_STACK};
    font-size: 10.3pt;
    line-height: 1.68;
  }

  .doc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 5mm;
    margin-bottom: 8mm;
    border-bottom: 0.75pt solid ${LINE};
  }

  .doc-header .reg {
    text-align: right;
    font-family: ${MONO_STACK};
    font-size: 8.5px;
    line-height: 1.6;
    letter-spacing: 0.02em;
    color: ${MUTED};
    text-transform: uppercase;
  }

  .title-block { margin-bottom: 9mm; }

  .doc-kind {
    font-family: ${MONO_STACK};
    font-size: 9.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${ACCENT};
    margin: 0 0 5mm;
  }

  .title-block h1 {
    font-family: ${DISPLAY_STACK};
    font-size: 22pt;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: ${INK};
    margin: 0 0 7mm;
    max-width: 30ch;
  }

  .doc-control {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: ${WASH};
    border: 0.75pt solid ${LINE};
    border-radius: 2px;
  }

  .doc-control div {
    padding: 3.6mm 4mm;
    border-right: 0.75pt solid ${LINE};
  }

  .doc-control div:last-child { border-right: none; }

  .doc-control .k {
    font-family: ${MONO_STACK};
    font-size: 7.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${MUTED};
    margin: 0 0 1.5mm;
  }

  .doc-control .v {
    font-size: 10px;
    font-weight: 600;
    color: ${INK};
    font-variant-numeric: tabular-nums;
    margin: 0;
  }

  .content { max-width: 165mm; }

  .content h2, .content h3 {
    font-family: ${DISPLAY_STACK};
    color: ${INK};
    font-weight: 700;
    margin: 8mm 0 2mm;
    padding-bottom: 2mm;
    border-bottom: 1.5pt solid ${ACCENT};
    display: flex;
    align-items: baseline;
    gap: 7px;
    page-break-after: avoid;
    break-after: avoid;
  }

  .content h2 { font-size: 14.5pt; }
  .content h3 { font-size: 12pt; }

  .content h2 .num, .content h3 .num {
    font-family: ${MONO_STACK};
    font-size: 11px;
    color: ${ACCENT};
    font-weight: 600;
  }

  .content p, .content ul, .content ol, .content table, .content blockquote {
    page-break-inside: avoid;
    break-inside: avoid;
    margin: 0 0 3.6mm;
  }

  .content ul, .content ol {
    padding-left: 0;
    list-style: none;
  }

  .content li {
    padding-left: 4.5mm;
    position: relative;
    margin-bottom: 1.8mm;
  }

  .content ul li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.62em;
    width: 4px;
    height: 4px;
    background: ${ACCENT};
    border-radius: 1px;
  }

  .content ol { counter-reset: item; }

  .content ol li { padding-left: 6mm; }

  .content ol li::before {
    counter-increment: item;
    content: counter(item) '.';
    position: absolute;
    left: 0;
    font-family: ${MONO_STACK};
    font-size: 0.85em;
    color: ${ACCENT};
    font-weight: 600;
  }

  .content strong { color: ${INK}; font-weight: 700; }

  .content a { color: ${ACCENT_DEEP}; }

  .content hr {
    border: none;
    border-top: 0.75pt solid ${LINE};
    margin: 8mm 0;
  }

  .content table {
    border-collapse: collapse;
    width: 100%;
  }

  .content th, .content td {
    border: 0.75pt solid ${LINE};
    padding: 2mm 3mm;
    text-align: left;
    font-size: 9.5pt;
  }

  .content th {
    background: ${WASH};
    color: ${INK};
  }

  .signoff {
    margin-top: 10mm;
    padding-top: 6mm;
    border-top: 0.75pt solid ${LINE};
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10mm;
    max-width: 165mm;
    page-break-inside: avoid;
  }

  .signoff .field-label {
    font-family: ${MONO_STACK};
    font-size: 7.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${MUTED};
    margin: 0 0 9mm;
  }

  .signoff .sig-line {
    border-bottom: 0.75pt solid ${INK};
    height: 1px;
    margin-bottom: 2.5mm;
  }

  .signoff .sig-name {
    font-size: 10pt;
    font-weight: 700;
    color: ${INK};
    margin: 0;
  }

  .signoff .sig-role {
    font-size: 8.5pt;
    color: ${MUTED};
    margin: 0.5mm 0 0;
  }
`;

function buildHtml({ title, kind, bodyHtml, director, issued, reference }) {
  const review = nextYear(issued);
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <title>${title} - ${COMPANY_NAME}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="doc-header">
    ${printLogo({ height: '20px' })}
    <div class="reg">
      ${COMPANY_NAME}<br>
      Company No. ${COMPANY_NUMBER}<br>
      Registered in England &amp; Wales
    </div>
  </div>

  <div class="title-block">
    <p class="doc-kind">${kind}</p>
    <h1>${title}</h1>
    <div class="doc-control">
      <div><p class="k">Managing Director</p><p class="v">${director}</p></div>
      <div><p class="k">Issued</p><p class="v">${issued}</p></div>
      <div><p class="k">Review Date</p><p class="v">${review}</p></div>
      <div><p class="k">Reference</p><p class="v">${reference}</p></div>
    </div>
  </div>

  <div class="content">${bodyHtml}</div>

  <div class="signoff">
    <div>
      <p class="field-label">Approved By</p>
      <div class="sig-line"></div>
      <p class="sig-name">${director}</p>
      <p class="sig-role">Managing Director, ${COMPANY_NAME}</p>
    </div>
    <div>
      <p class="field-label">Date</p>
      <div class="sig-line"></div>
      <p class="sig-name">${issued}</p>
      <p class="sig-role">Next scheduled review: ${review}</p>
    </div>
  </div>
</body>
</html>`;
}

function footerTemplate({ title, reference }) {
  return `<div style="width:100%; box-sizing:border-box; padding:0 18mm; display:flex; justify-content:space-between; align-items:center; font-family:${MONO_STACK}; font-size:7.5px; letter-spacing:0.04em; text-transform:uppercase; color:${MUTED_2};">
    <span>${COMPANY_NAME} — Confidential</span>
    <span>${title} · ${reference}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;
}

function headerTemplate({ title }) {
  return `<div style="width:100%; box-sizing:border-box; padding:0 18mm; display:flex; justify-content:flex-end; align-items:center; border-bottom:0.75pt solid ${LINE}; font-family:${MONO_STACK}; font-size:7px; letter-spacing:0.08em; text-transform:uppercase; color:${MUTED_2};">
    <span>${title} — ${COMPANY_NAME}</span>
  </div>`;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });

  const results = [];

  try {
    for (const policy of POLICIES) {
      const sourcePath = path.join(SOURCE_DIR, policy.source);
      const outputPath = path.join(OUTPUT_DIR, `${policy.outputName}.pdf`);

      try {
        const markdown = fs.readFileSync(sourcePath, 'utf8');
        const { title, director, issued, body } = extractMeta(markdown);
        const bodyHtml = marked.parse(body);
        const html = buildHtml({
          title,
          kind: policy.kind,
          bodyHtml,
          director,
          issued,
          reference: policy.reference,
        });

        const page = await browser.newPage();
        try {
          await page.setContent(html, { waitUntil: 'networkidle0' });
          await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: headerTemplate({ title }),
            footerTemplate: footerTemplate({ title, reference: policy.reference }),
            margin: { top: '24mm', bottom: '20mm', left: '18mm', right: '18mm' },
          });
        } finally {
          await page.close();
        }

        const { size } = fs.statSync(outputPath);
        console.log(`OK   ${policy.source} -> policies/${policy.outputName}.pdf (${(size / 1024).toFixed(1)} KB)`);
        results.push({ policy: title, ok: true });
      } catch (err) {
        console.error(`FAIL ${policy.source}: ${err.message}`);
        results.push({ policy: policy.source, ok: false, error: err.message });
      }
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PDFs generated successfully.`);

  if (failed.length > 0) {
    console.error(`Failed: ${failed.map((f) => f.policy).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal error generating PDFs:', err);
  process.exitCode = 1;
});
