"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreationCard from "@/components/CreationCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CreationSummary } from "@/types";
import Link from "next/link";

interface ApiResponse {
  items: CreationSummary[];
  total: number;
  page: number;
  limit: number;
}

export default function CreationsPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort, page: String(page) });
    if (search) params.set("search", search);
    const res = await fetch(`/api/creations?${params}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [search, sort, page]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Kreationen</h1>
        <Link href="/" className={cn(buttonVariants())}>
          + Neue Analyse
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="URL suchen…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
          aria-label="Kreationen nach URL suchen"
        />
        <Select value={sort} onValueChange={(v) => { if (v !== null) { setSort(v); setPage(1); } }}>
          <SelectTrigger className="w-44" aria-label="Sortierung">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Neueste zuerst</SelectItem>
            <SelectItem value="oldest">Älteste zuerst</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground text-lg">Noch keine Kreationen vorhanden.</p>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Erste Analyse starten
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((c) => (
            <CreationCard
              key={c.id}
              creation={c}
              onDeleted={(id) =>
                setData((prev) =>
                  prev
                    ? { ...prev, items: prev.items.filter((x) => x.id !== id), total: prev.total - 1 }
                    : prev
                )
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {data?.total} Ergebnis{data?.total !== 1 ? "se" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Vorherige Seite"
            >
              ←
            </Button>
            <span className="flex items-center px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Nächste Seite"
            >
              →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
