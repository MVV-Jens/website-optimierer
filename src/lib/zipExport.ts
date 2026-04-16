import JSZip from "jszip";
import type { RedesignResult, AnalysisResult, StyleLock } from "@/types";

export async function createRedesignZip(
  creationId: string,
  redesign: RedesignResult,
  analysis: AnalysisResult,
  styleLock: StyleLock,
  url: string
): Promise<Buffer> {
  const zip = new JSZip();

  // Main redesigned HTML
  zip.file("redesign/index.html", redesign.html);

  // UX improvements CSS (standalone)
  zip.file("redesign/ux-improvements.css", redesign.css);

  // Analysis report (Markdown)
  const reportMd = generateReportMarkdown(analysis, redesign, url);
  zip.file("report/analysis-report.md", reportMd);

  // Style lock JSON
  zip.file("report/style-lock.json", JSON.stringify(styleLock, null, 2));

  // Changes JSON
  zip.file(
    "report/changes.json",
    JSON.stringify(
      {
        url,
        creationId,
        changeCount: redesign.changeCount,
        changes: redesign.changes,
        iaOutline: redesign.iaOutline,
      },
      null,
      2
    )
  );

  // Readme
  zip.file(
    "README.txt",
    `UX-Redesign Export
==================
URL: ${url}
Erstellt: ${new Date().toLocaleString("de-DE")}
Kreation-ID: ${creationId}

Inhalt:
- redesign/index.html    Überarbeitete HTML-Seite
- redesign/ux-improvements.css   UX-CSS-Layer (nicht-destruktiv)
- report/analysis-report.md      Analyse-Report (Markdown)
- report/style-lock.json         Extrahierte Design-Tokens
- report/changes.json            Liste aller Änderungen

So nutzen Sie das Redesign:
1. Öffnen Sie redesign/index.html im Browser
2. Die Seite referenziert original CSS/Assets der Quelle
3. Implementieren Sie die empfohlenen Änderungen in Ihre Codebasis
4. Lesen Sie den Analyse-Report für priorisierte Maßnahmen
`
  );

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return buffer;
}

function generateReportMarkdown(
  analysis: AnalysisResult,
  redesign: RedesignResult,
  url: string
): string {
  const lines: string[] = [];

  lines.push(`# UX-Analyse & Redesign-Report`);
  lines.push(`**URL:** ${url}`);
  lines.push(
    `**Datum:** ${new Date().toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}`
  );
  lines.push(`**Gesamtscore:** ${analysis.overallScore}/100`);
  lines.push("");

  lines.push("## Kategorie-Scores");
  lines.push("");
  lines.push("| Kategorie | Score |");
  lines.push("|-----------|------:|");
  for (const cat of analysis.categories) {
    lines.push(`| ${cat.label} | ${cat.score}/100 |`);
  }
  lines.push(`| **Gesamtbewertung** | **${analysis.overallScore}/100** |`);
  lines.push("");

  lines.push("## Top Issues");
  lines.push("");
  const priority = { P0: "🔴 Kritisch", P1: "🟡 Wichtig", P2: "🔵 Nice-to-have" };
  for (const issue of analysis.topIssues) {
    lines.push(`### ${priority[issue.priority]}: ${issue.title}`);
    lines.push(`> ${issue.description}`);
    lines.push(`**Empfehlung:** ${issue.fix}`);
    lines.push("");
  }

  lines.push("## Durchgeführte UX-Verbesserungen im Redesign");
  lines.push("");
  lines.push("| Änderung | Vorher | Nachher | Wirkung |");
  lines.push("|----------|--------|---------|---------|");
  for (const ch of redesign.changes) {
    const impact = ch.impact === "high" ? "🔴 Hoch" : ch.impact === "medium" ? "🟡 Mittel" : "🔵 Niedrig";
    lines.push(`| ${ch.reason} | ${ch.before.slice(0, 60)} | ${ch.after.slice(0, 60)} | ${impact} |`);
  }
  lines.push("");

  lines.push("## IA-Outline (Seitenstruktur nach Redesign)");
  lines.push("");
  for (const section of redesign.iaOutline) {
    lines.push(`${section.order + 1}. **${section.name}** – ${section.purpose}`);
  }
  lines.push("");

  return lines.join("\n");
}
