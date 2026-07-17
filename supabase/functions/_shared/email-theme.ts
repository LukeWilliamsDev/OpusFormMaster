// Shared email theming for all outbound transactional emails (Resend HTML).
// Palette mirrors the app's brand tokens defined in src/styles.css.

export const EMAIL_COLORS = {
  light: {
    bg: "#F5F1EA",
    card: "#FDFAF5",
    header: "#EAE5DC",
    foreground: "#2B2F33",
    muted: "#5A5450",
    border: "#D9D3C7",
  },
  dark: {
    bg: "#1B1C20",
    card: "#232429",
    header: "#2E3036",
    foreground: "#EDEBE6",
    muted: "#ACA89F",
    border: "#2E3036",
  },
  accent: "#B5651D",
  accentForeground: { light: "#FDFAF5", dark: "#EDEBE6" },
  alert: "#C0392B",
};

/**
 * <head> block: sets up light-mode-by-default styles (safest for clients with no
 * dark-mode support) plus a prefers-color-scheme dark override, and the
 * data-ogsc/data-ogsb hooks Gmail/Outlook use in place of the media query.
 */
export function emailHeadStyles(): string {
  const c = EMAIL_COLORS;
  return [
    "<head>",
    '  <meta name="color-scheme" content="light dark">',
    '  <meta name="supported-color-schemes" content="light dark">',
    "  <style>",
    "    :root { color-scheme: light dark; supported-color-schemes: light dark; }",
    `    .bg-page { background-color: ${c.light.bg} !important; background-image: none !important; }`,
    `    .bg-card { background-color: ${c.light.card} !important; background-image: none !important; }`,
    `    .bg-header { background-color: ${c.light.header} !important; background-image: none !important; }`,
    `    .text-title { color: ${c.light.foreground} !important; }`,
    `    .text-body { color: ${c.light.foreground} !important; }`,
    `    .text-secondary { color: ${c.light.muted} !important; }`,
    `    .border-theme { border-color: ${c.light.border} !important; }`,
    "    @media (prefers-color-scheme: dark) {",
    `      .bg-page { background-color: ${c.dark.bg} !important; background-image: none !important; }`,
    `      .bg-card { background-color: ${c.dark.card} !important; background-image: none !important; }`,
    `      .bg-header { background-color: ${c.dark.header} !important; background-image: none !important; }`,
    `      .text-title { color: ${c.dark.foreground} !important; }`,
    `      .text-body { color: ${c.dark.foreground} !important; }`,
    `      .text-secondary { color: ${c.dark.muted} !important; }`,
    `      .border-theme { border-color: ${c.dark.border} !important; }`,
    "    }",
    `    [data-ogsc] .text-title { color: ${c.dark.foreground} !important; }`,
    `    [data-ogsc] .text-body { color: ${c.dark.foreground} !important; }`,
    `    [data-ogsc] .text-secondary { color: ${c.dark.muted} !important; }`,
    `    [data-ogsb] .bg-page { background-color: ${c.dark.bg} !important; background-image: none !important; }`,
    `    [data-ogsb] .bg-card { background-color: ${c.dark.card} !important; background-image: none !important; }`,
    `    [data-ogsb] .bg-header { background-color: ${c.dark.header} !important; background-image: none !important; }`,
    "  </style>",
    "</head>",
  ].join("");
}

/**
 * Plain HTML/CSS wordmark — deliberately NOT an image. SVG <img>s are unreliable across
 * mail clients (Outlook desktop doesn't render them at all; many clients block remote
 * images by default), and computing a fixed dot x-position for an <img> breaks the moment
 * a client substitutes a fallback font with different glyph widths. Text + a colored <span>
 * dot rides the same .text-title / prefers-color-scheme toggle as the rest of the email, so
 * it's exactly as reliable as any other themed text in the message.
 */
export function emailLogoBlock(): string {
  return (
    '<span class="text-title" style="font-family: \'Arial Black\', Arial, sans-serif; ' +
    `font-weight: 900; font-size: 30px; letter-spacing: 3px;">OPUS` +
    `<span style="color: ${EMAIL_COLORS.accent}; padding: 0 8px; font-size: 22px;">&bull;</span>` +
    "FORM</span>"
  );
}

export interface EmailShellOptions {
  eyebrow: string;
  bodyHtml: string;
  footerName: string;
  footerEmail: string;
  accentColor?: string;
}

/** Full page shell: head styles + page bg + card + header (logo) + body + footer. */
export function emailShell(opts: EmailShellOptions): string {
  const accent = opts.accentColor || EMAIL_COLORS.accent;
  return (
    emailHeadStyles() +
    `<div class="bg-page" style="background-color: ${EMAIL_COLORS.light.bg}; padding: 40px 20px; font-family: 'Inter', -apple-system, sans-serif; font-size: 14px; line-height: 1.6;">` +
    `  <div class="bg-card border-theme" style="max-width: 600px; margin: 0 auto; background-color: ${EMAIL_COLORS.light.card}; border: 1px solid ${EMAIL_COLORS.light.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">` +
    `    <div class="bg-header border-theme" style="background-color: ${EMAIL_COLORS.light.header}; padding: 30px 40px; border-bottom: 3px solid ${accent}; text-align: center;">` +
    emailLogoBlock() +
    "    </div>" +
    '    <div style="padding: 40px;">' +
    `      <div style="text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.2em; color: ${accent}; margin-bottom: 20px;">` +
    opts.eyebrow +
    "      </div>" +
    opts.bodyHtml +
    `      <div class="border-theme" style="border-top: 1px solid ${EMAIL_COLORS.light.border}; padding-top: 24px; margin-top: 32px;">` +
    `        <p class="text-title" style="margin: 0 0 4px; color: ${EMAIL_COLORS.light.foreground}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Kind regards,</p>` +
    `        <p class="text-title" style="margin: 0 0 4px; color: ${EMAIL_COLORS.light.foreground}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${opts.footerName}</p>` +
    `        <a href="mailto:${opts.footerEmail}" style="color: ${accent}; text-decoration: none; font-size: 12px; font-weight: 700;">${opts.footerEmail}</a>` +
    "      </div>" +
    "    </div>" +
    "  </div>" +
    "</div>"
  );
}

/** Inline SVG wordmark matching public/opus-form-primary-{light,dark}.svg */
export function logoSvg(theme: "light" | "dark"): string {
  const textFill = theme === "dark" ? "#E9E6E1" : "#2B2F33";
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 120" width="100%" height="100%">' +
    `<text x="40" y="76" font-family="'Inter', 'Arial Black', system-ui, -apple-system, sans-serif" font-weight="900" font-size="48" letter-spacing="6" fill="${textFill}">OPUS</text>` +
    `<circle cx="231" cy="59" r="5" fill="${EMAIL_COLORS.accent}"/>` +
    `<text x="246" y="76" font-family="'Inter', 'Arial Black', system-ui, -apple-system, sans-serif" font-weight="900" font-size="48" letter-spacing="6" fill="${textFill}">FORM</text>` +
    "</svg>"
  );
}
