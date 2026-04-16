---
description: "Use when modifying the analysis pipeline, adding new analysis steps, changing status transitions, or handling crawler/analyzer errors. Covers the ANALYZING→DESIGNING→DONE|ERROR state machine."
applyTo: "src/lib/pipeline.ts"
---

# Pipeline-Anforderungen

## Status-Maschine (unveränderlich)

```
ANALYZING → (Crawl + Analyze + StyleLock fertig) → DESIGNING → (Redesign + ZIP fertig) → DONE
                        ↓ Fehler jederzeit ↓
                        ERROR (mit errorMessage)
```

**Verboten:** Direktsprung `ANALYZING → DONE` ohne Zwischenstatus DESIGNING.

## Schritte und Zuständigkeiten

| Schritt | Funktion | DB-Update |
|---------|----------|-----------|
| 1. Robots-Check | `checkRobots(url)` | – |
| 2. Crawl | `crawlPage(url)` | – |
| 3. Analyse | `analyzePage(crawl)` | – |
| 4. Markdown-Report | `generateMarkdownReport(analysis, url)` | – |
| 5. Style Lock | `extractStyleLock(crawl)` | analysisJson, styleLockJson, analysisMarkdown |
| 6. Status-Update | – | status → DESIGNING |
| 7. Redesign | `generateRedesign(crawl, analysis, styleLock, options)` | – |
| 8. Dateien schreiben | `writeFile(...)` × 3 | – |
| 9. ZIP | `createRedesignZip(...)` | – |
| 10. Abschluss | – | status → DONE, alle Pfade, Assets |

## Fehlerbehandlung

- **Jeder Fehler** wird in `catch` abgefangen und als `status: ERROR` + `errorMessage` gespeichert
- `CrawlError` mit `.code` unterscheidet: TIMEOUT, SIZE_LIMIT, HTTP_ERROR, INVALID_URL, NETWORK_ERROR
- Fehler beim DB-Update selbst (im catch) werden mit `.catch(() => {})` ignoriert (Deadlock-Prävention)
- **Kein Fehler darf unbehandelt in den Server-Crash führen**

## Timeouts & Limits

| Parameter | Wert |
|-----------|------|
| Fetch-Timeout | 15 000 ms |
| HTML-Max-Größe | 5 MB |
| CSS-Fetch-Timeout | 5 000 ms |
| CSS-Dateien max. | 3 (erste 3 aus cssFiles) |

## Hintergrund-Ausführung

- Die Pipeline läuft via `setImmediate()` nicht-blockierend
- Der API-Endpunkt gibt sofort `201 {id, status: "ANALYZING"}` zurück
- Der Client pollt alle 3 Sekunden `GET /api/creations/:id` bis `status === "DONE"` oder `"ERROR"`

## Asset-Persistenz

Nach DONE immer drei Assets in `prisma.asset` anlegen:

```typescript
{ creationId, type: "html",  filePath: htmlPath }
{ creationId, type: "css",   filePath: cssPath  }
{ creationId, type: "zip",   filePath: zipPath  }
```
