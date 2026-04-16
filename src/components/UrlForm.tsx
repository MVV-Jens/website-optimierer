"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function UrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [focus, setFocus] = useState("all");
  const [depth, setDepth] = useState("moderate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Bitte eine URL eingeben.");
      return;
    }

    // Normalize URL
    let normalized = trimmed;
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }

    try {
      new URL(normalized);
    } catch {
      setError("Ungültige URL. Beispiel: https://example.com");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized, optimizationFocus: focus, depth }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Fehler beim Starten der Analyse.");
        return;
      }

      router.push(`/creations/${data.id}`);
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Neue UX-Analyse starten</CardTitle>
        <CardDescription>
          URL eingeben → Analyse läuft automatisch → UX-optimiertes Redesign wird generiert
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="url-input">Website-URL</Label>
            <Input
              id="url-input"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-required="true"
              aria-describedby={error ? "url-error" : undefined}
              className="text-base"
              autoFocus
            />
            {error && (
              <p id="url-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Nur öffentlich zugängliche Seiten (kein Login, keine Paywall).
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="focus-select">Optimierungsfokus</Label>
              <Select value={focus} onValueChange={(v) => { if (v !== null) setFocus(v); }}>
                <SelectTrigger id="focus-select">
                  <SelectValue placeholder="Fokus wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Bereiche</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="form-ux">Formular-UX</SelectItem>
                  <SelectItem value="content-hierarchy">Content-Hierarchie</SelectItem>
                  <SelectItem value="mobile">Mobile UX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="depth-select">Eingriffstiefe</Label>
              <Select value={depth} onValueChange={(v) => { if (v !== null) setDepth(v); }}>
                <SelectTrigger id="depth-select">
                  <SelectValue placeholder="Tiefe wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Konservativ (minimale Änderungen)</SelectItem>
                  <SelectItem value="moderate">Moderat (empfohlen)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full text-base"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                Analyse läuft…
              </>
            ) : (
              "Analyse starten →"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
