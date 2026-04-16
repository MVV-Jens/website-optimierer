import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const creation = await prisma.creation.findUnique({
    where: { id },
    select: { redesignZipPath: true, url: true },
  });

  if (!creation?.redesignZipPath) {
    return NextResponse.json({ error: "Kein ZIP vorhanden." }, { status: 404 });
  }

  const buffer = readFile(creation.redesignZipPath);
  if (!buffer) {
    return NextResponse.json({ error: "ZIP-Datei nicht gefunden." }, { status: 404 });
  }

  const slug = new URL(creation.url).hostname.replace(/\./g, "-");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ux-redesign-${slug}.zip"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
