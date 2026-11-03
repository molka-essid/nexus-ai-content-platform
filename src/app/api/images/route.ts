import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { createImage, listImages } from "@/lib/data/images";
import { uploadImage } from "@/lib/storage/supabase";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function GET(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag") ?? undefined;
  const excludeTag = searchParams.get("excludeTag") ?? undefined;

  const images = await listImages({ tag, excludeTag });
  return NextResponse.json(images);
}

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
    return NextResponse.json({ error: "Fichier trop volumineux (8 Mo max)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url, storagePath } = await uploadImage({
    buffer,
    filename: file.name,
    contentType: file.type,
  });

  const image = await createImage({
    url,
    storagePath,
    filename: file.name,
    uploadedById: authResult.session.user.id,
  });

  return NextResponse.json(image, { status: 201 });
}
