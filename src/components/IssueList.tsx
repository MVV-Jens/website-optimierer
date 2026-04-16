import { Badge } from "@/components/ui/badge";
import type { Issue } from "@/types";

const priorityConfig = {
  P0: { label: "P0 Kritisch", className: "bg-red-100 text-red-800 border-red-200" },
  P1: { label: "P1 Wichtig",  className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  P2: { label: "P2 Nice-to-have", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

const categoryIcon: Record<string, string> = {
  "information-architecture": "🗂️",
  interaction:                "🎯",
  readability:                "📖",
  accessibility:              "♿",
  responsiveness:             "📱",
  performance:                "⚡",
  seo:                        "🔍",
};

export default function IssueList({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        Keine Issues gefunden – sehr gute Ausgangslage!
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {issues.map((issue, idx) => {
        const cfg = priorityConfig[issue.priority];
        return (
          <li
            key={issue.id}
            className="rounded-lg border bg-card p-4 space-y-1.5"
          >
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground w-5 shrink-0 mt-0.5">
                {idx + 1}.
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}
              >
                {cfg.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {categoryIcon[issue.category] ?? "•"} {issue.category}
              </span>
              {issue.count && (
                <Badge variant="outline" className="text-xs">
                  ×{issue.count}
                </Badge>
              )}
            </div>
            <p className="font-semibold text-sm leading-snug">{issue.title}</p>
            <p className="text-sm text-muted-foreground">{issue.description}</p>
            <p className="text-sm">
              <span className="font-medium">Empfehlung: </span>
              {issue.fix}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
