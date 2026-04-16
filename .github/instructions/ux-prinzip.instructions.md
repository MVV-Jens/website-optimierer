---
description: "Use when changing the redesigner, style lock extraction, adding new UX transformations, or modifying what the redesign output looks like. The Style-Lock principle is the most critical constraint in this project."
applyTo: "src/lib/{redesigner,styleLock,analyzer}.ts"
---

# UX-Prinzip: „UX verbessern, Design bewahren"

## Style-Lock (Pflichtmodul – nicht umgehen)

Vor jedem Redesign-Schritt muss `extractStyleLock()` das bestehende Design einfrieren.
Das Style-Lock-Objekt ist eine **harte Vorgabe** für das Redesign.

### Was extrahiert wird

| Token-Gruppe | Quelle |
|--------------|--------|
| Farben | CSS-Variablen (`--primary`, `--background`, etc.) + computed color values |
| Fonts | `font-family` aus CSS + `--font-*` CSS-Variablen |
| Border-Radius | `border-radius`-Regeln + `--radius` CSS-Variable |
| Box-Shadow | `box-shadow`-Regeln |
| Breakpoints | `@media (min/max-width: ...)` aus allen CSS-Quellen |
| CSS-Variablen | Alle `--*`-Variablen aus `:root` und globalen Selektoren |
| Max-Width | `max-width` auf Layout-Containern |

### Priorität der Quellen

1. CSS-Variablen (stärkste Quelle, da Design-Tokens)
2. Geladene externe CSS-Dateien (bis zu 3 Dateien)
3. Inline `<style>`-Blöcke
4. Fallback-Werte (nur wenn keine andere Quelle vorhanden)

## Erlaubte UX-Transformationen

Das Redesign darf **ausschließlich** diese Eingriffe vornehmen:

| Kategorie | Erlaubte Transformation |
|-----------|------------------------|
| Accessibility | lang-Attribut, Skip-Link, Alt-Texte, ARIA-Landmarks, Form-Labels, Heading-Hierarchie |
| Performance | `loading="lazy"` für Bilder, `fetchpriority="high"` für erstes Bild |
| Responsiveness | Viewport-Meta-Tag ergänzen |
| Formulare | `autocomplete`-Attribute, `required`-Markierung mit `*` |
| Semantik | `role`-Attribute auf nav/header/footer/main |
| CSS | Nicht-destruktiver UX-Layer als `<style id="ux-improvements">` am Ende von `<head>` |

## Verbotene Transformationen

- ❌ Keine neuen Farben einführen (nur Werte aus Style-Lock verwenden)
- ❌ Keine Schriften ersetzen (nur aus Style-Lock)
- ❌ Keine Layout-Strukturen entfernen oder grundlegend umbauen
- ❌ Keine Inhalte löschen (Text, Bilder, Abschnitte)
- ❌ Keinen Glassmorphism, Gradienten oder andere Trend-Stile hinzufügen
- ❌ Kein Inline-JavaScript hinzufügen (Security + CSP)
- ❌ Keine externen Script-Tags

## UX-CSS-Layer Regeln

Der injizierte CSS-Layer (`ux-improvements`) **muss**:

1. Alle Farbwerte als CSS-Variablen aus Style-Lock referenzieren: `var(--ux-primary, fallback)`
2. Ausschließlich additive Regeln enthalten (keine `!important`-Overrides außer für Accessibility-Basics)
3. Einen `@media (max-width: 768px)` Block für Mobile-Basics enthalten
4. Focus-Stile (`focus-visible`) für alle interaktiven Elemente definieren
5. Touch-Targets auf `min-height: 44px; min-width: 44px` setzen

## URL-Absolutifizierung

Alle relativen URLs (`/pfad` → `https://domain.com/pfad`) müssen im Redesign
auf absolute URLs umgeschrieben werden, damit das Preview korrekt funktioniert:

- `[src]` Attribute
- `[href]` Attribute (außer Anker `#`)
- `link[rel='stylesheet']`

## IA-Outline Pflicht

Jedes Redesign muss eine `IAOutlineSection[]` zurückgeben, die die erkannten
Sektionen der Seite (H2-basiert + Header/Footer) dokumentiert.

## Analyse-Score-Gewichtung

Alle 7 Kategorien fließen **gleich gewichtet** in den Gesamtscore ein (Ø der 7 Scores).
Score-Skala: 0–100 (ganzzahlig, geclampt).

Issue-Prioritäten:
- **P0** (Kritisch): Score-Abzug ≥ 20 Punkte, Accessibility-Blockaden, fehlende Grundstruktur
- **P1** (Wichtig): Score-Abzug 10–20 Punkte, spürbare UX-Einschränkungen
- **P2** (Nice-to-have): Score-Abzug < 10 Punkte, Verbesserungspotenzial
