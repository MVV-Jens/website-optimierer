---
description: "Use when changing the crawler, preview route, robots.txt handling, iframe sandbox, CSP headers, or any functionality that fetches or renders external content. Security is critical here."
applyTo: "src/lib/{crawler,robots}.ts"
---

# Sicherheits-Anforderungen

## robots.txt (nicht umgehen)

- robots.txt **muss** vor jedem Crawl geprüft werden
- Bei Verbot: Pipeline sofort mit `ERROR` + Hinweistext beenden
- Bei Netzwerkfehler beim robots.txt-Abruf: Crawl **erlauben** (fail-open)
- User-Agent für robots.txt: `"UX-Analyzer/1.0 (Analysis Tool)"`

## Crawl-Einschränkungen

| Limit | Wert | Verhalten |
|-------|------|-----------|
| Fetch-Timeout | 15 000 ms | `CrawlError("TIMEOUT")` |
| Max HTML-Größe | 5 MB | `CrawlError("SIZE_LIMIT")` |
| Erlaubte Protokolle | `http:`, `https:` | `CrawlError("INVALID_URL")` |

- Content-Type muss `text/html` oder `application/xhtml` enthalten
- HTTP-Fehler (4xx, 5xx) → `CrawlError("HTTP_ERROR")` mit Statuscode

## Fremde Script-Ausführung

- **Kein `eval()`**, kein `new Function()` mit fremdem Code
- **Keine `<script>`-Tags** im generierten Redesign hinzufügen
- Der UX-CSS-Layer (`<style id="ux-improvements">`) enthält **ausschließlich CSS**, kein JavaScript

## Preview-Sandbox (nicht abschwächen)

Der iframe in `RedesignPreview.tsx` muss immer haben:
```html
sandbox="allow-same-origin allow-forms allow-popups"
```

`allow-scripts` darf **nicht** hinzugefügt werden.

Der Preview-Route-Handler muss immer diese CSP zurückgeben:
```
script-src 'none'
```

Eine Abschwächung (z.B. `script-src 'self'`) ist nicht erlaubt.

## Input-Validierung

- URL-Validierung: `new URL(input)` + Protokoll-Check (`http:` / `https:`)
- Alle API-Felder mit bekannten Enums (optimizationFocus, depth) gegen Whitelist prüfen
- Keine SQL-Injections möglich durch Prisma ORM, aber keine rohen Queries verwenden

## Rate Limiting (TODO – noch nicht implementiert)

Für Produktion ist ein Rate-Limit auf `/api/analyze` erforderlich:
- Max. 5 Analysen pro IP pro Minute (empfohlen)
- Aktuell kein Rate Limit implementiert – bei öffentlichem Deployment nachrüsten

## Sicherheitsheader

Mindest-Response-Header für die Preview-Route:
```
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: default-src 'self' https: data:; script-src 'none'; ...
```

Für alle anderen API-Responses gelten Next.js-Standard-Sicherheitsheader.

## Keine Login-Umgehung

- Die App darf **keine Login-Formulare** automatisch ausfüllen oder Paywalls umgehen
- Seiten hinter Authentication (Login-Redirect, 401/403) werden mit `HTTP_ERROR` abgebrochen
