import type {
  CrawlResult,
  AnalysisResult,
  CategoryScore,
  Issue,
  AnalysisCategory,
  IssuePriority,
} from "@/types";

let issueCounter = 0;
function makeId(cat: string): string {
  return `${cat}-${++issueCounter}`;
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

// ─── Information Architecture ─────────────────────────────────────────────────

function analyzeIA(crawl: CrawlResult): { score: number; issues: Issue[]; quickWins: string[] } {
  const issues: Issue[] = [];
  const quickWins: string[] = [];
  let score = 100;

  const h1s = crawl.headings.filter((h) => h.level === 1);
  if (h1s.length === 0) {
    score -= 30;
    issues.push({
      id: makeId("ia"),
      category: "information-architecture",
      priority: "P0",
      title: "Kein H1-Heading vorhanden",
      description: "Die Seite hat keine H1-Überschrift. H1 ist essenziell für Orientierung und SEO.",
      fix: "Füge eine klare H1-Überschrift hinzu, die das Hauptthema der Seite beschreibt.",
    });
    quickWins.push("H1-Überschrift hinzufügen");
  } else if (h1s.length > 1) {
    score -= 15;
    issues.push({
      id: makeId("ia"),
      category: "information-architecture",
      priority: "P1",
      title: `Mehrere H1-Headings (${h1s.length}×)`,
      description: "Mehrere H1s verwirren Nutzer und Suchmaschinen.",
      fix: "Behalte nur eine H1-Überschrift. Andere zu H2 herabstufen.",
      count: h1s.length,
    });
    quickWins.push("Auf eine H1 reduzieren");
  }

  // Heading hierarchy check
  const levels = crawl.headings.map((h) => h.level);
  let hierarchyBroken = false;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      hierarchyBroken = true;
      break;
    }
  }
  if (hierarchyBroken) {
    score -= 15;
    issues.push({
      id: makeId("ia"),
      category: "information-architecture",
      priority: "P1",
      title: "Heading-Hierarchie fehlerhaft (Sprünge)",
      description: "Überschriften springen z.B. von H2 auf H4. Das stört Screenreader und Orientierung.",
      fix: "Überschriften lückenlos von H1 → H2 → H3 strukturieren.",
    });
    quickWins.push("Heading-Hierarchie korrigieren");
  }

  if (crawl.navigation.length === 0) {
    score -= 20;
    issues.push({
      id: makeId("ia"),
      category: "information-architecture",
      priority: "P1",
      title: "Keine erkennbare Navigation",
      description: "Es wurde kein <nav>-Element oder role='navigation' gefunden.",
      fix: "Navigationsleiste in einem <nav>-Element kapseln.",
    });
    quickWins.push("<nav>-Element ergänzen");
  }

  if (!crawl.hasSkipLink) {
    score -= 10;
    issues.push({
      id: makeId("ia"),
      category: "information-architecture",
      priority: "P2",
      title: "Kein Skip-to-Content-Link",
      description: "Tastaturnutzer müssen die gesamte Navigation durchlaufen, um zum Inhalt zu gelangen.",
      fix: 'Skip-Link am Anfang des <body> ergänzen: <a href="#main-content">Zum Inhalt springen</a>',
    });
  }

  if (crawl.headings.length < 3 && crawl.htmlSizeBytes > 20000) {
    score -= 10;
    issues.push({
      id: makeId("ia"),
      category: "information-architecture",
      priority: "P2",
      title: "Wenig Strukturierung durch Überschriften",
      description: `Nur ${crawl.headings.length} Überschriften auf einer ${Math.round(crawl.htmlSizeBytes / 1024)} KB Seite.`,
      fix: "Inhalte mit Überschriften (H2, H3) gliedern für bessere Scannbarkeit.",
    });
    quickWins.push("Mehr Zwischenüberschriften einsetzen");
  }

  return { score: clamp(score), issues, quickWins };
}

// ─── Interaction & Conversion ─────────────────────────────────────────────────

function analyzeInteraction(crawl: CrawlResult): { score: number; issues: Issue[]; quickWins: string[] } {
  const issues: Issue[] = [];
  const quickWins: string[] = [];
  let score = 100;

  const ctaKeywords = ["jetzt", "kaufen", "bestellen", "kontakt", "anmelden", "registrieren",
    "starten", "demo", "testen", "buchen", "herunterladen", "download", "get started",
    "sign up", "contact", "buy", "order", "try", "book", "learn more"];

  const buttons = crawl.links.filter((l) => {
    const lower = l.text.toLowerCase();
    return ctaKeywords.some((k) => lower.includes(k));
  });

  if (buttons.length === 0 && crawl.forms.length === 0) {
    score -= 25;
    issues.push({
      id: makeId("int"),
      category: "interaction",
      priority: "P1",
      title: "Kein eindeutiger Call-to-Action sichtbar",
      description: "Keine CTA-Schaltflächen oder -Links gefunden. Nutzer wissen nicht, was sie tun sollen.",
      fix: "Klaren primären CTA prominent platzieren (z.B. 'Jetzt kontaktieren', 'Kostenlos testen').",
    });
    quickWins.push("Primären CTA hinzufügen");
  }

  let unlabeledInputCount = 0;
  for (const form of crawl.forms) {
    for (const input of form.inputs) {
      if (
        input.type !== "hidden" &&
        input.type !== "submit" &&
        input.type !== "button" &&
        !input.label &&
        !input.placeholder
      ) {
        unlabeledInputCount++;
      }
    }
  }
  if (unlabeledInputCount > 0) {
    score -= Math.min(30, unlabeledInputCount * 10);
    issues.push({
      id: makeId("int"),
      category: "interaction",
      priority: "P1",
      title: `${unlabeledInputCount} Formularfelder ohne Label oder Platzhalter`,
      description: "Formularfelder ohne Beschriftung sind schwer verständlich und nicht zugänglich.",
      fix: "Jedem Eingabefeld ein sichtbares <label> oder einen aria-label-Wert geben.",
      count: unlabeledInputCount,
    });
    quickWins.push("Formular-Labels ergänzen");
  }

  if (crawl.forms.length > 0) {
    const longForms = crawl.forms.filter((f) => f.inputs.filter((i) => i.type !== "hidden").length > 7);
    if (longForms.length > 0) {
      score -= 15;
      issues.push({
        id: makeId("int"),
        category: "interaction",
        priority: "P2",
        title: `${longForms.length} mehrspaltige/lange Formulare`,
        description: "Formulare mit >7 Feldern erhöhen die Abbruchrate erheblich.",
        fix: "Formulare auf das Wesentliche reduzieren oder in Schritte aufteilen (Wizard).",
        count: longForms.length,
      });
    }
  }

  return { score: clamp(score), issues, quickWins };
}

// ─── Readability ───────────────────────────────────────────────────────────────

function analyzeReadability(crawl: CrawlResult): { score: number; issues: Issue[]; quickWins: string[] } {
  const issues: Issue[] = [];
  const quickWins: string[] = [];
  let score = 100;

  // Count headings in content area (non-nav)
  const contentHeadingsRatio =
    crawl.headings.length > 0 ? 1 : 0;
  if (contentHeadingsRatio === 0) {
    score -= 20;
    issues.push({
      id: makeId("read"),
      category: "readability",
      priority: "P1",
      title: "Keine Überschriften im Inhaltsbereich",
      description: "Langer Text ohne Überschriften ist schwer zu scannen.",
      fix: "Inhalte mit H2/H3-Überschriften untergliedern.",
    });
    quickWins.push("Zwischenüberschriften hinzufügen");
  }

  // Check paragraph headings ratio
  if (crawl.headings.length < 2 && crawl.htmlSizeBytes > 30000) {
    score -= 15;
    issues.push({
      id: makeId("read"),
      category: "readability",
      priority: "P2",
      title: "Zu wenig Strukturierung für die Seitengröße",
      description: `${crawl.headings.length} Überschriften für ${Math.round(crawl.htmlSizeBytes / 1024)} KB Inhalt.`,
      fix: "Textblöcke in Sektionen mit Überschriften aufteilen.",
    });
  }

  // Check lists usage
  // We can roughly check if there's structured content
  if (crawl.htmlSizeBytes > 50000 && crawl.headings.length < 5) {
    score -= 10;
    quickWins.push("Listen und Zwischenüberschriften zur Scannbarkeit nutzen");
  }

  // No lang attribute affects readability of screen readers
  if (!crawl.hasLangAttribute) {
    score -= 10;
    issues.push({
      id: makeId("read"),
      category: "readability",
      priority: "P2",
      title: "Fehlendes lang-Attribut am <html>-Element",
      description: "Ohne lang-Attribut können Screenreader die Sprache nicht korrekt erkennen.",
      fix: 'lang="de" (oder zutreffende Sprache) zum <html>-Tag hinzufügen.',
    });
  }

  return { score: clamp(score), issues, quickWins };
}

// ─── Accessibility ─────────────────────────────────────────────────────────────

function analyzeAccessibility(crawl: CrawlResult): { score: number; issues: Issue[]; quickWins: string[] } {
  const issues: Issue[] = [];
  const quickWins: string[] = [];
  let score = 100;

  // Images without alt
  const imagesWithoutAlt = crawl.images.filter((img) => img.alt === null);
  if (imagesWithoutAlt.length > 0) {
    const penalty = Math.min(40, imagesWithoutAlt.length * 8);
    score -= penalty;
    issues.push({
      id: makeId("a11y"),
      category: "accessibility",
      priority: imagesWithoutAlt.length > 3 ? "P0" : "P1",
      title: `${imagesWithoutAlt.length} Bild(er) ohne Alt-Text`,
      description: "Bilder ohne alt-Attribut sind für Screenreader-Nutzer nicht zugänglich.",
      fix: 'alt-Attribut für alle <img>-Elemente ergänzen. Dekorative Bilder: alt="".',
      count: imagesWithoutAlt.length,
    });
    quickWins.push("Alt-Texte für alle Bilder ergänzen");
  }

  // Form inputs without labels
  let unlabeledCount = 0;
  for (const form of crawl.forms) {
    for (const input of form.inputs) {
      if (
        input.type !== "hidden" &&
        input.type !== "submit" &&
        input.type !== "button" &&
        !input.label
      ) {
        unlabeledCount++;
      }
    }
  }
  if (unlabeledCount > 0) {
    score -= Math.min(35, unlabeledCount * 10);
    issues.push({
      id: makeId("a11y"),
      category: "accessibility",
      priority: "P0",
      title: `${unlabeledCount} Formulareingaben ohne <label>`,
      description: "Nicht beschriftete Felder sind für Screenreader-Nutzer unzugänglich.",
      fix: "Jedem input/textarea/select ein verknüpftes <label for='...'> geben.",
      count: unlabeledCount,
    });
  }

  if (!crawl.hasLangAttribute) {
    score -= 15;
    issues.push({
      id: makeId("a11y"),
      category: "accessibility",
      priority: "P1",
      title: 'Fehlendes lang-Attribut am <html>',
      description: "Screenreader benötigen das lang-Attribut für korrekte Aussprache.",
      fix: '<html lang="de"> (oder Landescode der Seite)',
    });
    quickWins.push('lang-Attribut am <html>-Tag ergänzen');
  }

  if (!crawl.hasSkipLink) {
    score -= 10;
    issues.push({
      id: makeId("a11y"),
      category: "accessibility",
      priority: "P1",
      title: "Kein Skip-Link für Tastaturnavigation",
      description: "Tastaturnutzer müssen die komplette Navigation ohne Abkürzung durchlaufen.",
      fix: 'Erstes Element im <body>: <a class="skip-link" href="#main-content">Zum Inhalt springen</a>',
    });
  }

  // Check heading order
  const levels = crawl.headings.map((h) => h.level);
  let badOrder = false;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      badOrder = true;
      break;
    }
  }
  if (badOrder) {
    score -= 15;
    issues.push({
      id: makeId("a11y"),
      category: "accessibility",
      priority: "P1",
      title: "Übersprungene Heading-Ebenen",
      description: "Zwischen Überschriftsebenen wird gesprungen (z.B. H2 → H4). Verletzt WCAG 1.3.1.",
      fix: "Lückenlose Heading-Hierarchie herstellen (H1 → H2 → H3, keine Sprünge).",
    });
  }

  return { score: clamp(score), issues, quickWins };
}

// ─── Responsiveness ───────────────────────────────────────────────────────────

function analyzeResponsiveness(crawl: CrawlResult): { score: number; issues: Issue[]; quickWins: string[] } {
  const issues: Issue[] = [];
  const quickWins: string[] = [];
  let score = 100;

  if (!crawl.hasViewportMeta) {
    score -= 50;
    issues.push({
      id: makeId("resp"),
      category: "responsiveness",
      priority: "P0",
      title: "Kritisch: Kein Viewport-Meta-Tag",
      description: "Ohne viewport-Tag wird die Seite auf Mobilgeräten nicht korrekt skaliert.",
      fix: '<meta name="viewport" content="width=device-width, initial-scale=1"> im <head> ergänzen.',
    });
    quickWins.push("Viewport-Meta-Tag hinzufügen (kritisch!)");
  }

  // Check for media queries in inline CSS
  const hasMediaQueries = crawl.inlineCssBlocks.some((css) =>
    /@media\s/.test(css)
  );
  if (!hasMediaQueries && crawl.cssFiles.length === 0) {
    score -= 20;
    issues.push({
      id: makeId("resp"),
      category: "responsiveness",
      priority: "P1",
      title: "Keine Media Queries gefunden (Inline-CSS)",
      description: "Kein responsives Styling erkennbar. Die Seite könnte auf Mobilgeräten schlecht aussehen.",
      fix: "Media Queries für mindestens 768px und 480px Breakpoints hinzufügen.",
    });
    quickWins.push("Media Queries für Mobile ergänzen");
  }

  return { score: clamp(score), issues, quickWins };
}

// ─── Performance ──────────────────────────────────────────────────────────────

function analyzePerformance(crawl: CrawlResult): { score: number; issues: Issue[]; quickWins: string[] } {
  const issues: Issue[] = [];
  const quickWins: string[] = [];
  let score = 100;

  const htmlKB = crawl.htmlSizeBytes / 1024;

  if (htmlKB > 500) {
    score -= 40;
    issues.push({
      id: makeId("perf"),
      category: "performance",
      priority: "P0",
      title: `Sehr großes HTML-Dokument (${Math.round(htmlKB)} KB)`,
      description: "Große HTML-Dateien verlangsamen den ersten Seitenaufruf erheblich.",
      fix: "Unnötige Inline-Styles/Scripts auslagern, HTML komprimieren (gzip/brotli).",
    });
  } else if (htmlKB > 200) {
    score -= 20;
    issues.push({
      id: makeId("perf"),
      category: "performance",
      priority: "P1",
      title: `Großes HTML-Dokument (${Math.round(htmlKB)} KB)`,
      description: "Das HTML ist größer als empfohlen. Komprimierung aktivieren.",
      fix: "Server-seitige Komprimierung aktivieren, nicht genutztes HTML entfernen.",
    });
    quickWins.push("HTML-Komprimierung (gzip/brotli) aktivieren");
  }

  if (crawl.images.length > 50) {
    score -= 20;
    issues.push({
      id: makeId("perf"),
      category: "performance",
      priority: "P1",
      title: `Viele Bilder auf der Seite (${crawl.images.length})`,
      description: "Zu viele Bilder verlangsamen den Seitenaufbau signifikant.",
      fix: "Lazy Loading für alle Bilder unterhalb the fold aktivieren: loading='lazy'.",
      count: crawl.images.length,
    });
    quickWins.push("Lazy Loading für Bilder aktivieren");
  }

  if (crawl.scriptCount > 20) {
    score -= 15;
    issues.push({
      id: makeId("perf"),
      category: "performance",
      priority: "P2",
      title: `Viele Script-Tags (${crawl.scriptCount})`,
      description: "Zu viele Scripts blockieren das Rendering und verlangsamen die Seite.",
      fix: "Scripts zusammenfassen, async/defer verwenden, nicht benötigte Scripts entfernen.",
      count: crawl.scriptCount,
    });
  }

  if (crawl.loadTimeMs > 5000) {
    score -= 15;
    issues.push({
      id: makeId("perf"),
      category: "performance",
      priority: "P1",
      title: `Langsame Ladezeit (${(crawl.loadTimeMs / 1000).toFixed(1)}s)`,
      description: "Die Seite hat länger als 5 Sekunden zum Laden gebraucht.",
      fix: "Server-Performance prüfen, CDN einsetzen, statische Assets cachen.",
    });
    quickWins.push("Server-Ladezeiten optimieren");
  }

  return { score: clamp(score), issues, quickWins };
}

// ─── SEO ──────────────────────────────────────────────────────────────────────

function analyzeSEO(crawl: CrawlResult): { score: number; issues: Issue[]; quickWins: string[] } {
  const issues: Issue[] = [];
  const quickWins: string[] = [];
  let score = 100;

  if (!crawl.title) {
    score -= 30;
    issues.push({
      id: makeId("seo"),
      category: "seo",
      priority: "P0",
      title: "Kein <title>-Tag",
      description: "Fehlender Seitentitel verhindert korrekte Darstellung in Suchergebnissen.",
      fix: "Aussagekräftigen <title> (50-60 Zeichen) in den <head> einfügen.",
    });
    quickWins.push("Seitentitel (<title>) ergänzen");
  } else if (crawl.title.length < 20 || crawl.title.length > 65) {
    score -= 10;
    issues.push({
      id: makeId("seo"),
      category: "seo",
      priority: "P2",
      title: `Seitentitel Länge ungünstig (${crawl.title.length} Zeichen)`,
      description: "Optimale Titellänge: 50-60 Zeichen für beste Darstellung in Suchergebnissen.",
      fix: "Seitentitel auf 50-60 Zeichen anpassen.",
    });
  }

  if (!crawl.metaDescription) {
    score -= 25;
    issues.push({
      id: makeId("seo"),
      category: "seo",
      priority: "P0",
      title: "Keine Meta-Description",
      description: "Ohne Meta-Description generiert Google eigene Snippets, oft suboptimal.",
      fix: "Meta-Description mit 120-160 Zeichen ergänzen: <meta name='description' content='...'>",
    });
    quickWins.push("Meta-Description ergänzen");
  }

  if (crawl.headings.filter((h) => h.level === 1).length === 0) {
    score -= 15;
    // H1 issue already reported in IA, skip duplicate
  }

  if (!crawl.canonicalUrl) {
    score -= 15;
    issues.push({
      id: makeId("seo"),
      category: "seo",
      priority: "P1",
      title: "Kein Canonical-Link",
      description: "Ohne canonical-Tag können Duplicate-Content-Probleme entstehen.",
      fix: '<link rel="canonical" href="https://example.com/page"> im <head> ergänzen.',
    });
    quickWins.push("Canonical-Link-Tag hinzufügen");
  }

  const ogTagCount = Object.keys(crawl.ogTags).length;
  if (ogTagCount < 3) {
    score -= 10;
    issues.push({
      id: makeId("seo"),
      category: "seo",
      priority: "P2",
      title: "Wenige Open Graph Tags",
      description: `Nur ${ogTagCount} OG-Tags gefunden. Für Social Sharing werden og:title, og:description, og:image benötigt.`,
      fix: 'og:title, og:description, og:image und og:url ergänzen.',
      count: ogTagCount,
    });
  }

  return { score: clamp(score), issues, quickWins };
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<AnalysisCategory, string> = {
  "information-architecture": "Informationsarchitektur & Orientierung",
  interaction: "Interaktion & Conversion-Reibung",
  readability: "Lesbarkeit & Content-Scannability",
  accessibility: "Accessibility-Basics",
  responsiveness: "Responsiveness & Mobile UX",
  performance: "Performance-Indikatoren",
  seo: "SEO-Basics",
};

export function analyzePage(crawl: CrawlResult): AnalysisResult {
  issueCounter = 0; // reset per analysis

  const ia = analyzeIA(crawl);
  const interaction = analyzeInteraction(crawl);
  const readability = analyzeReadability(crawl);
  const accessibility = analyzeAccessibility(crawl);
  const responsiveness = analyzeResponsiveness(crawl);
  const performance = analyzePerformance(crawl);
  const seo = analyzeSEO(crawl);

  const scores: Record<AnalysisCategory, number> = {
    "information-architecture": ia.score,
    interaction: interaction.score,
    readability: readability.score,
    accessibility: accessibility.score,
    responsiveness: responsiveness.score,
    performance: performance.score,
    seo: seo.score,
  };

  const overallScore = clamp(
    Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 7)
  );

  const allIssues: Issue[] = [
    ...ia.issues,
    ...interaction.issues,
    ...readability.issues,
    ...accessibility.issues,
    ...responsiveness.issues,
    ...performance.issues,
    ...seo.issues,
  ];

  const priorityOrder: Record<IssuePriority, number> = { P0: 0, P1: 1, P2: 2 };
  const sortedIssues = [...allIssues].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const categories: CategoryScore[] = (Object.keys(scores) as AnalysisCategory[]).map((cat) => {
    const catIssues = allIssues.filter((i) => i.category === cat);
    const quickWinsMap: Record<AnalysisCategory, string[]> = {
      "information-architecture": ia.quickWins,
      interaction: interaction.quickWins,
      readability: readability.quickWins,
      accessibility: accessibility.quickWins,
      responsiveness: responsiveness.quickWins,
      performance: performance.quickWins,
      seo: seo.quickWins,
    };
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      score: scores[cat],
      description: catIssues.length === 0
        ? "Keine kritischen Probleme gefunden."
        : `${catIssues.length} Problem(e) identifiziert.`,
      quickWins: quickWinsMap[cat],
    };
  });

  const overallRecommendations = sortedIssues.slice(0, 5).map((i) => i.fix);

  return {
    url: crawl.url,
    analyzedAt: new Date().toISOString(),
    scores,
    overallScore,
    categories,
    issues: allIssues,
    topIssues: sortedIssues.slice(0, 10),
    recommendations: overallRecommendations,
  };
}

// ─── Markdown Report ──────────────────────────────────────────────────────────

const priorityEmoji: Record<IssuePriority, string> = {
  P0: "🔴",
  P1: "🟡",
  P2: "🔵",
};

export function generateMarkdownReport(analysis: AnalysisResult, url: string): string {
  const lines: string[] = [];

  lines.push(`# UX-Analyse: ${url}`);
  lines.push("");
  lines.push(`**Datum:** ${new Date(analysis.analyzedAt).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })}`);
  lines.push(`**URL:** ${url}`);
  lines.push(`**Gesamtscore:** ${analysis.overallScore}/100`);
  lines.push("");

  lines.push("## Kategorie-Scores");
  lines.push("");
  lines.push("| Kategorie | Score |");
  lines.push("|-----------|-------|");
  for (const cat of analysis.categories) {
    const bar = "█".repeat(Math.round(cat.score / 10)) + "░".repeat(10 - Math.round(cat.score / 10));
    lines.push(`| ${cat.label} | ${cat.score}/100 ${bar} |`);
  }
  lines.push(`| **Gesamt** | **${analysis.overallScore}/100** |`);
  lines.push("");

  lines.push("## Top Issues");
  lines.push("");
  for (const issue of analysis.topIssues) {
    lines.push(`### ${priorityEmoji[issue.priority]} [${issue.priority}] ${issue.title}`);
    lines.push(`**Kategorie:** ${CATEGORY_LABELS[issue.category]}`);
    lines.push(`**Problem:** ${issue.description}`);
    lines.push(`**Empfehlung:** ${issue.fix}`);
    lines.push("");
  }

  if (analysis.recommendations.length > 0) {
    lines.push("## Quick Wins");
    lines.push("");
    for (const rec of analysis.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
