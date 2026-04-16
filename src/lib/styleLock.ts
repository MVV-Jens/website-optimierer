import type { CrawlResult, StyleLock } from "@/types";

const COLOR_REGEX = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g;
const FONT_FAMILY_REGEX = /font-family\s*:\s*([^;{}]+)/gi;
const CSS_VAR_REGEX = /(--[\w-]+)\s*:\s*([^;{}]+)/g;

function extractColorsFromCss(css: string): string[] {
  const matches = css.match(COLOR_REGEX) ?? [];
  return [...new Set(matches.map((c) => c.trim()))];
}

function extractFontsFromCss(css: string): string[] {
  const fonts: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(FONT_FAMILY_REGEX.source, "gi");
  while ((match = re.exec(css)) !== null) {
    fonts.push(match[1].trim().replace(/['"]/g, "").split(",")[0].trim());
  }
  return [...new Set(fonts)];
}

function extractCssVars(css: string): Record<string, string> {
  const vars: Record<string, string> = {};
  let match: RegExpExecArray | null;
  const re = new RegExp(CSS_VAR_REGEX.source, "g");
  while ((match = re.exec(css)) !== null) {
    vars[match[1].trim()] = match[2].trim();
  }
  return vars;
}

function extractBreakpoints(css: string): string[] {
  const bpRegex = /@media[^{]*\(\s*(min|max)-width\s*:\s*([\d.]+\w+)\s*\)/g;
  const breakpoints = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = bpRegex.exec(css)) !== null) {
    breakpoints.add(match[2]);
  }
  return [...breakpoints];
}

function mostCommonValue<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  const freq = new Map<T, number>();
  for (const item of arr) {
    freq.set(item, (freq.get(item) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function guessColorRole(
  colors: string[],
  cssVars: Record<string, string>
): StyleLock["colors"] {
  // Try CSS variables first
  const primary =
    cssVars["--primary"] ??
    cssVars["--color-primary"] ??
    cssVars["--brand-color"] ??
    colors.find((c) => !["#fff", "#ffffff", "#000", "#000000"].includes(c.toLowerCase())) ??
    "#0070f3";

  const background =
    cssVars["--background"] ??
    cssVars["--bg"] ??
    cssVars["--color-background"] ??
    "#ffffff";

  const text =
    cssVars["--foreground"] ??
    cssVars["--text"] ??
    cssVars["--color-text"] ??
    "#111111";

  return {
    primary,
    secondary: cssVars["--secondary"] ?? cssVars["--color-secondary"] ?? colors[1] ?? "#6b7280",
    accent: cssVars["--accent"] ?? cssVars["--color-accent"] ?? colors[2] ?? primary,
    background,
    surface: cssVars["--card"] ?? cssVars["--surface"] ?? "#f9fafb",
    text,
    textMuted: cssVars["--muted-foreground"] ?? "#6b7280",
    border: cssVars["--border"] ?? "#e5e7eb",
    error: cssVars["--destructive"] ?? cssVars["--error"] ?? "#dc2626",
    success: cssVars["--success"] ?? "#16a34a",
  };
}

export async function extractStyleLock(crawl: CrawlResult): Promise<StyleLock> {
  const allCss: string[] = [...crawl.inlineCssBlocks];

  // Fetch up to 3 CSS files (timeout-limited)
  const cssPromises = crawl.cssFiles.slice(0, 3).map(async (url) => {
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "UXAnalyzer/1.0" },
      });
      if (resp.ok) return await resp.text();
    } catch {
      // ignore failed CSS fetch
    }
    return null;
  });

  const fetched = await Promise.all(cssPromises);
  for (const css of fetched) {
    if (css) allCss.push(css);
  }

  const combinedCss = allCss.join("\n");

  const colors = extractColorsFromCss(combinedCss);
  const fonts = extractFontsFromCss(combinedCss);
  const cssVars = extractCssVars(combinedCss);
  const breakpoints = extractBreakpoints(combinedCss);
  const hasDesignTokens = Object.keys(cssVars).length > 3;

  // Border radius
  const brMatch = /border-radius\s*:\s*([^;]+)/g.exec(combinedCss);
  const borderRadius = brMatch ? brMatch[1].trim() : cssVars["--radius"] ?? "0.375rem";

  // Box shadow
  const shadowMatch = /box-shadow\s*:\s*([^;]+)/g.exec(combinedCss);
  const boxShadow = shadowMatch
    ? shadowMatch[1].trim()
    : "0 1px 3px 0 rgb(0 0 0 / 0.1)";

  // Max-width
  const maxWidthMatch = /max-width\s*:\s*(\d+px)/g.exec(combinedCss);
  const maxWidth = maxWidthMatch ? maxWidthMatch[1] : "1280px";

  // Spacing unit
  const spacingUnit = cssVars["--spacing"] ?? "0.25rem";

  // Font stacks
  const systemFallback =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const primaryFamily =
    cssVars["--font-sans"] ??
    cssVars["--font-body"] ??
    cssVars["--font-primary"] ??
    fonts[0] ??
    systemFallback;
  const secondaryFamily =
    cssVars["--font-heading"] ??
    cssVars["--font-mono"] ??
    fonts[1] ??
    primaryFamily;

  // Component styles (basic extraction)
  const buttonMatch = /button[^{]*{([^}]+)}/i.exec(combinedCss);
  const inputMatch = /input[^{]*{([^}]+)}/i.exec(combinedCss);

  const colorRoles = guessColorRole(colors, cssVars);

  return {
    typography: {
      primaryFamily,
      secondaryFamily,
      baseSizeRem: 1,
      sizes: ["0.75rem", "0.875rem", "1rem", "1.125rem", "1.25rem", "1.5rem", "2rem", "3rem"],
      weights: ["400", "500", "600", "700"],
      lineHeight: cssVars["--line-height"] ?? "1.6",
    },
    colors: colorRoles,
    components: {
      buttonPrimary: buttonMatch
        ? buttonMatch[1].replace(/\s+/g, " ").trim()
        : `background:${colorRoles.primary};color:#fff;border-radius:${borderRadius};padding:0.5rem 1.25rem`,
      buttonSecondary: `background:transparent;color:${colorRoles.primary};border:1px solid ${colorRoles.primary};border-radius:${borderRadius};padding:0.5rem 1.25rem`,
      inputStyle: inputMatch
        ? inputMatch[1].replace(/\s+/g, " ").trim()
        : `border:1px solid ${colorRoles.border};border-radius:${borderRadius};padding:0.5rem 0.75rem`,
      cardStyle: `background:${colorRoles.surface};border:1px solid ${colorRoles.border};border-radius:${borderRadius};box-shadow:${boxShadow}`,
      linkStyle: `color:${colorRoles.primary};text-decoration:underline`,
    },
    layout: {
      borderRadius,
      boxShadow,
      spacingUnit,
      maxWidth,
      breakpoints:
        breakpoints.length > 0 ? breakpoints : ["768px", "1024px", "1280px"],
    },
    cssVars,
    hasDesignTokens,
    originalCssFiles: crawl.cssFiles,
  };
}
