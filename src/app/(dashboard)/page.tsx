import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";
import { listCalendarSlotsInRange } from "@/lib/data/calendar";
import { CalendarBoard } from "@/components/calendar/calendar-board";

export default async function DashboardHomePage() {
  const today = new Date();
  const gridStart = startOfWeek(startOfMonth(today), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(today), { weekStartsOn: 1 });
  const slots = await listCalendarSlotsInRange(gridStart, gridEnd);

  return <CalendarBoard initialSlots={slots} initialMonth={format(today, "yyyy-MM-dd")} />;
}
