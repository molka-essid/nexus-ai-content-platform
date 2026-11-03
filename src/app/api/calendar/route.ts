import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { listCalendarSlotsInRange } from "@/lib/data/calendar";

// Powers the month-grid calendar board: GET /api/calendar?start=...&end=...
// returns every slot scheduled in that date range.
export async function GET(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "Les paramètres de requête start et end sont requis" }, { status: 400 });
  }

  const slots = await listCalendarSlotsInRange(new Date(start), new Date(end));
  return NextResponse.json(slots);
}
