import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type {
  CrawlResult,
  AnalysisResult,
  StyleLock,
  AnalysisOptions,
  RedesignResult,
  RedesignChange,
  IAOutlineSection,
  AnalysisCategory,
} from "@/types";

// ─── URL absolutification ─────────────────────────────────────────────────────

function makeUrlsAbsolute($: cheerio.CheerioAPI, baseUrl: string) {
  $("[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src && src.startsWith("/") && !src.startsWith("//")) {
      $(el).attr("src", baseUrl + src);
    }
  });
  $("[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (
      href &&
      href.startsWith("/") &&
      !href.startsWith("//") &&
      !href.startsWith("#")
    ) {
      $(el).attr("href", baseUrl + href);
    }
  });
  $("link[rel='stylesheet']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith("/") && !href.startsWith("//")) {
      $(el).attr("href", baseUrl + href);
    }
  });
}

// ─── Transformation functions ─────────────────────────────────────────────────

function fixLangAttribute(
  $: cheerio.CheerioAPI,
  crawl: CrawlResult,
  changes: RedesignChange[]
) {
  const html = $("html");
  if (!crawl.hasLangAttribute) {
    html.attr("lang", "de");
    changes.push({
      category: "accessibility",
      before: '<html> ohne lang-Attribut',
      after: '<html lang="de">',
      reason: "lang-Attribut für Screenreader und korrekte Aussprache hinzugefügt.",
      impact: "medium",
      selector: "html",
      elementPreview: "html-Element (Dokumentwurzel)",
    });
  }
}

function fixViewportMeta(
  $: cheerio.CheerioAPI,
  crawl: CrawlResult,
  changes: RedesignChange[]
) {
  if (!crawl.hasViewportMeta) {
    $("head").append(
      '<meta name="viewport" content="width=device-width, initial-scale=1">'
    );
    changes.push({
      category: "responsiveness",
      before: "Kein Viewport-Meta-Tag vorhanden",
      after: '<meta name="viewport" content="width=device-width, initial-scale=1">',
      reason: "Ohne Viewport-Tag wird die Seite auf Mobilgeräten nicht korrekt skaliert.",
      impact: "high",
      selector: 'meta[name="viewport"]',
      elementPreview: "<meta name=\"viewport\"> (in <head>)",
    });
  }
}

function addSkipLink(
  $: cheerio.CheerioAPI,
  crawl: CrawlResult,
  changes: RedesignChange[]
) {
  if (!crawl.hasSkipLink) {
    const pinNum = changes.length + 1;
    $("body").prepend(
      `<a href="#ux-main-content" class="ux-skip-link" data-ux-pin="${pinNum}">Zum Hauptinhalt springen</a>`
    );

    // Mark main content area
    const main = $("main, [role='main'], #content, #main, .main, .content").first();
    if (main.length) {
      if (!main.attr("id")) main.attr("id", "ux-main-content");
    } else {
      $("body > *:not(header):not(nav):not(.ux-skip-link)").first().attr(
        "id",
        "ux-main-content"
      );
    }

    changes.push({
      category: "accessibility",
      before: "Kein Skip-Link vorhanden",
      after: '<a href="#ux-main-content" class="ux-skip-link">Zum Hauptinhalt springen</a> am Seitenanfang',
      reason: "Tastaturnutzer können so direkt zum Inhalt navigieren, ohne die Navigation zu durchlaufen.",
      impact: "medium",
      selector: ".ux-skip-link",
      elementPreview: "Skip-Link am Seitenkopf (bei Tab-Fokus sichtbar)",
    });
  }
}

function fixHeadingHierarchy(
  $: cheerio.CheerioAPI,
  changes: RedesignChange[]
) {
  const headings = $("h1, h2, h3, h4, h5, h6").toArray();
  if (headings.length < 2) return;

  // Collect what needs fixing, capture text BEFORE replacement
  const toFix: Array<{ el: Element; corrected: number; originalText: string }> = [];
  let lastLevel = 0;
  for (const el of headings) {
    const current = parseInt(el.tagName.replace("h", ""), 10);
    if (lastLevel > 0 && current > lastLevel + 1) {
      toFix.push({ el, corrected: lastLevel + 1, originalText: $(el).text().trim().slice(0, 50) });
      lastLevel = lastLevel + 1;
    } else {
      lastLevel = current;
    }
  }

  if (toFix.length === 0) return;

  const pinNum = changes.length + 1;
  let pinInjected = false;

  for (const { el, corrected, originalText: _t } of toFix) {
    const newTag = `h${corrected}`;
    const content = $(el).html() ?? "";
    const attribs = Object.entries(el.attribs ?? {})
      .map(([k, v]) => ` ${k}="${v}"`)
      .join("");
    const pinAttr = !pinInjected ? ` data-ux-pin="${pinNum}"` : "";
    $(el).replaceWith(`<${newTag}${attribs}${pinAttr}>${content}</${newTag}>`);
    pinInjected = true;
  }

  const exampleText = toFix[0].originalText;
  changes.push({
    category: "accessibility",
    before: `Übersprungene Heading-Ebenen (${toFix.length} Stellen), z.B. ${toFix[0].el.tagName.toUpperCase()}: „${exampleText || "…"}"`,
    after: "Lückenlose Heading-Hierarchie H1 → H2 → H3",
    reason: "Konsistente Heading-Hierarchie verbessert Zugänglichkeit und Orientierung.",
    impact: "medium",
    selector: `[data-ux-pin="${pinNum}"]`,
    elementPreview: `${toFix[0].el.tagName.toUpperCase()} → H${toFix[0].corrected}: „${exampleText}"`,
  });
}

function addImageAltTexts(
  $: cheerio.CheerioAPI,
  changes: RedesignChange[]
) {
  let fixCount = 0;
  let firstEl: Element | null = null;
  let firstSrc = "";

  $("img").each((_, el) => {
    if ($(el).attr("alt") === undefined) {
      if (!firstEl) {
        firstEl = el;
        firstSrc = $(el).attr("src") ?? "";
      }
      const src = $(el).attr("src") ?? "";
      const parent = $(el).parent();
      const isDecorative =
        parent.is("button") ||
        parent.attr("role") === "presentation" ||
        src.includes("bg") ||
        src.includes("background") ||
        src.includes("decor");

      $(el).attr("alt", isDecorative ? "" : src.split("/").pop()?.split("?")[0].split(".")[0].replace(/[-_]/g, " ") ?? "Bild");
      fixCount++;
    }
  });

  if (fixCount > 0) {
    const pinNum = changes.length + 1;
    if (firstEl) $(firstEl as Element).attr("data-ux-pin", String(pinNum));
    const fileName = firstSrc.split("/").pop()?.split("?")[0] ?? "Bild";
    changes.push({
      category: "accessibility",
      before: `${fixCount} Bild(er) ohne alt-Attribut`,
      after: "Alt-Text aus Dateiname generiert; dekorative Bilder mit alt='' markiert",
      reason: "Alt-Texte sind essenziell für Screenreader und WCAG-Konformität (1.1.1).",
      impact: "high",
      selector: `[data-ux-pin="${pinNum}"]`,
      elementPreview: fixCount === 1
        ? `<img src="…/${fileName}">`
        : `${fixCount} Bilder, erstes: „${fileName}"`,
    });
  }
}

function addFormLabels(
  $: cheerio.CheerioAPI,
  changes: RedesignChange[]
) {
  let fixCount = 0;
  let firstEl: Element | null = null;
  let firstLabel = "";

  $("input, textarea, select").each((_, el) => {
    const type = $(el).attr("type") ?? "text";
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;

    const id = $(el).attr("id");
    if (id) {
      const hasLabel = $(`label[for="${id}"]`).length > 0;
      if (!hasLabel) {
        const placeholder = $(el).attr("placeholder") ?? $(el).attr("name") ?? "Eingabe";
        const ariaLabel = $(el).attr("aria-label");
        if (!ariaLabel) {
          $(el).attr("aria-label", placeholder);
          if (!firstEl) { firstEl = el; firstLabel = placeholder; }
          fixCount++;
        }
      }
    } else {
      const name = $(el).attr("name") ?? `field-${fixCount}`;
      const newId = `ux-input-${name.replace(/\W+/g, "-")}`;
      $(el).attr("id", newId);
      const placeholder = $(el).attr("placeholder") ?? name;
      if (!$(el).attr("aria-label")) {
        $(el).attr("aria-label", placeholder);
        if (!firstEl) { firstEl = el; firstLabel = placeholder; }
        fixCount++;
      }
    }
  });

  if (fixCount > 0) {
    const pinNum = changes.length + 1;
    if (firstEl) $(firstEl as Element).attr("data-ux-pin", String(pinNum));
    changes.push({
      category: "accessibility",
      before: `${fixCount} Formulareingaben ohne zugängliche Beschriftung`,
      after: "aria-label-Attribute ergänzt; IDs für programmatische Verknüpfung gesetzt",
      reason: "Formular-Labels sind Pflicht für WCAG 1.3.1 und verbessern Nutzbarkeit erheblich.",
      impact: "high",
      selector: `[data-ux-pin="${pinNum}"]`,
      elementPreview: `Eingabefeld: „${firstLabel}"`,
    });
  }
}

function addAriaLandmarks(
  $: cheerio.CheerioAPI,
  changes: RedesignChange[]
) {
  let changed = false;

  // Add role to nav elements without role
  $("nav:not([role])").attr("role", "navigation");
  $("nav:not([aria-label])").attr("aria-label", "Hauptnavigation");

  // Add role to header without role
  $("header:not([role])").attr("role", "banner");

  // Add role to footer
  $("footer:not([role])").attr("role", "contentinfo");

  // Add missing main if not present
  const hasMain = $("main, [role='main']").length > 0;
  let mainEl: cheerio.Cheerio<Element> | null = null;
  if (!hasMain) {
    const candidates = $("body > div, body > section, body > article").not(
      "header, nav, footer, aside"
    );
    if (candidates.length > 0) {
      candidates.first().attr("role", "main");
      mainEl = candidates.first();
      changed = true;
    }
  }

  // Label multiple nav elements
  $("nav").each((i, el) => {
    if (!$(el).attr("aria-label") && i > 0) {
      $(el).attr("aria-label", `Navigation ${i + 1}`);
    }
  });

  if (changed) {
    const pinNum = changes.length + 1;
    const primaryEl = mainEl ?? $("nav").first();
    if (primaryEl.length) primaryEl.attr("data-ux-pin", String(pinNum));
    const tag = mainEl ? (mainEl.get(0)?.tagName ?? "div") : "nav";
    changes.push({
      category: "accessibility",
      before: "Fehlende ARIA-Landmark-Rollen",
      after: "role='main', role='navigation', role='banner', role='contentinfo' ergänzt",
      reason: "Landmark-Rollen ermöglichen Screenreader-Nutzern schnelle Navigation zwischen Seitenbereichen.",
      impact: "medium",
      selector: `[data-ux-pin="${pinNum}"]`,
      elementPreview: `<${tag}> → role="main" ergänzt`,
    });
  }
}

function improveFormStructure(
  $: cheerio.CheerioAPI,
  changes: RedesignChange[]
) {
  let improved = 0;

  $("form").each((_, form) => {
    // Add novalidate to let us handle validation (remove browser ugly UI)
    // Actually, keep browser validation but improve labels
    // Add autocomplete where missing
    $(form).find("input[type='email']:not([autocomplete])").attr("autocomplete", "email");
    $(form).find("input[type='tel']:not([autocomplete])").attr("autocomplete", "tel");
    $(form)
      .find("input[name*='name']:not([autocomplete])")
      .attr("autocomplete", "name");
    $(form)
      .find("input[name*='fname']:not([autocomplete]), input[name*='firstname']:not([autocomplete])")
      .attr("autocomplete", "given-name");

    // Add required indicator to required fields without visual marker
    $(form).find("input[required], textarea[required], select[required]").each((_, el) => {
      const label = $(`label[for='${$(el).attr("id")}']`);
      if (label.length && !label.text().includes("*") && !label.text().includes("required")) {
        label.append('<span aria-hidden="true" style="color:var(--ux-error,#dc2626);margin-left:2px">*</span>');
        improved++;
      }
    });
  });

  if (improved > 0) {
    changes.push({
      category: "interaction",
      before: "Pflichtfelder ohne visuelle Markierung",
      after: "* Markierung an Pflichtfeldern, autocomplete-Attribute ergänzt",
      reason: "Klare Pflichtfeld-Markierung reduziert Formularabbrüche erheblich.",
      impact: "medium",
      selector: "form",
      elementPreview: `<form> mit ${improved} Pflichtfeld(ern)`,
    });
  }
}

function addLazyLoading(
  $: cheerio.CheerioAPI,
  changes: RedesignChange[]
) {
  let count = 0;
  let firstEl: Element | null = null;
  let firstSrc = "";

  $("img:not([loading])").each((i, el) => {
    if (i > 2) {
      if (!firstEl) { firstEl = el; firstSrc = $(el).attr("src") ?? ""; }
      $(el).attr("loading", "lazy");
      count++;
    }
  });

  if (count > 0) {
    const pinNum = changes.length + 1;
    if (firstEl) $(firstEl as Element).attr("data-ux-pin", String(pinNum));
    const fileName = firstSrc.split("/").pop()?.split("?")[0] ?? "Bild";
    changes.push({
      category: "performance",
      before: `${count} Bilder (ab Position 4) laden sofort beim Seitenaufruf`,
      after: `${count} Bilder mit loading="lazy" verzögert geladen`,
      reason: "Lazy Loading reduziert initiale Ladezeit und Bandbreitenverbrauch.",
      impact: "medium",
      selector: `[data-ux-pin="${pinNum}"]`,
      elementPreview: `Erstes Lazy-Bild: „${fileName}"`,
    });
  }
}

function injectUxCss(
  $: cheerio.CheerioAPI,
  styleLock: StyleLock,
  changes: RedesignChange[]
) {
  const c = styleLock.colors;
  const l = styleLock.layout;
  const t = styleLock.typography;

  const uxCss = `
/* ═════════════════════════════════════════════════════════
   UX-Verbesserungen – aufbauend auf bestehendem Design
   Generated by Website-Optimierer
   ═════════════════════════════════════════════════════════ */

/* CSS-Variablen aus Style-Lock */
:root {
  --ux-primary: ${c.primary};
  --ux-bg: ${c.background};
  --ux-text: ${c.text};
  --ux-border: ${c.border};
  --ux-error: ${c.error};
  --ux-radius: ${l.borderRadius};
  --ux-shadow: ${l.boxShadow};
}

/* Skip-Link */
.ux-skip-link {
  position: absolute;
  top: -100px;
  left: 8px;
  z-index: 99999;
  padding: 0.5rem 1rem;
  background: var(--ux-primary, #0070f3);
  color: #fff;
  text-decoration: none;
  border-radius: var(--ux-radius, 4px);
  font-family: ${t.primaryFamily};
  font-size: 0.875rem;
  transition: top 0.15s ease;
  white-space: nowrap;
}
.ux-skip-link:focus {
  top: 8px;
  outline: 2px solid #fff;
  outline-offset: 2px;
}

/* Verbesserte Fokus-Stile */
*:focus-visible {
  outline: 2px solid var(--ux-primary, #0070f3);
  outline-offset: 2px;
  border-radius: 2px;
}
*:focus:not(:focus-visible) {
  outline: none;
}

/* Bildresponsiveness */
img {
  max-width: 100%;
  height: auto;
}

/* Zeilenbreite für bessere Lesbarkeit */
p, li, td {
  max-width: 75ch;
}

/* Bessere Formulareingaben */
input:not([type='submit']):not([type='button']):not([type='reset']):not([type='checkbox']):not([type='radio']),
textarea,
select {
  max-width: 100%;
  box-sizing: border-box;
}

/* Validierungsfeedback */
input:invalid:not(:placeholder-shown),
textarea:invalid:not(:placeholder-shown),
select:invalid:not(:placeholder-shown) {
  border-color: var(--ux-error, #dc2626) !important;
}

/* Tabellen responsiv */
table {
  border-collapse: collapse;
  width: 100%;
}

/* Touch-Targets mindestens 44×44px */
button, a, [role='button'], input[type='submit'], input[type='button'] {
  min-height: 44px;
  min-width: 44px;
}

/* Mobile UX Basisoptimierungen */
@media (max-width: 768px) {
  * {
    word-break: break-word;
    overflow-wrap: break-word;
  }
  table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  img {
    width: 100%;
    height: auto;
  }
}

/* Reduzierte Abstände für kleinste Screens */
@media (max-width: 480px) {
  body {
    font-size: 16px; /* verhindert iOS Auto-Zoom */
  }
}

/* ── UX Annotation Pins (Website-Optimierer) ── */
[data-ux-pin] {
  outline: 2px dashed rgba(99, 102, 241, 0.75) !important;
  outline-offset: 3px;
}
`.trim();

  // Check if ux-improvements already exists
  if (!$("#ux-improvements").length) {
    $("head").append(`\n<style id="ux-improvements">\n${uxCss}\n</style>`);
    changes.push({
      category: "accessibility",
      before: "Keine verbesserten Focus-Stile, kein Skip-Link CSS",
      after: "UX-CSS-Layer eingefügt: Focus-Stile, Touch-Targets, Mobile-Optimierungen, Bildresponsiveness",
      reason: "Nicht-destruktive CSS-Erweiterungen verbessern mobile UX und Zugänglichkeit.",
      impact: "high",
    });
  }

  return uxCss;
}

// ─── IA Outline Generator ─────────────────────────────────────────────────────

function generateIAOutline(
  $: cheerio.CheerioAPI,
  crawl: CrawlResult
): IAOutlineSection[] {
  const sections: IAOutlineSection[] = [];
  let order = 0;

  if ($("header, [role='banner']").length > 0 || crawl.navigation.length > 0) {
    sections.push({
      name: "Header / Navigation",
      purpose: "Orientierung, Markenidentität, Hauptnavigation",
      order: order++,
      isNew: false,
    });
  }

  // Hero section
  const hero = $("section, .hero, .banner, [class*='hero'], [id*='hero']").first();
  if (hero.length) {
    sections.push({
      name: "Hero / Einstieg",
      purpose: "Value Proposition, primärer CTA, erste Conversion-Möglichkeit",
      order: order++,
      isNew: false,
    });
  }

  // H2 sections
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 2) {
      sections.push({
        name: text,
        purpose: "Inhaltsabschnitt",
        order: order++,
        isNew: false,
      });
    }
  });

  if (crawl.forms.length > 0) {
    sections.push({
      name: "Formular / Interaktion",
      purpose: "Direkte Nutzeraktion, Lead-Generierung, Kontakt",
      order: order++,
      isNew: false,
    });
  }

  if ($("footer, [role='contentinfo']").length > 0) {
    sections.push({
      name: "Footer",
      purpose: "Rechtliche Infos, sekundäre Navigation, Kontakt",
      order: order++,
      isNew: false,
    });
  }

  return sections;
}

// ─── Main Redesign Generator ──────────────────────────────────────────────────

export function generateRedesign(
  crawl: CrawlResult,
  analysis: AnalysisResult,
  styleLock: StyleLock,
  options: AnalysisOptions
): RedesignResult {
  const $ = cheerio.load(crawl.html, { xmlMode: false });
  const changes: RedesignChange[] = [];

  // Make all relative URLs absolute so the preview works
  makeUrlsAbsolute($, crawl.baseUrl);

  // ── Transformation pipeline ──────────────────────────────────────────────
  fixLangAttribute($, crawl, changes);
  fixViewportMeta($, crawl, changes);
  addSkipLink($, crawl, changes);
  fixHeadingHierarchy($, changes);
  addImageAltTexts($, changes);
  addFormLabels($, changes);
  addAriaLandmarks($, changes);
  improveFormStructure($, changes);
  addLazyLoading($, changes);

  // Inject UX CSS improvements (non-destructive, additive)
  const uxCss = injectUxCss($, styleLock, changes);

  // ── IA Outline ────────────────────────────────────────────────────────────
  const iaOutline = generateIAOutline($, crawl);

  // Apply focus-based improvements for moderate depth
  if (options.depth === "moderate") {
    applyModerateImprovements($, crawl, styleLock, changes, options);
  }

  const redesignedHtml = $.html();

  return {
    html: redesignedHtml,
    css: uxCss,
    changes,
    iaOutline,
    changeCount: changes.length,
  };
}

// ─── Moderate depth improvements ─────────────────────────────────────────────

function applyModerateImprovements(
  $: cheerio.CheerioAPI,
  crawl: CrawlResult,
  styleLock: StyleLock,
  changes: RedesignChange[],
  options: AnalysisOptions
) {
  // Improve navigation with aria-current
  const currentPath = (() => {
    try {
      return new URL(crawl.url).pathname;
    } catch {
      return "/";
    }
  })();

  $("nav a, [role='navigation'] a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    try {
      const linkPath = new URL(href).pathname;
      if (linkPath === currentPath) {
        $(el).attr("aria-current", "page");
      }
    } catch {
      if (href === currentPath) {
        $(el).attr("aria-current", "page");
      }
    }
  });

  // Add loading="eager" to first image (LCP candidate)
  $("img").first().attr("loading", "eager").attr("fetchpriority", "high");

  // Improve heading structure: add section elements around H2+ blocks
  // (only if the content isn't already in sections or articles)
  const h2s = $("h2").not("section h2, article h2, aside h2");
  if (h2s.length > 1) {
    changes.push({
      category: "information-architecture",
      before: "H2-Überschriften ohne umschließende Sektionen",
      after: "aria-labelledby auf H2-Elemente gesetzt",
      reason: "Bessere semantische Struktur für Screenreader.",
      impact: "low",
    });

    h2s.each((_, el) => {
      const id = $(el).attr("id") ?? `ux-section-${Math.random().toString(36).slice(2, 7)}`;
      $(el).attr("id", id);
    });
  }

  // If focus is on navigation
  if (options.optimizationFocus === "navigation" || options.optimizationFocus === "all") {
    $("nav a").each((_, el) => {
      const title = $(el).attr("title");
      if (!title && $(el).text().trim().length < 3) {
        $(el).attr("title", $(el).attr("href") ?? "Link");
      }
    });
  }

  // If focus is on form UX
  if (options.optimizationFocus === "form-ux" || options.optimizationFocus === "all") {
    $("form").each((_, form) => {
      // Add role and aria attributes
      const formId = $(form).attr("id") ?? `ux-form-${Math.random().toString(36).slice(2, 7)}`;
      $(form).attr("id", formId);

      // Add error live region if not present
      if (!$(form).find('[role="alert"], [aria-live]').length) {
        $(form).append(
          `<div role="alert" aria-live="polite" id="${formId}-errors" style="display:none;color:var(--ux-error,#dc2626);"></div>`
        );
      }
    });
  }
}
