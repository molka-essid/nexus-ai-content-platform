import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { getBrandProfile, updateBrandProfile } from "@/lib/data/brand";
import { brandProfileSchema } from "@/lib/validation/brand";

export async function GET() {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const brand = await getBrandProfile();
  return NextResponse.json(brand);
}

export async function PUT(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const body = await request.json();
  const parsed = brandProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const brand = await updateBrandProfile(parsed.data);
  return NextResponse.json(brand);
}
