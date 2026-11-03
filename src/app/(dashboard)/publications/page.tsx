import Link from "next/link";
import { Plus, FileText, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/publications/status-badge";
import { DeletePublicationButton } from "@/components/publications/delete-publication-button";
import { listPublications } from "@/lib/data/publications";
import { PublicationStatus } from "@prisma/client";
import { parseEnumParam } from "@/lib/http/query";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  RECRUITMENT: "Recrutement",
  HUMAN_RESOURCES: "Ressources humaines",
  EMPLOYEE_WELLBEING: "Bien-être des employés",
};

const statusFilters: { label: string; value: PublicationStatus | undefined }[] = [
  { label: "Toutes", value: undefined },
  { label: "Brouillon", value: PublicationStatus.DRAFT },
  { label: "À valider", value: PublicationStatus.NEEDS_REVIEW },
  { label: "Programmé", value: PublicationStatus.SCHEDULED },
  { label: "Publié", value: PublicationStatus.PUBLISHED },
];

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = parseEnumParam(statusParam ?? null, PublicationStatus);
  const publications = await listPublications({ status });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Publications</h1>
          <p className="text-muted-foreground">
            Générez et gérez des publications individuelles pour les réseaux sociaux.
          </p>
        </div>
        <Button asChild>
          <Link href="/publications/new">
            <Plus className="size-4" />
            Nouvelle publication
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.value ? `/publications?status=${filter.value}` : "/publications"}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              status === filter.value
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Plateformes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {publications.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <FileText className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Aucune publication pour l&apos;instant</p>
                        <p className="text-sm text-muted-foreground">
                          Générez votre première publication pour commencer.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                publications.map((publication) => {
                  const failedPlatforms = publication.variants
                    .filter((variant) => variant.publishError)
                    .map((variant) => variant.platform);
                  return (
                  <TableRow key={publication.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Link href={`/publications/${publication.id}`} className="hover:underline">
                          {publication.title}
                        </Link>
                        {publication.calendarSlot?.calendarWeekId ? (
                          <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                            Plan hebdomadaire
                          </span>
                        ) : null}
                        {failedPlatforms.length > 0 ? (
                          <TriangleAlert
                            className="size-3.5 shrink-0 text-red-600"
                            aria-label={`Échec de publication sur ${failedPlatforms.join(", ")}`}
                          >
                            <title>{`Échec de publication sur ${failedPlatforms.join(", ")}`}</title>
                          </TriangleAlert>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{categoryLabels[publication.category] ?? publication.category}</TableCell>
                    <TableCell>
                      {publication.variants.map((variant) => variant.platform).join(", ")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={publication.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {publication.createdAt.toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      {publication.status !== PublicationStatus.PUBLISHED ? (
                        <DeletePublicationButton id={publication.id} title={publication.title} />
                      ) : null}
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
