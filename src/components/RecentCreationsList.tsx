"use client";

import { useRouter } from "next/navigation";
import CreationCard from "@/components/CreationCard";
import type { CreationSummary } from "@/types";

export default function RecentCreationsList({ creations }: { creations: CreationSummary[] }) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {creations.map((c) => (
        <CreationCard
          key={c.id}
          creation={c}
          onDeleted={() => router.refresh()}
        />
      ))}
    </div>
  );
}
