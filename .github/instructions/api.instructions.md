---
description: "Use when adding new API endpoints, changing request/response formats, modifying API validation, or adding new query parameters. Covers all route handlers under src/app/api/."
applyTo: "src/app/api/**"
---

# API-Anforderungen

## Endpunkte-Übersicht

| Methode | Pfad | Zweck |
|---------|------|-------|
| `POST` | `/api/analyze` | Neue Kreation anlegen + Pipeline starten |
| `GET` | `/api/creations` | Paginierte Liste mit Suche + Sortierung |
| `GET` | `/api/creations/:id` | Detail einer Kreation inkl. Analysis + StyleLock |
| `DELETE` | `/api/creations/:id` | Kreation löschen (inkl. Cascade auf Assets in DB) |
| `GET` | `/api/creations/:id/download` | ZIP-Download als `application/zip` |
| `GET` | `/api/creations/:id/preview` | Redesign-HTML mit CSP-Header |

## POST /api/analyze – Request-Format

```typescript
{
  url: string;                   // Pflicht, muss http:// oder https:// sein
  optimizationFocus?: "all" | "navigation" | "form-ux" | "content-hierarchy" | "mobile";
  depth?: "conservative" | "moderate";
}
```

**Response 201:**
```json
{ "id": "uuid", "status": "ANALYZING" }
```

**Fehler-Responses:**
- `400` – Ungültige URL oder fehlende Felder
- `400` – Protokoll nicht http/https

## GET /api/creations – Query-Parameter

| Parameter | Typ | Standard | Beschreibung |
|-----------|-----|---------|--------------|
| `search` | string | `""` | Filtert nach URL (contains, case-insensitive) |
| `sort` | `"newest"` \| `"oldest"` | `"newest"` | Sortierung nach createdAt |
| `page` | number | `1` | 1-basierte Seitennummer |

**Response-Shape:**
```typescript
{
  items: CreationSummary[];  // overallScore kommt aus analysisJson.overallScore
  total: number;
  page: number;
  limit: 20;                 // Fix auf 20 pro Seite
}
```

## GET /api/creations/:id – Response-Shape

```typescript
{
  id, url, createdAt, status, optimizationFocus, depth, errorMessage,
  analysis: AnalysisResult | null,      // aus analysisJson
  styleLock: StyleLock | null,          // aus styleLockJson
  redesignChanges: RedesignChange[],    // leer wenn noch nicht fertig
  iaOutline: IAOutlineSection[],        // leer wenn noch nicht fertig
  hasRedesign: boolean,                 // !!creation.redesignHtml
  hasZip: boolean,                      // !!creation.redesignZipPath
  overallScore: number | undefined
}
```

## GET /api/creations/:id/preview – Sicherheitsanforderungen

**Pflicht-Header:**
```
Content-Security-Policy: default-src 'self' https: data:; script-src 'none'; style-src 'self' 'unsafe-inline' https:; img-src https: data: *; font-src https: data:;
X-Frame-Options: SAMEORIGIN
Content-Type: text/html; charset=utf-8
```

- `script-src 'none'` ist **nicht verhandelbar** (kein fremdes JavaScript ausführen)
- `X-Frame-Options: SAMEORIGIN` verhindert Einbettung in externe Seiten

## GET /api/creations/:id/download – Response-Anforderungen

```
Content-Type: application/zip
Content-Disposition: attachment; filename="ux-redesign-{hostname}.zip"
Content-Length: {bytes}
```

## Allgemeine Regeln

- Alle Route Handler prüfen `params` mit `await params` (Next.js 16 App Router)
- `404` wenn Kreation nicht gefunden
- Kein ungefiltertes Weiterreichen von DB-Fehlern an den Client
- JSON-Parse-Fehler bei `analysisJson`/`styleLockJson` werden mit `try/catch` abgefangen (kein 500er)
- Neue Felder in Responses → auch `src/types/index.ts` aktualisieren
