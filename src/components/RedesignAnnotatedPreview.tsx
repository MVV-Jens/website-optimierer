"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RedesignChange } from "@/types";

const CATEGORY_ICONS: Record<string, string> = {
  accessibility: "♿",
  "information-architecture": "🗂️",
  interaction: "🎯",
  readability: "📖",
  responsiveness: "📱",
  performance: "⚡",
  seo: "🔍",
};

const CATEGORY_LABELS: Record<string, string> = {
  accessibility: "Barrierefreiheit",
  "information-architecture": "IA / Struktur",
  interaction: "Interaktion",
  readability: "Lesbarkeit",
  responsiveness: "Responsiveness",
  performance: "Performance",
  seo: "SEO",
};

const IMPACT_COLORS: Record<string, string> = {
  high: "bg-red-500 text-white",
  medium: "bg-amber-400 text-white",
  low: "bg-blue-500 text-white",
};

const IMPACT_LABELS: Record<string, string> = {
  high: "Hoher Einfluss",
  medium: "Mittlerer Einfluss",
  low: "Geringer Einfluss",
};

function pinTopPercent(index: number, total: number): number {
  if (total <= 1) return 50;
  return 5 + (index / (total - 1)) * 80;
}

interface AnnotationPinProps {
  index: number;
  change: RedesignChange;
  total: number;
  isActive: boolean;
  onActivate: (i: number | null) => void;
}

function AnnotationPin({ index, change, total, isActive, onActivate }: AnnotationPinProps) {
  const top = pinTopPercent(index, total);
  const pinColor = IMPACT_COLORS[change.impact] ?? "bg-gray-500 text-white";

  return (
    <div
      className="absolute z-10"
      style={{ top: `${top}%`, left: "6px", transform: "translateY(-50%)" }}
    >
      {/* Connector line pointing left into the iframe */}
      <div
        className="absolute"
        style={{
          right: "28px",
          top: "50%",
          width: "16px",
          height: "1px",
          background: "rgb(156 163 175)",
          opacity: 0.7,
        }}
      />

      {/* Pin button */}
      <button
        type="button"
        aria-label={`Änderung ${index + 1}: ${CATEGORY_LABELS[change.category] ?? change.category}`}
        aria-expanded={isActive}
        onClick={() => onActivate(isActive ? null : index)}
        className={cn(
          "w-7 h-7 rounded-full text-xs font-bold shadow-md flex items-center justify-center",
          "ring-2 ring-white transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          pinColor,
          isActive && "scale-125 ring-offset-2"
        )}
      >
        {index + 1}
      </button>

      {/* Tooltip – opens to the left of the pin */}
      {isActive && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-20 w-72 rounded-lg border bg-popover shadow-xl p-0 overflow-hidden",
            "right-10 top-1/2 -translate-y-1/2",
          )}
        >
          {/* Header */}
          <div className={cn("px-3 py-2 flex items-center gap-2", pinColor)}>
            <span className="text-base leading-none">
              {CATEGORY_ICONS[change.category] ?? "✏️"}
            </span>
            <span className="font-semibold text-sm">
              {CATEGORY_LABELS[change.category] ?? change.category}
            </span>
            <span className="ml-auto text-xs opacity-80">{IMPACT_LABELS[change.impact]}</span>
          </div>

          {/* Body */}
          <div className="px-3 py-3 space-y-2 text-xs">
            {change.elementPreview && (
              <div className="rounded bg-indigo-50 border border-indigo-200 px-2 py-1.5">
                <p className="font-semibold text-indigo-700 mb-0.5">Element</p>
                <p className="font-mono text-indigo-900 leading-snug break-all">{change.elementPreview}</p>
              </div>
            )}
            <div className="rounded bg-red-50 border border-red-200 px-2 py-1.5">
              <p className="font-semibold text-red-700 mb-0.5">Vorher</p>
              <p className="text-muted-foreground leading-snug">{change.before}</p>
            </div>
            <div className="rounded bg-green-50 border border-green-200 px-2 py-1.5">
              <p className="font-semibold text-green-700 mb-0.5">Nachher</p>
              <p className="text-muted-foreground leading-snug">{change.after}</p>
            </div>
            <div className="rounded bg-muted px-2 py-1.5">
              <p className="font-semibold text-foreground mb-0.5">Begründung</p>
              <p className="text-muted-foreground leading-snug">{change.reason}</p>
            </div>
            {change.selector && (
              <p className="text-muted-foreground font-mono text-[10px] truncate pt-1 border-t">
                CSS: {change.selector}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface RedesignAnnotatedPreviewProps {
  creationId: string;
  status: string;
  changes: RedesignChange[];
}

export default function RedesignAnnotatedPreview({
  creationId,
  status,
  changes,
}: RedesignAnnotatedPreviewProps) {
  const [iframeMode, setIframeMode] = useState<"desktop" | "mobile">("desktop");
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [activePin, setActivePin] = useState<number | null>(null);

  const isDone = status === "DONE";

  function handleToggleAnnotations() {
    setShowAnnotations((v) => !v);
    if (showAnnotations) setActivePin(null);
  }

  if (!isDone) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/30 text-muted-foreground text-sm">
        Redesign wird noch generiert…
      </div>
    );
  }

  const iframeWidth = iframeMode === "mobile" ? "390px" : "100%";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setIframeMode("desktop")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              iframeMode === "desktop"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            )}
            aria-pressed={iframeMode === "desktop"}
          >
            🖥 Desktop
          </button>
          <button
            type="button"
            onClick={() => setIframeMode("mobile")}
            className={cn(
              "px-3 py-1.5 border-l transition-colors",
              iframeMode === "mobile"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            )}
            aria-pressed={iframeMode === "mobile"}
          >
            📱 Mobil
          </button>
        </div>

        {changes.length > 0 && (
          <button
            type="button"
            onClick={handleToggleAnnotations}
            className={cn(
              buttonVariants({ variant: showAnnotations ? "default" : "outline", size: "sm" })
            )}
          >
            📝 Annotierungen {showAnnotations ? "ausblenden" : "einblenden"}
          </button>
        )}

        <a
          href={`/api/creations/${creationId}/preview`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ml-auto")}
        >
          ↗ In neuem Tab
        </a>
      </div>

      {/* Preview + pins container */}
      <div
        className="relative"
        style={{ marginRight: changes.length > 0 && showAnnotations ? "52px" : undefined }}
      >
        {/* iframe – overflow-hidden only on this inner div */}
        <div
          className="relative border rounded-lg overflow-hidden bg-white"
          style={{ width: iframeWidth, maxWidth: "100%" }}
        >
          <iframe
            src={`/api/creations/${creationId}/preview`}
            title="Redesign-Vorschau"
            sandbox="allow-same-origin"
            className="w-full"
            style={{ height: "600px", border: "none", display: "block" }}
          />
        </div>

        {/* Annotation pins – outside overflow-hidden so they're not clipped */}
        {showAnnotations && changes.length > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ right: "-52px" }}>
            {changes.map((change, i) => (
              <div key={i} className="pointer-events-auto">
                <AnnotationPin
                  index={i}
                  change={change}
                  total={changes.length}
                  isActive={activePin === i}
                  onActivate={setActivePin}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      {showAnnotations && changes.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">{changes.length} Änderungen:</span>
          {(["high", "medium", "low"] as const).map((impact) => {
            const count = changes.filter((c) => c.impact === impact).length;
            if (count === 0) return null;
            return (
              <span key={impact} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex w-3.5 h-3.5 rounded-full",
                    impact === "high" ? "bg-red-500" : impact === "medium" ? "bg-amber-400" : "bg-blue-500"
                  )}
                />
                {count}× {IMPACT_LABELS[impact]}
              </span>
            );
          })}
          <span className="ml-auto italic">Auf eine Nummer klicken für Details</span>
        </div>
      )}

      {changes.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Diese Analyse enthält keine Annotierungsdaten. Starte eine neue Analyse, um das Overlay zu sehen.
        </p>
      )}
    </div>
  );
}
