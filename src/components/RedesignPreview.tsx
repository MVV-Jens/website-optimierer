"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface RedesignPreviewProps {
  creationId: string;
  status: string;
}

export default function RedesignPreview({ creationId, status }: RedesignPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeMode, setIframeMode] = useState<"desktop" | "mobile">("desktop");
  const [loaded, setLoaded] = useState(false);

  const previewUrl = `/api/creations/${creationId}/preview`;

  useEffect(() => {
    setLoaded(false);
  }, [creationId]);

  if (status !== "DONE") {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed bg-muted/30">
        <p className="text-muted-foreground text-sm">
          Redesign wird generiert…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant={iframeMode === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => setIframeMode("desktop")}
        >
          🖥 Desktop
        </Button>
        <Button
          variant={iframeMode === "mobile" ? "default" : "outline"}
          size="sm"
          onClick={() => setIframeMode("mobile")}
        >
          📱 Mobile
        </Button>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sm text-primary underline"
        >
          In neuem Tab öffnen ↗
        </a>
      </div>

      <div
        className={`relative rounded-lg border overflow-hidden bg-white transition-all`}
        style={{
          width: "100%",
          minHeight: 600,
        }}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
        <div
          style={{
            width: iframeMode === "mobile" ? 390 : "100%",
            margin: "0 auto",
            transition: "width 0.3s ease",
          }}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            sandbox="allow-same-origin allow-forms allow-popups"
            title="Redesign-Vorschau"
            className="w-full border-0"
            style={{
              height: 700,
              display: "block",
            }}
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Vorschau in sandboxed iframe · JavaScript deaktiviert · Original-CSS wird referenziert
      </p>
    </div>
  );
}
