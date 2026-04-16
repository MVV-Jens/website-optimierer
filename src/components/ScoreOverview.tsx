import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalysisResult } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  "information-architecture": "Informationsarchitektur",
  interaction:                "Interaktion & Conversion",
  readability:                "Lesbarkeit",
  accessibility:              "Accessibility",
  responsiveness:             "Responsiveness",
  performance:                "Performance",
  seo:                        "SEO",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <Progress
        value={score}
        className="h-2 flex-1"
      />
      <span className={`w-12 text-right text-sm font-semibold tabular-nums ${scoreColor(score)}`}>
        {score}/100
      </span>
    </div>
  );
}

export default function ScoreOverview({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="space-y-4">
      {/* Overall score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg">Gesamtbewertung</span>
            <span className={`text-3xl font-bold ${scoreColor(analysis.overallScore)}`}>
              {analysis.overallScore}
              <span className="text-base font-normal text-muted-foreground">/100</span>
            </span>
          </div>
          <Progress value={analysis.overallScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Category scores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {analysis.categories.map((cat) => (
          <Card key={cat.category}>
            <CardContent className="pt-4 pb-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {CATEGORY_LABELS[cat.category] ?? cat.label}
                </span>
              </div>
              <ScoreBar score={cat.score} />
              {cat.quickWins.length > 0 && (
                <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  {cat.quickWins.slice(0, 2).map((w, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span aria-hidden>→</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
