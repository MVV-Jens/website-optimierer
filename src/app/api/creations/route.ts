import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 20;

  const where = search
    ? { url: { contains: search } }
    : {};

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : { createdAt: "desc" as const };

  const [creations, total] = await Promise.all([
    prisma.creation.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        url: true,
        createdAt: true,
        status: true,
        optimizationFocus: true,
        depth: true,
        errorMessage: true,
        analysisJson: true,
      },
    }),
    prisma.creation.count({ where }),
  ]);

  const items = creations.map((c) => {
    let overallScore: number | undefined;
    if (c.analysisJson) {
      try {
        const analysis = JSON.parse(c.analysisJson);
        overallScore = analysis.overallScore;
      } catch {}
    }
    const { analysisJson: _a, ...rest } = c;
    return { ...rest, overallScore, createdAt: c.createdAt.toISOString() };
  });

  return NextResponse.json({ items, total, page, limit });
}
