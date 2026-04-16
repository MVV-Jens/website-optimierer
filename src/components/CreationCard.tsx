"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import type { CreationSummary } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

const focusLabels: Record<string, string> = {
  all: "Alle Bereiche",
  navigation: "Navigation",
  "form-ux": "Formular-UX",
  "content-hierarchy": "Content-Hierarchie",
  mobile: "Mobile",
};

interface Props {
  creation: CreationSummary;
  onDeleted?: (id: string) => void;
}

export default function CreationCard({ creation, onDeleted }: Props) {
  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Kreation für „${creation.url}" wirklich löschen?`)) return;
    const res = await fetch(`/api/creations/${creation.id}`, { method: "DELETE" });
    if (res.ok) onDeleted?.(creation.id);
  }

  return (
    <div className="group relative">
      <Link href={`/creations/${creation.id}`} className="block">
        <Card className="transition-shadow group-hover:shadow-md pr-10">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p
                className="text-sm font-medium truncate max-w-xs text-primary underline-offset-2 group-hover:underline"
                title={creation.url}
              >
                {creation.url}
              </p>
              <StatusBadge status={creation.status as "ANALYZING" | "DESIGNING" | "DONE" | "ERROR"} />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span>{formatDate(creation.createdAt)}</span>
              {creation.optimizationFocus && (
                <span>
                  Fokus: {focusLabels[creation.optimizationFocus] ?? creation.optimizationFocus}
                </span>
              )}
              {creation.overallScore !== undefined && (
                <span className={`font-semibold ${scoreColor(creation.overallScore)}`}>
                  Score: {creation.overallScore}/100
                </span>
              )}
            </div>

            {creation.errorMessage && (
              <p className="text-xs text-destructive truncate" title={creation.errorMessage}>
                ⚠ {creation.errorMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>

      <button
        type="button"
        onClick={handleDelete}
        aria-label={`„${creation.url}" löschen`}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  );
}
