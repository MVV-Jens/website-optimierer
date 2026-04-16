import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const creation = await prisma.creation.findUnique({
    where: { id },
    select: {
      id: true,
      url: true,
      createdAt: true,
      status: true,
      optimizationFocus: true,
      depth: true,
      errorMessage: true,
      analysisJson: true,
      styleLockJson: true,
      redesignHtml: true,
      redesignCss: true,
      redesignZipPath: true,
      redesignChangesJson: true,
    },
  });

  if (!creation) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  let analysis: unknown = null;
  let styleLock: unknown = null;
  let redesignChanges: unknown[] = [];
  let iaOutline: unknown[] = [];

  if (creation.analysisJson) {
    try {
      analysis = JSON.parse(creation.analysisJson);
    } catch {}
  }

  if (creation.styleLockJson) {
    try {
      styleLock = JSON.parse(creation.styleLockJson);
    } catch {}
  }

  if (creation.redesignChangesJson) {
    try {
      const changesData = JSON.parse(creation.redesignChangesJson) as {
        changes?: unknown[];
        iaOutline?: unknown[];
      };
      redesignChanges = changesData.changes ?? [];
      iaOutline = changesData.iaOutline ?? [];
    } catch {}
  }

  return NextResponse.json({
    id: creation.id,
    url: creation.url,
    createdAt: creation.createdAt.toISOString(),
    status: creation.status,
    optimizationFocus: creation.optimizationFocus,
    depth: creation.depth,
    errorMessage: creation.errorMessage,
    analysis,
    styleLock,
    redesignChanges,
    iaOutline,
    hasRedesign: !!creation.redesignHtml,
    hasZip: !!creation.redesignZipPath,
    overallScore: (analysis as Record<string, unknown>)?.overallScore,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.creation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  await prisma.creation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
