import Link from "next/link";
import UrlForm from "@/components/UrlForm";
import RecentCreationsList from "@/components/RecentCreationsList";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";

// Never statically prerender – requires DB access at runtime
export const dynamic = "force-dynamic";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import type { CreationSummary } from "@/types";

async function getRecentCreations(): Promise<CreationSummary[]> {
  const items = await prisma.creation.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      url: true,
      status: true,
      createdAt: true,
      optimizationFocus: true,
      depth: true,
      errorMessage: true,
      analysisJson: true,
    },
  });

  return items.map((c) => {
    let overallScore: number | undefined;
    if (c.analysisJson) {
      try {
        const parsed = JSON.parse(c.analysisJson) as { overallScore?: number };
        overallScore = parsed.overallScore;
      } catch {}
    }
    return {
      id: c.id,
      url: c.url,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      optimizationFocus: c.optimizationFocus ?? null,
      depth: c.depth ?? null,
      errorMessage: c.errorMessage ?? null,
      overallScore,
    };
  });
}

export default async function HomePage() {
  const recent = await getRecentCreations();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <section className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight">UX-Analyse &amp; Redesign</h1>
        <p className="text-lg text-muted-foreground">
          Gib eine URL ein – die App analysiert die Seite nach 7 UX-Kategorien
          und generiert ein optimiertes Redesign, das das bestehende Design vollständig beibehält.
        </p>
      </section>
      <div className="flex justify-center">
        <UrlForm />
      </div>
      <Separator />
      {recent.length > 0 && (
        <section aria-labelledby="recent-title">
          <div className="flex items-center justify-between mb-5">
            <h2 id="recent-title" className="text-xl font-semibold">Zuletzt erstellt</h2>
            <Link href="/creations" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Alle anzeigen →
            </Link>
          </div>
          <RecentCreationsList creations={recent} />
        </section>
      )}
      <Separator />
      <section aria-labelledby="features-title">
        <h2 id="features-title" className="text-xl font-semibold text-center mb-8">Was die App analysiert</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "🗂️", title: "Informationsarchitektur", desc: "Heading-Hierarchie, Navigation, Seitenstruktur, Orientierung" },
            { icon: "♿", title: "Accessibility", desc: "Alt-Texte, Form-Labels, Heading-Order, ARIA, Focus-States" },
            { icon: "🎯", title: "Interaktion & Conversion", desc: "CTA-Platzierung, Formular-UX, Klickpfade, Reibungspunkte" },
            { icon: "📖", title: "Lesbarkeit", desc: "Textstruktur, Zeilenlängen, Scannability, Absatzlänge" },
            { icon: "📱", title: "Responsiveness", desc: "Viewport-Meta, Media Queries, Touch-Targets, Mobile UX" },
            { icon: "⚡", title: "Performance", desc: "HTML-Größe, Bild-Optimierung, Script-Count, Ladezeit" },
            { icon: "🔍", title: "SEO-Basics", desc: "Title, Meta-Description, Canonical, Open Graph Tags" },
            { icon: "🎨", title: "Style-Lock", desc: "Farben, Fonts, Design-Tokens werden extrahiert und unverändernd weitergegeben" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-4 space-y-1 hover:shadow-sm transition-shadow">
              <div className="text-2xl" aria-hidden="true">{f.icon}</div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <Separator />
      <section className="max-w-2xl mx-auto space-y-4" aria-labelledby="principles-title">
        <h2 id="principles-title" className="text-xl font-semibold text-center">
          Kernprinzip: &ldquo;UX verbessern, Design bewahren&rdquo;
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <h3 className="font-semibold text-green-700">✅ Erlaubt (UX-Optimierung)</h3>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Informationshierarchie &amp; Sektionsreihenfolge</li>
              <li>Layout, Spacing, Grid verbessern</li>
              <li>Navigation &amp; Seitengliederung</li>
              <li>CTA-Platzierung &amp; -Priorisierung</li>
              <li>Textlesbarkeit (Absätze, Überschriften)</li>
              <li>Formulare (Labels, Fehlermeldungen)</li>
              <li>Accessibility (ARIA, Alt-Texte, Focus)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-red-700">❌ Nicht geändert</h3>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Farbpalette &amp; Primärfarben</li>
              <li>Schriften &amp; Typografie</li>
              <li>Corporate-Design-Tokens</li>
              <li>Icon-Stil &amp; Bildsprache</li>
              <li>Trend-Look (Glassmorphism etc.)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
