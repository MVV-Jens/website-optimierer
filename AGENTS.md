<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Website-Optimierer – Projektanforderungen

**Vor jeder Änderung gelten folgende Pflichtregeln.** Detaillierte Anforderungen sind in `.github/instructions/` dokumentiert.

## Kernprinzip (nicht verhandelbar)

> **„UX verbessern, Design bewahren"** – Das Redesign darf kein Rebranding sein. Farben, Fonts und Design-Tokens der Zielseite bleiben immer erhalten.

## Pflicht-Checkliste vor jeder Änderung

- [ ] Ändert diese Änderung das Style-Lock-Verhalten? → Sicherstellen, dass extrahierte Tokens unverändert ins Redesign fließen
- [ ] Werden neue API-Felder hinzugefügt? → DB-Migration + Typen in `src/types/index.ts` aktualisieren
- [ ] Wurde ein neuer Bibliotheks-Import ergänzt? → Prüfen ob `next.config.ts serverExternalPackages` angepasst werden muss
- [ ] Werden neue Seiten/Routen ergänzt? → Sicherstellen dass `<main id="main-content">` und Landmark-Rollen korrekt gesetzt sind
- [ ] Wird die Pipeline (`src/lib/pipeline.ts`) geändert? → Status-Übergänge `ANALYZING → DESIGNING → DONE | ERROR` beibehalten

## Anforderungsdokumentation

| Dokument | Inhalt |
|----------|--------|
| [architektur.instructions.md](.github/instructions/architektur.instructions.md) | App-Struktur, Datenfluss, Modulgrenzen |
| [pipeline.instructions.md](.github/instructions/pipeline.instructions.md) | Analyse-Pipeline, Status-Maschine, Fehlerbehandlung |
| [ux-prinzip.instructions.md](.github/instructions/ux-prinzip.instructions.md) | Style-Lock, Redesign-Regeln, Transformationen |
| [api.instructions.md](.github/instructions/api.instructions.md) | API-Verträge, Request/Response-Formate |
| [datenbank.instructions.md](.github/instructions/datenbank.instructions.md) | Prisma-Schema, Migrations-Konventionen |
| [sicherheit.instructions.md](.github/instructions/sicherheit.instructions.md) | Sicherheitsregeln, robots.txt, CSP, Sandbox |
| [ui.instructions.md](.github/instructions/ui.instructions.md) | Komponenten-Regeln, shadcn/ui, Accessibility |
