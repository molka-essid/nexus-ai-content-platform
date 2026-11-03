import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { getPublicationById, setPublicationStatus } from "@/lib/data/publications";

const bodySchema = z.object({
  status: z.enum(["DRAFT", "NEEDS_REVIEW", "SCHEDULED", "PUBLISHED"]),
});

// Single-user workflow: any status is freely settable at any time (no
// reviewer role, no APPROVED gate before PUBLISHED) — this backs both the
// status dropdown and the "Publish" quick-action button on the detail page.
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

  const updated = await setPublicationStatus(id, parsed.data.status);
  return NextResponse.json(updated);
}
