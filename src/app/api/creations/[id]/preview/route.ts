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
    select: { redesignHtml: true, status: true },
  });

  if (!creation) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  if (creation.status !== "DONE" || !creation.redesignHtml) {
    return new NextResponse("<!-- Redesign noch nicht fertig -->", {
      status: 202,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const buffer = readFile(creation.redesignHtml);
  if (!buffer) {
    return NextResponse.json({ error: "HTML-Datei nicht gefunden." }, { status: 404 });
  }

  const html = buffer.toString("utf-8");

  // Add CSP header to sandbox content
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Allow styles but block scripts for preview safety
      "Content-Security-Policy":
        "default-src 'self' https: data:; script-src 'none'; style-src 'self' 'unsafe-inline' https:; img-src https: data: *; font-src https: data:;",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
