import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { updateCalendarSlot, deleteCalendarSlot } from "@/lib/data/calendar";

const bodySchema = z.object({
  scheduledDate: z.string().date().optional(),
  publicationId: z.string().min(1).nullable().optional(),
});

// Reschedules a slot (drag-and-drop move) and/or reassigns its publication.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateCalendarSlot(id, {
    scheduledDate: parsed.data.scheduledDate ? new Date(parsed.data.scheduledDate) : undefined,
    publicationId: parsed.data.publicationId,
  });
  return NextResponse.json(updated);
}

// Detaches a slot from the calendar only — the underlying Publication (if
// any) is untouched and keeps its own delete flow.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  await deleteCalendarSlot(id);
  return new NextResponse(null, { status: 204 });
}
