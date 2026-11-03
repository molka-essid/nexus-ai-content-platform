import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { listPublications } from "@/lib/data/publications";
import { PublicationStatus, ContentCategory } from "@prisma/client";
import { parseEnumParam } from "@/lib/http/query";

export async function GET(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const status = parseEnumParam(searchParams.get("status"), PublicationStatus);
  const category = parseEnumParam(searchParams.get("category"), ContentCategory);

  const publications = await listPublications({ status, category });
  return NextResponse.json(publications);
}
