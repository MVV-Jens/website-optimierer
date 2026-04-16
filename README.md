# Website-Optimierer – UX-Analyse & Redesign

Eine produktionsnahe Web-App, die öffentlich zugängliche Websites nach 7 UX-Kategorien analysiert und ein optimiertes statisches Redesign generiert – ohne das bestehende Design zu verändern.

## Kernprinzip: „UX verbessern, Design bewahren"

Das Redesign verbessert Struktur, Zugänglichkeit und Usability der Seite, behält aber alle bestehenden Farben, Schriften und Design-Tokens bei.

---

## Features

- **URL-Analyse** – Crawlt öffentliche Seiten (robots.txt-Check, 15s Timeout, 5MB Limit)
- **7 Analysekategorien** – Informationsarchitektur, Interaktion, Lesbarkeit, Accessibility, Responsiveness, Performance, SEO
- **Style Lock** – Extrahiert Farben, Fonts, CSS-Variablen und Design-Tokens aus der Originalseite
- **UX-Redesign** – Generiert verbessertes HTML/CSS als nicht-destruktiven Layer auf dem Original
- **Live-Vorschau** – Sandboxed iframe mit Desktop/Mobile-Ansicht
- **ZIP-Export** – Redesign-HTML + CSS + Analyse-Report als Download
- **Kreationen-Historie** – Alle Analysen gespeichert, filterbar, durchsuchbar

---

## Tech-Stack

| Ebene | Technologie |
|-------|-------------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling App | Tailwind CSS v4 + shadcn/ui v4 |
| Datenbank | SQLite + Prisma v7 (@prisma/adapter-libsql) |
| HTML-Parser | cheerio v1 |
| ZIP-Export | jszip v3 |
| Storage | Lokales Dateisystem (`/storage/{creationId}/`) |

---

## Setup

### Voraussetzungen

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/MVV-Jens/website-optimierer
cd website-optimierer

# Dependencies installieren
npm install

# .env anlegen
cp .env.example .env
# DATABASE_URL="file:./prisma/dev.db" (Standard)

# Datenbank migrieren
npx prisma migrate deploy

# Prisma Client generieren
npx prisma generate

# Entwicklungsserver starten
npm run dev
```

App läuft auf: **http://localhost:3000**

### Umgebungsvariablen (`.env`)

```env
# Pflicht
DATABASE_URL="file:./prisma/dev.db"

# Optional
STORAGE_PATH="/pfad/zu/storage"   # Standard: ./storage im Projektstamm
```

---

## Verzeichnisstruktur

```
├── prisma/
│   ├── schema.prisma           Datenbankschema (Creation, Asset)
│   └── migrations/             Automatische Prisma-Migrationen
├── src/
│   ├── app/
│   │   ├── page.tsx            Home – URL-Eingabe
│   │   ├── creations/
│   │   │   ├── page.tsx        Kreationen-Liste
│   │   │   └── [id]/page.tsx   Detail: Tabs Analyse | Redesign | Style Lock
│   │   └── api/
│   │       ├── analyze/        POST – Analyse starten
│   │       └── creations/      GET – Liste & Detail; Download; Preview
│   ├── components/             UI-Komponenten
│   ├── lib/
│   │   ├── crawler.ts          fetch + cheerio Seiten-Crawler
│   │   ├── analyzer.ts         7-Kategorie UX-Analyse + Markdown-Report
│   │   ├── styleLock.ts        Design-Token-Extraktion
│   │   ├── redesigner.ts       HTML-Transformation (deterministische UX-Optimierungen)
│   │   ├── zipExport.ts        ZIP mit HTML + CSS + Report
│   │   ├── pipeline.ts         Orchestrierung des gesamten Prozesses
│   │   ├── robots.ts           robots.txt-Check
│   │   ├── storage.ts          Dateisystem-Hilfsfunktionen
│   │   └── prisma.ts           Prisma-Client mit libsql-Adapter
│   └── types/index.ts          TypeScript-Typen
└── storage/                    Laufzeit-Artefakte (gitignored)
    └── {creationId}/
        ├── redesign.html
        ├── ux-improvements.css
        └── redesign.zip
```

---

## API

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `POST` | `/api/analyze` | Neue Analyse starten. Body: `{url, optimizationFocus?, depth?}` |
| `GET` | `/api/creations` | Liste aller Kreationen. Query: `?search=&sort=&page=` |
| `GET` | `/api/creations/:id` | Detail einer Kreation |
| `DELETE` | `/api/creations/:id` | Kreation löschen |
| `GET` | `/api/creations/:id/download` | ZIP-Download |
| `GET` | `/api/creations/:id/preview` | Redesign-HTML (sandboxed) |

### Analyse starten

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","optimizationFocus":"all","depth":"moderate"}'
# → {"id":"uuid","status":"ANALYZING"}
```

Status pollen:
```bash
curl http://localhost:3000/api/creations/{id}
# → {..., "status":"DONE", "analysis":{...}, "styleLock":{...}}
```

---

## Analyse-Kategorien

| Kategorie | Was wird bewertet |
|-----------|-------------------|
| Informationsarchitektur | H1, Heading-Hierarchie, Navigation, Landmarks |
| Interaktion & Conversion | CTAs, Formular-UX, Labels, Klickpfade |
| Lesbarkeit | Überschriften-Dichte, Absätze, lang-Attribut |
| Accessibility | Alt-Texte, Labels, Heading-Order, Skip-Links, ARIA |
| Responsiveness | Viewport-Meta, Media Queries, Touch-Targets |
| Performance | HTML-Größe, Bild-Anzahl, Script-Count, Ladezeit |
| SEO | Title, Meta-Description, Canonical, OG-Tags |

Jede Kategorie erhält einen Score 0–100. P0/P1/P2-Issues werden priorisiert ausgegeben.

---

## Redesign-Transformationen

Die folgenden UX-Verbesserungen werden **nicht-destruktiv** als Layer eingefügt:

1. **lang-Attribut** am `<html>` ergänzen
2. **Viewport-Meta-Tag** hinzufügen
3. **Skip-Link** am Seitenanfang
4. **Heading-Hierarchie** korrigieren (keine Sprünge)
5. **Alt-Texte** für Bilder generieren
6. **ARIA-Labels** für unbeschriftete Formularfelder
7. **ARIA-Landmarks** (header, main, footer, nav)
8. **Formular-Verbesserungen** (autocomplete, required-Markierung)
9. **Lazy Loading** für Bilder
10. **UX-CSS-Layer** injizieren (Focus-Stile, Touch-Targets, Responsiveness, Skip-Link-CSS)

---

## Sicherheit

- robots.txt wird vor jeder Analyse geprüft
- Timeout: 15 Sekunden pro Anfrage
- Maximale HTML-Größe: 5 MB
- Preview in sandboxed `<iframe>` ohne JavaScript-Ausführung
- CSP-Header auf Preview-Route: `script-src 'none'`
- Keine Benutzerverwaltung, kein Auth

---

## Produktion / Deployment

```bash
npm run build
npm start
```

Für produktiven Einsatz:
- `DATABASE_URL` auf eine persistente SQLite-Datei setzen
- `STORAGE_PATH` auf ein persistentes Volume zeigen
- Optional: Upgrade auf PostgreSQL (nur `prisma.config.ts` + `schema.prisma` anpassen)

---

## Lizenz

MIT
