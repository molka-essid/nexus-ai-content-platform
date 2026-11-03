import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { deleteSocialAccount } from "@/lib/data/social-accounts";
import { Platform } from "@prisma/client";

export async function DELETE(_request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { platform } = await params;
  if (!(platform.toUpperCase() in Platform)) {
    return NextResponse.json({ error: "Plateforme inconnue" }, { status: 400 });
  }

  await deleteSocialAccount(platform.toUpperCase() as Platform);
  return new NextResponse(null, { status: 204 });
}
