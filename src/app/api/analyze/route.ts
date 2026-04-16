import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runPipeline } from "@/lib/pipeline";
import type { AnalysisOptions, OptimizationFocus, OptimizationDepth } from "@/types";

function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const {
    url,
    optimizationFocus = "all",
    depth = "moderate",
  } = body as {
    url?: string;
    optimizationFocus?: OptimizationFocus;
    depth?: OptimizationDepth;
  };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url ist erforderlich." }, { status: 400 });
  }

  if (!isValidUrl(url)) {
    return NextResponse.json(
      { error: "Ungültige URL. Nur http:// und https:// werden unterstützt." },
      { status: 400 }
    );
  }

  const validFocus: OptimizationFocus[] = ["all", "navigation", "form-ux", "content-hierarchy", "mobile"];
  const validDepth: OptimizationDepth[] = ["conservative", "moderate"];

  const options: AnalysisOptions = {
    optimizationFocus: validFocus.includes(optimizationFocus as OptimizationFocus)
      ? (optimizationFocus as OptimizationFocus)
      : "all",
    depth: validDepth.includes(depth as OptimizationDepth)
      ? (depth as OptimizationDepth)
      : "moderate",
  };

  // Create DB record
  const creation = await prisma.creation.create({
    data: {
      url: url.trim(),
      status: "ANALYZING",
      optimizationFocus: options.optimizationFocus,
      depth: options.depth,
    },
  });

  // Start pipeline in background (non-blocking)
  setImmediate(() => {
    runPipeline(creation.id, url.trim(), options).catch((err) => {
      console.error("[Pipeline error]", err);
    });
  });

  return NextResponse.json(
    { id: creation.id, status: "ANALYZING" },
    { status: 201 }
  );
}
