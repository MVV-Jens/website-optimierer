---
description: "Use when adding new pages, routes, components, or restructuring the app. Covers directory structure, data flow, and module boundaries of the Website-Optimierer."
applyTo: "src/**"
---

# Architektur-Anforderungen

## Verzeichnisstruktur (nicht verschieben ohne Grund)

```
src/
├── app/
│   ├── page.tsx                  Home (URL-Eingabe)
│   ├── creations/
│   │   ├── page.tsx              Kreationen-Liste (Client Component)
│   │   └── [id]/page.tsx         Detail-Page: Tabs Analyse | Redesign | Style Lock
│   └── api/
│       ├── analyze/route.ts      POST – Analyse starten, Pipeline-Trigger
│       └── creations/
│           ├── route.ts          GET (Liste)
│           └── [id]/
│               ├── route.ts      GET (Detail) + DELETE
│               ├── download/     GET – ZIP-Download
│               └── preview/      GET – sandboxed HTML-Preview
├── components/
│   ├── ui/                       shadcn/ui Basiskomponenten (nicht direkt bearbeiten)
│   ├── UrlForm.tsx               Client Component, URL-Validierung
│   ├── StatusBadge.tsx           Rein darstellend
│   ├── ScoreOverview.tsx         Kategorie-Scores anzeigen
│   ├── IssueList.tsx             P0/P1/P2-Issues anzeigen
│   ├── RedesignPreview.tsx       Sandboxed iframe
│   ├── RedesignInfo.tsx          ChangeList + IAOutlineView
│   └── CreationCard.tsx          Eintrag in der Kreationen-Liste
├── lib/
│   ├── crawler.ts                fetch + cheerio, gibt CrawlResult zurück
│   ├── analyzer.ts               Rein funktional: CrawlResult → AnalysisResult
│   ├── styleLock.ts              CSS-Fetching + Token-Extraktion → StyleLock
│   ├── redesigner.ts             cheerio-Transformationen → RedesignResult
│   ├── zipExport.ts              RedesignResult + Analysis → ZIP-Buffer
│   ├── pipeline.ts               Orchestrierung (DB-Updates + alle Schritte)
│   ├── robots.ts                 robots.txt-Check (blockierend bei Verbot)
│   ├── storage.ts                Dateisystem-Hilfsfunktionen (kein direktes fs außerhalb)
│   └── prisma.ts                 Singleton Prisma-Client
└── types/index.ts                Alle TypeScript-Typen (SINGLE SOURCE OF TRUTH)
```

## Datenfluss

```
POST /api/analyze
  → Creation in DB anlegen (status: ANALYZING)
  → setImmediate: pipeline.ts starten (non-blocking)
  → 201 mit {id, status} zurückgeben

pipeline.ts:
  1. robots.ts: checkRobots(url)
  2. crawler.ts: crawlPage(url) → CrawlResult
  3. analyzer.ts: analyzePage(crawl) → AnalysisResult
  4. styleLock.ts: extractStyleLock(crawl) → StyleLock
  5. DB: analysisJson, styleLockJson speichern
  6. DB: status → DESIGNING
  7. redesigner.ts: generateRedesign(...) → RedesignResult
  8. storage.ts: HTML + CSS schreiben
  9. zipExport.ts: createRedesignZip(...) → Buffer
  10. storage.ts: ZIP schreiben
  11. DB: status → DONE, alle Pfade speichern
  Bei Fehler: DB: status → ERROR, errorMessage speichern
```

## Modulregeln

- **Kein Prisma-Import außerhalb von** `lib/prisma.ts`, `lib/pipeline.ts` und API-Routes
- **Kein `fs`-Import außerhalb von** `lib/storage.ts`
- **`lib/analyzer.ts` ist rein funktional** – keine Seiteneffekte, kein I/O
- **`lib/redesigner.ts` ist rein funktional** – gibt HTML-String zurück, schreibt nichts
- **Alle Typen** in `src/types/index.ts` zentralisieren

## Next.js-Besonderheiten (v16 + Turbopack)

- App Router mit `async` Server Components und `"use client"` Client Components
- Route Handler Params sind `Promise<{id: string}>` → immer `await params`
- `serverExternalPackages` in `next.config.ts` für Node.js-Module (Prisma, fs)
- shadcn/ui v4 verwendet `@base-ui/react` statt Radix – kein `asChild` prop verfügbar
  → Stattdessen `buttonVariants()` direkt auf `<Link>` oder `<a>` anwenden
