import { NextResponse } from "next/server";
import { getImageById } from "@/lib/data/images";

// AI-generated/composited images are stored as inline base64 data: URLs
// (see createInlineImage), not real hosted files — fine for rendering in
// <img> tags in our own UI, but external platform APIs (Instagram, TikTok)
// require a real https:// URL they can fetch the bytes from themselves.
// This route is that real, stable, publicly-fetchable URL for any image
// regardless of how it's actually stored: it decodes+serves inline data:
// URLs directly, and redirects to already-public Supabase Storage URLs.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await getImageById(id);
  if (!image) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  if (!image.url.startsWith("data:")) {
    return NextResponse.redirect(image.url);
  }

  const match = image.url.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!match) {
    return NextResponse.json({ error: "Encodage d'image non reconnu" }, { status: 500 });
  }
  const [, mimeType, base64Data] = match;
  const buffer = Buffer.from(base64Data, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
