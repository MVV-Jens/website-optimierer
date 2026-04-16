---
description: "Use when changing the Prisma schema, adding new models or fields, creating migrations, or modifying database queries. Covers schema conventions and migration workflow."
applyTo: "prisma/**"
---

# Datenbank-Anforderungen

## Schema-Konventionen

### Modelle

| Modell | Zweck |
|--------|-------|
| `Creation` | Hauptentität – URL, Status, alle JSON-Blobs, Dateipfade |
| `Asset` | Dateiartefakte (html, css, zip) – Relation zu Creation |

### Pflichtfelder in `Creation`

```prisma
id                String   @id @default(uuid())
url               String
createdAt         DateTime @default(now())
updatedAt         DateTime @updatedAt
status            Status   @default(ANALYZING)
```

### Status-Enum (unveränderlich)

```prisma
enum Status {
  ANALYZING   // Crawl + Analyse läuft
  DESIGNING   // Redesign-Generierung läuft
  DONE        // Vollständig fertig
  ERROR       // Fehler aufgetreten (errorMessage enthält Details)
}
```

**Kein neuer Status ohne Pipeline-Anpassung.**

### JSON-Felder

Alle komplexen Daten werden als serialisiertes JSON in `String?`-Feldern gespeichert:

| Feld | Typ | Inhalt |
|------|-----|--------|
| `analysisJson` | `String?` | `AnalysisResult` |
| `styleLockJson` | `String?` | `StyleLock` |

Beim Lesen immer mit `try/catch JSON.parse()` absichern – nie unkritisch parsen.

### Dateipfad-Felder

| Feld | Beschreibung |
|------|-------------|
| `redesignHtml` | Absoluter Pfad zu `storage/{id}/redesign.html` |
| `redesignCss` | Absoluter Pfad zu `storage/{id}/ux-improvements.css` |
| `redesignZipPath` | Absoluter Pfad zu `storage/{id}/redesign.zip` |

## Migrations-Workflow

```bash
# 1. Schema ändern (prisma/schema.prisma)
# 2. Migration erstellen und anwenden
npx prisma migrate dev --name beschreibender-name

# 3. Client neu generieren
npx prisma generate

# 4. TypeScript-Typen in src/types/index.ts anpassen (wenn Felder hinzukommen)
```

**Niemals** `prisma db push` in Production verwenden – nur `migrate deploy`.

## Prisma-Client Konfiguration (Prisma v7)

Da Prisma v7 den alten Engine-Typ nicht mehr unterstützt, wird der `@prisma/adapter-libsql` verwendet:

```typescript
// src/lib/prisma.ts
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });
```

**`url` im `datasource db`-Block der schema.prisma ist in Prisma v7 verboten** – URL nur in `prisma.config.ts` und im Adapter konfigurieren.

## Cascading

`Asset` → `Creation` mit `onDelete: Cascade` – beim Löschen einer Kreation werden automatisch alle verknüpften Assets mitgelöscht.

Dateien im Dateisystem werden **nicht** automatisch gelöscht – das muss in der API-Route explizit ergänzt werden falls erforderlich.

## Query-Konventionen

- Selects immer auf benötigte Felder einschränken (kein `findUnique({ where: {id} })` ohne `select`)
- Große JSON-Blobs (`analysisJson`, `styleLockJson`) nur in Detail-Queries laden, nicht in Listen-Queries
- `createdAt` für Sortierung nutzen (Index automatisch durch Prisma)
