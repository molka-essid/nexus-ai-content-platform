import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { getPublicationById, setPublicationAutoPublish } from "@/lib/data/publications";

const bodySchema = z.object({ autoPublish: z.boolean() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const existing = await getPublicationById(id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await setPublicationAutoPublish(id, parsed.data.autoPublish);
  return NextResponse.json(updated);
}
