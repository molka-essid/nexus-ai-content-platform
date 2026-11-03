import { notFound } from "next/navigation";
import { getPublicationById } from "@/lib/data/publications";
import { getPublicationWeekContext } from "@/lib/data/calendar";
import { listImages } from "@/lib/data/images";
import { PublicationDetail } from "@/components/publications/publication-detail";

export default async function PublicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const publication = await getPublicationById(id);

  if (!publication) {
    notFound();
  }

  const [flyerOptions, weekContext] = await Promise.all([
    listImages({ tag: `flyer-set:${id}` }),
    getPublicationWeekContext(id),
  ]);

  return (
    <PublicationDetail publication={publication} flyerOptions={flyerOptions} weekContext={weekContext} />
  );
}
