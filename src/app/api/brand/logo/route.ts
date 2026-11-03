import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { updateBrandLogo } from "@/lib/data/brand";
import { uploadImage } from "@/lib/storage/supabase";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Type de fichier non pris en charge" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (5 Mo max)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await uploadImage({
    buffer,
    filename: file.name,
    contentType: file.type,
  });

  const brand = await updateBrandLogo(url);
  return NextResponse.json(brand);
}
