import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { getAiQuotaStatus } from "@/lib/data/ai-quota-status";

// Polled by the AiStatusBadge — cheap DB read, no AI provider call involved,
// so it's safe to check often without spending any quota.
export async function GET() {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { blockedUntil } = await getAiQuotaStatus();
  const available = !blockedUntil || blockedUntil.getTime() <= Date.now();
  return NextResponse.json({ available, blockedUntil: available ? null : blockedUntil });
}
