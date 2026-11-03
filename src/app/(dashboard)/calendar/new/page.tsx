import { GenerateWeekWizard } from "@/components/calendar/generate-week-wizard";

export default function NewCalendarWeekPage() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Générer une semaine</h1>
        <p className="text-muted-foreground">
          Planifiez une semaine thématique, laissez l&apos;IA générer chaque publication, puis validez avant qu&apos;elle n&apos;atterrisse sur votre calendrier.
        </p>
      </div>
      <GenerateWeekWizard />
    </div>
  );
}
