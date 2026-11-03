import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client: full read/write access to storage, used only from
// server-side code (API routes). Never import this from a client component —
// the "server-only" import above makes that a build error if attempted.
const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const bucket = env.SUPABASE_STORAGE_BUCKET;

function buildStoragePath(originalFilename: string): string {
  const safeName = originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return `${randomUUID()}-${safeName}`;
}

export function getPublicUrl(storagePath: string): string {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadImage(input: {
  buffer: Buffer;
  filename: string;
  contentType: string;
}): Promise<{ storagePath: string; url: string }> {
  const storagePath = buildStoragePath(input.filename);

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, input.buffer, {
      contentType: input.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Échec du téléversement de l'image vers le stockage : ${error.message}`);
  }

  return { storagePath, url: getPublicUrl(storagePath) };
}

export async function deleteImage(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([storagePath]);

  if (error) {
    throw new Error(`Échec de la suppression de l'image du stockage : ${error.message}`);
  }
}
