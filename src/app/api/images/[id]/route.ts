import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { deleteImage, getImageById, updateImage } from "@/lib/data/images";
import { updateImageSchema } from "@/lib/validation/image";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const existing = await getImageById(id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateImageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateImage(id, parsed.data);
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const existing = await getImageById(id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await deleteImage(id);
  return new NextResponse(null, { status: 204 });
}
