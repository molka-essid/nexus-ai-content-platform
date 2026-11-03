import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import {
  deletePublication,
  getPublicationById,
  updatePublication,
} from "@/lib/data/publications";
import { updatePublicationSchema } from "@/lib/validation/publication";
import { PublicationStatus } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const publication = await getPublicationById(id);
  if (!publication) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json(publication);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const existing = await getPublicationById(id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  if (existing.status === PublicationStatus.PUBLISHED) {
    return NextResponse.json(
      { error: "Impossible de modifier une publication déjà publiée." },
      { status: 409 },
    );
  }

  const body = await request.json();
  const parsed = updatePublicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updatePublication(id, parsed.data);
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const existing = await getPublicationById(id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  if (existing.status === PublicationStatus.PUBLISHED) {
    return NextResponse.json(
      { error: "Impossible de supprimer une publication déjà publiée." },
      { status: 409 },
    );
  }

  await deletePublication(id);
  return new NextResponse(null, { status: 204 });
}
