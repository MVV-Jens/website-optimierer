import { prisma } from "@/lib/prisma";
import { checkRobots } from "@/lib/robots";
import { crawlPage, CrawlError } from "@/lib/crawler";
import { analyzePage, generateMarkdownReport } from "@/lib/analyzer";
import { extractStyleLock } from "@/lib/styleLock";
import { generateRedesign } from "@/lib/redesigner";
import { createRedesignZip } from "@/lib/zipExport";
import { writeFile } from "@/lib/storage";
import type { AnalysisOptions } from "@/types";

async function setStatus(
  id: string,
  status: "ANALYZING" | "DESIGNING" | "DONE" | "ERROR",
  errorMessage?: string
) {
  await prisma.creation.update({
    where: { id },
    data: { status, ...(errorMessage ? { errorMessage } : {}) },
  });
}

export async function runPipeline(
  creationId: string,
  url: string,
  options: AnalysisOptions
): Promise<void> {
  try {
    // ── 1. Check robots.txt ────────────────────────────────────────────────
    await setStatus(creationId, "ANALYZING");

    const robotsCheck = await checkRobots(url);
    if (!robotsCheck.allowed) {
      throw new Error(robotsCheck.reason ?? "Zugriff durch robots.txt verweigert.");
    }

    // ── 2. Crawl page ───────────────────────────────────────────────────────
    const crawlResult = await crawlPage(url);

    // ── 3. Analyze ──────────────────────────────────────────────────────────
    const analysis = analyzePage(crawlResult);
    const analysisMarkdown = generateMarkdownReport(analysis, url);

    // ── 4. Extract Style Lock ───────────────────────────────────────────────
    const styleLock = await extractStyleLock(crawlResult);

    // Save analysis to DB
    await prisma.creation.update({
      where: { id: creationId },
      data: {
        analysisJson: JSON.stringify(analysis),
        analysisMarkdown,
        styleLockJson: JSON.stringify(styleLock),
      },
    });

    // ── 5. Generate Redesign ────────────────────────────────────────────────
    await setStatus(creationId, "DESIGNING");

    const redesign = generateRedesign(crawlResult, analysis, styleLock, options);

    // ── 6. Save HTML + CSS to filesystem ───────────────────────────────────
    const htmlPath = writeFile(creationId, "redesign.html", redesign.html);
    const cssPath = writeFile(creationId, "ux-improvements.css", redesign.css);

    // ── 7. Create ZIP ────────────────────────────────────────────────────────
    const zipBuffer = await createRedesignZip(
      creationId,
      redesign,
      analysis,
      styleLock,
      url
    );
    const zipPath = writeFile(creationId, "redesign.zip", zipBuffer);

    // ── 8. Persist everything ───────────────────────────────────────────────
    await prisma.creation.update({
      where: { id: creationId },
      data: {
        status: "DONE",
        redesignHtml: htmlPath,
        redesignCss: cssPath,
        redesignZipPath: zipPath,
        redesignChangesJson: JSON.stringify({
          changes: redesign.changes,
          iaOutline: redesign.iaOutline,
        }),
      },
    });

    // Save assets
    await prisma.asset.createMany({
      data: [
        { creationId, type: "html", filePath: htmlPath },
        { creationId, type: "css", filePath: cssPath },
        { creationId, type: "zip", filePath: zipPath },
      ],
    });
  } catch (err: unknown) {
    const message =
      err instanceof CrawlError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Unbekannter Fehler";

    await prisma.creation.update({
      where: { id: creationId },
      data: { status: "ERROR", errorMessage: message },
    }).catch(() => {});
  }
}
