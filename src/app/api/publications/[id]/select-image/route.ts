import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { getPublicationById, setPublicationImage } from "@/lib/data/publications";
import { getImageById } from "@/lib/data/images";

const bodySchema = z.object({ imageId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const publication = await getPublicationById(id);
  if (!publication) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const image = await getImageById(parsed.data.imageId);
  if (!image) {
    return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
  }

  const updated = await setPublicationImage(id, parsed.data.imageId);
  return NextResponse.json(updated);
}
