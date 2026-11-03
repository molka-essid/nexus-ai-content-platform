import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { createCalendarSlot } from "@/lib/data/calendar";
import { platformSchema, contentCategorySchema } from "@/lib/ai/schemas";

const bodySchema = z.object({
  scheduledDate: z.string().date(),
  platform: platformSchema,
  category: contentCategorySchema,
  objective: z.string().min(1).max(300),
  publicationId: z.string().min(1).optional(),
});

// Pins an existing publication onto a calendar date, or reserves a planned
// (publication-less) slot for later — the ad-hoc counterpart to the AI
// week-batch generator.
export async function POST(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const slot = await createCalendarSlot({
    ...parsed.data,
    scheduledDate: new Date(parsed.data.scheduledDate),
  });
  return NextResponse.json(slot, { status: 201 });
}
