---
description: "Use when creating new UI components, modifying existing components, adding new pages, or working with shadcn/ui. Covers component patterns, accessibility requirements, and the shadcn v4 API differences."
applyTo: "src/{app,components}/**"
---

# UI-Anforderungen

## shadcn/ui v4 Besonderheiten

Diese Version verwendet `@base-ui/react` statt Radix UI. Wichtige Unterschiede:

### `Button` – kein `asChild` prop

```typescript
// ❌ Falsch – asChild existiert nicht in shadcn v4
<Button asChild><Link href="/">Text</Link></Button>

// ✅ Richtig – buttonVariants auf Link/a anwenden
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

<Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>Text</Link>
<a href="/download" download className={cn(buttonVariants())}>Download</a>
```

### `Select` – onValueChange-Typing

```typescript
// ❌ Falsch – setState direkt übergeben schlägt fehl (null-Safety)
<Select onValueChange={setValue}>

// ✅ Richtig – null-Safety beachten
<Select onValueChange={(v) => { if (v !== null) setValue(v); }}>
```

## Accessibility-Pflichten für jede neue Seite/Komponente

1. **Landmark-Rollen** – `<header role="banner">`, `<main id="main-content">`, `<footer role="contentinfo">`, `<nav aria-label="...">`
2. **Heading-Hierarchie** – Nur eine `<h1>` pro Seite, lückenlose Reihenfolge H1 → H2 → H3
3. **Alle Formulare** – Jedes `<input>`, `<select>`, `<textarea>` braucht ein `<label for>` oder `aria-label`
4. **Alle Buttons** – Klarer, beschreibender Text; Icons brauchen `aria-label` oder `aria-hidden="true"` + sichtbarer Label
5. **Ladezustände** – `aria-busy="true"` auf ladenden Elementen, `role="alert"` für Fehlermeldungen
6. **Fokus-Management** – Focus-Ring niemals mit `outline: none` entfernen; `focus-visible` nutzen

## Komponenten-Konventionen

### Client Components

- `"use client"` nur wenn zwingend nötig (State, Event Handler, Browser APIs)
- Polling-Logik immer mit `clearTimeout` aufräumen (Memory Leak verhindern)
- Loading-States immer mit Spinner + `aria-live` oder `aria-busy` zugänglich machen

### Fehler-Darstellung

```typescript
// Fehlermeldungen immer mit role="alert"
{error && (
  <p role="alert" className="text-sm text-destructive">
    {error}
  </p>
)}
```

### Lade-Indikatoren

Standardmuster für Spinner:
```html
<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
     aria-hidden="true" />
```

Bei Buttons mit Ladezustand:
```typescript
<Button disabled={loading} aria-busy={loading}>
  {loading ? (
    <><span className="mr-2 animate-spin ..." aria-hidden /><span>Lädt…</span></>
  ) : "Aktion"}
</Button>
```

## Tailwind-Klassen-Konventionen

- shadcn Design Tokens (`bg-card`, `text-muted-foreground`, `border`, etc.) bevorzugen
- Inline-Farben (`text-red-600`) nur für spezifische Fehler/Erfolg-States, nicht für Branding
- Responsive Klassen immer: mobile-first (`sm:`, `lg:` Breakpoint-Suffixe)

## Seiten-Template

Jede neue Seite unter `src/app/` muss:

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
  <h1>Seitentitel</h1>
  {/* Inhalt */}
</div>
```

Das globale `<main id="main-content">` kommt aus `src/app/layout.tsx` – **nicht** auf Unterseiten duplizieren.
