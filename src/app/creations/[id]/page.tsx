"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import ScoreOverview from "@/components/ScoreOverview";
import IssueList from "@/components/IssueList";
import RedesignAnnotatedPreview from "@/components/RedesignAnnotatedPreview";
import { ChangeList, IAOutlineView } from "@/components/RedesignInfo";
import type { CreationDetail } from "@/types";

const POLL_INTERVAL_MS = 3000;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const focusLabels: Record<string, string> = {
  all: "Alle Bereiche", navigation: "Navigation",
  "form-ux": "Formular-UX", "content-hierarchy": "Content-Hierarchie", mobile: "Mobile",
};

type Status = "ANALYZING" | "DESIGNING" | "DONE" | "ERROR";

export default function CreationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [creation, setCreation] = useState<CreationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchCreation = useCallback(async () => {
    const res = await fetch(`/api/creations/${params.id}`);
    if (res.status === 404) { setNotFound(true); return null; }
    if (!res.ok) return null;
    return (await res.json()) as CreationDetail;
  }, [params.id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const data = await fetchCreation();
      if (data) {
        setCreation(data);
        setLoading(false);
        if (data.status === "ANALYZING" || data.status === "DESIGNING") {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } else {
        setLoading(false);
      }
    }
    poll();
    return () => clearTimeout(timer);
  }, [fetchCreation]);

  async function handleDelete() {
    if (!confirm("Diese Kreation wirklich löschen?")) return;
    await fetch(`/api/creations/${params.id}`, { method: "DELETE" });
    router.push("/creations");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !creation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Kreation nicht gefunden</h1>
        <Link href="/creations" className={cn(buttonVariants({ variant: "outline" }))}>
          ← Zurück zur Liste
        </Link>
      </div>
    );
  }

  const isProcessing = creation.status === "ANALYZING" || creation.status === "DESIGNING";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <Link href="/creations" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}>
            ← Kreationen
          </Link>
          <h1 className="text-xl font-bold break-all">{creation.url}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <StatusBadge status={creation.status as Status} />
            <span>{formatDate(creation.createdAt)}</span>
            {creation.optimizationFocus && <span>Fokus: {focusLabels[creation.optimizationFocus] ?? creation.optimizationFocus}</span>}
            {creation.depth && <span>Tiefe: {creation.depth === "moderate" ? "Moderat" : "Konservativ"}</span>}
            {creation.overallScore !== undefined && <span className="font-semibold">Score: {creation.overallScore}/100</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {creation.hasZip && (
            <a href={`/api/creations/${creation.id}/download`} download className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              ↓ ZIP herunterladen
            </a>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>Löschen</Button>
        </div>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent shrink-0" />
            <div>
              <p className="font-medium text-blue-800 text-sm">
                {creation.status === "ANALYZING" ? "Seite wird analysiert…" : "Redesign wird generiert…"}
              </p>
              <p className="text-xs text-blue-600">Wird automatisch aktualisiert.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {creation.status === "ERROR" && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <p className="font-semibold text-destructive text-sm">Fehler beim Verarbeiten</p>
            <p className="text-sm text-muted-foreground mt-1">{creation.errorMessage}</p>
            <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}>
              Neue Analyse starten
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main content tabs */}
      {creation.analysis && (
        <Tabs defaultValue="analysis">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="analysis">📊 Analyse</TabsTrigger>
            <TabsTrigger value="redesign" disabled={!creation.hasRedesign}>🎨 Redesign</TabsTrigger>
            <TabsTrigger value="stylelock">🔒 Style Lock</TabsTrigger>
          </TabsList>

          {/* TAB 1: Analysis */}
          <TabsContent value="analysis" className="space-y-6 mt-4">
            <ScoreOverview analysis={creation.analysis} />
            <Separator />
            <section aria-labelledby="issues-title">
              <h2 id="issues-title" className="text-lg font-semibold mb-4">Top Issues ({creation.analysis.topIssues.length})</h2>
              <IssueList issues={creation.analysis.topIssues} />
            </section>
            {creation.analysis.recommendations.length > 0 && (
              <>
                <Separator />
                <section aria-labelledby="quickwins-title">
                  <h2 id="quickwins-title" className="text-lg font-semibold mb-3">Quick Wins</h2>
                  <ul className="space-y-2">
                    {creation.analysis.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </TabsContent>

          {/* TAB 2: Redesign */}
          <TabsContent value="redesign" className="space-y-6 mt-4">
            <section aria-labelledby="preview-title">
              <h2 id="preview-title" className="text-lg font-semibold mb-4">Vorschau mit Annotierungen</h2>
              <RedesignAnnotatedPreview
                creationId={creation.id}
                status={creation.status}
                changes={creation.redesignChanges ?? []}
              />
            </section>
            <Separator />
            <section aria-labelledby="ia-title">
              <h2 id="ia-title" className="text-lg font-semibold mb-4">IA-Outline (Seitenstruktur)</h2>
              <IAOutlineView outline={creation.iaOutline ?? []} />
            </section>
            <Separator />
            <section aria-labelledby="changes-title">
              <h2 id="changes-title" className="text-lg font-semibold mb-4">
                Durchgeführte Änderungen ({creation.redesignChanges?.length ?? 0})
              </h2>
              <ChangeList changes={creation.redesignChanges ?? []} />
            </section>
            {creation.hasZip && (
              <div className="flex gap-2 flex-wrap">
                <a href={`/api/creations/${creation.id}/download`} download className={cn(buttonVariants())}>
                  ↓ ZIP exportieren (HTML + CSS + Report)
                </a>
                <a href={`/api/creations/${creation.id}/preview`} target="_blank" rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }))}>
                  ↗ In neuem Tab öffnen
                </a>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: Style Lock */}
          <TabsContent value="stylelock" className="mt-4">
            {creation.styleLock ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Farben</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(creation.styleLock.colors).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded border shrink-0" style={{ background: val as string }} aria-label={`${key}: ${val}`} />
                          <span className="font-mono text-muted-foreground">{key}</span>
                          <span className="font-mono ml-auto">{val as string}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Typografie</CardTitle></CardHeader>
                    <CardContent>
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex gap-2"><dt className="text-muted-foreground w-24 shrink-0">Primär</dt><dd className="font-mono break-all">{creation.styleLock.typography.primaryFamily}</dd></div>
                        <div className="flex gap-2"><dt className="text-muted-foreground w-24 shrink-0">Line-Height</dt><dd className="font-mono">{creation.styleLock.typography.lineHeight}</dd></div>
                      </dl>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Layout</CardTitle></CardHeader>
                    <CardContent>
                      <dl className="space-y-1.5 text-xs">
                        {(Object.entries(creation.styleLock.layout) as [string, unknown][]).filter(([, v]) => !Array.isArray(v)).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <dt className="text-muted-foreground w-28 shrink-0">{k}</dt>
                            <dd className="font-mono break-all">{String(v)}</dd>
                          </div>
                        ))}
                        {(creation.styleLock.layout.breakpoints as string[]).length > 0 && (
                          <div className="flex gap-2">
                            <dt className="text-muted-foreground w-28 shrink-0">Breakpoints</dt>
                            <dd className="font-mono">{(creation.styleLock.layout.breakpoints as string[]).join(", ")}</dd>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                  {creation.styleLock.hasDesignTokens && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">CSS-Variablen</CardTitle></CardHeader>
                      <CardContent className="max-h-48 overflow-y-auto">
                        <dl className="space-y-1 text-xs">
                          {(Object.entries(creation.styleLock.cssVars as Record<string, string>)).slice(0, 20).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <dt className="font-mono text-muted-foreground truncate max-w-32">{k}</dt>
                              <dd className="font-mono ml-auto">{v}</dd>
                            </div>
                          ))}
                        </dl>
                      </CardContent>
                    </Card>
                  )}
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">Style Lock JSON anzeigen</summary>
                  <pre className="mt-2 rounded bg-muted p-4 text-xs overflow-auto max-h-96">
                    {JSON.stringify(creation.styleLock, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-muted-foreground">Style Lock noch nicht verfügbar.</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
