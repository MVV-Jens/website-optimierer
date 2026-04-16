import type { RedesignChange, IAOutlineSection } from "@/types";

const impactIcon = { high: "🔴", medium: "🟡", low: "🔵" };
const categoryIcon: Record<string, string> = {
  "information-architecture": "🗂️",
  interaction:    "🎯",
  readability:    "📖",
  accessibility:  "♿",
  responsiveness: "📱",
  performance:    "⚡",
  seo:            "🔍",
};

export function ChangeList({ changes }: { changes: RedesignChange[] }) {
  if (changes.length === 0) {
    return <p className="text-muted-foreground text-sm">Keine Änderungen aufgezeichnet.</p>;
  }

  return (
    <div className="space-y-3">
      {changes.map((ch, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span>{impactIcon[ch.impact]}</span>
            <span>{categoryIcon[ch.category] ?? "•"}</span>
            <span className="font-medium leading-snug">{ch.reason}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded bg-red-50 border border-red-100 p-2">
              <p className="text-xs text-red-600 font-semibold mb-0.5">Vorher</p>
              <p className="text-xs font-mono break-all">{ch.before}</p>
            </div>
            <div className="rounded bg-green-50 border border-green-100 p-2">
              <p className="text-xs text-green-600 font-semibold mb-0.5">Nachher</p>
              <p className="text-xs font-mono break-all">{ch.after}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function IAOutlineView({ outline }: { outline: IAOutlineSection[] }) {
  if (outline.length === 0) {
    return <p className="text-muted-foreground text-sm">Keine IA-Struktur ermittelt.</p>;
  }

  return (
    <ol className="space-y-2">
      {outline.map((sec) => (
        <li key={sec.order} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <span className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
            {sec.order + 1}
          </span>
          <div>
            <p className="font-semibold">
              {sec.name}
              {sec.isNew && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  NEU
                </span>
              )}
            </p>
            <p className="text-muted-foreground">{sec.purpose}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
