import { Badge } from "@/components/ui/badge";

type Status = "ANALYZING" | "DESIGNING" | "DONE" | "ERROR";

const config: Record<Status, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ANALYZING: { label: "Analysiere…", variant: "secondary" },
  DESIGNING: { label: "Redesign läuft…", variant: "secondary" },
  DONE:      { label: "Fertig", variant: "default" },
  ERROR:     { label: "Fehler", variant: "destructive" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, variant } = config[status] ?? config.ERROR;
  return <Badge variant={variant}>{label}</Badge>;
}
